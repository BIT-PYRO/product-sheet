'use client';

import dynamic from 'next/dynamic';

const MasterJobSheet = dynamic(() => import('@/components/master_job_sheet'), { ssr: false });

export default function MasterJobSheetPage() {
  return <MasterJobSheet />;
}
