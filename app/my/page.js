import {
    getCurrentMembership
} from '../../lib/membership';

import MyPageClient
    from '../../components/MyPageClient';


export const dynamic =
    'force-dynamic';


export default async function MyPage() {

    const {
        user,
        membership
    } =
        await getCurrentMembership();


    return (
        <MyPageClient
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