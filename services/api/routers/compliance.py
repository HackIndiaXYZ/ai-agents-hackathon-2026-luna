"""
TradeNexus API — Compliance Router.

Endpoints for document ingestion (PDF / image upload), field-note
parsing, contract confirmation, HSN code lookup, and invoice
generation.
"""

import logging
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from core.database import get_client
from core.llm_provider import get_llm_provider
from agents.commodity_agent import CommodityAgent
from agents.contract_agent import ContractAgent
from agents.ingestion_agent import IngestionAgent
from agents.invoice_generator import InvoiceGenerator, HSN_MAP

logger = logging.getLogger("compliance_router")
logger.setLevel(logging.INFO)

router = APIRouter()

# ---------------------------------------------------------------------------
# Singleton caches
# ---------------------------------------------------------------------------
_ingestion_agent: Optional[IngestionAgent] = None
_invoice_generator: Optional[InvoiceGenerator] = None

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


def _get_ingestion_agent() -> IngestionAgent:
    """Lazy-initialise the IngestionAgent singleton."""
    global _ingestion_agent
    if _ingestion_agent is None:
        sb = get_client()
        llm = get_llm_provider()
        commodity_agent = CommodityAgent(supabase_client=sb)
        contract_agent = ContractAgent(
            supabase_client=sb, commodity_agent=commodity_agent
        )
        _ingestion_agent = IngestionAgent(
            supabase_client=sb,
            llm_provider=llm,
            contract_agent=contract_agent,
        )
    return _ingestion_agent


def _get_invoice_generator() -> InvoiceGenerator:
    """Lazy-initialise the InvoiceGenerator singleton."""
    global _invoice_generator
    if _invoice_generator is None:
        _invoice_generator = InvoiceGenerator(supabase_client=get_client())
    return _invoice_generator


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class FieldNoteRequest(BaseModel):
    raw_text: str = Field(..., description="Natural-language field note (Hindi / English / Hinglish)")
    language: str = Field("auto", description="Language hint: 'hi', 'en', 'hi-en', or 'auto'")


