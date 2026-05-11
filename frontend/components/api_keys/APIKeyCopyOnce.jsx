'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Displays the raw API key exactly once.
 * Shows a prominent warning that the key cannot be retrieved again.
 */
export default function APIKeyCopyOnce({ rawKey, onDismiss }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select the text
    }
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-amber-600 text-lg leading-none mt-0.5">⚠</span>
        <p className="text-sm font-semibold text-amber-800">
          Copy this key now — it will <span className="underline">not</span> be shown again.
        </p>
      </div>

      <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2">
        <code className="flex-1 text-xs font-mono break-all text-midnight-ink select-all">
          {rawKey}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 text-cool-gray hover:text-midnight-ink transition"
          title="Copy to clipboard"
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <p className="text-xs text-amber-700">
        Share this key with the software integrator. Store it securely — once you close this dialog
        you cannot retrieve the key, only regenerate it.
      </p>

      {onDismiss && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onDismiss}>
            I&apos;ve copied the key
          </Button>
        </div>
      )}
    </div>
  );
}
