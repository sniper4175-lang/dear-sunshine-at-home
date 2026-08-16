import {
    createClient
} from '@supabase/supabase-js';

import {
    createServerClient
} from '@supabase/ssr';

import {
    cookies
} from 'next/headers';


/*
 * ==========================================
 * 사용자 로그인 세션용 Supabase
 *
 * Server Component / Route Handler에서
 * 현재 로그인 사용자를 확인할 때 사용
 * ==========================================
 */
export async function createServerSupabase() {

    const cookieStore =
        await cookies();


    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;


    const publishableKey =
        process.env
            .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env
            .NEXT_PUBLIC_SUPABASE_ANON_KEY;


    if (
        !url ||
        !publishableKey
    ) {

        throw new Error(
            'Supabase 공개 환경변수가 설정되지 않았습니다.'
        );

    }


    return createServerClient(
        url,
        publishableKey,
        {
            cookies: {

                getAll() {

                    return cookieStore
                        .getAll();

                },


                setAll(
                    cookiesToSet
                ) {

                    try {

                        cookiesToSet.forEach(
                            ({
                                name,
                                value,
                                options
                            }) => {

                                cookieStore.set(
                                    name,
                                    value,
                                    options
                                );

                            }
                        );

                    } catch {

                        /*
                         * Server Component에서는
                         * 쿠키 쓰기가 허용되지 않을 수 있음.
                         *
                         * 읽기에는 문제가 없고,
                         * 세션 갱신은 proxy에서 처리.
                         */

                    }

                }

            }
        }
    );

}



/*
 * ==========================================
 * 관리자용 Supabase
 *
 * Service Role / Secret Key 사용
 *
 * 절대 브라우저에서 사용하면 안 됨
 * ==========================================
 */
export function createAdminSupabase() {

    const url =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;


    const secretKey =
        process.env
            .SUPABASE_SECRET_KEY ||
        process.env
            .SUPABASE_SERVICE_ROLE_KEY;


    if (
        !url ||
        !secretKey
    ) {

        throw new Error(
            'Supabase 환경변수가 설정되지 않았습니다.'
        );

    }


    return createClient(
        url,
        secretKey,
        {
            auth: {

                persistSession:
                    false,

                autoRefreshToken:
                    false

            }
        }
    );

}