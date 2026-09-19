import { redirect } from 'next/navigation';

export const metadata = {
    title: '이용권·환불 안내 | Dear Sunshine Home'
};

export default function SubscriptionPolicyPage() {
    redirect('/refund');
}
