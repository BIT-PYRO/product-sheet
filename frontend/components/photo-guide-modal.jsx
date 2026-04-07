"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Printer, X, ImageOff } from "lucide-react"

export default function PhotoGuideModal({ open, onOpenChange, jobId, voucherNo = "" }) {
  // Each entry: { sku, category, metal, issued_qty, unit, images }
  const [skuData, setSkuData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch all SKU+image data in one call when the modal opens
  useEffect(() => {
    if (!open || !jobId) return

    setLoading(true)
    setError(null)
    setSkuData([])

    fetch(`/frontend/api/jobs/${jobId}/photo-guide/`)
      .then(r => r.json())
      .then(res => {
        if (res?.success && Array.isArray(res.data)) {
          setSkuData(res.data)
        } else {
          setError('Failed to load photo guide data.')
        }
      })
      .catch(() => setError('Network error loading photo guide.'))
      .finally(() => setLoading(false))
  }, [open, jobId])

  // Total issued qty (numeric sum where possible)
  const totalQty = skuData.reduce((sum, s) => {
    const n = parseFloat(s.issued_qty)
    return sum + (isNaN(n) ? 0 : n)
  }, 0)
  const totalUnit = skuData.length === 1 ? (skuData[0]?.unit || 'Pcs') : 'Pcs'

  function handlePrint() {
    const tableRows = skuData.map((s, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td class="img-cell">
          ${s.images && s.images.length > 0
            ? s.images.map(src => `<img src="${src}" alt="${s.sku}" />`).join('')
            : `<div class="no-img">No Image</div>`
          }
        </td>
        <td class="sku">${s.sku}</td>
        <td class="center qty">${s.issued_qty || '—'} <span class="unit">${s.unit}</span></td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Photo Guide – ${voucherNo}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 9.5px; color: #111;
           -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    .page-title { font-size: 14px; font-weight: 800; color: #1a56db; letter-spacing: 0.5px; margin-bottom: 3px; }
    .voucher-sub { font-size: 8.5px; color: #64748b; margin-bottom: 10px; }

    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    th { background: #1a56db; color: #fff; font-weight: 600; padding: 4px 6px;
         text-align: left; border: 1px solid #1e40af; }
    th.center { text-align: center; }
    td { padding: 3px 6px; border: 1px solid #d1d5db; vertical-align: middle; }
    td.center { text-align: center; }
    td.sku { font-weight: 700; color: #1e3a8a; }
    td.qty { font-weight: 700; }
    td.img-cell { padding: 3px; text-align: center; }
    td.img-cell img { width: 60px; height: 60px; object-fit: cover; border-radius: 2px; display: inline-block; margin: 1px; }
    .no-img { width: 66px; height: 66px; background: #f1f5f9; display: inline-flex;
              align-items: center; justify-content: center; font-size: 8px; color: #94a3b8;
              border-radius: 2px; }
    tr:nth-child(even) td { background: #f9fafb; }
    .unit { font-size: 8px; color: #94a3b8; }

    .total-row { margin-top: 10px; padding: 5px 10px; background: #eff6ff;
                 border: 1px solid #bfdbfe; border-radius: 3px;
                 display: flex; justify-content: space-between; align-items: center; }
    .total-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #1e40af; }
    .total-val { font-size: 13px; font-weight: 800; color: #1e3a8a; }
  </style>
</head>
<body>
  <div class="page-title">Photo Guide</div>
  <div class="voucher-sub">Voucher: ${voucherNo || '—'} &nbsp;·&nbsp; ${skuData.length} SKU(s)</div>
  <table>
    <thead>
      <tr>
        <th class="center" style="width:28px">#</th>
        <th class="center" style="width:78px">Image</th>
        <th>SKU</th>
        <th class="center" style="width:80px">Issued Qty</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="total-row">
    <span class="total-label">Total Issued Quantity</span>
    <span class="total-val">${totalQty} <span class="unit" style="font-size:9px;">${totalUnit}</span></span>
  </div>
  </div>
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
      <DialogContent className="max-w-[780px] w-[95vw] max-h-[90vh] overflow-y-auto bg-background text-foreground p-0 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Photo Guide</DialogTitle>

        {/* Header bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">Photo Guide</h2>
            {voucherNo && <p className="text-xs text-muted-foreground mt-0.5">Voucher: {voucherNo}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 h-7 rounded border border-trust-blue text-trust-blue text-sm font-semibold hover:bg-trust-blue/10 transition-colors"
              aria-label="Print photo guide"
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

        {/* SKU table */}
        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-trust-blue border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading photo guide…</span>
            </div>
          ) : error ? (
            <p className="text-sm text-destructive text-center py-8">{error}</p>
          ) : skuData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No SKUs found in this voucher.</p>
          ) : (
            <>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#1a56db] text-white text-xs">
                    <th className="border border-[#1e40af] px-2 py-1.5 text-center w-8">#</th>
                    <th className="border border-[#1e40af] px-2 py-1.5 text-center w-20">Image</th>
                    <th className="border border-[#1e40af] px-3 py-1.5 text-left">SKU</th>
                    <th className="border border-[#1e40af] px-3 py-1.5 text-center w-24">Issued Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {skuData.map((s, i) => (
                    <tr key={s.sku} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="border border-border px-2 py-1 text-center text-xs text-muted-foreground">{i + 1}</td>
                      <td className="border border-border p-1 text-center">
                        {s.images && s.images.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {s.images.map((imgSrc, imgIdx) => (
                              <img
                                key={imgIdx}
                                src={imgSrc}
                                alt={`${s.sku} ${imgIdx + 1}`}
                                className="w-16 h-16 object-cover rounded block"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded flex flex-col items-center justify-center gap-1 mx-auto">
                            <ImageOff className="h-5 w-5 text-muted-foreground" />
                            <span className="text-[9px] text-muted-foreground">No Image</span>
                          </div>
                        )}
                      </td>
                      <td className="border border-border px-3 py-1 font-bold text-trust-blue text-xs">{s.sku}</td>
                      <td className="border border-border px-3 py-1 text-center font-bold text-xs">
                        {s.issued_qty || '—'} <span className="text-[10px] font-normal text-muted-foreground">{s.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50">
                    <td colSpan={3} className="border border-blue-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-blue-800 text-right">Total Issued Quantity</td>
                    <td className="border border-blue-200 px-3 py-2 text-center font-extrabold text-blue-900">
                      {totalQty} <span className="text-[10px] font-normal text-blue-600">{totalUnit}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
