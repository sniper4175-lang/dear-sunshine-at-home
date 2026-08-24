'use client';

import {
    useRouter
} from 'next/navigation';

import {
    createBrowserSupabase
} from '../lib/supabase-browser';


export default function MembershipClient({
    loggedIn,
    email,
    membership
}) {

    const router =
        useRouter();


    async function logout() {

        const supabase =
            createBrowserSupabase();


        const {
            error
        } =
            await supabase
                .auth
                .signOut();


        if (error) {

            alert(
                '로그아웃 중 오류가 발생했습니다.'
            );

            return;

        }


        router.push(
            '/login'
        );

        router.refresh();

    }


    function requireLogin() {

        if (!loggedIn) {

            router.push(
                '/login'
            );

            return false;

        }


        return true;

    }


    function startMembership() {

        if (!requireLogin()) {
            return;
        }


        /*
         * 실제 정기결제 연결 전 임시 안내
         */
        alert(
            '첫 7일 무료 후 월 12,900원 정기결제 기능은 다음 단계에서 연결합니다.'
        );

    }


    return (

        <section className="section top-section">


            <p className="eyebrow">
                MEMBERSHIP
            </p>


            <h1>
                DEAR SUNSHINE MONTHLY SONG CLUB
            </h1>


            <p className="page-copy">
                아이들이 사랑한 Dear Sunshine의 노래,
                <br />
                이제 집에서도 만나요!
            </p>


            <p className="page-copy">
                Dear Sunshine 정규 수강생만 가입할 수 있는
                특별한 Song Membership ♡
            </p>



            {/* 현재 회원 상태 */}

            <div
                className="content-card"
                style={{
                    marginBottom: 22
                }}
            >

                <p className="eyebrow">
                    MY MEMBERSHIP
                </p>


                {!loggedIn ? (

                    <>

                        <h2>
                            로그인이 필요해요
                        </h2>


                        <p className="muted">
                            로그인 후 현재 멤버십과
                            이용 가능한 콘텐츠를 확인할 수 있어요.
                        </p>


                        <button
                            type="button"
                            className="primary-button wide"
                            onClick={() =>
                                router.push(
                                    '/login'
                                )
                            }
                        >
                            로그인
                        </button>

                    </>

                ) : membership ? (

                    <>

                        <h2>
                            ☀️ Song Club 이용 중
                        </h2>


                        <p className="muted">
                            {email}
                        </p>


                        <div
                            style={{
                                marginTop: 14,
                                padding: 14,
                                borderRadius: 14,
                                background: '#fff8ea'
                            }}
                        >

                            <strong>
                                Dear Sunshine Monthly Song Club
                            </strong>


                            {membership.starts_at && (

                                <p
                                    style={{
                                        marginBottom:
                                            membership.ends_at
                                                ? 6
                                                : 0
                                    }}
                                >
                                    이용 시작일:{' '}
                                    {
                                        String(
                                            membership.starts_at
                                        ).slice(
                                            0,
                                            10
                                        )
                                    }
                                </p>

                            )}


                            {membership.ends_at && (

                                <p
                                    style={{
                                        marginBottom: 0
                                    }}
                                >
                                    이용 종료일:{' '}
                                    {
                                        String(
                                            membership.ends_at
                                        ).slice(
                                            0,
                                            10
                                        )
                                    }
                                </p>

                            )}

                        </div>

                    </>

                ) : (

                    <>

                        <h2>
                            가입된 멤버십이 없어요
                        </h2>


                        <p className="muted">
                            Song Club에 가입하면
                            수업에서 만난 노래와 자료를
                            집에서도 이어서 이용할 수 있어요.
                        </p>

                    </>

                )}

            </div>



            {/* 단일 멤버십 */}

            <div
                className="content-card"
                style={{
                    marginBottom: 18
                }}
            >

                <p className="eyebrow">
                    MONTHLY SONG CLUB
                </p>


                <h2>
                    Dear Sunshine Monthly Song Club
                </h2>


                <p className="page-copy">
                    매달 수업에서 만나는 Dear Sunshine의 노래를
                    집에서도 듣고, 보고, 함께 놀아보세요.
                </p>


                <div
                    style={{
                        margin: '18px 0',
                        lineHeight: 2
                    }}
                >
                    🎵 매월 수업곡 4~5곡
                    <br />
                    📝 Lyrics
                    <br />
                    💡 Play Ideas
                    <br />
                    🎨 Printable Materials
                </div>


                <div
                    style={{
                        padding: '18px',
                        borderRadius: 16,
                        background: '#fff8ea',
                        marginBottom: 18,
                        textAlign: 'center'
                    }}
                >
                    <strong
                        style={{
                            display: 'block',
                            fontSize: 18,
                            marginBottom: 6
                        }}
                    >
                        첫 7일 FREE
                    </strong>

                    <span>
                        이후 월 12,900원
                    </span>
                </div>


                <button
                    type="button"
                    className={
                        membership
                            ? 'secondary-button wide'
                            : 'primary-button wide'
                    }
                    disabled={
                        Boolean(
                            membership
                        )
                    }
                    onClick={
                        startMembership
                    }
                >

                    {
                        membership
                            ? '현재 이용 중'
                            : loggedIn
                                ? 'Song Club 시작하기'
                                : '로그인 후 시작하기'
                    }

                </button>

            </div>



            {/* 로그아웃 */}

            {loggedIn && (

                <button
                    type="button"
                    className="secondary-button"
                    onClick={
                        logout
                    }
                    style={{
                        width: '100%',
                        marginTop: 10
                    }}
                >
                    로그아웃
                </button>

            )}


        </section>

    );
}
