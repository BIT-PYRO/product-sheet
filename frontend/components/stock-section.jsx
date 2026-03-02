"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function StockSection({ onCreateJob }) {
  return (
    <div className="bg-card rounded-lg p-6 shadow-sm border border-border">
      <h2 className="text-base font-bold text-emerald-600 uppercase tracking-wider mb-5">
        Stock Maintenance
      </h2>

      <div className="border border-border rounded overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">SKU</TableHead>
              <TableHead className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Category</TableHead>
              <TableHead className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Opening Stock</TableHead>
              <TableHead className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Issued Qty</TableHead>
              <TableHead className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Received Qty</TableHead>
              <TableHead className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Current Stock</TableHead>
              <TableHead className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Weight (gm)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell><Input className="border-0 bg-transparent p-1 h-8 text-sm focus-visible:ring-0" placeholder="SKU-001" /></TableCell>
              <TableCell><Input className="border-0 bg-transparent p-1 h-8 text-sm focus-visible:ring-0" placeholder="Category" /></TableCell>
              <TableCell><Input className="border-0 bg-transparent p-1 h-8 text-sm focus-visible:ring-0" type="number" placeholder="0" /></TableCell>
              <TableCell><Input className="border-0 bg-transparent p-1 h-8 text-sm focus-visible:ring-0" type="number" placeholder="0" /></TableCell>
              <TableCell><Input className="border-0 bg-transparent p-1 h-8 text-sm focus-visible:ring-0" type="number" placeholder="0" /></TableCell>
              <TableCell><Input className="border-0 bg-transparent p-1 h-8 text-sm focus-visible:ring-0" type="number" placeholder="0" /></TableCell>
              <TableCell><Input className="border-0 bg-transparent p-1 h-8 text-sm focus-visible:ring-0" type="number" placeholder="0.00" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><Input className="border-0 bg-transparent p-1 h-8 text-sm focus-visible:ring-0" placeholder="SKU-002" /></TableCell>
              <TableCell><Input className="border-0 bg-transparent p-1 h-8 text-sm focus-visible:ring-0" placeholder="Category" /></TableCell>
              <TableCell><Input className="border-0 bg-transparent p-1 h-8 text-sm focus-visible:ring-0" type="number" placeholder="0" /></TableCell>
              <TableCell><Input className="border-0 bg-transparent p-1 h-8 text-sm focus-visible:ring-0" type="number" placeholder="0" /></TableCell>
              <TableCell><Input className="border-0 bg-transparent p-1 h-8 text-sm focus-visible:ring-0" type="number" placeholder="0" /></TableCell>
              <TableCell><Input className="border-0 bg-transparent p-1 h-8 text-sm focus-visible:ring-0" type="number" placeholder="0" /></TableCell>
              <TableCell><Input className="border-0 bg-transparent p-1 h-8 text-sm focus-visible:ring-0" type="number" placeholder="0.00" /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Button
        onClick={onCreateJob}
        className="mt-5 bg-success hover:bg-success text-white font-semibold px-8"
      >
        Create a Job
      </Button>
    </div>
  )
}
