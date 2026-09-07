'use client';

import {
    useState
} from 'react';

import {
    useRouter
} from 'next/navigation';

import {
    createBrowserSupabase
} from '../lib/supabase-browser';

import BillingStartButton
    from './BillingStartButton';


function formatDate(
    value
) {

    if (!value) {
        return '-';
    }


    try {
        return new Intl.DateTimeFormat(
            'ko-KR',
            {
                timeZone:
                    'Asia/Seoul',
                year:
                    'numeric',
                month:
                    'long',
                day:
                    'numeric'
            }
        ).format(
            new Date(
                value
            )
        );
    } catch {
        return String(
            value
        ).slice(
            0,
            10
        );
    }
}


function getAccessUntil(
    membership
) {

    if (!membership) {
        return null;
    }


    if (
        membership.status ===
        'trialing'
    ) {
        return (
            membership.trial_ends_at ||
            membership.current_period_end ||
            membership.ends_at ||
            null
        );
    }


    return (
        membership.current_period_end ||
        membership.ends_at ||
        null
    );
}


export default function MembershipClient({
    loggedIn,
    email,
    membership,
    billingProfile
}) {

    const router =
        useRouter();


    const [
        cancelling,
        setCancelling
    ] =
        useState(
            false
        );


    const [
        cancelError,
        setCancelError
    ] =
        useState(
            ''
        );


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


    async function cancelMembership() {

        if (
            !membership ||
            membership.cancel_at_period_end ||
            cancelling
        ) {
            return;
        }


        const accessUntil =
            getAccessUntil(
                membership
            );


        const message =
            membership.status ===
            'trialing'
                ? `무료체험을 해지할까요?\n\n${formatDate(accessUntil)}까지 이용할 수 있고, 이후 12,900원 자동결제는 진행되지 않습니다.`
                : `Song Club 구독을 해지할까요?\n\n${formatDate(accessUntil)}까지 이용할 수 있고, 다음 자동결제는 진행되지 않습니다.`;


        if (
            !window.confirm(
                message
            )
        ) {
            return;
        }


        setCancelling(
            true
        );

        setCancelError(
            ''
        );


        try {

            const response =
                await fetch(
                    '/api/billing/cancel',
                    {
                        method:
                            'POST',
                        headers: {
                            'Content-Type':
                                'application/json'
                        }
                    }
                );


            const result =
                await response.json();


            if (
                !response.ok ||
                !result?.ok
            ) {
                throw new Error(
                    result?.error ||
                    '구독 해지에 실패했습니다.'
                );
            }


            router.refresh();

        } catch (error) {

            setCancelError(
                error?.message ||
                '구독 해지 중 오류가 발생했습니다.'
            );

        } finally {

            setCancelling(
                false
            );
        }
    }


    const accessUntil =
        getAccessUntil(
            membership
        );


    const nextBillingAt =
        membership?.next_billing_at ||
        null;


    const paymentLabel =
        billingProfile?.payment_method_label ||
        billingProfile?.payment_method ||
        '등록된 카드';


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
                                padding: 16,
                                borderRadius: 14,
                                background: '#fff8ea'
                            }}
                        >

                            <strong
                                style={{
                                    display: 'block',
                                    marginBottom: 12
                                }}
                            >
                                Dear Sunshine Monthly Song Club
                            </strong>


                            <div
                                style={{
                                    display: 'grid',
                                    gap: 8,
                                    fontSize: 14
                                }}
                            >

                                <div>
                                    <strong>상태</strong>{' '}
                                    {membership.cancel_at_period_end
                                        ? '해지 예정'
                                        : membership.status === 'trialing'
                                            ? '7일 무료체험 중'
                                            : '이용 중'}
                                </div>


                                {membership.starts_at && (
                                    <div>
                                        <strong>이용 시작일</strong>{' '}
                                        {formatDate(
                                            membership.starts_at
                                        )}
                                    </div>
                                )}


                                {membership.status === 'trialing' && !membership.cancel_at_period_end && (
                                    <div>
                                        <strong>첫 결제 예정일</strong>{' '}
                                        {formatDate(
                                            nextBillingAt
                                        )}
                                    </div>
                                )}


                                {membership.status === 'active' && !membership.cancel_at_period_end && (
                                    <div>
                                        <strong>다음 결제 예정일</strong>{' '}
                                        {formatDate(
                                            nextBillingAt
                                        )}
                                    </div>
                                )}


                                {billingProfile && (
                                    <div>
                                        <strong>결제수단</strong>{' '}
                                        {paymentLabel}
                                    </div>
                                )}


                                {membership.cancel_at_period_end && (
                                    <div>
                                        <strong>이용 가능 기간</strong>{' '}
                                        {formatDate(
                                            accessUntil
                                        )}까지
                                    </div>
                                )}

                            </div>


                            {membership.cancel_at_period_end && (
                                <div
                                    style={{
                                        marginTop: 14,
                                        paddingTop: 12,
                                        borderTop: '1px solid rgba(0,0,0,0.08)',
                                        lineHeight: 1.6,
                                        fontSize: 14
                                    }}
                                >
                                    해지 신청이 완료되었습니다.
                                    <br />
                                    {formatDate(accessUntil)}까지 이용할 수 있으며,
                                    이후 자동결제는 진행되지 않습니다.
                                </div>
                            )}

                        </div>


                        {!membership.cancel_at_period_end && (
                            <button
                                type="button"
                                className="secondary-button wide"
                                onClick={
                                    cancelMembership
                                }
                                disabled={
                                    cancelling
                                }
                                style={{
                                    marginTop: 12
                                }}
                            >
                                {cancelling
                                    ? '해지 처리 중...'
                                    : '구독 해지'}
                            </button>
                        )}


                        {cancelError && (
                            <p
                                style={{
                                    marginTop: 10,
                                    marginBottom: 0,
                                    fontSize: 14
                                }}
                            >
                                {cancelError}
                            </p>
                        )}

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


                {
                    membership ? (

                        <button
                            type="button"
                            className="secondary-button wide"
                            disabled
                        >
                            {
                                membership.cancel_at_period_end
                                    ? '해지 예정'
                                    : membership.status === 'trialing'
                                        ? '7일 무료체험 이용 중'
                                        : '현재 이용 중'
                            }
                        </button>

                    ) : loggedIn ? (

                        <BillingStartButton />

                    ) : (

                        <button
                            type="button"
                            className="primary-button wide"
                            onClick={() =>
                                router.push(
                                    '/login'
                                )
                            }
                        >
                            로그인 후 시작하기
                        </button>

                    )
                }

            </div>


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
