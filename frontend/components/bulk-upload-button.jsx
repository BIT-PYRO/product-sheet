'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BulkUploadButton({
  sheetType,
  onComplete,
  className = 'border-midnight-ink text-midnight-ink rounded-full px-6',
}) {
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState(null);

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
    setStatus(null);

    try {
      const response = await fetch('/api/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Bulk upload failed.');
      }

      setStatus({
        tone: 'success',
        message: result.message || 'Bulk upload completed successfully.',
      });

      if (typeof onComplete === 'function') {
        await onComplete(result);
      }
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error.message || 'Bulk upload failed.',
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
        accept=".csv,.xlsx,.xls,.json"
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
        {isUploading ? 'Uploading...' : 'Bulk Upload'}
      </Button>
      {status ? (
        <p className={`max-w-[280px] text-right text-xs ${status.tone === 'error' ? 'text-danger-dark' : 'text-success'}`}>
          {status.message}
        </p>
      ) : null}
    </div>
  );
}