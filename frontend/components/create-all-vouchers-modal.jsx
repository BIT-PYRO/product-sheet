"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { X, ArrowRight, Loader2 } from "lucide-react"

export function CreateAllVouchersModal({ open, onOpenChange, onVouchersCreated }) {
  const [picklists, setPicklists] = useState([])
  const [selectedPicklistId, setSelectedPicklistId] = useState("")
  const [voucherType, setVoucherType] = useState("New")
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")
  const [createdSummary, setCreatedSummary] = useState(null)

  // Fetch picklists from backend
  const loadPicklists = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/picklist-groups', { cache: 'no-store' })
      const result = await response.json().catch(() => null)
      const groups = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.picklists)
          ? result.picklists
          : []

      // Also load from localStorage as fallback
      let localPicklists = []
      try {
        const raw = localStorage.getItem('psd_picklists')
        if (raw) localPicklists = JSON.parse(raw)
      } catch { /* ignore */ }

      // Merge: backend first, then local-only
      const merged = new Map()
      groups.forEach(p => merged.set(String(p.id), p))
      localPicklists.forEach(p => {
        const id = String(p.id || '')
        if (!merged.has(id)) merged.set(id, p)
      })

      setPicklists(Array.from(merged.values()))
    } catch {
      setPicklists([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadPicklists()
      setSelectedPicklistId("")
      setError("")
      setCreatedSummary(null)
    }
  }, [open, loadPicklists])

  async function handleCreateAll() {
    if (!selectedPicklistId) {
      setError("Please select a picklist first.")
      return
    }

    setIsCreating(true)
    setError("")

    try {
      const response = await fetch('/api/jobs/bulk-create-from-picklist/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          picklist_group_id: Number(selectedPicklistId),
          approved_by: '',
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        const msg = result?.error?.message || result?.error?.details?.picklist_group_id || 'Failed to create vouchers.'
        setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
        return
      }

      const data = result.data
      setCreatedSummary({
        batchId: data.batch_id,
        count: data.vouchers_created,
        vouchers: data.vouchers || [],
      })

      if (onVouchersCreated) {
        onVouchersCreated(data)
      }
    } catch (err) {
      setError(err.message || 'Failed to create vouchers.')
    } finally {
      setIsCreating(false)
    }
  }

  const selectedPicklist = picklists.find(p => String(p.id) === selectedPicklistId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] w-[95vw] max-h-[85vh] overflow-y-auto bg-background text-foreground p-0 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Create All Vouchers</DialogTitle>

        {/* Close button */}
        <div className="flex justify-between items-center px-4 pt-3 pb-0">
          <h2 className="text-lg font-bold text-midnight-ink">Create All Vouchers</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pb-4 flex flex-col gap-4 mt-2">
          {/* Type + Picklist Selection */}
          <div className="flex gap-3 items-end">
            <div className="flex flex-col gap-1 w-[140px]">
              <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Type</Label>
              <Select value={voucherType} onValueChange={setVoucherType}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Re-Issue">Re-Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 flex-1">
              <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Select Picklist</Label>
              <Select value={selectedPicklistId} onValueChange={setSelectedPicklistId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={isLoading ? "Loading picklists..." : "Select a Picklist"} />
                </SelectTrigger>
                <SelectContent>
                  {picklists.map(pl => (
                    <SelectItem key={pl.id} value={String(pl.id)}>
                      #{pl.number} — {pl.name}
                      {pl.items?.length ? ` (${pl.items.length} items)` : ''}
                    </SelectItem>
                  ))}
                  {picklists.length === 0 && (
                    <SelectItem value="__none" disabled>No picklists available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected Picklist Info */}
          {selectedPicklist && (
            <div className="border border-soft-border rounded-md p-3 bg-blue-50/50">
              <h3 className="text-sm font-semibold text-midnight-ink mb-2">
                Picklist #{selectedPicklist.number} — {selectedPicklist.name}
              </h3>
              <p className="text-xs text-cool-gray mb-1">
                Uploaded by {selectedPicklist.uploadedBy || selectedPicklist.uploaded_by || 'Unknown'}
                {selectedPicklist.dateFormatted
                  ? ` on ${selectedPicklist.dateFormatted}`
                  : selectedPicklist.uploaded_at
                    ? ` on ${new Date(selectedPicklist.uploaded_at).toLocaleString()}`
                    : ''}
              </p>
              <p className="text-xs text-cool-gray">
                {(selectedPicklist.items || []).length} SKU items in this picklist
              </p>
              <div className="mt-2 max-h-32 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-soft-border">
                      <th className="text-left py-1 px-1 font-semibold">SKU</th>
                      <th className="text-left py-1 px-1 font-semibold">Listing Name</th>
                      <th className="text-right py-1 px-1 font-semibold">Needed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPicklist.items || []).slice(0, 20).map((item, idx) => (
                      <tr key={idx} className="border-b border-soft-border/50">
                        <td className="py-1 px-1 font-mono">{item.sku}</td>
                        <td className="py-1 px-1">{item.listing_name || item.listingName || ''}</td>
                        <td className="py-1 px-1 text-right font-semibold">{item.needed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(selectedPicklist.items || []).length > 20 && (
                  <p className="text-xs text-cool-gray mt-1">... and {selectedPicklist.items.length - 20} more</p>
                )}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="border border-trust-blue/30 rounded-md p-3 bg-trust-blue/5">
            <p className="text-xs text-midnight-ink">
              <strong>How it works:</strong> Selecting a picklist will fetch all Master SKUs,
              calculate demand vs current Final Stock, and create vouchers for the full
              department pipeline (Wax Piece → Wax Setting → Casting → ... → Ready for Plating).
              The pieces needed are calculated as <code>Demand - Final Stock</code>.
              All created vouchers will appear under <strong>Pending Vouchers</strong>.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* Success Summary */}
          {createdSummary && (
            <div className="text-sm text-success-dark bg-success/10 border border-success/30 rounded-md px-3 py-2">
              <p className="font-semibold">
                {createdSummary.count} voucher{createdSummary.count !== 1 ? 's' : ''} created successfully!
              </p>
              <p className="text-xs mt-1">Batch ID: {createdSummary.batchId}</p>
              <p className="text-xs">View them in the <strong>Vouchers</strong> button to review and approve.</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-1">
            <Button
              variant="outline"
              className="flex-1 h-9"
              onClick={() => onOpenChange(false)}
            >
              {createdSummary ? 'Close' : 'Cancel'}
            </Button>
            {!createdSummary && (
              <Button
                className="flex-1 h-9 bg-trust-blue hover:bg-deep-blue text-white font-bold"
                onClick={handleCreateAll}
                disabled={isCreating || !selectedPicklistId}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Vouchers...
                  </>
                ) : (
                  'Create All Vouchers'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
