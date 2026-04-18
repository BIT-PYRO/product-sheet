'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function dedupe(values) {
  const seen = new Set();
  const out = [];
  values.forEach((value) => {
    const text = String(value || '').trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(text);
  });
  return out;
}

export default function CreatableFilterPopover({
  label,
  selectedValue,
  onSelectValue,
  options = [],
  className = '',
  storageKey = '',
  onAddOption = null,
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draftValue, setDraftValue] = useState('');
  const [savedOptions, setSavedOptions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setSavedOptions(dedupe(parsed));
    } catch {
      setSavedOptions([]);
    }
  }, [storageKey]);

  const mergedOptions = useMemo(() => dedupe([...(options || []), ...savedOptions]), [options, savedOptions]);

  const persistOptions = (nextOptions) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextOptions));
    } catch {
      // Ignore storage write failures.
    }
  };

  const addOption = async () => {
    const next = String(draftValue || '').trim();
    if (!next) return;
    if (onAddOption) {
      setIsSaving(true);
      try { await onAddOption(next); } catch { /* ignore */ }
      setIsSaving(false);
    }
    const merged = dedupe([...savedOptions, next]);
    setSavedOptions(merged);
    persistOptions(merged);
    onSelectValue(next);
    setDraftValue('');
    setIsAddOpen(false);
  };

  const clearSelection = () => {
    onSelectValue('');
    setDraftValue('');
    setIsAddOpen(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1 text-sm border rounded bg-white text-midnight-ink border-trust-blue/40 ${className}`}
        >
          <span className="truncate">{selectedValue || label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="z-[130] w-56 max-h-64 overflow-y-auto p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            clearSelection();
          }}
          className="block w-full rounded px-1 py-1.5 text-left text-sm text-cool-gray hover:bg-cloud-gray"
        >
          Select {label}
        </button>

        {mergedOptions.map((option) => (
          <button
            key={option}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelectValue(option);
              setIsAddOpen(false);
              setDraftValue('');
            }}
            className="block w-full rounded px-1 py-1.5 text-left text-sm text-midnight-ink hover:bg-cloud-gray"
          >
            {option}
          </button>
        ))}

        <div
          className="mt-1 flex items-center gap-1 border-t border-soft-border px-1 py-1.5 text-sm text-trust-blue cursor-pointer hover:bg-cloud-gray"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsAddOpen(true);
            setDraftValue('');
          }}
        >
          + Add {label}
        </div>

        {isAddOpen && (
          <div className="mt-2 border border-soft-border rounded-md p-2 bg-white">
            <input
              type="text"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}`}
              className="h-8 text-sm w-full bg-white rounded-md border border-trust-blue/40 px-2"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsAddOpen(false);
                  setDraftValue('');
                }}
                className="text-xs text-cool-gray hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addOption();
                }}
                disabled={!draftValue.trim() || isSaving}
                className="text-xs text-trust-blue hover:underline disabled:opacity-40"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {mergedOptions.length === 0 && <p className="text-sm text-cool-gray">No values</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
