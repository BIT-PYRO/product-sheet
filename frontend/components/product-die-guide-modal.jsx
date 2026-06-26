"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Printer, X, Layers, Image as ImageIcon } from "lucide-react"

export default function ProductDieGuideModal({ open, onOpenChange, jobId, voucherNo = "" }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !jobId) return

    setLoading(true)
    setError(null)
    setData([])

    fetch(`/frontend/api/jobs/${jobId}/product-die-guide/`)
      .then(r => r.json())
      .then(res => {
        if (res?.success && Array.isArray(res.data)) {
          setData(res.data)
        } else {
          setError('Failed to load guide data.')
        }
      })
      .catch(() => setError('Network error loading guide.'))
      .finally(() => setLoading(false))
  }, [open, jobId])

  function handlePrint() {
    const groupsHtml = data.map((group) => {
      // Resolve Master SKU images
      const masterImgsHtml = group.images && group.images.length > 0
        ? `<div class="image-gallery">` +
          group.images.map(src => `<img src="${src}" class="master-thumb-img" />`).join('') +
          `</div>`
        : '<div class="no-photo">No Master SKU Photo</div>';

      // Resolve Die SKU rows
      const dieRows = group.dies && group.dies.length > 0
        ? group.dies.map(d => {
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
              ? `<div class="die-gallery">` +
                imgs.map(src => `<img src="${src}" class="die-thumb-img" />`).join('') +
                `</div>`
              : '—';

            return `
              <tr>
                <td class="die-code">${d.die_code || '—'}</td>
                <td class="center">${imgsHtml}</td>
                <td class="center">${d.location || '—'}</td>
                <td class="center">${d.wax_setting_location || '—'}</td>
                <td class="center">${d.wax_piece_location || '—'}</td>
                <td class="center">${d.casting_location || '—'}</td>
                <td class="center font-medium">${d.qty_per_piece != null ? d.qty_per_piece : '—'}</td>
                <td class="center font-bold text-amber-800 bg-amber-50">${d.qty_needed != null ? d.qty_needed : '—'}</td>
              </tr>
            `;
          }).join('')
        : `<tr><td colspan="8" class="center text-muted">No related dies defined for this product.</td></tr>`;

      return `
        <div class="master-group">
          <div class="master-header">
            <div class="master-sku">${group.master_sku || '—'}</div>
            <div class="master-meta">
              <div class="meta-item"><strong>Qty Needed:</strong> <span>${group.quantity}</span></div>
              <div class="meta-item"><strong>Stock Location:</strong> <span>${group.location || '—'}</span></div>
            </div>
          </div>
          <div class="master-body">
            <div class="master-photo-section">
              <div class="section-title">Master SKU Photos</div>
              ${masterImgsHtml}
            </div>
            <div class="dies-section">
              <div class="section-title">Related Die SKUs & Quantities</div>
              <table>
                <thead>
                  <tr>
                    <th>Die Code</th>
                    <th class="center" style="width:70px">Die Image</th>
                    <th class="center">Die Location</th>
                    <th class="center">Wax Setting Loc</th>
                    <th class="center">Wax Piece Loc</th>
                    <th class="center">Casting Loc</th>
                    <th class="center" style="width:70px">Qty / Piece</th>
                    <th class="center" style="width:80px">Total Qty</th>
                  </tr>
                </thead>
                <tbody>
                  ${dieRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Product Die Guide – ${voucherNo}</title>
  <style>
    @page { size: A4; margin: 12mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #1e293b;
           -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
    .page-title { font-size: 16px; font-weight: 800; color: #b45309; letter-spacing: 0.5px; margin-bottom: 3px; }
    .voucher-sub { font-size: 9px; color: #64748b; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    
    .master-group {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 20px;
      page-break-inside: avoid;
      background: #fff;
    }
    .master-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #d97706;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }
    .master-sku {
      font-size: 13px;
      font-weight: 800;
      color: #92400e;
    }
    .master-meta {
      display: flex;
      gap: 16px;
      font-size: 10px;
    }
    .meta-item strong {
      color: #475569;
    }
    .meta-item span {
      font-weight: 700;
      color: #0f172a;
    }
    
    .master-body {
      display: flex;
      gap: 12px;
    }
    .master-photo-section {
      width: 130px;
      flex-shrink: 0;
      border-right: 1px dashed #e2e8f0;
      padding-right: 12px;
    }
    .dies-section {
      flex-grow: 1;
    }
    
    .section-title {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    
    .image-gallery {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .master-thumb-img {
      height: 52px;
      width: 52px;
      object-fit: contain;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }
    .no-photo {
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px dashed #cbd5e1;
      border-radius: 4px;
      color: #94a3b8;
      font-size: 8px;
      text-align: center;
      background: #f8fafc;
    }
    
    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; padding: 4px 6px;
         text-align: left; border: 1px solid #cbd5e1; white-space: nowrap; font-size: 8px; }
    th.center { text-align: center; }
    td { padding: 4px 6px; border: 1px solid #e2e8f0; vertical-align: middle; }
    td.center { text-align: center; }
    td.die-code { font-weight: 700; color: #b45309; }
    td.font-medium { font-weight: 600; }
    td.font-bold { font-weight: 700; }
    td.text-amber-800 { color: #92400e; }
    td.bg-amber-50 { background: #fffbeb !important; }
    tr:nth-child(even) td { background: #f8fafc; }
    
    .die-gallery {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
      justify-content: center;
    }
    .die-thumb-img {
      height: 28px;
      width: 28px;
      object-fit: contain;
      border: 1px solid #cbd5e1;
      border-radius: 2px;
    }
    .text-muted {
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="page-title">Product Die Guide</div>
  <div class="voucher-sub">Voucher: ${voucherNo || '—'} &nbsp;·&nbsp; ${data.length} Master SKU(s)</div>
  ${groupsHtml}
</body>
</html>`

    const win = window.open('', '_blank', 'width=950,height=720')
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
      <DialogContent className="max-w-4xl w-[96vw] max-h-[90vh] overflow-y-auto bg-background text-foreground p-0 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Product Die Guide</DialogTitle>

        {/* Header bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-500" />
              Product Die Guide
            </h2>
            {voucherNo && <p className="text-xs text-muted-foreground mt-0.5">Voucher: {voucherNo}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 h-7 rounded border border-amber-500 text-amber-600 text-sm font-semibold hover:bg-amber-50 transition-colors"
              aria-label="Print guide"
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
        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading guide data…</span>
            </div>
          ) : error ? (
            <p className="text-sm text-destructive text-center py-8">{error}</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No products found for this voucher.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {data.map((group, index) => (
                <div key={group.master_sku || index} className="border border-border rounded-lg bg-card text-card-foreground shadow-sm overflow-hidden">
                  {/* Master SKU header */}
                  <div className="bg-muted/50 px-4 py-3 border-b border-border flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Master SKU
                      </span>
                      <span className="text-base font-extrabold text-foreground tracking-tight">
                        {group.master_sku || <span className="text-muted-foreground/40">—</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                      <div>
                        Qty Needed: <span className="font-bold text-foreground">{group.quantity}</span>
                      </div>
                      <div>
                        Stock Location: <span className="font-bold text-foreground">{group.location || <span className="text-muted-foreground/30">—</span>}</span>
                      </div>
                    </div>
                  </div>

                  {/* Master SKU layout */}
                  <div className="p-4 flex flex-col md:flex-row gap-4">
                    {/* Master SKU images */}
                    <div className="w-full md:w-36 flex-shrink-0 md:border-r border-border md:pr-4">
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        Master SKU Photos
                      </span>
                      {group.images && group.images.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {group.images.map((src, idx) => (
                            <img
                              key={idx}
                              src={src}
                              alt={`${group.master_sku} img ${idx + 1}`}
                              className="h-16 w-16 object-contain rounded border border-border bg-background"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-3 border border-dashed border-border rounded bg-muted/20 text-muted-foreground h-16 w-16">
                          <ImageIcon className="h-5 w-5 opacity-40" />
                          <span className="text-[8px] mt-1">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Related Die SKUs table */}
                    <div className="flex-grow overflow-x-auto">
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        Related Die SKUs & Quantities
                      </span>
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="bg-amber-600/10 text-amber-800 text-left border-b border-amber-600/20">
                            <th className="px-3 py-2 font-bold">Die Code</th>
                            <th className="px-3 py-2 font-bold text-center w-16">Die Image</th>
                            <th className="px-3 py-2 font-bold text-center">Die Location</th>
                            <th className="px-3 py-2 font-bold text-center">Wax Setting Loc</th>
                            <th className="px-3 py-2 font-bold text-center">Wax Piece Loc</th>
                            <th className="px-3 py-2 font-bold text-center">Casting Loc</th>
                            <th className="px-3 py-2 font-bold text-center w-24">Qty / Piece</th>
                            <th className="px-3 py-2 font-bold text-center w-24 bg-amber-600/10">Total Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.dies && group.dies.length > 0 ? (
                            group.dies.map((d, i) => (
                              <tr key={d.die_code || i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                <td className="px-3 py-2 font-bold text-amber-700">
                                  {d.die_code || <span className="text-muted-foreground/40">—</span>}
                                </td>
                                <td className="px-1.5 py-1 text-center align-middle">
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
                                          <img
                                            key={idx}
                                            src={src}
                                            alt={`${d.die_code} img ${idx + 1}`}
                                            className="h-8 w-8 object-contain rounded border border-border bg-background"
                                          />
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="px-3 py-2 text-center text-foreground">
                                  {d.location || <span className="text-muted-foreground/40">—</span>}
                                </td>
                                <td className="px-3 py-2 text-center text-foreground">
                                  {d.wax_setting_location || <span className="text-muted-foreground/40">—</span>}
                                </td>
                                <td className="px-3 py-2 text-center text-foreground">
                                  {d.wax_piece_location || <span className="text-muted-foreground/40">—</span>}
                                </td>
                                <td className="px-3 py-2 text-center text-foreground">
                                  {d.casting_location || <span className="text-muted-foreground/40">—</span>}
                                </td>
                                <td className="px-3 py-2 text-center font-medium text-foreground">
                                  {d.qty_per_piece != null ? d.qty_per_piece : <span className="text-muted-foreground/40">—</span>}
                                </td>
                                <td className="px-3 py-2 text-center font-bold text-amber-800 bg-amber-500/5">
                                  {d.qty_needed != null ? d.qty_needed : <span className="text-muted-foreground/40">—</span>}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                                No related dies defined for this product.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
