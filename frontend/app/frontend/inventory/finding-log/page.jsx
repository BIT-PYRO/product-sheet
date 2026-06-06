import { redirect } from 'next/navigation';

export default function FindingLogRedirect() {
  redirect('/inventory/product-log');
}
