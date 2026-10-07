import { PaymentCheckout } from '@/components/payment-checkout';
export const metadata={title:'Project payment — DeliveryProof',referrer:'no-referrer'};
export default async function Page({params}:{params:Promise<{token:string}>}) { return <PaymentCheckout token={(await params).token}/>; }
