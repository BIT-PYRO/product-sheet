'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BulkUploadButton({
  sheetType,
  onComplete,
  className = 'border-midnight-ink text-midnight-ink rounded-full px-4 text-sm h-8',
}) {
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sheetType', sheetType);

    setIsUploading(true);
    setUploadResult(null);

    try {
      const response = await fetch('/api/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setUploadResult({
          success: false,
          message: result?.message || 'Bulk upload failed.',
          failures: result?.failures || [],
          imagesFound: result?.imagesFound || 0,
          imagesUploaded: result?.imagesUploaded || 0,
        });
        if (typeof onComplete === 'function') {
          await onComplete(result);
        }
        return;
      }

      setUploadResult({
        success: true,
        message: result.message || 'Bulk upload completed successfully.',
        imagesFound: result.imagesFound || 0,
        imagesUploaded: result.imagesUploaded || 0,
        createdCount: result.createdCount || 0,
        updatedCount: result.updatedCount || 0,
        failures: result.failures || [],
      });

      if (typeof onComplete === 'function') {
        await onComplete(result);
      }
    } catch (error) {
      setUploadResult((prev) => prev ?? {
        success: false,
        message: error.message || 'Bulk upload failed.',
        failures: [],
        imagesFound: 0,
        imagesUploaded: 0,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.json,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={isUploading}
        className={className}
      >
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? 'Uploading…' : 'Bulk Upload'}
      </Button>

      {uploadResult ? (
        <div className="max-w-[320px] text-right text-xs space-y-0.5">
          {/* Primary result line */}
          <p className={uploadResult.success ? 'text-success font-medium' : 'text-danger-dark font-medium'}>
            {uploadResult.success ? '\u2713' : '\u2717'}{' '}
            {uploadResult.createdCount != null && uploadResult.success
              ? `${uploadResult.createdCount} created, ${uploadResult.updatedCount} updated`
              : uploadResult.message}
          </p>

          {/* Image stats — shown when images were found */}
          {uploadResult.imagesFound > 0 ? (
            <p className={
              uploadResult.imagesUploaded === uploadResult.imagesFound
                ? 'text-success'
                : 'text-amber-600'
            }>
              {uploadResult.imagesUploaded}/{uploadResult.imagesFound} images uploaded
            </p>
          ) : uploadResult.success && sheetType === 'designers' ? (
            <p className="text-cool-gray">No embedded images found in file</p>
          ) : null}

          {/* Collapsible failure list */}
          {uploadResult.failures?.length > 0 && (
            <details className="text-left mt-0.5">
              <summary className="cursor-pointer text-amber-600 hover:underline text-right list-none">
                ⚠ {uploadResult.failures.length} issue(s) — click to expand
              </summary>
              <ul className="mt-1 space-y-0.5 text-danger-dark max-h-36 overflow-y-auto border border-soft-border rounded p-1.5 bg-white shadow-sm">
                {uploadResult.failures.slice(0, 20).map((f, i) => (
                  <li key={i} className="text-xs break-words leading-snug">{f}</li>
                ))}
                {uploadResult.failures.length > 20 && (
                  <li className="text-cool-gray text-xs">…and {uploadResult.failures.length - 20} more</li>
                )}
              </ul>
            </details>
          )}
        </div>
      ) : null}
    </div>
  );
}