'use client';

import dynamic from 'next/dynamic';

const MasterInventorySheet = dynamic(() => import('@/components/master_inventory_sheet'), { ssr: false });

export default function MasterInventorySheetPage() {
  return <MasterInventorySheet />;
}
