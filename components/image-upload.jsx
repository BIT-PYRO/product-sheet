"use client"

import { useRef, useState } from "react"
import { ImageIcon } from "lucide-react"

export function ImageUpload() {
  const [preview, setPreview] = useState(null)
  const inputRef = useRef(null)

  function handleClick() {
    inputRef.current?.click()
  }

  function handleChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
  }

  return (
    <div
      onClick={handleClick}
      className="border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center w-[300px] h-[300px] cursor-pointer transition-colors hover:border-blue-600 hover:bg-blue-50/50 mt-14 shrink-0"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      {preview ? (
        <img
          src={preview}
          alt="Product preview"
          className="w-full h-full object-contain rounded p-2"
        />
      ) : (
        <div className="text-center text-muted-foreground/50">
          <ImageIcon className="w-14 h-14 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">PRODUCT IMAGE</p>
          <p className="text-xs text-muted-foreground/40 mt-1">Click to upload or drag and drop</p>
        </div>
      )}
    </div>
  )
}
