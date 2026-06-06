'use client';

import dynamic from 'next/dynamic';

const MasterProductSheet = dynamic(() => import('@/components/master_product_sheet'), { ssr: false });

export default function MasterProductSheetPage() {
  return <MasterProductSheet />;
}
