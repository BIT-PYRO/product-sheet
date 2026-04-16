"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CreateJobModal } from "@/components/create-job-modal"
import { CreateAllVouchersModal } from "@/components/create-all-vouchers-modal"
import { SuggestedVouchersModal } from "@/components/suggested-vouchers-modal"
import { NeededVouchersModal } from "@/components/needed-vouchers-modal"

export function StockSection() {
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false)
  const [isCreateAllVouchersOpen, setIsCreateAllVouchersOpen] = useState(false)
  const [isSuggestedVouchersOpen, setIsSuggestedVouchersOpen] = useState(false)
  const [isNeededVouchersOpen, setIsNeededVouchersOpen] = useState(false)

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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="mt-5 bg-success hover:bg-success/90 text-white font-semibold px-8 gap-1">
            Create a Job
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => setIsCreateJobOpen(true)} className="cursor-pointer">Create Job</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsCreateAllVouchersOpen(true)} className="cursor-pointer">Create All Vouchers</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsSuggestedVouchersOpen(true)} className="cursor-pointer text-orange-600 font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-orange-400 text-white text-[9px] font-bold flex items-center justify-center shrink-0">!</span>
              Create Suggested Vouchers
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsNeededVouchersOpen(true)} className="cursor-pointer text-red-600 font-semibold" disabled>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">!</span>
              Create Needed Vouchers
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateJobModal open={isCreateJobOpen} onOpenChange={setIsCreateJobOpen} />
      <CreateAllVouchersModal open={isCreateAllVouchersOpen} onOpenChange={setIsCreateAllVouchersOpen} />
      <SuggestedVouchersModal open={isSuggestedVouchersOpen} onOpenChange={setIsSuggestedVouchersOpen} suggestedItems={[]} />
      <NeededVouchersModal open={isNeededVouchersOpen} onOpenChange={setIsNeededVouchersOpen} neededItems={[]} />
    </div>
  )
}
