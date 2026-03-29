'use client';

import dynamic from 'next/dynamic';

const MasterDesignerSheet = dynamic(() => import('@/components/master_designer_sheet'), { ssr: false });

export default function MasterDesignerSheetPage() {
  return <MasterDesignerSheet />;
}
