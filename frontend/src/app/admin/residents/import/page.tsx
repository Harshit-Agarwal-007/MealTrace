"use client";
import { ArrowLeft, UploadCloud, FileSpreadsheet, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function AdminResidentImport() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<null | any>(null);

  const handleDrag = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="p-6 pt-8 pb-24 animate-in fade-in duration-500 space-y-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
         <Link href="/admin/residents" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Residents
         </Link>
         {file && (
            <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform shadow-md shadow-blue-500/20">
               Process CSV
            </button>
         )}
      </div>

      <h1 className="text-2xl font-bold text-slate-900">Bulk Import</h1>
      <p className="text-slate-500 text-sm">Upload a CSV file containing resident data to bulk provision accounts.</p>

      {/* Drag & Drop Zone */}
      <div 
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        className={`mt-8 border-2 border-dashed rounded-[32px] p-12 flex flex-col items-center justify-center text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50'}`}
      >
         {file ? (
            <div className="flex flex-col items-center animate-in zoom-in duration-300">
               <FileSpreadsheet className="w-16 h-16 text-emerald-500 mb-4" />
               <h3 className="text-lg font-bold text-slate-900">{file.name}</h3>
               <p className="text-slate-500 text-sm mt-1">{Math.round(file.size / 1024)} KB</p>
               <button onClick={() => setFile(null)} className="text-red-500 text-sm font-bold hover:text-red-600 mt-4 underline">Remove file</button>
            </div>
         ) : (
            <>
               <UploadCloud className={`w-16 h-16 mb-4 ${dragActive ? 'text-blue-500 animate-bounce' : 'text-slate-300'}`} />
               <h3 className="text-lg font-bold text-slate-900 mb-1">Upload CSV Document</h3>
               <p className="text-slate-500 text-xs max-w-[200px]">Drag and drop your file here or click to browse</p>
               <input type="file" accept=".csv" className="hidden" id="file-upload" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
               <label htmlFor="file-upload" className="mt-6 bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                  Browse Files
               </label>
            </>
         )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-[24px] p-5 flex gap-3 items-start mt-6">
         <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
         <div>
            <h4 className="font-bold text-amber-900 text-sm">Required CSV Columns</h4>
            <p className="text-amber-700 text-xs mt-1 leading-relaxed">Your file must include <code>name</code>, <code>email</code>, <code>phone</code>, and <code>plan_id</code>. Invalid fields will be skipped during processing.</p>
         </div>
      </div>
    </div>
  )
}
