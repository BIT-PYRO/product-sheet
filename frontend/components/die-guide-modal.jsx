"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Printer, X } from "lucide-react"

export default function DieGuideModal({ open, onOpenChange, jobId, voucherNo = "" }) {
  // Each entry: { sku, in_job, die_numbers: [{ value, quantity, location }] }
  const [skuData, setSkuData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !jobId) return

    setLoading(true)
    setError(null)
    setSkuData([])

    fetch(`/frontend/api/jobs/${jobId}/die-guide/`)
      .then(r => r.json())
      .then(res => {
        if (res?.success && Array.isArray(res.data)) {
          setSkuData(res.data)
        } else {
          setError('Failed to load die guide data.')
        }
      })
      .catch(() => setError('Network error loading die guide.'))
      .finally(() => setLoading(false))
  }, [open, jobId])

  const totalDies = skuData.reduce((sum, s) => sum + (s.die_numbers?.length || 0), 0)

  function handlePrint() {
    const tableRows = skuData.flatMap((s) =>
      s.die_numbers.length > 0
        ? s.die_numbers.map((d, di) => `
            <tr>
              ${di === 0 ? `<td class="sku" rowspan="${s.die_numbers.length}">${s.sku}</td>` : ''}
              <td class="center">${d.value || '—'}</td>
              <td class="center">${d.location || '—'}</td>
              <td class="center">${d.quantity || '—'}</td>
            </tr>
          `)
        : [`<tr>
              <td class="sku">${s.sku}</td>
              <td colspan="3" class="center" style="color:#94a3b8;font-style:italic;">No die numbers recorded</td>
            </tr>`]
    ).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Die Guide – ${voucherNo}</title>
  <style>
    @page { size: A4; margin: 12mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 9.5px; color: #111;
           -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-title { font-size: 14px; font-weight: 800; color: #d97706; letter-spacing: 0.5px; margin-bottom: 3px; }
    .voucher-sub { font-size: 8.5px; color: #64748b; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    th { background: #d97706; color: #fff; font-weight: 600; padding: 5px 6px;
         text-align: left; border: 1px solid #b45309; white-space: nowrap; }
    th.center { text-align: center; }
    td { padding: 4px 6px; border: 1px solid #d1d5db; vertical-align: middle; }
    td.center { text-align: center; }
    td.sku { font-weight: 700; color: #92400e; }
    tr:nth-child(even) td { background: #fefce8; }
  </style>
</head>
<body>
  <div class="page-title">Die Guide</div>
  <div class="voucher-sub">Voucher: ${voucherNo || '—'} &nbsp;·&nbsp; ${skuData.length} SKU(s) · ${totalDies} die number(s)</div>
  <table>
    <thead>
      <tr>
        <th>Master SKU</th>
        <th class="center">Die Number</th>
        <th class="center">Location</th>
        <th class="center" style="width:70px">Quantity</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups for this site to print.')
      return
    }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
      win.addEventListener('afterprint', () => win.close())
    }, 400)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-background text-foreground p-0 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Die Guide</DialogTitle>

        {/* Header bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">Die Guide</h2>
            {voucherNo && <p className="text-xs text-muted-foreground mt-0.5">Voucher: {voucherNo}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 h-7 rounded border border-amber-500 text-amber-600 text-sm font-semibold hover:bg-amber-50 transition-colors"
              aria-label="Print die guide"
              type="button"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading die guide…</span>
            </div>
          ) : error ? (
            <p className="text-sm text-destructive text-center py-8">{error}</p>
          ) : skuData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No products with die numbers found.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-amber-600 text-white text-xs">
                  <th className="border border-amber-700 px-3 py-1.5 text-left">Master SKU</th>
                  <th className="border border-amber-700 px-3 py-1.5 text-center w-40">Die Number</th>
                  <th className="border border-amber-700 px-3 py-1.5 text-center w-40">Location</th>
                  <th className="border border-amber-700 px-3 py-1.5 text-center w-24">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {skuData.map((s, si) =>
                  s.die_numbers.length > 0 ? (
                    s.die_numbers.map((d, di) => (
                      <tr key={`${s.sku}-${di}`} className={si % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        {di === 0 && (
                          <td
                            className="border border-border px-3 py-1.5 font-bold text-amber-800 text-xs align-middle"
                            rowSpan={s.die_numbers.length}
                          >
                            {s.sku}
                          </td>
                        )}
                        <td className="border border-border px-3 py-1.5 text-center text-xs font-semibold">
                          {d.value || <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="border border-border px-3 py-1.5 text-center text-xs text-gray-700">
                          {d.location || <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="border border-border px-3 py-1.5 text-center text-xs">
                          {d.quantity || <span className="text-muted-foreground/40">—</span>}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr key={s.sku} className={si % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="border border-border px-3 py-1.5 font-bold text-amber-800 text-xs">{s.sku}</td>
                      <td colSpan={3} className="border border-border px-3 py-1.5 text-center text-xs text-muted-foreground italic">
                        No die numbers recorded
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
