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
      <DialogContent className="max-w-[900px] max-h-[88vh] overflow-y-auto bg-white text-midnight-ink p-0 gap-0 [&>button]:hidden print:max-w-full print:max-h-full">
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
            className="text-cool-gray hover:text-cool-gray"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-1 voucherContainer">
          {/* Header with Date/Schedule on Left, Voucher Type/No on Right */}
          <table className="w-full border border-soft-border">
            <tbody>
              <tr className="bg-midnight-ink text-white">
                <td className="border-r border-soft-border px-3 py-1.5 text-sm font-bold w-1/4">DATE</td>
                <td className="border-r border-soft-border px-3 py-1.5 text-sm font-bold w-1/4">SCHEDULE FOR FUTURE</td>
                <td className="border-r border-soft-border px-3 py-1.5 text-sm font-bold w-1/4">VOUCHER TYPE</td>
                <td className="px-3 py-1.5 text-sm font-bold w-1/4">VOUCHER NO.</td>
              </tr>
              <tr className="bg-white">
                <td className="border-r border-soft-border px-3 py-1.5 text-sm font-semibold">{data.date}</td>
                <td className="border-r border-soft-border px-3 py-1.5 text-sm">—</td>
                <td className="border-r border-soft-border px-3 py-1.5 text-sm">New</td>
                <td className="px-3 py-1.5 text-sm font-semibold">{data.voucherNo}</td>
              </tr>
            </tbody>
          </table>

          {/* Issued To & Department */}
          <table className="w-full border border-soft-border border-t-0">
            <tbody>
              <tr className="bg-midnight-ink text-white">
                <td className="border-r border-soft-border px-3 py-1.5 text-sm font-bold w-1/2">ISSUED TO</td>
                <td className="px-3 py-1.5 text-sm font-bold w-1/2">DEPARTMENT</td>
              </tr>
              <tr className="bg-white">
                <td className="border-r border-soft-border px-3 py-1.5 text-sm">{data.issuedTo}</td>
                <td className="px-3 py-1.5 text-sm">{data.department}</td>
              </tr>
            </tbody>
          </table>

          {/* SKU Table */}
          <table className="w-full border border-soft-border border-t-0">
            <thead>
              <tr className="bg-midnight-ink text-white">
                <th className="border-r border-soft-border px-3 py-1.5 text-sm font-bold text-left">SKU</th>
                <th className="border-r border-soft-border px-3 py-1.5 text-sm font-bold text-left">CATEGORY</th>
                <th className="border-r border-soft-border px-3 py-1.5 text-sm font-bold text-left">ISSUED QTY</th>
                <th className="border-r border-soft-border px-3 py-1.5 text-sm font-bold text-left">UNIT</th>
                <th className="border-r border-soft-border px-3 py-1.5 text-sm font-bold text-left">ISSUED WEIGHT</th>
                <th className="px-3 py-1.5 text-sm font-bold text-left">UNIT</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-cloud-gray"}>
                  <td className="border-r border-soft-border px-3 py-1 text-sm">{row.sku}</td>
                  <td className="border-r border-soft-border px-3 py-1 text-sm">Category</td>
                  <td className="border-r border-soft-border px-3 py-1 text-sm text-center">{row.qty}</td>
                  <td className="border-r border-soft-border px-3 py-1 text-sm text-center">Pcs</td>
                  <td className="border-r border-soft-border px-3 py-1 text-sm text-right">{row.weight}</td>
                  <td className="px-3 py-1 text-sm text-center">Kg</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Stones / Findings Reference */}
          {((Array.isArray(data.stoneRows) && data.stoneRows.some(r => r.variety || r.qty || r.shape)) || 
            (Array.isArray(data.die_weight_rows) && data.die_weight_rows.some(r => r.finding_code || r.quantity))) && (
            <div className="flex flex-col gap-3 mt-3">
              {/* Stones Table */}
              {Array.isArray(data.stoneRows) && data.stoneRows.some(r => r.variety || r.qty || r.shape) && (
                <div className="rounded-md overflow-hidden border border-amber-400/40">
                  <div className="px-2.5 py-1.5 bg-amber-50 border-b border-amber-400/40">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                      Stones Needed
                    </p>
                  </div>
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-amber-600 text-white font-bold uppercase tracking-wider">
                        {['Variety', 'Color', 'Cut', 'Shape', 'L', 'W', 'H', 'Qty', 'Master SKUs'].map(h => (
                          <th key={h} className="px-2 py-1 text-left font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.stoneRows.filter(r => r.variety || r.qty || r.shape).map((sr, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}>
                          <td className="px-2 py-0.5 border-t border-amber-100">{sr.variety || '—'}</td>
                          <td className="px-2 py-0.5 border-t border-amber-100">{sr.color || '—'}</td>
                          <td className="px-2 py-0.5 border-t border-amber-100">{sr.cut || '—'}</td>
                          <td className="px-2 py-0.5 border-t border-amber-100">{sr.shape || '—'}</td>
                          <td className="px-2 py-0.5 border-t border-amber-100">{sr.length || '—'}</td>
                          <td className="px-2 py-0.5 border-t border-amber-100">{sr.width || '—'}</td>
                          <td className="px-2 py-0.5 border-t border-amber-100">{sr.height || '—'}</td>
                          <td className="px-2 py-0.5 border-t border-amber-100 font-semibold">{sr.qty ?? '—'}</td>
                          <td className="px-2 py-0.5 border-t border-amber-100">
                            {Array.isArray(sr.master_sku_breakdown) && sr.master_sku_breakdown.length > 0
                              ? sr.master_sku_breakdown.map((b, bi) => (
                                  <span key={bi} className="mr-1 font-semibold">{b.master_sku}[{Math.round((b.qty || 0) * 100) / 100}]</span>
                                ))
                              : '—'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Findings Table */}
              {Array.isArray(data.die_weight_rows) && data.die_weight_rows.some(r => r.finding_code || r.quantity) && (
                <div className="rounded-md overflow-hidden border border-violet-400/40">
                  <div className="px-2.5 py-1.5 bg-violet-50 border-b border-violet-400/40">
                    <p className="text-xs font-bold text-violet-700 uppercase tracking-wide">
                      Findings Needed
                    </p>
                  </div>
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-violet-600 text-white font-bold uppercase tracking-wider">
                        {['Finding Code', 'Location', 'Qty', 'Master SKUs'].map(h => (
                          <th key={h} className="px-2 py-1 text-left font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.die_weight_rows.filter(r => r.finding_code || r.quantity).map((fr, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-violet-50/30'}>
                          <td className="px-2 py-0.5 border-t border-violet-100 font-semibold text-violet-950">{fr.finding_code || '—'}</td>
                          <td className="px-2 py-0.5 border-t border-violet-100">{fr.location || '—'}</td>
                          <td className="px-2 py-0.5 border-t border-violet-100 font-bold">{fr.quantity ?? '—'}</td>
                          <td className="px-2 py-0.5 border-t border-violet-100">
                            {Array.isArray(fr.master_sku_breakdown) && fr.master_sku_breakdown.length > 0
                              ? fr.master_sku_breakdown.map((b, bi) => (
                                  <span key={bi} className="mr-1 font-semibold">{b.master_sku}[{Math.round((b.qty || 0) * 100) / 100}]</span>
                                ))
                              : '—'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 mt-3 print-hide">
            <Button
              variant="outline"
              className="h-11 font-semibold text-slate-text border-soft-border text-base"
              onClick={handlePrint}
            >
              <Printer className="mr-1 h-3.5 w-3.5" />
              Print
            </Button>
            <Button
              className="h-11 bg-midnight-ink hover:bg-midnight-ink/90 text-white font-semibold text-base"
              onClick={() => alert("PDF download feature coming soon")}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Download
            </Button>
            <Button
              variant="outline"
              className="h-11 font-semibold text-slate-text border-soft-border text-base"
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
