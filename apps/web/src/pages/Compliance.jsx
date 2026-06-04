import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import toast from 'react-hot-toast';
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
  Printer,
  FileCheck,
  Languages,
  ArrowRight,
  Database,
  Calendar,
  Layers,
  Sparkles,
  ClipboardList
} from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

import {
  getContracts,
  getInvoice,
  parseFieldNote,
  createContract,
  updateInventory
} from '../lib/api';
import { formatINR, formatQty } from '../utils/format';

export const Compliance = () => {
  const navigate = useNavigate();
  const { isLoading, setIsLoading } = useStore();

  const [activeTab, setActiveTab] = useState('ocr');

  // ==========================================
  // TAB 1: Document OCR Extraction States
  // ==========================================
  const [selectedFile, setSelectedFile] = useState(null);
  const [ocrStep, setOcrStep] = useState(0); // 0=idle, 1=reading, 2=extracting, 3=validating, 4=complete
  const [ocrData, setOcrData] = useState(null);
  const [complianceScore, setComplianceScore] = useState(94);
  const [isCreatingContractFromOcr, setIsCreatingContractFromOcr] = useState(false);

  // ==========================================
  // TAB 2: Invoice Generator States
  // ==========================================
  const [contractsList, setContractsList] = useState([]);
  const [selectedContractId, setSelectedContractId] = useState('');
  const [generatedInvoice, setGeneratedInvoice] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // ==========================================
  // TAB 3: Field Note Parser States
  // ==========================================
  const [fieldNote, setFieldNote] = useState('');
  const [detectedLang, setDetectedLang] = useState('English');
  const [parsingNote, setParsingNote] = useState(false);
  const [parsedFields, setParsedFields] = useState(null);
  const [processingNoteAction, setProcessingNoteAction] = useState(false);

  // Load contracts for Tab 2
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const list = await getContracts();
        // filter settled + confirmed
        const filtered = (list || []).filter(c => c.status === 'confirmed' || c.status === 'settled' || c.status === 'delivered');
        setContractsList(filtered);
      } catch (e) {
        console.warn("Could not fetch contracts", e);
      }
    };
    fetchContracts();
  }, []);

  // ==========================================
  // TAB 1: OCR Logic
  // ==========================================
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setOcrData(null);
      setOcrStep(0);
      toast.success(`Loaded document: ${file.name}`);
    }
  };

  const handleStartOCR = () => {
    if (!selectedFile) return;
    setOcrStep(1); // Reading document...
    
    // Fake sequential steps with 800ms delays
    setTimeout(() => {
      setOcrStep(2); // Extracting fields...
      setTimeout(() => {
        setOcrStep(3); // Validating GST...
        setTimeout(() => {
          setOcrStep(4); // Complete
          setOcrData({
            invoiceNum: "INV-2026-08421",
            sellerGst: "27AAPCS1234M1Z5",
            buyerGst: "24BBBCS4321N2Y6",
            commodity: "Cotton",
            hsnCode: "5201",
            quantity: 50,
            rate: 6400,
            value: 320000,
            tax: 57600, // 18% GST
            ewayRequired: "Yes"
          });
          toast.success("Document processed successfully!");
        }, 800);
      }, 800);
    }, 800);
  };

  const handleEditOcrField = (key, val) => {
    setOcrData(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleCreateContractFromOcr = async () => {
    if (!ocrData) return;
    setIsCreatingContractFromOcr(true);
    try {
      const newContract = await createContract({
        type: 'BUY',
        commodity: ocrData.commodity,
        quantity: Number(ocrData.quantity),
        price: Number(ocrData.rate),
        counterparty_name: 'Ramesh Cotton Traders',
        delivery_location: 'Nagpur Mandi',
        notes: `Automatically generated from Invoice ${ocrData.invoiceNum}`
      });
      toast.success("Contract created successfully from OCR metadata!");
      navigate(`/app/contracts?id=${newContract.id}`);
    } catch (e) {
      toast.error("Failed to generate contract.");
    } finally {
      setIsCreatingContractFromOcr(false);
    }
  };

  // ==========================================
  // TAB 2: Invoice Logic
  // ==========================================
  const handleSelectInvoiceContract = async (id) => {
    setSelectedContractId(id);
    if (!id) {
      setGeneratedInvoice(null);
      return;
    }
    setLoadingInvoice(true);
    try {
      const data = await getInvoice(id);
      setGeneratedInvoice(data);
    } catch (e) {
      toast.error("Failed to load invoice layout.");
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ==========================================
  // TAB 3: Field Note Parser Logic
  // ==========================================
  const handleFieldNoteChange = (text) => {
    setFieldNote(text);
    // Simple language detection heuristics
    const txt = text.toLowerCase();
    if (txt.includes('kapas') || txt.includes('liya') || txt.includes('diya') || txt.includes('becha') || txt.includes('rupaye')) {
      setDetectedLang('Hinglish');
    } else if (txt.match(/[\u0900-\u097F]/)) {
      setDetectedLang('Hindi');
    } else {
      setDetectedLang('English');
    }
  };

  const autofillNote = (exampleText) => {
    handleFieldNoteChange(exampleText);
    toast.success("Example loaded!");
  };

  const handleParseNoteSubmit = async (e) => {
    e.preventDefault();
    if (!fieldNote.trim()) return;

    setParsingNote(true);
    setParsedFields(null);
    try {
      const res = await parseFieldNote(fieldNote);
      setParsedFields(res);
      toast.success("Field note parsed into transaction schema!");
    } catch (err) {
      toast.error("Failed to parse field note.");
    } finally {
      setParsingNote(false);
    }
  };

  const handleExecuteParsedAction = async () => {
    if (!parsedFields) return;
    setProcessingNoteAction(true);
    try {
      if (parsedFields.action === 'buy' || parsedFields.action === 'sell') {
        const newContract = await createContract({
          type: parsedFields.action.toUpperCase(),
          commodity: parsedFields.commodity,
          quantity: Number(parsedFields.quantity),
          price: Number(parsedFields.price),
          counterparty_name: parsedFields.counterparty || 'Ramesh Cotton Traders',
          delivery_location: 'Nagpur Mandi',
          notes: `Parsed from voice memo note: "${parsedFields.raw_text}"`
        });
        toast.success(`Draft Contract created successfully!`);
        navigate(`/app/contracts?id=${newContract.id}`);
      } else {
        // Inventory update
        await updateInventory({
          commodity: parsedFields.commodity,
          quantity: Number(parsedFields.quantity),
          operation: 'add',
          notes: `Adjusted via parsed note: "${parsedFields.raw_text}"`
        });
        toast.success(`Storage inventory adjusted!`);
        navigate(`/app/inventory`);
      }
    } catch (e) {
      toast.error("Transaction execution failed.");
    } finally {
      setProcessingNoteAction(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 text-slate-700">
      <PageHeader
        title="Compliance & Documents"
        subtitle="Manage OCR audits, print statutory invoices, and parse field records"
      />

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 no-print">
        <button
          onClick={() => setActiveTab('ocr')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'ocr' ? 'border-brand-green text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <Upload className="w-4 h-4" />
          Document OCR Auditor
        </button>
        <button
          onClick={() => setActiveTab('invoice')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'invoice' ? 'border-brand-green text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <Printer className="w-4 h-4" />
          Tax Invoice Generator
        </button>
        <button
          onClick={() => setActiveTab('note')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'note' ? 'border-brand-green text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <Languages className="w-4 h-4" />
          Field Note Parser
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DOCUMENT OCR AUDITOR */}
      {/* ======================================================== */}
      {activeTab === 'ocr' && (
        <div className="space-y-6">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs text-amber-800 font-semibold leading-relaxed">
              <span className="block font-bold">Government Sandbox Integration</span>
              <p className="font-medium text-amber-700">
                OCR audit records simulate tax calculations and HSN databases. Upload an invoice to verify e-way bill compliance parameters.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Dropzone card left 2 cols */}
            <div className="lg:col-span-2">
              <Card className="p-8 text-center border-dashed border-2 flex flex-col items-center justify-center space-y-4 min-h-[300px]">
                <div className="p-4 rounded-full bg-slate-50 border text-slate-400">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="space-y-1 text-xs">
                  <span className="text-sm font-bold text-slate-800 block">
                    {selectedFile ? selectedFile.name : 'Drag & drop invoice receipt PDF'}
                  </span>
                  <p className="text-slate-400 font-semibold">
                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'or click to browse local files'}
                  </p>
                </div>
                <input
                  type="file"
                  id="comUpload"
                  className="hidden"
                  accept=".pdf,.png,.jpg"
                  onChange={handleFileChange}
                />
                
                <div className="flex gap-2">
                  <label
                    htmlFor="comUpload"
                    className="px-4 py-2 border rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer select-none text-slate-700 transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    Browse Files
                  </label>
                  {selectedFile && ocrStep === 0 && (
                    <Button variant="primary" size="sm" onClick={handleStartOCR}>
                      Audit Invoice
                    </Button>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-bold">Supported: PDF, JPG, PNG up to 10MB</span>
              </Card>

              {/* Sequential Loading Step Indicator */}
              {ocrStep > 0 && ocrStep < 4 && (
                <div className="mt-4 p-4 border bg-white rounded-xl space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">OCR Extraction Progress</span>
                  <div className="space-y-2 text-xs font-semibold">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className={ocrStep >= 1 ? "text-brand-green font-bold" : "text-slate-400"}>1. Reading document...</span>
                      {ocrStep === 1 && <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-green" />}
                      {ocrStep > 1 && <CheckCircle className="w-3.5 h-3.5 text-brand-green" />}
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className={ocrStep >= 2 ? "text-brand-green font-bold" : "text-slate-400"}>2. Extracting metadata fields...</span>
                      {ocrStep === 2 && <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-green" />}
                      {ocrStep > 2 && <CheckCircle className="w-3.5 h-3.5 text-brand-green" />}
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className={ocrStep >= 3 ? "text-brand-green font-bold" : "text-slate-400"}>3. Validating GST numbers...</span>
                      {ocrStep === 3 && <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-green" />}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Extraction Results right 3 cols */}
            <div className="lg:col-span-3">
              {ocrData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Fields Column */}
                  <div className="md:col-span-2 space-y-4">
                    <Card className="overflow-hidden">
                      <div className="p-4 border-b bg-slate-50 flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                          Extracted Audit Fields
                        </h3>
                        <Badge variant="success">100% OCR Match</Badge>
                      </div>
                      <div className="divide-y text-xs font-semibold text-slate-700" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex justify-between items-center p-3">
                          <span className="text-slate-400 font-bold">Invoice Number</span>
                          <input
                            type="text"
                            value={ocrData.invoiceNum}
                            onChange={(e) => handleEditOcrField('invoiceNum', e.target.value)}
                            className="bg-slate-50 px-2 py-1 rounded text-right font-bold text-slate-900 focus:bg-white border focus:border-brand-green w-36"
                          />
                        </div>
                        <div className="flex justify-between items-center p-3">
                          <span className="text-slate-400 font-bold">Seller GSTIN</span>
                          <input
                            type="text"
                            value={ocrData.sellerGst}
                            onChange={(e) => handleEditOcrField('sellerGst', e.target.value)}
                            className="bg-slate-50 px-2 py-1 rounded text-right font-bold text-slate-900 focus:bg-white border focus:border-brand-green w-40"
                          />
                        </div>
                        <div className="flex justify-between items-center p-3">
                          <span className="text-slate-400 font-bold">Buyer GSTIN</span>
                          <input
                            type="text"
                            value={ocrData.buyerGst}
                            onChange={(e) => handleEditOcrField('buyerGst', e.target.value)}
                            className="bg-slate-50 px-2 py-1 rounded text-right font-bold text-slate-900 focus:bg-white border focus:border-brand-green w-40"
                          />
                        </div>
                        <div className="flex justify-between items-center p-3">
                          <span className="text-slate-400 font-bold">Commodity</span>
                          <input
                            type="text"
                            value={ocrData.commodity}
                            onChange={(e) => handleEditOcrField('commodity', e.target.value)}
                            className="bg-slate-50 px-2 py-1 rounded text-right font-bold text-slate-900 focus:bg-white border focus:border-brand-green w-32"
                          />
                        </div>
                        <div className="flex justify-between items-center p-3">
                          <span className="text-slate-400 font-bold">HSN Code</span>
                          <input
                            type="text"
                            value={ocrData.hsnCode}
                            onChange={(e) => handleEditOcrField('hsnCode', e.target.value)}
                            className="bg-slate-50 px-2 py-1 rounded text-right font-bold text-slate-900 focus:bg-white border focus:border-brand-green w-20"
                          />
                        </div>
                        <div className="flex justify-between items-center p-3">
                          <span className="text-slate-400 font-bold">Quantity (q)</span>
                          <input
                            type="number"
                            value={ocrData.quantity}
                            onChange={(e) => handleEditOcrField('quantity', e.target.value)}
                            className="bg-slate-50 px-2 py-1 rounded text-right font-bold text-slate-900 focus:bg-white border focus:border-brand-green w-20"
                          />
                        </div>
                        <div className="flex justify-between items-center p-3">
                          <span className="text-slate-400 font-bold">Total Value</span>
                          <span className="text-slate-900 font-extrabold">{formatINR(ocrData.rate * ocrData.quantity)}</span>
                        </div>
                      </div>
                    </Card>

                    <Button
                      variant="primary"
                      size="md"
                      className="w-full flex items-center justify-center gap-1.5"
                      onClick={handleCreateContractFromOcr}
                      disabled={isCreatingContractFromOcr}
                    >
                      <FileCheck className="w-4 h-4" />
                      Create Contract from Invoice
                    </Button>
                  </div>

                  {/* Checklist Column */}
                  <div className="space-y-4">
                    <Card className="p-4 space-y-4">
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        Compliance Checklist
                      </h3>

                      <div className="space-y-3 text-xs font-bold text-slate-600">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>GSTIN format valid</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>HSN code recognized</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Tax calculation verified</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>E-way bill registered</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Compliance Rating</span>
                        <span className="text-3xl font-black text-emerald-600 font-display">94%</span>
                      </div>
                    </Card>
                  </div>
                </div>
              ) : (
                <Card className="p-8 text-center text-slate-400 text-xs italic flex items-center justify-center min-h-[300px]">
                  Perform an OCR document audit on your receipt layout to extract invoice variables.
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: TAX INVOICE GENERATOR */}
      {/* ======================================================== */}
      {activeTab === 'invoice' && (
        <div className="space-y-6">
          <Card className="p-5 flex items-center gap-4 bg-white border no-print">
            <span className="text-xs font-bold text-slate-400 uppercase shrink-0">Select Active Contract:</span>
            <select
              value={selectedContractId}
              onChange={(e) => handleSelectInvoiceContract(e.target.value)}
              className="flex-grow bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-green"
            >
              <option value="">-- Choose Settled or Confirmed Contract --</option>
              {contractsList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.contract_number} ({c.commodity} | {c.counterparty_name} | {formatINR(c.contract_price * c.quantity)})
                </option>
              ))}
            </select>
          </Card>

          {loadingInvoice ? (
            <div className="h-64 flex items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : generatedInvoice ? (
            <div className="space-y-4">
              {/* Structured Invoice Preview */}
              <Card className="p-8 bg-white shadow-lg border border-slate-200 max-w-3xl mx-auto print:shadow-none print:border-none print:p-0">
                {/* Header */}
                <div className="flex justify-between items-start border-b pb-6 mb-6">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">TradeNexus Invoice</h1>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">APMC STATUTORY TAX RECEIPT</span>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-slate-800">Invoice: {generatedInvoice.invoice_number}</p>
                    <p className="text-slate-400 mt-1">Date: {formatDate(generatedInvoice.date)}</p>
                    <p className="text-slate-400">Contract ID: {generatedInvoice.contract_id}</p>
                  </div>
                </div>

                {/* Seller/Buyer grid */}
                <div className="grid grid-cols-2 gap-8 text-xs mb-8">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Seller Details</span>
                    <p className="font-bold text-slate-800">TradeNexus Logistics Hub</p>
                    <p className="text-slate-500 mt-1">Mandi Yard No. 4, MIDC Area</p>
                    <p className="text-slate-500">Nagpur, Maharashtra - 440008</p>
                    <p className="font-semibold text-slate-600 mt-2">GSTIN: 27AAPCS1234M1Z5</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Buyer Details</span>
                    <p className="font-bold text-slate-800">Balaji Agro Industries</p>
                    <p className="text-slate-500 mt-1">APMC Market Committee Yard</p>
                    <p className="text-slate-500">Ahmedabad, Gujarat - 380002</p>
                    <p className="font-semibold text-slate-600 mt-2">GSTIN: 24BBBCS4321N2Y6</p>
                  </div>
                </div>

                {/* Line items Table */}
                <table className="w-full text-left text-xs mb-8 border-collapse">
                  <thead>
                    <tr className="border-b-2 font-bold text-slate-400 uppercase bg-slate-50">
                      <th className="py-2.5 px-3">Commodity Item</th>
                      <th className="py-2.5 px-3 text-center">HSN Code</th>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Rate / q</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b font-medium text-slate-800">
                      <td className="py-3 px-3 font-bold">Cotton (Grade A Premium)</td>
                      <td className="py-3 px-3 text-center text-slate-500">5201</td>
                      <td className="py-3 px-3 text-right">50 quintal</td>
                      <td className="py-3 px-3 text-right">{formatINR(generatedInvoice.taxable_value / 50)}</td>
                      <td className="py-3 px-3 text-right font-bold">{formatINR(generatedInvoice.taxable_value)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Tax summary breakdown */}
                <div className="flex justify-end text-xs">
                  <div className="w-72 space-y-2.5">
                    <div className="flex justify-between font-semibold text-slate-500">
                      <span>Taxable Amount</span>
                      <span className="text-slate-800">{formatINR(generatedInvoice.taxable_value)}</span>
                    </div>

                    {generatedInvoice.cgst_amount > 0 && (
                      <div className="flex justify-between font-medium text-slate-500">
                        <span>CGST ({generatedInvoice.cgst_rate}%)</span>
                        <span className="text-slate-800">+{formatINR(generatedInvoice.cgst_amount)}</span>
                      </div>
                    )}
                    {generatedInvoice.sgst_amount > 0 && (
                      <div className="flex justify-between font-medium text-slate-500">
                        <span>SGST ({generatedInvoice.sgst_rate}%)</span>
                        <span className="text-slate-800">+{formatINR(generatedInvoice.sgst_amount)}</span>
                      </div>
                    )}
                    {generatedInvoice.igst_amount > 0 && (
                      <div className="flex justify-between font-medium text-slate-500">
                        <span>IGST ({generatedInvoice.igst_rate}%)</span>
                        <span className="text-slate-800">+{formatINR(generatedInvoice.igst_amount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-semibold text-slate-500 border-t pt-2">
                      <span>Total Tax (GST)</span>
                      <span className="text-slate-800">{formatINR(generatedInvoice.total_tax)}</span>
                    </div>

                    <div className="flex justify-between font-black text-slate-900 text-sm border-t-2 pt-2">
                      <span>Grand Invoice Value</span>
                      <span className="text-brand-green">{formatINR(generatedInvoice.total_value)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Action buttons */}
              <div className="flex justify-center gap-3 no-print">
                <Button variant="secondary" size="md" onClick={handlePrint} className="flex items-center gap-1.5">
                  <Printer className="w-4.5 h-4.5" />
                  Print statutory Invoice
                </Button>
                <Button variant="primary" size="md" onClick={handlePrint} className="flex items-center gap-1.5">
                  <FileText className="w-4.5 h-4.5" />
                  Download Invoice (PDF)
                </Button>
              </div>
            </div>
          ) : (
            <Card className="p-12 text-center text-slate-400 text-xs italic flex items-center justify-center min-h-[300px]">
              Select a confirmed or settled contract from the ledger above to formulate its tax invoice receipt.
            </Card>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: FIELD NOTE PARSER */}
      {/* ======================================================== */}
      {activeTab === 'note' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Parser Form left 2 cols */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display">
                  Field Memo Transcriber
                </h3>
                <Badge variant="info" className="flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5" />
                  {detectedLang}
                </Badge>
              </div>

              <form onSubmit={handleParseNoteSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Raw Note Input</label>
                  <textarea
                    value={fieldNote}
                    onChange={(e) => handleFieldNoteChange(e.target.value)}
                    placeholder="Try Hin-glish: Ramesh se 50 quintal kapas liya 6400 rupaye..."
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-green resize-none custom-scrollbar"
                    style={{ borderColor: 'var(--border)' }}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={parsingNote}
                  disabled={!fieldNote.trim()}
                  className="w-full text-xs font-bold"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Parse Note
                </Button>
              </form>

              {/* Clickable Quick Examples */}
              <div className="mt-6 border-t pt-4 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Click example to autofill:</span>
                <div className="space-y-1.5">
                  <button
                    onClick={() => autofillNote("Ramesh se 50 quintal kapas liya 6400 rupaye")}
                    className="w-full text-left p-2 border border-slate-100 rounded bg-slate-50 hover:bg-slate-100/50 text-[10px] font-semibold text-slate-600 block transition-colors truncate"
                  >
                    "Ramesh se 50 quintal kapas liya 6400 rupaye" (Buy Contract)
                  </button>
                  <button
                    onClick={() => autofillNote("Sold 30 quintals soybean to Pune traders at 4800")}
                    className="w-full text-left p-2 border border-slate-100 rounded bg-slate-50 hover:bg-slate-100/50 text-[10px] font-semibold text-slate-600 block transition-colors truncate"
                  >
                    "Sold 30 quintals soybean to Pune traders at 4800" (Sell Contract)
                  </button>
                  <button
                    onClick={() => autofillNote("Moisture in cotton lot was 14%, some foreign matter")}
                    className="w-full text-left p-2 border border-slate-100 rounded bg-slate-50 hover:bg-slate-100/50 text-[10px] font-semibold text-slate-600 block transition-colors truncate"
                  >
                    "Moisture in cotton lot was 14%, some foreign matter" (Quality Inspection)
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* Parser Results right 3 cols */}
          <div className="lg:col-span-3">
            {parsedFields ? (
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Parsed Transaction Fields
                  </h3>
                  <Badge variant={parsedFields.action === 'buy' ? 'success' : parsedFields.action === 'sell' ? 'info' : 'warning'}>
                    Parsed Action: {parsedFields.action.toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resolved Commodity</span>
                    <input
                      type="text"
                      value={parsedFields.commodity}
                      onChange={(e) => setParsedFields(prev => ({ ...prev, commodity: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fulfillment Qty</span>
                    <input
                      type="number"
                      value={parsedFields.quantity}
                      onChange={(e) => setParsedFields(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Price Value / q</span>
                    <input
                      type="number"
                      value={parsedFields.price}
                      onChange={(e) => setParsedFields(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Associated Entity</span>
                    <input
                      type="text"
                      value={parsedFields.counterparty || 'Ramesh Cotton Traders'}
                      onChange={(e) => setParsedFields(prev => ({ ...prev, counterparty: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs leading-relaxed text-slate-700 font-medium">
                  <div className="font-bold text-slate-400 uppercase text-[9px] mb-1">Raw Speech Text</div>
                  "{parsedFields.raw_text}"
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={processingNoteAction}
                    onClick={handleExecuteParsedAction}
                    className="flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-4 h-4" />
                    {parsedFields.action === 'buy' || parsedFields.action === 'sell' ? 'Create Contract' : 'Update Inventory'}
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center text-slate-400 text-xs italic flex items-center justify-center min-h-[300px]">
                Parse a Hinglish or native speech field memo to generate automated contracts or storage logs.
              </Card>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Compliance;
