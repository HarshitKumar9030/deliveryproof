import { ClientDelivery } from '@/components/client-delivery';
export const metadata = { title: 'Confirm delivery — DeliveryProof', referrer: 'no-referrer', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <ClientDelivery token={(await params).token}/>;
}
