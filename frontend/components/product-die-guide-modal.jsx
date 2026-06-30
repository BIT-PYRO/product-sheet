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

  /** Resolve die images to an array of URL strings */
  function resolveDieImages(d) {
    if (d.images && d.images.length > 0) return d.images
    if (!d.image) return []
    if (d.image.startsWith('[')) {
      try { return JSON.parse(d.image) } catch { return [d.image] }
    }
    if (d.image.includes(',')) return d.image.split(',').map(s => s.trim()).filter(Boolean)
    return [d.image]
  }

  function handlePrint() {
    // Build flat-table HTML — one row per (masterSku × die) combination,
    // with masterSku cells spanning multiple die rows via rowspan.
    let rowsHtml = ''

    data.forEach((group) => {
      const dies = group.dies && group.dies.length > 0 ? group.dies : [null]
      const rowspan = dies.length

      dies.forEach((d, dIdx) => {
        const isFirst = dIdx === 0

        // Master SKU cells (only on first die row)
        const masterImgHtml = isFirst
          ? group.images && group.images.length > 0
            ? `<div class="img-cell">${group.images.map(src => `<img src="${src}" class="master-img" />`).join('')}</div>`
            : '<span class="no-img">—</span>'
          : ''

        const masterSkuCell = isFirst
          ? `<td class="master-img-td" rowspan="${rowspan}">${masterImgHtml}</td>
             <td class="master-sku-td" rowspan="${rowspan}">${group.master_sku || '—'}</td>
             <td class="center" rowspan="${rowspan}">${group.location || '—'}</td>
             <td class="center bold-amber" rowspan="${rowspan}">${group.quantity ?? '—'}</td>`
          : ''

        // Die cells
        let dieImgHtml = '—'
        let dieCode = '—'
        let dieLoc = '—', waxSetLoc = '—', waxPieceLoc = '—', castingLoc = '—'
        let qtyPiece = '—', totalQty = '—'

        if (d) {
          const imgs = resolveDieImages(d)
          dieImgHtml = imgs.length > 0
            ? `<div class="img-cell">${imgs.map(src => `<img src="${src}" class="die-img" />`).join('')}</div>`
            : '—'
          dieCode = d.die_code || '—'
          dieLoc = d.location || '—'
          waxSetLoc = d.wax_setting_location || '—'
          waxPieceLoc = d.wax_piece_location || '—'
          castingLoc = d.casting_location || '—'
          qtyPiece = d.qty_per_piece != null ? d.qty_per_piece : '—'
          totalQty = d.qty_needed != null ? d.qty_needed : '—'
        }

        rowsHtml += `
          <tr class="${dIdx % 2 === 0 ? 'row-even' : 'row-odd'}">
            ${masterSkuCell}
            <td class="die-code-td">${dieCode}</td>
            <td class="center">${dieImgHtml}</td>
            <td class="center">${dieLoc}</td>
            <td class="center">${waxSetLoc}</td>
            <td class="center">${waxPieceLoc}</td>
            <td class="center">${castingLoc}</td>
            <td class="center">${qtyPiece}</td>
            <td class="center total-qty">${totalQty}</td>
          </tr>`
      })
    })

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Product Die Guide – ${voucherNo}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 9px; color: #1e293b;
           -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
    .page-title { font-size: 15px; font-weight: 800; color: #b45309; margin-bottom: 2px; }
    .voucher-sub { font-size: 8px; color: #64748b; margin-bottom: 10px;
                   border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }

    table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
    thead tr th {
      background: #92400e; color: #fff; font-weight: 700;
      padding: 5px 6px; border: 1px solid #78350f; white-space: nowrap; text-align: center;
    }
    thead tr th.left { text-align: left; }
    td { padding: 4px 5px; border: 1px solid #e2e8f0; vertical-align: middle; }
    td.center { text-align: center; }
    td.master-img-td { width: 60px; }
    td.master-sku-td { font-weight: 800; color: #92400e; font-size: 10px; white-space: nowrap; }
    td.die-code-td { font-weight: 700; color: #b45309; white-space: nowrap; }
    td.bold-amber { font-weight: 700; color: #92400e; text-align: center; background: #fffbeb; }
    td.total-qty { font-weight: 700; color: #92400e; background: #fffbeb !important; }
    .row-even td { background: #fff; }
    .row-odd td { background: #f8fafc; }
    .img-cell { display: flex; flex-wrap: wrap; gap: 2px; justify-content: center; }
    .master-img { height: 46px; width: 46px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 3px; }
    .die-img { height: 26px; width: 26px; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 2px; }
    .no-img { color: #94a3b8; font-size: 8px; }
  </style>
</head>
<body>
  <div class="page-title">Product Die Guide</div>
  <div class="voucher-sub">Voucher: ${voucherNo || '—'} &nbsp;·&nbsp; ${data.length} Master SKU(s)</div>
  <table>
    <thead>
      <tr>
        <th style="width:58px">Photo</th>
        <th class="left" style="min-width:80px">Master SKU</th>
        <th style="min-width:70px">Stock Loc.</th>
        <th style="width:52px">Qty Needed</th>
        <th style="min-width:60px">Die Code</th>
        <th style="width:56px">Die Image</th>
        <th style="min-width:60px">Die Location</th>
        <th style="min-width:70px">Wax Setting Loc</th>
        <th style="min-width:70px">Wax Piece Loc</th>
        <th style="min-width:60px">Casting Loc</th>
        <th style="width:54px">Qty/Piece</th>
        <th style="width:54px">Total Qty</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`

    const win = window.open('', '_blank', 'width=1100,height=720')
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
      <DialogContent className="max-w-5xl w-[98vw] max-h-[90vh] overflow-y-auto bg-background text-foreground p-0 gap-0 [&>button]:hidden">
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
        <div className="px-4 py-3">
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
            /* ── Flat sheet table ── */
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-amber-800 text-white text-left">
                    <th className="px-2 py-2 font-bold text-center border-r border-amber-700 w-14">Photo</th>
                    <th className="px-3 py-2 font-bold border-r border-amber-700 min-w-[80px]">Master SKU</th>
                    <th className="px-2 py-2 font-bold text-center border-r border-amber-700 min-w-[70px]">Stock Loc.</th>
                    <th className="px-2 py-2 font-bold text-center border-r border-amber-700 w-[64px]">Qty Needed</th>
                    <th className="px-2 py-2 font-bold border-r border-amber-700 min-w-[60px]">Die Code</th>
                    <th className="px-2 py-2 font-bold text-center border-r border-amber-700 w-14">Die Image</th>
                    <th className="px-2 py-2 font-bold text-center border-r border-amber-700 min-w-[65px]">Die Location</th>
                    <th className="px-2 py-2 font-bold text-center border-r border-amber-700 min-w-[75px]">Wax Setting Loc</th>
                    <th className="px-2 py-2 font-bold text-center border-r border-amber-700 min-w-[75px]">Wax Piece Loc</th>
                    <th className="px-2 py-2 font-bold text-center border-r border-amber-700 min-w-[65px]">Casting Loc</th>
                    <th className="px-2 py-2 font-bold text-center border-r border-amber-700 w-[62px]">Qty/Piece</th>
                    <th className="px-2 py-2 font-bold text-center w-[62px] bg-amber-700">Total Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((group, gIdx) => {
                    const dies = group.dies && group.dies.length > 0 ? group.dies : [null]
                    return dies.map((d, dIdx) => {
                      const isFirst = dIdx === 0
                      const rowspan = dies.length
                      const evenRow = (gIdx + dIdx) % 2 === 0

                      // Die image resolution
                      const dieImgs = d ? resolveDieImages(d) : []

                      return (
                        <tr
                          key={`${group.master_sku}-${dIdx}`}
                          className={`border-b border-border/40 ${evenRow ? 'bg-background' : 'bg-muted/30'} hover:bg-amber-500/5 transition-colors`}
                        >
                          {/* Master SKU cells — only on first die row */}
                          {isFirst && (
                            <>
                              {/* Master photos */}
                              <td rowSpan={rowspan} className="px-1.5 py-1.5 text-center align-middle border-r border-border/40">
                                {group.images && group.images.length > 0 ? (
                                  <div className="flex flex-col gap-1 items-center">
                                    {group.images.slice(0, 2).map((src, idx) => (
                                      <img
                                        key={idx}
                                        src={src}
                                        alt={`${group.master_sku} img ${idx + 1}`}
                                        className="h-11 w-11 object-contain rounded border border-border bg-background"
                                      />
                                    ))}
                                    {group.images.length > 2 && (
                                      <span className="text-[9px] text-muted-foreground">+{group.images.length - 2}</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-10 w-10 mx-auto border border-dashed border-border rounded bg-muted/20 text-muted-foreground">
                                    <ImageIcon className="h-4 w-4 opacity-40" />
                                  </div>
                                )}
                              </td>

                              {/* Master SKU name */}
                              <td rowSpan={rowspan} className="px-3 py-2 font-extrabold text-amber-700 text-sm border-r border-border/40 whitespace-nowrap align-middle">
                                {group.master_sku || <span className="text-muted-foreground/40">—</span>}
                              </td>

                              {/* Stock Location */}
                              <td rowSpan={rowspan} className="px-2 py-2 text-center text-foreground border-r border-border/40 align-middle">
                                {group.location || <span className="text-muted-foreground/40">—</span>}
                              </td>

                              {/* Qty Needed */}
                              <td rowSpan={rowspan} className="px-2 py-2 text-center font-bold text-amber-800 bg-amber-500/5 border-r border-border/40 align-middle">
                                {group.quantity ?? <span className="text-muted-foreground/40">—</span>}
                              </td>
                            </>
                          )}

                          {/* Die Code */}
                          <td className="px-2 py-2 font-bold text-amber-600 border-r border-border/40 whitespace-nowrap">
                            {d?.die_code || <span className="text-muted-foreground/40">—</span>}
                          </td>

                          {/* Die Image */}
                          <td className="px-1 py-1 text-center border-r border-border/40">
                            {dieImgs.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {dieImgs.map((src, idx) => (
                                  <img
                                    key={idx}
                                    src={src}
                                    alt={`${d?.die_code} img ${idx + 1}`}
                                    className="h-8 w-8 object-contain rounded border border-border bg-background"
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>

                          {/* Die Location */}
                          <td className="px-2 py-2 text-center text-foreground border-r border-border/40">
                            {d?.location || <span className="text-muted-foreground/40">—</span>}
                          </td>

                          {/* Wax Setting Loc */}
                          <td className="px-2 py-2 text-center text-foreground border-r border-border/40">
                            {d?.wax_setting_location || <span className="text-muted-foreground/40">—</span>}
                          </td>

                          {/* Wax Piece Loc */}
                          <td className="px-2 py-2 text-center text-foreground border-r border-border/40">
                            {d?.wax_piece_location || <span className="text-muted-foreground/40">—</span>}
                          </td>

                          {/* Casting Loc */}
                          <td className="px-2 py-2 text-center text-foreground border-r border-border/40">
                            {d?.casting_location || <span className="text-muted-foreground/40">—</span>}
                          </td>

                          {/* Qty / Piece */}
                          <td className="px-2 py-2 text-center font-medium text-foreground border-r border-border/40">
                            {d?.qty_per_piece != null ? d.qty_per_piece : <span className="text-muted-foreground/40">—</span>}
                          </td>

                          {/* Total Qty */}
                          <td className="px-2 py-2 text-center font-bold text-amber-800 bg-amber-500/5">
                            {d?.qty_needed != null ? d.qty_needed : <span className="text-muted-foreground/40">—</span>}
                          </td>
                        </tr>
                      )
                    })
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
