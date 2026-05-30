"""
TradeNexus — Compliance Checker Agent.

Validates regulatory compliance for commodity trades including APMC guidelines,
FSSAI requirements, GST e-way bills, and interstate transport permits.
Uses Nvidia LLM provider for unstructured permit parsing with structured fallback.
"""

import json
from core.llm_provider import get_llm_provider


class ComplianceAgent:
    """Agent responsible for regulatory compliance checks."""

    def __init__(self):
        self.llm = get_llm_provider()

    async def check(self, commodity: str, origin: str, destination: str) -> dict:
        """
        Check compliance requirements for a trade corridor.
        Invokes LLM provider to digest and extract guidelines.
        """
        system_prompt = (
            "You are TradeNexus's Indian Agricultural Compliance AI. "
            "Your task is to analyze compliance permits, taxes, and cess required for agricultural trade corridors. "
            "Provide output strictly as a JSON block with no markdown wrapper (unless requested), containing exactly:\n"
            "1. 'permits_required': list of permit names.\n"
            "2. 'cess_fee_percent': estimated APMC cess/fee rate as a percentage.\n"
            "3. 'quality_standards': list of FSSAI/mandi quality check parameters.\n"
            "4. 'interstate_gst_required': boolean (true if origin and destination states are different).\n"
            "5. 'regulatory_compliance_summary': a one-line summary of transport readiness."
        )

        user_prompt = (
            f"Analyze compliance for transport of {commodity} "
            f"from origin mandi: {origin} to destination mandi: {destination}."
        )

        try:
            raw_response = await self.llm.generate(system_prompt, user_prompt, temperature=0.1)
            # Safe JSON extractor
            clean_str = raw_response.strip()
            if clean_str.startswith("```json"):
                clean_str = clean_str.split("```json")[1].split("```")[0].strip()
            elif clean_str.startswith("```"):
                clean_str = clean_str.split("```")[1].split("```")[0].strip()
            
            data = json.loads(clean_str)
            return {
                "commodity": commodity,
                "origin": origin,
                "destination": destination,
                **data,
                "source": "compliance_llm_agent"
            }
        except Exception as e:
            # High-fidelity fallback compliance configuration
            print(f"[ComplianceAgent] Parsing error or API timeout: {e}. Executing mock compliance engine...")
            
            # Simple heuristic for interstate checks
            # Let's say states are different if origins/destinations don't belong to the same state
            # Known states based on mandi list
            state_map = {
                "nagpur": "Maharashtra", "indore": "Madhya Pradesh", "lucknow": "Uttar Pradesh",
                "guntur": "Andhra Pradesh", "jaipur": "Rajasthan", "nashik": "Maharashtra",
                "hubli": "Karnataka", "nizamabad": "Telangana", "rajkot": "Gujarat",
                "patna": "Bihar", "ludhiana": "Punjab", "pune": "Maharashtra",
                "madurai": "Tamil Nadu", "junagadh": "Gujarat", "ujjain": "Madhya Pradesh",
                "ahmedabad": "Gujarat", "mumbai": "Maharashtra", "azadpur": "Delhi",
                "chennai": "Tamil Nadu", "kolkata": "West Bengal", "bengaluru": "Karnataka",
                "kochi": "Kerala", "jodhpur": "Rajasthan"
            }
            
            orig_state = state_map.get(origin.lower(), "State A")
            dest_state = state_map.get(destination.lower(), "State B")
            is_interstate = orig_state != dest_state

            permits = ["APMC Gate Pass", "GST E-Way Bill"]
            if is_interstate:
                permits.append(f"{orig_state}-{dest_state} Transit NOC")
                permits.append("Interstate Transport Declaration")

            return {
                "commodity": commodity,
                "origin": origin,
                "destination": destination,
                "permits_required": permits,
                "cess_fee_percent": 1.5 if not is_interstate else 2.0,
                "quality_standards": [
                    "Maximum Moisture Content < 12%",
                    "Admixture limit < 1.0%",
                    "FSSAI residue levels compliant"
                ],
                "interstate_gst_required": is_interstate,
                "regulatory_compliance_summary": f"Standard {commodity} trade regulations apply. Valid {orig_state} APMC clearance certificate is required at gates.",
                "source": "compliance_fallback_engine"
            }
