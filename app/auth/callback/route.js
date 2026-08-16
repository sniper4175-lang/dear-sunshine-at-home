import {
    NextResponse
} from 'next/server';

import {
    createServerClient
} from '@supabase/ssr';

import {
    cookies
} from 'next/headers';


export async function GET(
    request
) {

    try {

        const requestUrl =
            new URL(
                request.url
            );


        const code =
            requestUrl
                .searchParams
                .get(
                    'code'
                );


        const next =
            requestUrl
                .searchParams
                .get(
                    'next'
                ) ||
            '/';


        /*
         * code가 없으면 로그인 화면으로
         */
        if (!code) {

            return NextResponse.redirect(
                new URL(
                    '/login',
                    request.url
                )
            );

        }


        const cookieStore =
            await cookies();


        const supabase =
            createServerClient(

                process.env
                    .NEXT_PUBLIC_SUPABASE_URL,

                process.env
                    .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,

                {
                    cookies: {

                        getAll() {

                            return cookieStore
                                .getAll();

                        },


                        setAll(
                            cookiesToSet
                        ) {

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

                        }

                    }
                }

            );


        /*
         * PKCE code → 로그인 세션 교환
         */
        const {
            error
        } =
            await supabase
                .auth
                .exchangeCodeForSession(
                    code
                );


        if (error) {

            console.error(
                'exchangeCodeForSession error:',
                error
            );


            return NextResponse.redirect(
                new URL(
                    '/forgot-password?error=invalid_link',
                    request.url
                )
            );

        }


        /*
         * 비밀번호 변경 페이지로 이동
         */
        return NextResponse.redirect(
            new URL(
                next,
                request.url
            )
        );


    } catch (error) {

        console.error(
            'AUTH CALLBACK ERROR:',
            error
        );


        return NextResponse.redirect(
            new URL(
                '/forgot-password?error=callback_error',
                request.url
            )
        );

    }

}