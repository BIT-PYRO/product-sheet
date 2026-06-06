'use client';

import dynamic from 'next/dynamic';

const FrontendDashboard = dynamic(() => import('@/components/frontend_dashboard'), { ssr: false });

export default function FrontendPage() {
  return <FrontendDashboard />;
}
