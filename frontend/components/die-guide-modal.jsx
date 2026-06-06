"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Printer, X } from "lucide-react"

export default function DieGuideModal({ open, onOpenChange, jobId, voucherNo = "" }) {
  // Each entry: { die_code, image, location, quantity }
  const [dies, setDies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !jobId) return

    setLoading(true)
    setError(null)
    setDies([])

    fetch(`/frontend/api/jobs/${jobId}/die-guide/`)
      .then(r => r.json())
      .then(res => {
        if (res?.success && Array.isArray(res.data)) {
          setDies(res.data)
        } else {
          setError('Failed to load die guide data.')
        }
      })
      .catch(() => setError('Network error loading die guide.'))
      .finally(() => setLoading(false))
  }, [open, jobId])

  function handlePrint() {
    const tableRows = dies.map((d, i) => {
      let imgs = [];
      if (d.images && d.images.length > 0) {
        imgs = d.images;
      } else if (d.image) {
        if (d.image.startsWith('[')) {
          try { imgs = JSON.parse(d.image); } catch(e) { imgs = [d.image]; }
        } else if (d.image.includes(',')) {
          imgs = d.image.split(',').map(s => s.trim()).filter(Boolean);
        } else {
          imgs = [d.image];
        }
      }
      const imgsHtml = imgs.length > 0
        ? `<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;">` +
          imgs.map(src => `<img src="${src}" style="height:48px;width:48px;object-fit:contain;border:1px solid #e2e8f0;border-radius:4px;" />`).join('') +
          `</div>`
        : '—';

      return `
        <tr>
          <td class="die-code">${d.die_code || '—'}</td>
          <td class="center">${imgsHtml}</td>
          <td class="center">${d.location || '—'}</td>
          <td class="center">${d.qty_needed != null ? d.qty_needed : '—'}</td>
        </tr>
      `;
    }).join('')

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
    td.die-code { font-weight: 700; color: #92400e; }
    tr:nth-child(even) td { background: #fefce8; }
    img { display: block; margin: auto; }
  </style>
</head>
<body>
  <div class="page-title">Die Guide</div>
  <div class="voucher-sub">Voucher: ${voucherNo || '—'} &nbsp;·&nbsp; ${dies.length} die(s)</div>
  <table>
    <thead>
      <tr>
        <th>Die Code</th>
        <th class="center" style="width:64px">Die Image</th>
        <th class="center">Location</th>
        <th class="center" style="width:70px">Qty Needed</th>
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
          ) : dies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No dies found for the products in this voucher.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-amber-600 text-white text-xs">
                  <th className="border border-amber-700 px-3 py-1.5 text-left">Die Code</th>
                  <th className="border border-amber-700 px-3 py-1.5 text-center w-16">Die Image</th>
                  <th className="border border-amber-700 px-3 py-1.5 text-center w-40">Location</th>
                  <th className="border border-amber-700 px-3 py-1.5 text-center w-24">Qty Needed</th>
                </tr>
              </thead>
              <tbody>
                {dies.map((d, i) => (
                  <tr key={d.die_code || i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                    <td className="border border-border px-3 py-1.5 font-bold text-amber-800 text-xs">
                      {d.die_code || <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="border border-border px-1.5 py-1 text-center align-middle">
                      {(() => {
                        let imgs = [];
                        if (d.images && d.images.length > 0) {
                          imgs = d.images;
                        } else if (d.image) {
                          if (d.image.startsWith('[')) {
                            try { imgs = JSON.parse(d.image); } catch(e) { imgs = [d.image]; }
                          } else if (d.image.includes(',')) {
                            imgs = d.image.split(',').map(s => s.trim()).filter(Boolean);
                          } else {
                            imgs = [d.image];
                          }
                        }
                        if (imgs.length === 0) {
                          return <span className="text-muted-foreground/40 text-xs">—</span>;
                        }
                        return (
                          <div className="flex flex-wrap gap-1 justify-center max-w-[120px] mx-auto">
                            {imgs.map((src, idx) => (
                              <img key={idx} src={src} alt={`${d.die_code} img ${idx + 1}`} className="h-12 w-12 object-contain rounded border border-amber-100 shadow-sm" />
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="border border-border px-3 py-1.5 text-center text-xs text-foreground">
                      {d.location || <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="border border-border px-3 py-1.5 text-center text-xs font-semibold">
                      {d.qty_needed != null ? d.qty_needed : <span className="text-muted-foreground/40">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
