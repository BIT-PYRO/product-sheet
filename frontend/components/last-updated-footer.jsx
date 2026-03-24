'use client';

import { useEffect, useState } from 'react';

export default function LastUpdatedFooter({ timestamp, username, compact = false }) {
  const [displayTime, setDisplayTime] = useState(null);

  useEffect(() => {
    setDisplayTime(timestamp || new Date());
  }, [timestamp]);

  const formatted = displayTime
    ? new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(displayTime)
    : '--/--/----, --:--:--';

  const inner = (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <span>Last updated:</span>
      <span suppressHydrationWarning className="font-semibold text-midnight-ink">{formatted}</span>
      {username && (
        <>
          <span className="mx-1 text-cool-gray/50">·</span>
          <span>by</span>
          <span className="font-semibold text-midnight-ink">@{username}</span>
        </>
      )}
    </>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-cool-gray select-none">
        {inner}
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-soft-border pt-3 pb-6 flex items-center justify-end gap-1.5 text-xs text-cool-gray select-none">
      {inner}
    </div>
  );
}
