import { unstable_cache } from 'next/cache';

import {
    createAdminSupabase
} from './supabase-server';


const getCachedUserPrograms = unstable_cache(
    async (userId) => {
        if (!userId) {
            return [];
        }

        const db = createAdminSupabase();

        const {
            data,
            error
        } = await db
            .from('ds_user_program_access')
            .select('program')
            .eq('user_id', userId);

        if (error) {
            console.error(
                'getUserPrograms error:',
                {
                    message: error?.message,
                    code: error?.code,
                    details: error?.details,
                    hint: error?.hint
                }
            );

            throw new Error(
                'PROGRAM_ACCESS_LOOKUP_FAILED'
            );
        }

        return [
            ...new Set(
                (data || [])
                    .map((row) => row.program)
                    .filter(Boolean)
            )
        ];
    },
    ['ds-user-program-access-v3'],
    {
        /* 관리자에서 클래스 권한을 바꿔도 최대 30초 안에 갱신 */
        revalidate: 30
    }
);


/*
 * 서버 전용 프로그램 권한 조회
 * ds_user_program_access를 단일 기준으로 사용합니다.
 *
 * 기존 호출부 호환을 위해 첫 번째 db 인자는 유지하지만,
 * 실제 조회는 userId 기준 Data Cache를 공유합니다.
 */
export async function getUserPrograms(
    _db,
    userId
) {
    return getCachedUserPrograms(String(userId || ''));
}
