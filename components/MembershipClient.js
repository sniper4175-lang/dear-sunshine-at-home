'use client';

import {
    useRouter
} from 'next/navigation';

import Link from 'next/link';

import {
    useState
} from 'react';

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

    const [
        autoPaymentAgreed,
        setAutoPaymentAgreed
    ] =
        useState(false);

    const [
        subscriptionPolicyAgreed,
        setSubscriptionPolicyAgreed
    ] =
        useState(false);


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


        if (
            !autoPaymentAgreed ||
            !subscriptionPolicyAgreed
        ) {
            alert(
                '정기결제 및 해지 조건에 모두 동의해주세요.'
            );

            return;
        }


        /*
         * Step ④ PG 연동 전 임시 안내.
         * 실제 PG 결제수단 등록 성공 후에만 trialing 멤버십을 생성합니다.
         */
        alert(
            '동의가 확인되었습니다. 다음 단계에서 네이버페이·토스페이·카드 정기결제 등록을 연결합니다.'
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



                {!membership && (

                    <div
                        style={{
                            display: 'grid',
                            gap: 12,
                            padding: 16,
                            borderRadius: 16,
                            background: '#fffdf7',
                            border: '1px solid #f0dfc8',
                            marginBottom: 16
                        }}
                    >

                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                lineHeight: 1.5
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={autoPaymentAgreed}
                                onChange={e =>
                                    setAutoPaymentAgreed(
                                        e.target.checked
                                    )
                                }
                                style={{ marginTop: 4 }}
                            />

                            <span>
                                <strong>
                                    [필수] 7일 무료체험 후 자동결제 동의
                                </strong>
                                <br />
                                <span
                                    style={{
                                        color: '#8d8175',
                                        fontSize: 12
                                    }}
                                >
                                    오늘 결제되지 않습니다.
                                    무료체험 종료 후 월 12,900원이
                                    등록한 결제수단으로 자동결제되고,
                                    해지 전까지 매월 자동갱신됩니다.
                                </span>
                            </span>
                        </label>


                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                lineHeight: 1.5
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={subscriptionPolicyAgreed}
                                onChange={e =>
                                    setSubscriptionPolicyAgreed(
                                        e.target.checked
                                    )
                                }
                                style={{ marginTop: 4 }}
                            />

                            <span>
                                <strong>
                                    [필수] 정기결제·해지·환불 조건 확인
                                </strong>
                                <br />

                                <Link
                                    href="/subscription-policy"
                                    target="_blank"
                                    style={{
                                        textDecoration: 'underline',
                                        fontSize: 13
                                    }}
                                >
                                    정기결제·해지 안내 보기
                                </Link>

                                {' · '}

                                <Link
                                    href="/terms"
                                    target="_blank"
                                    style={{
                                        textDecoration: 'underline',
                                        fontSize: 13
                                    }}
                                >
                                    이용약관 보기
                                </Link>
                            </span>
                        </label>

                    </div>

                )}


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
