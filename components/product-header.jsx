"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export function ProductHeader({ onAddProduct }) {
  return (
    <div className="flex items-center justify-between mb-10">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        PRODUCT SHEET
      </h1>
      <Button onClick={onAddProduct} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6">
        <Plus className="mr-1 h-4 w-4" />
        ADD PRODUCT
      </Button>
    </div>
  )
}
