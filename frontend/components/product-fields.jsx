"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export function ProductFields() {
  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product Name</Label>
          <Input placeholder="Enter product name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product ID / SKU</Label>
          <Input placeholder="SKU-001" />
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</Label>
          <Input placeholder="e.g. Rings, Necklaces" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sub-category</Label>
          <Input placeholder="e.g. Gold Rings" />
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Metal Type</Label>
          <Input placeholder="Gold / Silver / Platinum" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purity</Label>
          <Input placeholder="22K / 18K / 14K" />
        </div>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gross Weight (gm)</Label>
          <Input type="number" placeholder="0.00" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Weight (gm)</Label>
          <Input type="number" placeholder="0.00" />
        </div>
      </div>

      {/* Row 5 */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Size</Label>
        <Input placeholder="e.g. 16, 18, 20" />
      </div>

      {/* Variations Section */}
      <div className="bg-muted/50 rounded p-5 mt-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 block">Variations</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Color</Label>
            <Input placeholder="e.g. Yellow, White, Rose" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Finish</Label>
            <Input placeholder="e.g. Matte, Polished" />
          </div>
        </div>
        <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Variation
        </Button>
      </div>
    </div>
  )
}
