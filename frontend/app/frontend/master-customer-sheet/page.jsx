'use client';

import dynamic from 'next/dynamic';

const MasterCustomerSheet = dynamic(() => import('@/components/master-customer-sheet'), { ssr: false });

export default function MasterCustomerSheetPage() {
  return <MasterCustomerSheet />;
}
