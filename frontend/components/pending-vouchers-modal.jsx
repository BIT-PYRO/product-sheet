"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { X, Loader2, Check, Clock, AlertCircle, ArrowRight, ChevronDown, ChevronRight } from "lucide-react"

const APPROVAL_STATUS_LABELS = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800', icon: Check },
  in_process: { label: 'In Process', color: 'bg-orange-100 text-orange-800', icon: Loader2 },
  awaiting: { label: 'Awaiting', color: 'bg-gray-100 text-gray-700', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: Check },
}

function VoucherStatusBadge({ status }) {
  const config = APPROVAL_STATUS_LABELS[status] || APPROVAL_STATUS_LABELS.pending
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

export function PendingVouchersModal({ open, onOpenChange, onVouchersApproved }) {
  const [vouchers, setVouchers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [error, setError] = useState("")
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [filterStatus, setFilterStatus] = useState("all")
  const [expandedVoucherId, setExpandedVoucherId] = useState(null)

  const loadVouchers = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      // Load all vouchers that have a batch_id (ie. were created via bulk)
      const response = await fetch('/api/jobs?ordering=-created_at', { cache: 'no-store' })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        setError(result?.error?.message || 'Failed to load vouchers')
        return
      }

      const jobs = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.data?.results)
          ? result.data.results
          : []

      // Filter to only vouchers that have batch_id or were created by "Create Job"
      const voucherJobs = jobs.filter(j => j.batch_id || j.voucher_no)
      setVouchers(voucherJobs)
    } catch (err) {
      setError(err.message || 'Failed to load vouchers')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadVouchers()
      setSelectedIds(new Set())
    }
  }, [open, loadVouchers])

  const filteredVouchers = filterStatus === 'all'
    ? vouchers
    : vouchers.filter(v => v.approval_status === filterStatus)

  const pendingVouchers = vouchers.filter(v => v.approval_status === 'pending')
  const approvedVouchers = vouchers.filter(v =>
    v.approval_status === 'approved' ||
    v.approval_status === 'in_process' ||
    v.approval_status === 'awaiting'
  )
  const completedVouchers = vouchers.filter(v => v.approval_status === 'completed')

  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllPending = () => {
    const pendingIds = pendingVouchers.map(v => v.id)
    setSelectedIds(prev => {
      const allSelected = pendingIds.every(id => prev.has(id))
      if (allSelected) return new Set()
      return new Set(pendingIds)
    })
  }

  async function handleApproveAndPrint() {
    if (selectedIds.size === 0) {
      setError("Please select vouchers to approve.")
      return
    }

    setIsApproving(true)
    setError("")

    try {
      const response = await fetch('/api/jobs/approve-vouchers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucher_ids: Array.from(selectedIds),
          approved_by: '',
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        const msg = result?.error?.message || result?.error?.details?.voucher_ids || 'Failed to approve vouchers.'
        setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
        return
      }

      // Trigger print
      window.print()

      // Reload vouchers
      await loadVouchers()
      setSelectedIds(new Set())

      if (onVouchersApproved) {
        onVouchersApproved(result.data)
      }
    } catch (err) {
      setError(err.message || 'Failed to approve vouchers.')
    } finally {
      setIsApproving(false)
    }
  }

  const getDeptLabel = (deptKey) => {
    const labels = {
      'wax-pieces': 'Wax Piece',
      'wax-setting': 'Wax Setting',
      'casting': 'Casting',
      'filing': 'Filing / Grinding',
      'pre-polish': 'Pre-Polish',
      'hand-setting': 'Hand Setting',
      'polishing': 'Final Polish',
      'plating': 'Ready for Plating',
      'design': 'Design / CAD',
      '3d-print': '3D Print',
      'mold-die': 'Mold Die',
      'final-qc': 'Final QC',
      'hallmarking': 'Hallmarking',
      'laser-soldering': 'Laser Soldering',
      'final-packaging': 'Final Packaging',
    }
    return labels[deptKey] || deptKey || 'Unknown'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] w-[95vw] max-h-[90vh] overflow-hidden bg-background text-foreground p-0 gap-0 [&>button]:hidden">
        <style>{`
          @media print {
            .print-hide { display: none !important; }
            .voucher-print-area { padding: 20px; }
          }
        `}</style>
        <DialogTitle className="sr-only">Vouchers</DialogTitle>

        {/* Header */}
        <div className="flex justify-between items-center px-4 pt-3 pb-2 border-b border-soft-border print-hide">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-midnight-ink">Vouchers</h2>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-semibold">
                Pending: {pendingVouchers.length}
              </span>
              <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold">
                Approved: {approvedVouchers.length}
              </span>
              <span className="px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">
                Completed: {completedVouchers.length}
              </span>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter & Actions Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-blue-50/50 border-b border-soft-border print-hide">
          <div className="flex items-center gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-[160px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vouchers</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_process">In Process</SelectItem>
                <SelectItem value="awaiting">Awaiting</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {filterStatus === 'all' || filterStatus === 'pending' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllPending}
                className="text-xs h-7"
              >
                {pendingVouchers.length > 0 && pendingVouchers.every(v => selectedIds.has(v.id))
                  ? 'Deselect All Pending'
                  : `Select All Pending (${pendingVouchers.length})`}
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-cool-gray">
              {selectedIds.size} selected
            </span>
            <Button
              size="sm"
              className="h-8 bg-trust-blue hover:bg-deep-blue text-white font-semibold text-xs gap-1"
              onClick={handleApproveAndPrint}
              disabled={isApproving || selectedIds.size === 0}
            >
              {isApproving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Approve
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2 flex items-center gap-2 print-hide">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Voucher List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 voucher-print-area" style={{ maxHeight: 'calc(90vh - 160px)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-trust-blue" />
              <span className="ml-2 text-sm text-cool-gray">Loading vouchers...</span>
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="text-center py-12 text-cool-gray">
              <p className="text-sm">No vouchers found.</p>
              <p className="text-xs mt-1">Use "Create All Vouchers" from a picklist to generate vouchers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVouchers.map(voucher => {
                const isPending = voucher.approval_status === 'pending'
                const isExpanded = expandedVoucherId === voucher.id
                const materialRows = Array.isArray(voucher.material_rows) ? voucher.material_rows : []
                const totalQty = materialRows.reduce((sum, r) => sum + (parseFloat(r.issued_qty) || 0), 0)

                return (
                  <div
                    key={voucher.id}
                    className={`border rounded-lg overflow-hidden transition-all ${
                      isExpanded ? 'border-trust-blue shadow-md' : 'border-soft-border'
                    } ${isPending ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    {/* Clickable Header Row */}
                    <div
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-blue-50/30 transition-colors"
                      onClick={() => setExpandedVoucherId(prev => prev === voucher.id ? null : voucher.id)}
                    >
                      {isPending && (
                        <div onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(voucher.id)}
                            onCheckedChange={() => toggleSelection(voucher.id)}
                          />
                        </div>
                      )}
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-trust-blue shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-cool-gray shrink-0" />
                      }
                      <span className="text-sm font-bold text-midnight-ink">{voucher.voucher_no}</span>
                      <VoucherStatusBadge status={voucher.approval_status} />
                      <span className="text-xs text-cool-gray">
                        {getDeptLabel(voucher.dept_from)} → {getDeptLabel(voucher.dept_to)}
                      </span>
                      <span className="text-xs font-semibold text-midnight-ink">{totalQty} pcs</span>
                      {voucher.approved_at && (
                        <span className="text-[10px] text-cool-gray ml-auto">
                          Approved: {new Date(voucher.approved_at).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Voucher Body — matches Create Job modal layout */}
                    {isExpanded && (
                    <div className="px-4 py-3 flex flex-col gap-3">
                      {/* Row 1: DATE | SCHEDULE | TYPE | VOUCHER NO. */}
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-midnight-ink uppercase tracking-wide">Date</label>
                          <div className="mt-0.5 h-8 flex items-center px-2 border border-soft-border rounded-md bg-gray-50 text-xs">
                            {voucher.created_at ? new Date(voucher.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '—'}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-midnight-ink uppercase tracking-wide">Schedule</label>
                          <div className="mt-0.5 h-8 flex items-center px-2 border border-soft-border rounded-md bg-gray-50 text-xs text-cool-gray">
                            {voucher.schedule ? new Date(voucher.schedule).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : 'dd-mm-yyyy'}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-midnight-ink uppercase tracking-wide">Type</label>
                          <div className="mt-0.5 h-8 flex items-center px-2 border border-soft-border rounded-md bg-gray-50 text-xs">
                            {voucher.voucher_type || 'New'}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-midnight-ink uppercase tracking-wide">Voucher No.</label>
                          <div className="mt-0.5 h-8 flex items-center px-2 border border-soft-border rounded-md bg-gray-50 text-xs font-semibold">
                            {voucher.voucher_no}
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Issued To | Work Type */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-midnight-ink uppercase tracking-wide">Issued To</label>
                          <div className="mt-0.5 h-8 flex items-center px-2 border border-soft-border rounded-md bg-gray-50 text-xs">
                            {voucher.issued_to || 'Existing Workforce / Vendor'}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-midnight-ink uppercase tracking-wide">Work Type</label>
                          <div className="mt-0.5 h-8 flex items-center px-2 border border-soft-border rounded-md bg-gray-50 text-xs">
                            {voucher.work_type || 'In-House'}
                          </div>
                        </div>
                      </div>

                      {/* Row 3: From → To Department */}
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
                        <div>
                          <label className="text-[11px] font-semibold text-midnight-ink uppercase tracking-wide">From</label>
                          <div className="mt-0.5 h-8 flex items-center px-2 border border-soft-border rounded-md bg-gray-50 text-xs">
                            {getDeptLabel(voucher.dept_from)}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-cool-gray mb-1.5" />
                        <div>
                          <label className="text-[11px] font-semibold text-midnight-ink uppercase tracking-wide">To</label>
                          <div className="mt-0.5 h-8 flex items-center px-2 border border-soft-border rounded-md bg-gray-50 text-xs">
                            {getDeptLabel(voucher.dept_to)}
                          </div>
                        </div>
                      </div>

                      {/* SKU Table */}
                      {materialRows.length > 0 && (
                        <div className="border border-soft-border rounded-md overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-trust-blue text-white">
                                <th className="border-r border-white/20 px-2 py-1.5 text-left font-bold">MASTER SKU</th>
                                <th className="border-r border-white/20 px-2 py-1.5 text-left font-bold">CATEGORY</th>
                                <th className="border-r border-white/20 px-2 py-1.5 text-left font-bold">METAL</th>
                                <th className="border-r border-white/20 px-2 py-1.5 text-center font-bold">QTY</th>
                                <th className="border-r border-white/20 px-2 py-1.5 text-center font-bold">WEIGHT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {materialRows.map((row, idx) => (
                                <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-t border-soft-border`}>
                                  <td className="border-r border-soft-border px-2 py-1.5 font-mono">{row.sku}</td>
                                  <td className="border-r border-soft-border px-2 py-1.5">{row.category || ''}</td>
                                  <td className="border-r border-soft-border px-2 py-1.5">{row.metal || ''}</td>
                                  <td className="border-r border-soft-border px-2 py-1.5 text-center font-semibold">{row.issued_qty || ''}</td>
                                  <td className="px-2 py-1.5 text-center">{row.issued_weight || ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Issued By / Contact */}
                      {(voucher.issued_by_name || voucher.issued_by_contact) && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-midnight-ink uppercase tracking-wide">Issued By</label>
                            <div className="mt-0.5 h-8 flex items-center px-2 border border-soft-border rounded-md bg-gray-50 text-xs">
                              {voucher.issued_by_name || '—'}
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-midnight-ink uppercase tracking-wide">Contact</label>
                            <div className="mt-0.5 h-8 flex items-center px-2 border border-soft-border rounded-md bg-gray-50 text-xs">
                              {voucher.issued_by_contact || '—'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {voucher.notes && (
                        <div>
                          <label className="text-[11px] font-semibold text-midnight-ink uppercase tracking-wide">Note</label>
                          <div className="mt-0.5 px-2 py-1.5 border border-soft-border rounded-md bg-gray-50 text-xs text-cool-gray italic">
                            {voucher.notes}
                          </div>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
