'use client';
import dynamic from 'next/dynamic';

const MasterKYCSheet = dynamic(() => import('@/components/master_kyc_sheet'), { ssr: false });

export default function MasterKYCPage() {
  return <MasterKYCSheet />;
}
