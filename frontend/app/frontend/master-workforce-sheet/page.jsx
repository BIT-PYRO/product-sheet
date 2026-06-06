'use client';

import dynamic from 'next/dynamic';

const MasterWorkforceSheet = dynamic(() => import('@/components/master_workforce_sheet'), { ssr: false });

export default function MasterWorkforceSheetPage() {
  return <MasterWorkforceSheet />;
}
