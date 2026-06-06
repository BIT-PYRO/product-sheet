"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

function DataBlock({ title, rows: initialRows }) {
  const [rows, setRows] = useState(initialRows)

  return (
    <div className="border border-soft-border rounded overflow-hidden bg-white">
      <div className="bg-midnight-ink text-white px-3 py-1.5">
        <h2 className="text-sm font-bold uppercase tracking-wider">{title}</h2>
      </div>

      <div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`border-b border-soft-border last:border-b-0 px-3 py-1 ${i % 2 === 0 ? 'bg-white' : 'bg-cloud-gray'}`}>
            <Input
              className="border-0 bg-transparent p-0 h-7 text-sm focus-visible:ring-0 placeholder:text-cool-gray"
              placeholder={`Enter ${title.toLowerCase()} item...`}
            />
          </div>
        ))}
      </div>

      <Button
        variant="ghost"
        className="w-full justify-start text-cool-gray hover:text-midnight-ink hover:bg-cloud-gray font-semibold h-7 text-sm border-t border-soft-border rounded-none"
        onClick={() => setRows((r) => r + 1)}
      >
        <Plus className="mr-1 h-3 w-3" />
        Add Row
      </Button>
    </div>
  )
}

export function DataSections() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DataBlock title="Stone Details" rows={2} />
      <DataBlock title="craftsMan / Making Charges" rows={2} />
      <DataBlock title="Certifications" rows={2} />
      <DataBlock title="Additional Notes" rows={2} />
    </div>
  )
}
