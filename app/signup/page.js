'use client';

import {
    useState
} from 'react';

import {
    useRouter
} from 'next/navigation';

import Link from 'next/link';

import {
    createBrowserSupabase
} from '../../lib/supabase-browser';


export default function SignupPage() {

    const router =
        useRouter();


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
        passwordConfirm,
        setPasswordConfirm
    ] =
        useState('');


    const [
        loading,
        setLoading
    ] =
        useState(false);


    const [
        message,
        setMessage
    ] =
        useState('');


    const [
        error,
        setError
    ] =
        useState('');


    async function signup(
        e
    ) {

        e.preventDefault();

        setError('');
        setMessage('');


        if (
            password.length < 8
        ) {

            setError(
                '비밀번호는 8자 이상으로 입력해주세요.'
            );

            return;

        }


        if (
            password !==
            passwordConfirm
        ) {

            setError(
                '비밀번호가 서로 일치하지 않습니다.'
            );

            return;

        }


        setLoading(true);


        try {

            const supabase =
                createBrowserSupabase();


            const {
                data,
                error
            } =
                await supabase
                    .auth
                    .signUp({
                        email:
                            email.trim(),

                        password,

                        options: {

                            emailRedirectTo:
                                `${window.location.origin}/login`

                        }
                    });


            if (error) {

                console.error(
                    error
                );

                setError(
                    error.message ||
                    '회원가입 중 오류가 발생했습니다.'
                );

                return;

            }


            /*
             * 이메일 확인이 비활성화된 경우
             * 즉시 session이 만들어질 수도 있음
             */
            if (
                data.session
            ) {

                router.push(
                    '/'
                );

                router.refresh();

                return;

            }


            /*
             * 이메일 확인이 필요한 경우
             */
            setMessage(
                '가입 확인 메일을 보냈어요. 이메일의 확인 링크를 눌러 가입을 완료해주세요.'
            );


        } catch (e) {

            console.error(e);

            setError(
                '회원가입 중 오류가 발생했습니다.'
            );


        } finally {

            setLoading(false);

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
                    '60px 22px 100px'
            }}
        >

            <div
                style={{
                    textAlign:
                        'center',

                    marginBottom:
                        32
                }}
            >

                <div
                    style={{
                        fontSize:
                            48,

                        marginBottom:
                            12
                    }}
                >
                    ☀️
                </div>


                <p className="eyebrow">
                    DEAR SUNSHINE AT HOME
                </p>


                <h1>
                    회원가입
                </h1>


                <p className="page-copy">
                    Dear Sunshine 영어노래를
                    집에서도 이어서 만나보세요.
                </p>

            </div>


            <form
                onSubmit={
                    signup
                }
                style={{
                    display:
                        'grid',

                    gap:
                        16
                }}
            >

                <label>
                    이메일

                    <input
                        className="normal"
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
                        placeholder="example@email.com"
                        style={{
                            width:
                                '100%',

                            marginTop:
                                7
                        }}
                    />
                </label>


                <label>
                    비밀번호

                    <input
                        className="normal"
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
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="8자 이상 입력해주세요."
                        style={{
                            width:
                                '100%',

                            marginTop:
                                7
                        }}
                    />
                </label>


                <label>
                    비밀번호 확인

                    <input
                        className="normal"
                        type="password"
                        value={
                            passwordConfirm
                        }
                        onChange={e =>
                            setPasswordConfirm(
                                e.target.value
                            )
                        }
                        required
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="비밀번호를 한 번 더 입력해주세요."
                        style={{
                            width:
                                '100%',

                            marginTop:
                                7
                        }}
                    />
                </label>


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


                {message && (

                    <div
                        style={{
                            padding:
                                15,

                            borderRadius:
                                14,

                            background:
                                '#fff8e8',

                            lineHeight:
                                1.6
                        }}
                    >
                        {message}
                    </div>

                )}


                <button
                    type="submit"
                    className="primary-button wide"
                    disabled={
                        loading
                    }
                >
                    {
                        loading
                            ? '가입 중...'
                            : '회원가입'
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
                    이미 계정이 있으신가요?{' '}
                </span>


                <Link href="/login">
                    로그인
                </Link>

            </div>

        </main>

    );
}