'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Scope → API endpoint path (relative)
const SCOPE_ENDPOINT_MAP = {
  master_inventory:  '/api/v1/inventory/',
  master_products:   '/api/v1/products/',
  product_inventory: '/api/v1/product-inventory/',
  master_jobs:       '/api/v1/jobs/',
  master_workforce:  '/api/v1/workforce/',
  master_kyc:        '/api/v1/kyc/',
  master_customers:  '/api/v1/customers/',
  master_designers:  '/api/v1/designers/',
  orders:            '/api/v1/orders/',
  drafts:            '/api/v1/drafts/',
  findings:          '/api/v1/findings/',
  accounting:        '/api/accounting/',
  hr:                '/api/hr/',
};

const SCOPE_LABELS = {
  master_inventory:  'Master Inventory Sheet',
  master_products:   'Master Product Sheet',
  product_inventory: 'Product Inventory',
  master_jobs:       'Master Job Sheet',
  master_workforce:  'Master Workforce Sheet',
  master_kyc:        'Master KYC Sheet',
  master_customers:  'Master Customer Sheet',
  master_designers:  'Master Designer Sheet',
  orders:            'Orders',
  drafts:            'Drafts',
  findings:          'Finding Sheet',
  accounting:        'Accounting',
  hr:                'HR Section',
};

/**
 * Displays the raw API key exactly once, and — when apiBaseUrl + pageScopes are provided —
 * also renders a full integration card the developer can copy in one click.
 */
export default function APIKeyCopyOnce({ rawKey, onDismiss, apiBaseUrl, pageScopes, keyName }) {
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const hasIntegration = apiBaseUrl && pageScopes && pageScopes.length > 0;

  async function handleCopyKey() {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* silent */ }
  }

  async function handleCopyAll() {
    const base = apiBaseUrl.replace(/\/$/, '');
    const endpointLines = pageScopes
      .map((s) => `  ${SCOPE_LABELS[s] || s}: ${base}${SCOPE_ENDPOINT_MAP[s] || '/api/v1/'}`)
      .join('\n');

    const text = [
      '=== API Integration Details ===',
      keyName ? `Key Name: ${keyName}` : '',
      '',
      '--- Environment Variables ---',
      `PRODUCTION_SOFTWARE_API_URL=${base}`,
      `PRODUCTION_SOFTWARE_API_KEY=${rawKey}`,
      '',
      '--- Request Header ---',
      `X-API-Key: ${rawKey}`,
      '',
      '--- Accessible Endpoints (GET = list, GET /{id}/ = detail) ---',
      endpointLines,
      '',
      '--- Response Fields (per row) ---',
      '  master_sku       — Master SKU',
      '  final_sku        — Final / variant SKU',
      '  actual_quantity  — Quantity in stock',
      '  unit             — Unit of measurement (e.g. PCS)',
      '  location         — Storage location',
      '',
      '--- Example Request ---',
      `curl -H "X-API-Key: ${rawKey}" ${base}${SCOPE_ENDPOINT_MAP[pageScopes[0]] || '/api/v1/'}`,
    ].filter((l) => l !== undefined).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-4">
      {/* ── Raw key copy box ── */}
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
            onClick={handleCopyKey}
            className="shrink-0 text-cool-gray hover:text-midnight-ink transition"
            title="Copy API key"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <p className="text-xs text-amber-700">
          Share this key with the software integrator. Store it securely — once you close this
          dialog you cannot retrieve the key, only regenerate it.
        </p>

        {onDismiss && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onDismiss}>
              I&apos;ve copied the key
            </Button>
          </div>
        )}
      </div>

      {/* ── Integration card (shown when base URL + scopes are available) ── */}
      {hasIntegration && (() => {
        const base = apiBaseUrl.replace(/\/$/, '');
        return (
          <div className="rounded-xl border border-soft-border bg-cloud-gray/40 p-4 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-midnight-ink">Integration Details</p>
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 text-xs text-trust-blue hover:underline"
                title="Copy full integration info as plain text"
              >
                {copiedAll
                  ? <><Check className="h-3.5 w-3.5" /> Copied!</>
                  : <><Copy className="h-3.5 w-3.5" /> Copy all</>
                }
              </button>
            </div>

            {/* Env vars */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-cool-gray uppercase tracking-wide">Environment Variables</p>
              <div className="space-y-1 font-mono text-xs bg-white border border-soft-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-cool-gray select-none">PRODUCTION_SOFTWARE_API_URL=</span>
                  <span className="text-midnight-ink break-all">{base}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cool-gray select-none">PRODUCTION_SOFTWARE_API_KEY=</span>
                  <span className="text-midnight-ink break-all">{rawKey}</span>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-cool-gray uppercase tracking-wide">Request Header</p>
              <div className="font-mono text-xs bg-white border border-soft-border rounded-lg p-3">
                <span className="text-cool-gray">X-API-Key: </span>
                <span className="text-midnight-ink break-all">{rawKey}</span>
              </div>
            </div>

            {/* Endpoints */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-cool-gray uppercase tracking-wide">Accessible Endpoints</p>
              <div className="overflow-hidden rounded-lg border border-soft-border">
                <table className="w-full text-xs">
                  <thead className="bg-cloud-gray border-b border-soft-border">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-cool-gray">Page</th>
                      <th className="text-left px-3 py-2 font-medium text-cool-gray">Endpoint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft-border bg-white">
                    {pageScopes.map((s) => (
                      <tr key={s}>
                        <td className="px-3 py-2 text-midnight-ink font-medium whitespace-nowrap">
                          {SCOPE_LABELS[s] || s}
                        </td>
                        <td className="px-3 py-2 font-mono text-trust-blue break-all">
                          {base}{SCOPE_ENDPOINT_MAP[s] || '/api/v1/'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-cool-gray">
                Append <code className="font-mono bg-cloud-gray px-1 rounded">?page_size=200</code> to retrieve more rows.
                Use <code className="font-mono bg-cloud-gray px-1 rounded">/{'{id}'}/</code> to fetch a single record.
              </p>
            </div>

            {/* Response fields */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-cool-gray uppercase tracking-wide">Response Fields (per row)</p>
              <div className="overflow-hidden rounded-lg border border-soft-border">
                <table className="w-full text-xs">
                  <thead className="bg-cloud-gray border-b border-soft-border">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-cool-gray">Field</th>
                      <th className="text-left px-3 py-2 font-medium text-cool-gray">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft-border bg-white">
                    {[
                      ['master_sku',      'Master SKU (links back to the product)'],
                      ['final_sku',       'Final / variant SKU for this inventory entry'],
                      ['actual_quantity', 'Quantity currently in stock'],
                      ['unit',            'Unit of measurement (e.g. PCS, GMS)'],
                      ['location',        'Storage location'],
                    ].map(([field, desc]) => (
                      <tr key={field}>
                        <td className="px-3 py-2 font-mono text-trust-blue whitespace-nowrap">{field}</td>
                        <td className="px-3 py-2 text-midnight-ink">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Example curl */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-cool-gray uppercase tracking-wide">Example Request</p>
              <div className="font-mono text-xs bg-white border border-soft-border rounded-lg p-3 break-all text-midnight-ink">
                curl -H &quot;X-API-Key: {rawKey}&quot; &nbsp;
                {base}{SCOPE_ENDPOINT_MAP[pageScopes[0]] || '/api/v1/'}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
