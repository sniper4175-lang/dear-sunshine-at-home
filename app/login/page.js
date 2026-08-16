'use client';

import {
    useState
} from 'react';

import {
    useRouter,
    useSearchParams
} from 'next/navigation';

import {
    createBrowserSupabase
} from '../../lib/supabase-browser';


export default function LoginPage() {

    const router =
        useRouter();

    const searchParams =
        useSearchParams();


    const [
        email,
        setEmail
    ] =
        useState('');


    const [
        password,
        setPassword
    ] =
        useState('');


    const [
        loading,
        setLoading
    ] =
        useState(false);


    const [
        error,
        setError
    ] =
        useState('');


    /*
     * 로그인 후 돌아갈 페이지
     *
     * 예:
     * /login?next=/song/toddler-brown-bear
     */
    const next =
        searchParams.get(
            'next'
        );


    /*
     * 외부 URL로 이동하는 것을 막기 위해
     * "/"로 시작하는 내부 경로만 허용
     */
    const redirectPath =
        next &&
        next.startsWith('/') &&
        !next.startsWith('//')
            ? next
            : '/';


    async function login(
        e
    ) {

        e.preventDefault();


        setLoading(
            true
        );

        setError(
            ''
        );


        try {

            const supabase =
                createBrowserSupabase();


            const {
                error
            } =
                await supabase
                    .auth
                    .signInWithPassword({
                        email:
                            email.trim(),

                        password
                    });


            if (error) {

                setError(
                    '이메일 또는 비밀번호를 확인해주세요.'
                );

                return;

            }


            /*
             * 로그인 성공 후
             * 원래 보던 페이지로 이동
             */
            router.replace(
                redirectPath
            );


            router.refresh();


        } catch (e) {

            console.error(e);

            setError(
                '로그인 중 오류가 발생했습니다.'
            );


        } finally {

            setLoading(
                false
            );

        }

    }


    return (

        <main
            style={{
                maxWidth:
                    420,

                margin:
                    '0 auto',

                padding:
                    '70px 22px'
            }}
        >

            <div
                style={{
                    textAlign:
                        'center',

                    marginBottom:
                        34
                }}
            >

                <div
                    style={{
                        fontSize:
                            46
                    }}
                >
                    ☀️
                </div>


                <p className="eyebrow">
                    DEAR SUNSHINE AT HOME
                </p>


                <h1>
                    로그인
                </h1>


                <p className="page-copy">
                    Dear Sunshine 영어노래를
                    집에서도 만나보세요.
                </p>

            </div>


            <form
                onSubmit={
                    login
                }
                style={{
                    display:
                        'grid',

                    gap:
                        14
                }}
            >

                <label>

                    이메일

                    <input
                        type="email"
                        value={
                            email
                        }
                        onChange={e =>
                            setEmail(
                                e.target.value
                            )
                        }
                        required
                        autoComplete="email"
                        style={{
                            display:
                                'block',

                            width:
                                '100%',

                            marginTop:
                                7,

                            padding:
                                14,

                            borderRadius:
                                14,

                            border:
                                '1px solid #eee3d5'
                        }}
                    />

                </label>


                <label>

                    비밀번호

                    <input
                        type="password"
                        value={
                            password
                        }
                        onChange={e =>
                            setPassword(
                                e.target.value
                            )
                        }
                        required
                        autoComplete="current-password"
                        style={{
                            display:
                                'block',

                            width:
                                '100%',

                            marginTop:
                                7,

                            padding:
                                14,

                            borderRadius:
                                14,

                            border:
                                '1px solid #eee3d5'
                        }}
                    />

                </label>


                <div
                    style={{
                        textAlign:
                            'right',

                        marginTop:
                            -4
                    }}
                >
                    <a
                        href="/forgot-password"
                        style={{
                            fontSize:
                                13
                        }}
                    >
                        비밀번호를 잊으셨나요?
                    </a>
                </div>


                {error && (

                    <p
                        style={{
                            margin:
                                0,

                            color:
                                '#bd3d3d',

                            fontSize:
                                13
                        }}
                    >
                        {error}
                    </p>

                )}


                <button
                    className="primary-button wide"
                    type="submit"
                    disabled={
                        loading
                    }
                >

                    {
                        loading
                            ? '로그인 중...'
                            : '로그인'
                    }

                </button>

            </form>


            <div
                style={{
                    textAlign:
                        'center',

                    marginTop:
                        24
                }}
            >

                <span
                    style={{
                        color:
                            '#8d8175'
                    }}
                >
                    처음 이용하시나요?{' '}
                </span>


                <a href="/signup">
                    회원가입
                </a>

            </div>

        </main>

    );
}