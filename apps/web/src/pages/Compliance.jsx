import React, { useState } from 'react';
import { useStore } from '../store';

// UI components
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Compliance = () => {
  const { isLoading, setIsLoading } = useStore();
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractData, setExtractData] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setExtractData(null);
      toast.success(`Invoice loaded: ${file.name}`);
    }
  };

  const handleExtract = () => {
    setIsLoading(true);
    setExtractData(null);

    // Simulate 2 seconds of document OCR parsing
    setTimeout(() => {
      setIsLoading(false);
      setExtractData({
        invoiceNum: "INV-2026-08421",
        sellerGst: "27AAPCS1234M1Z5",
        buyerGst: "24BBBCS4321N2Y6",
        commodity: "Cotton (Raw)",
        hsnCode: "5201",
        quantity: "40 Quintals",
        value: "₹2,72,800",
        tax: "₹4,910.40",
        ewayRequired: "Yes"
      });
      toast.success("Invoice fields extracted!");
    }, 2000);
  };

  const handleExport = () => {
    toast.success("Structured JSON exported to download folder", { icon: '📊' });
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-700">
      
      {/* PageHeader */}
      <PageHeader 
        title="Compliance Assistant" 
        subtitle="Extract invoice metadata and verify APMC permit regulations."
      />

      {/* DEMO NOTE BANNER */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-xs text-amber-800 font-semibold leading-relaxed">
          <span className="block font-bold">Demo Sandbox Mode</span>
          <p className="font-medium text-amber-700">
            Upload any mock document to simulate OCR data parsing. Live API sync with government portals is disabled.
          </p>
        </div>
      </div>

      {/* UPLOAD SECTION */}
      <Card className="p-8 text-center max-w-2xl mx-auto border-dashed border-2 flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-full bg-slate-50 border text-slate-400">
          <Upload className="w-8 h-8" />
        </div>

        <div className="space-y-1 text-xs">
          <span className="text-sm font-bold text-slate-800 block">
            {selectedFile ? selectedFile.name : 'Drop your invoice or e-way bill PDF here'}
          </span>
          <p className="text-slate-400 font-semibold">
            {selectedFile ? `${Math.round(selectedFile.size / 102.4) / 10} KB` : 'or click to browse from folder'}
          </p>
        </div>

        <input 
          type="file" 
          id="invoiceUpload"
          className="hidden" 
          accept=".pdf,.jpg,.png"
          onChange={handleFileChange}
        />
        
        <div className="flex gap-3">
          <label 
            htmlFor="invoiceUpload"
            className="px-4 py-2 border rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer select-none text-slate-700 transition-colors"
            style={{ borderColor: 'var(--border)' }}
          >
            Select Document
          </label>

          {selectedFile && (
            <Button variant="primary" size="sm" onClick={handleExtract} loading={isLoading}>
              Extract Data
            </Button>
          )}
        </div>

        <span className="text-[10px] text-slate-400 font-bold block">
          Supported file formats: PDF, JPG, PNG up to 10MB
        </span>
      </Card>

      {/* EXTRACTION RESULT */}
      {extractData && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 animate-slide-up">
          
          {/* Left: Extracted fields table */}
          <div className="md:col-span-3">
            <Card className="overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Extracted Fields
                </h3>
                <span className="text-[10px] text-emerald-600 font-bold">100% OCR Match</span>
              </div>
              <div className="divide-y text-xs font-semibold text-slate-700" style={{ borderColor: 'var(--border)' }}>
                {[
                  { label: "Invoice Number", val: extractData.invoiceNum },
                  { label: "GSTIN (Seller)", val: extractData.sellerGst },
                  { label: "GSTIN (Buyer)", val: extractData.buyerGst },
                  { label: "Commodity type", val: extractData.commodity },
                  { label: "HSN Code", val: extractData.hsnCode },
                  { label: "Quantity", val: extractData.quantity },
                  { label: "Invoice Value", val: extractData.value },
                  { label: "Tax Amount", val: extractData.tax },
                  { label: "E-way Bill Required", val: extractData.ewayRequired }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between p-3">
                    <span className="text-slate-400 font-bold">{item.label}</span>
                    <span className="text-slate-900 font-extrabold">{item.val}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right: Rules checklist verification */}
          <div className="md:col-span-2 space-y-6">
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Compliance Verification Status
              </h3>
              
              <div className="space-y-3 text-xs font-bold text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>GSTIN format valid</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>HSN code found (5201 — Raw Cotton)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Invoice value matches line items</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>E-way bill required for &gt;50km transport</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tax calculation matches statutory rate</span>
                </div>
              </div>

              <div className="pt-4 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Compliance Score</span>
                <span className="text-3xl font-extrabold text-emerald-600 font-display">94%</span>
              </div>
            </Card>

            <Button variant="primary" size="md" className="w-full font-bold" onClick={handleExport}>
              <FileSpreadsheet className="w-4.5 h-4.5 mr-2" />
              Export Structured Data
            </Button>
          </div>

        </div>
      )}

    </div>
  );
};

export default Compliance;