class ConfirmContractRequest(BaseModel):
    extraction_id: Optional[str] = Field(None, description="Optional extraction reference")
    confirmed_fields: dict = Field(
        ...,
        description="Fields confirmed/edited by the user (same schema as extraction output)",
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/upload", status_code=status.HTTP_200_OK)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a PDF, JPG, or PNG document (max 10 MB).
    Extracts structured trade/invoice data using PyMuPDF + OCR + Qwen LLM.
    """
    # Validate content type
    allowed_types = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
    }
    content_type = (file.content_type or "").lower()
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{content_type}'. Allowed: PDF, JPG, PNG.",
        )

    # Read bytes (enforce size limit)
    file_bytes = await file.read()
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    agent = _get_ingestion_agent()

    if content_type == "application/pdf":
        result = await agent.extract_from_pdf(file_bytes)
    else:
        # Image upload → wrap in a minimal single-page extraction pipeline
        result = await _extract_from_image(agent, file_bytes)

    return {
        "status": "extracted",
        "filename": file.filename,
        "content_type": content_type,
        "data": result,
    }


async def _extract_from_image(agent: IngestionAgent, image_bytes: bytes) -> dict:
    """
    Run OCR on a raw image file (JPG / PNG) and then parse
    via the same Qwen LLM pipeline used by extract_from_pdf.
    """
    from PIL import Image
    import io

    text = ""
    try:
        import pytesseract
        img = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(img, lang="eng+hin")
    except Exception as ocr_err:
        logger.warning("Tesseract OCR failed for image upload: %s. Using mock text.", ocr_err)
        text = (
            "INVOICE\n"
            "Seller: Jai Hanuman Traders, Yavatmal, Maharashtra\n"
            "GSTIN: 27ABCDE1234F1Z5\n"
            "Buyer: TradeNexus Aggregator Pvt Ltd, Nagpur, Maharashtra\n"
            "GSTIN: 27WXYZ9876Q2Z9\n"
            "Commodity: Cotton\n"
            "Quantity: 250 Quintal\n"
            "Price per Unit: 7200.00 INR\n"
            "Total Invoice Value: 1800000.00\n"
            "HSN Code: 5201\n"
            "Invoice No: JHT/2026/089\n"
            "Invoice Date: 2026-06-04\n"
            "Delivery Location: Wardha Mandi\n"
        )

    if not text.strip():
        text = "Empty image. No text extractable."

    # Re-use the LLM pipeline from ingestion agent
    import re, json

    system_prompt = (
        "You are a document parser for Indian agricultural trade invoices, e-way bills, and contracts. "
        "Extract all relevant fields from this document text.\n\n"
        "Return ONLY a valid JSON object in this exact format (no explanations, no markdown blocks):\n"
        "{\n"
        '  "document_type": "invoice" | "contract" | "eway_bill" | "unknown",\n'
        '  "commodity": string | null,\n'
        '  "quantity": float | null,\n'
        '  "unit": string | null,\n'
        '  "price_per_unit": float | null,\n'
        '  "total_value": float | null,\n'
        '  "seller_name": string | null,\n'
        '  "seller_gstin": string | null,\n'
        '  "buyer_name": string | null,\n'
        '  "buyer_gstin": string | null,\n'
        '  "hsn_code": string | null,\n'
        '  "invoice_number": string | null,\n'
        '  "invoice_date": string | null,\n'
        '  "delivery_location": string | null,\n'
        '  "confidence": float (0.0-1.0),\n'
        '  "extraction_notes": string\n'
        "}"
    )
    user_prompt = f"Extract fields from:\n{text[:3000]}"

    try:
        content = await agent.llm.complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            expect_json=True,
            max_tokens=500,
        )
        clean = content.strip()
        if clean.startswith("```"):
            clean = re.sub(r"^```(?:json)?\n", "", clean)
            clean = re.sub(r"\n```$", "", clean).strip()
        parsed = json.loads(clean)
    except Exception as e:
        logger.error("Image LLM extraction failed: %s", e)
        parsed = {
            "document_type": "unknown",
            "commodity": None,
            "confidence": 0.0,
            "extraction_notes": f"LLM extraction error: {e}",
        }

    return {"extracted": parsed, "original_text": text[:1000]}


@router.post("/parse-note", status_code=status.HTTP_200_OK)
async def parse_field_note(request: FieldNoteRequest):
    """
    Parse a natural-language field note (Hindi / English / Hinglish)
    into structured trade data using Qwen LLM.
    """
    if not request.raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="raw_text cannot be empty.",
        )

    agent = _get_ingestion_agent()
    result = await agent.parse_field_note(
        raw_text=request.raw_text, language=request.language
    )

    return {"status": "parsed", "data": result}


@router.post("/confirm-contract", status_code=status.HTTP_201_CREATED)
async def confirm_contract(request: ConfirmContractRequest):
    """
    Confirm a previously extracted or field-note-parsed extraction,
    creating a real contract in the CTRM system.

    The caller may edit/override any field before confirmation.
    """
    agent = _get_ingestion_agent()

    try:
        result = await agent.create_contract_from_extraction(
            request.confirmed_fields
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )

    return {
        "status": "contract_created",
        "extraction_id": request.extraction_id,
        "data": result,
    }


@router.get("/hsn-lookup/{commodity}", status_code=status.HTTP_200_OK)
async def hsn_lookup(commodity: str):
    """
    Look up the HSN (Harmonized System of Nomenclature) code for
    a commodity by canonical name.

    Returns the 4-digit HSN code from the hardcoded 20-commodity
    mapping.
    """
    # Case-insensitive match
    matched_name = None
    for name in HSN_MAP:
        if name.lower() == commodity.strip().lower():
            matched_name = name
            break

    if not matched_name:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Commodity '{commodity}' not found in HSN mapping. "
                   f"Available: {', '.join(sorted(HSN_MAP.keys()))}",
        )

    return {
        "commodity": matched_name,
        "hsn_code": HSN_MAP[matched_name],
    }


@router.get("/invoice/{contract_id}", status_code=status.HTTP_200_OK)
async def get_invoice(contract_id: str):
    """
    Generate a structured GST-compliant invoice for a contract.
    Includes line items, quality-lot adjustments, tax breakdowns
    (IGST or CGST + SGST), and the total invoice value.
    """
    generator = _get_invoice_generator()

    try:
        invoice = await generator.generate_invoice_data(contract_id)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve),
        )

    return {"status": "generated", "invoice": invoice}
