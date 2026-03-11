'use client';

import { useEffect, useState } from 'react';

export default function DateTimeStamp({ className = '' }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());

    const timerId = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const formatted = now
    ? new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
      }).format(now)
    : '--/--/----, --:--:--';

  return (
    <span suppressHydrationWarning className={`text-sm font-medium text-cool-gray whitespace-nowrap ${className}`.trim()}>
      {formatted}
    </span>
  );
}
