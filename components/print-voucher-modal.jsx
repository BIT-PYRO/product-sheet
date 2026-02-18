"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Printer, Download, Pencil, X } from "lucide-react"

export function PrintVoucherModal({ open, onOpenChange, onEdit, onOpenReceiveModal, data }) {
  if (!data) return null

  function handlePrint() {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[88vh] overflow-y-auto bg-white text-slate-900 p-0 gap-0 [&>button]:hidden print:max-w-full print:max-h-full">
        <style>{`
          @media print {
            .print-hide { display: none !important; }
          }
        `}</style>
        <DialogTitle className="sr-only">Print Voucher</DialogTitle>
        {/* Close Button */}
        <div className="flex justify-end px-5 pt-3 pb-2 print-hide">
          <button
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-1 voucherContainer">
          {/* Header with Date/Schedule on Left, Voucher Type/No on Right */}
          <table className="w-full border border-slate-300">
            <tbody>
              <tr className="bg-slate-900 text-white">
                <td className="border-r border-slate-300 px-3 py-1.5 text-xs font-bold w-1/4">DATE</td>
                <td className="border-r border-slate-300 px-3 py-1.5 text-xs font-bold w-1/4">SCHEDULE FOR FUTURE</td>
                <td className="border-r border-slate-300 px-3 py-1.5 text-xs font-bold w-1/4">VOUCHER TYPE</td>
                <td className="px-3 py-1.5 text-xs font-bold w-1/4">VOUCHER NO.</td>
              </tr>
              <tr className="bg-white">
                <td className="border-r border-slate-300 px-3 py-1.5 text-sm font-semibold">{data.date}</td>
                <td className="border-r border-slate-300 px-3 py-1.5 text-sm">—</td>
                <td className="border-r border-slate-300 px-3 py-1.5 text-sm">New</td>
                <td className="px-3 py-1.5 text-sm font-semibold">{data.voucherNo}</td>
              </tr>
            </tbody>
          </table>

          {/* Issued To & Department */}
          <table className="w-full border border-slate-300 border-t-0">
            <tbody>
              <tr className="bg-slate-900 text-white">
                <td className="border-r border-slate-300 px-3 py-1.5 text-xs font-bold w-1/2">ISSUED TO</td>
                <td className="px-3 py-1.5 text-xs font-bold w-1/2">DEPARTMENT</td>
              </tr>
              <tr className="bg-white">
                <td className="border-r border-slate-300 px-3 py-1.5 text-sm">{data.issuedTo}</td>
                <td className="px-3 py-1.5 text-sm">{data.department}</td>
              </tr>
            </tbody>
          </table>

          {/* SKU Table */}
          <table className="w-full border border-slate-300 border-t-0">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="border-r border-slate-300 px-3 py-1.5 text-xs font-bold text-left">SKU</th>
                <th className="border-r border-slate-300 px-3 py-1.5 text-xs font-bold text-left">CATEGORY</th>
                <th className="border-r border-slate-300 px-3 py-1.5 text-xs font-bold text-left">ISSUED QTY</th>
                <th className="border-r border-slate-300 px-3 py-1.5 text-xs font-bold text-left">UNIT</th>
                <th className="border-r border-slate-300 px-3 py-1.5 text-xs font-bold text-left">ISSUED WEIGHT</th>
                <th className="px-3 py-1.5 text-xs font-bold text-left">UNIT</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="border-r border-slate-300 px-3 py-1 text-sm">{row.sku}</td>
                  <td className="border-r border-slate-300 px-3 py-1 text-sm">Category</td>
                  <td className="border-r border-slate-300 px-3 py-1 text-sm text-center">{row.qty}</td>
                  <td className="border-r border-slate-300 px-3 py-1 text-sm text-center">Pcs</td>
                  <td className="border-r border-slate-300 px-3 py-1 text-sm text-right">{row.weight}</td>
                  <td className="px-3 py-1 text-sm text-center">Kg</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 mt-3 print-hide">
            <Button
              variant="outline"
              className="h-8 font-semibold text-slate-700 border-slate-300 text-xs"
              onClick={handlePrint}
            >
              <Printer className="mr-1 h-3.5 w-3.5" />
              Print
            </Button>
            <Button
              className="h-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
              onClick={() => alert("PDF download feature coming soon")}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Download
            </Button>
            <Button
              variant="outline"
              className="h-8 font-semibold text-slate-700 border-slate-300 text-xs"
              onClick={() => onOpenChange(false)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Exit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
