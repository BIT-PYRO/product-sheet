'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * SortPopover — a small dropdown button that lets the user pick a sort column.
 *
 * Props
 *   columns   : Array<{id: string, label: string}>  — sortable column list
 *   sortField  : string  — currently active sort field id ('' = unsorted)
 *   sortDir    : 'asc' | 'desc'
 *   onSort(field)  : called when the user clicks a column;
 *                    parent should toggle dir if field === sortField, else set asc
 *   onClear()      : called when the user clicks the × to clear sort
 */
export default function SortPopover({ columns, sortField, sortDir, onSort, onClear }) {
  const activeCol = columns.find((c) => c.id === sortField);

  const DirIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 h-8 text-sm font-medium transition ${
            sortField
              ? 'border-trust-blue bg-trust-blue/10 text-trust-blue'
              : 'border-midnight-ink bg-white text-midnight-ink hover:bg-gray-50'
          }`}
        >
          {sortField ? (
            <DirIcon className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>{activeCol ? activeCol.label : 'Sort'}</span>
          {sortField && (
            <span
              role="button"
              aria-label="Clear sort"
              className="ml-0.5 rounded-full hover:bg-trust-blue/20 p-0.5"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClear();
              }}
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[180px] p-1">
        {columns.map((col) => (
          <button
            key={col.id}
            type="button"
            onClick={() => onSort(col.id)}
            className={`flex w-full items-center justify-between rounded px-3 py-1.5 text-sm transition hover:bg-cloud-gray ${
              sortField === col.id ? 'text-trust-blue font-medium' : 'text-midnight-ink'
            }`}
          >
            {col.label}
            {sortField === col.id && (
              <DirIcon className="h-3.5 w-3.5 ml-2 shrink-0" />
            )}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
