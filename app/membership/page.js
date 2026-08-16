import {
    getCurrentMembership
} from '../../lib/membership';

import MembershipClient
    from '../../components/MembershipClient';


export const dynamic =
    'force-dynamic';


export default async function MembershipPage() {

    const {
        user,
        membership
    } =
        await getCurrentMembership();


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
        />
    );
}