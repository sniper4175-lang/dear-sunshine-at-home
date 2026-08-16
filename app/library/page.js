import {
    getSongs
} from '../../lib/content';

import {
    getCurrentMembership
} from '../../lib/membership';

import LibraryClient
    from '../../components/LibraryClient';


export const dynamic =
    'force-dynamic';


export default async function LibraryPage() {

    const songs =
        await getSongs();


    const {
        user,
        membership
    } =
        await getCurrentMembership();


    return (
        <LibraryClient
            songs={
                songs
            }
            loggedIn={
                Boolean(user)
            }
            membership={
                membership
            }
        />
    );
}