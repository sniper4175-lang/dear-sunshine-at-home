'use client';

import {
    useEffect,
    useState
} from 'react';

import {
    useRouter
} from 'next/navigation';

import {
    createBrowserSupabase
} from '../../lib/supabase-browser';


export default function ResetPasswordPage() {

    const router =
        useRouter();


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
        preparing,
        setPreparing
    ] =
        useState(true);


    const [
        ready,
        setReady
    ] =
        useState(false);


    const [
        error,
        setError
    ] =
        useState('');


    /*
     * =====================================
     * 비밀번호 재설정 세션 확인
     * =====================================
     */
    useEffect(
        () => {

            async function prepareRecovery() {

                const supabase =
                    createBrowserSupabase();


                try {

                    const {
                        data: {
                            user
                        },
                        error:
                            userError
                    } =
                        await supabase
                            .auth
                            .getUser();


                    if (
                        userError ||
                        !user
                    ) {

                        setError(
                            '비밀번호를 변경할 수 있는 인증 정보가 없습니다. 재설정 메일을 다시 요청해주세요.'
                        );

                        setReady(
                            false
                        );

                        return;

                    }


                    /*
                     * 정상적으로 recovery session이
                     * 만들어진 상태
                     */
                    setReady(
                        true
                    );


                } catch (e) {

                    console.error(
                        'password recovery session error:',
                        e
                    );


                    setError(
                        '비밀번호 재설정 정보를 확인하지 못했습니다.'
                    );


                    setReady(
                        false
                    );


                } finally {

                    setPreparing(
                        false
                    );

                }

            }


            prepareRecovery();

        },
        []
    );


    /*
     * =====================================
     * 새 비밀번호 저장
     * =====================================
     */
    async function changePassword(
        e
    ) {

        e.preventDefault();

        setError('');


        if (!ready) {

            setError(
                '비밀번호 재설정 인증이 완료되지 않았습니다.'
            );

            return;

        }


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


        setLoading(
            true
        );


        try {

            const supabase =
                createBrowserSupabase();


            const {
                error:
                    updateError
            } =
                await supabase
                    .auth
                    .updateUser({
                        password
                    });


            if (updateError) {

                console.error(
                    'password update error:',
                    updateError
                );


                setError(
                    updateError.message ||
                    '비밀번호 변경에 실패했습니다.'
                );

                return;

            }


            /*
             * 비밀번호 재설정에 사용된
             * 임시 로그인 세션 종료
             */
            const {
                error:
                    signOutError
            } =
                await supabase
                    .auth
                    .signOut();


            if (signOutError) {

                console.error(
                    'sign out after password reset:',
                    signOutError
                );

            }


            alert(
                '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.'
            );


            router.replace(
                '/login'
            );


            router.refresh();


        } catch (e) {

            console.error(
                'password change error:',
                e
            );


            setError(
                '비밀번호 변경 중 오류가 발생했습니다.'
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
                            48
                    }}
                >
                    ☀️
                </div>


                <p className="eyebrow">
                    DEAR SUNSHINE SONG PLAY
                </p>


                <h1>
                    새 비밀번호 설정
                </h1>


                <p className="page-copy">
                    앞으로 사용할 새 비밀번호를 입력해주세요.
                </p>

            </div>



            {/* 인증 상태 확인 중 */}

            {preparing && (

                <div
                    style={{
                        textAlign:
                            'center',

                        padding:
                            '30px 0'
                    }}
                >

                    <p>
                        인증 정보를 확인하고 있어요...
                    </p>

                </div>

            )}



            {/* 인증 실패 */}

            {!preparing &&
                !ready && (

                    <div
                        style={{
                            textAlign:
                                'center'
                        }}
                    >

                        <div
                            style={{
                                padding:
                                    18,

                                marginBottom:
                                    18,

                                borderRadius:
                                    14,

                                background:
                                    '#fff0f0',

                                color:
                                    '#bd3d3d',

                                lineHeight:
                                    1.6
                            }}
                        >
                            {
                                error ||
                                '비밀번호 재설정 링크를 확인할 수 없습니다.'
                            }
                        </div>


                        <button
                            type="button"
                            className="primary-button wide"
                            onClick={() =>
                                router.push(
                                    '/forgot-password'
                                )
                            }
                        >
                            재설정 메일 다시 받기
                        </button>

                    </div>

                )}



            {/* 정상 인증 */}

            {!preparing &&
                ready && (

                    <form
                        onSubmit={
                            changePassword
                        }
                        style={{
                            display:
                                'grid',

                            gap:
                                16
                        }}
                    >

                        <label>
                            새 비밀번호

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
                                minLength={8}
                                required
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
                            새 비밀번호 확인

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
                                minLength={8}
                                required
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


                        <button
                            type="submit"
                            className="primary-button wide"
                            disabled={
                                loading
                            }
                        >
                            {
                                loading
                                    ? '변경 중...'
                                    : '비밀번호 변경'
                            }
                        </button>

                    </form>

                )}

        </main>

    );
}