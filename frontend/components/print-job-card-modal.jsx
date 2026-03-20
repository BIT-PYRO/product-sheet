"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Printer, Download, X } from "lucide-react"

export function PrintJobCardModal({ open, onOpenChange, data }) {
  if (!data) return null

  function handlePrint() {
    window.print()
  }

  const {
    jobNumber = "JOB-000000",
    jobTitle = "",
    description = "",
    workCategory = "",
    assignedTo = "",
    priority = "Medium",
    urgency = "Normal",
    location = "",
    startDate = "",
    dueDate = "",
    estimatedCost = "",
    workers = [],
    materials = [],
    specialInstructions = "",
  } = data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[88vh] overflow-y-auto bg-white text-midnight-ink p-0 gap-0 [&>button]:hidden print:max-w-full print:max-h-full print:p-0">
        <style>{`
          @media print {
            .print-hide { display: none !important; }
            body { margin: 0; padding: 0; }
            .job-card-container { page-break-after: always; }
          }
        `}</style>
        <DialogTitle className="sr-only">Print Job Card</DialogTitle>

        {/* Close Button */}
        <div className="flex justify-end px-5 pt-3 pb-2 print-hide border-b border-soft-border">
          <button
            onClick={() => onOpenChange(false)}
            className="text-cool-gray hover:text-midnight-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col gap-4 job-card-container">
          {/* Header */}
          <div className="border-b-2 border-midnight-ink pb-4">
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-3xl font-bold text-midnight-ink">JOB CARD</h1>
              <div className="text-right">
                <p className="text-xl font-bold text-midnight-ink">{jobNumber}</p>
                <p className="text-xs text-cool-gray">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Job Details Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-cool-gray uppercase">Job Title</p>
                <p className="text-base font-semibold text-midnight-ink">{jobTitle}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-cool-gray uppercase">Work Category</p>
                <p className="text-sm text-midnight-ink">{workCategory}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-cool-gray uppercase">Assigned To</p>
                <p className="text-sm text-midnight-ink font-semibold">{assignedTo}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-cool-gray uppercase">Location</p>
                <p className="text-sm text-midnight-ink">{location || "—"}</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold text-cool-gray uppercase">Priority</p>
                  <p className="text-sm text-midnight-ink font-semibold">{priority}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-cool-gray uppercase">Urgency</p>
                  <p className="text-sm text-midnight-ink font-semibold">{urgency}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-cool-gray uppercase">Start Date</p>
                <p className="text-sm text-midnight-ink">{startDate || "—"}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-cool-gray uppercase">Due Date</p>
                <p className="text-sm text-midnight-ink">{dueDate || "—"}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-cool-gray uppercase">Est. Cost</p>
                <p className="text-sm text-midnight-ink">
                  {estimatedCost ? `₹${parseFloat(estimatedCost).toLocaleString("en-IN")}` : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {description && (
            <div className="border-t border-soft-border pt-4">
              <p className="text-xs font-bold text-cool-gray uppercase mb-2">Description</p>
              <p className="text-sm text-midnight-ink whitespace-pre-wrap">{description}</p>
            </div>
          )}

          {/* Workers Table */}
          {workers && workers.length > 0 && (
            <div className="border-t border-soft-border pt-4">
              <p className="text-xs font-bold text-cool-gray uppercase mb-3">Workers Assigned</p>
              <table className="w-full border border-soft-border">
                <thead>
                  <tr className="bg-midnight-ink text-white">
                    <th className="border-r border-soft-border px-3 py-2 text-xs font-bold text-left">Name</th>
                    <th className="border-r border-soft-border px-3 py-2 text-xs font-bold text-left">Role</th>
                    <th className="px-3 py-2 text-xs font-bold text-left">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.filter((w) => w.name).map((worker, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-cloud-gray"}>
                      <td className="border-r border-soft-border px-3 py-2 text-xs">{worker.name}</td>
                      <td className="border-r border-soft-border px-3 py-2 text-xs">{worker.role || "—"}</td>
                      <td className="px-3 py-2 text-xs">{worker.contact || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Materials Table */}
          {materials && materials.length > 0 && (
            <div className="border-t border-soft-border pt-4">
              <p className="text-xs font-bold text-cool-gray uppercase mb-3">Materials Required</p>
              <table className="w-full border border-soft-border">
                <thead>
                  <tr className="bg-midnight-ink text-white">
                    <th className="border-r border-soft-border px-3 py-2 text-xs font-bold text-left">Material</th>
                    <th className="border-r border-soft-border px-3 py-2 text-xs font-bold text-center w-16">Qty</th>
                    <th className="border-r border-soft-border px-3 py-2 text-xs font-bold text-center w-16">Unit</th>
                    <th className="px-3 py-2 text-xs font-bold text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.filter((m) => m.name).map((material, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-cloud-gray"}>
                      <td className="border-r border-soft-border px-3 py-2 text-xs">{material.name}</td>
                      <td className="border-r border-soft-border px-3 py-2 text-xs text-center">{material.quantity || "—"}</td>
                      <td className="border-r border-soft-border px-3 py-2 text-xs text-center">{material.unit || "—"}</td>
                      <td className="px-3 py-2 text-xs">{material.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Special Instructions */}
          {specialInstructions && (
            <div className="border-t border-soft-border pt-4 bg-yellow-50 p-4 rounded">
              <p className="text-xs font-bold text-cool-gray uppercase mb-2">Special Instructions</p>
              <p className="text-sm text-midnight-ink whitespace-pre-wrap">{specialInstructions}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-soft-border pt-4 mt-6">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-xs text-cool-gray mb-8">Issued By</p>
                <p className="border-t border-midnight-ink pt-2 text-xs">[Signature]</p>
              </div>
              <div>
                <p className="text-xs text-cool-gray mb-8">Assigned To</p>
                <p className="border-t border-midnight-ink pt-2 text-xs">[Signature]</p>
              </div>
              <div>
                <p className="text-xs text-cool-gray mb-8">Received By</p>
                <p className="border-t border-midnight-ink pt-2 text-xs">[Signature]</p>
              </div>
            </div>
          </div>

          {/* Print Date */}
          <div className="text-center text-xs text-cool-gray mt-4 print-hide">
            <p>Printed on {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 px-6 py-4 border-t border-soft-border print-hide">
          <Button
            onClick={handlePrint}
            className="flex-1 bg-midnight-ink hover:bg-midnight-ink/90 text-white font-semibold"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-soft-border"
          >
            Exit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
