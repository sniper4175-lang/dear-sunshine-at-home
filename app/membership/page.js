import {
    getCurrentMembership
} from '../../lib/membership';

import { redirect } from 'next/navigation';

import MembershipClient
    from '../../components/MembershipClient';


export const dynamic =
    'force-dynamic';


export default async function MembershipPage() {

    const {
        user,
        membership,
        billingProfile
    } =
        await getCurrentMembership();


    if (
        membership?.product_type === 'home_package'
    ) {
        redirect('/my');
    }


    return (
        <MembershipClient
            loggedIn={
                Boolean(user)
            }
            email={
                user?.email || ''
            }
            membership={
                membership
            }
            billingProfile={
                billingProfile
            }
        />
    );
}