'use client';

import {
    useRouter
} from 'next/navigation';

import {
    createBrowserSupabase
} from '../lib/supabase-browser';

import MembershipPlans
    from './MembershipPlans';


/*
 * 날짜 표시
 * 예: 2026년 9월 12일
 */
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


/*
 * 멤버십 이용 종료일
 */
function getAccessUntil(
    membership
) {

    if (!membership) {
        return null;
    }


    return (
        membership.ends_at ||
        membership.current_period_end ||
        null
    );

}


/*
 * 남은 이용일 계산
 *
 * 종료일까지 남은 시간을
 * 일 단위로 올림하여 표시
 *
 * 예:
 * 30.1일 남음 → 31일
 */
function getDaysRemaining(
    value
) {

    if (!value) {
        return null;
    }


    const endDate =
        new Date(
            value
        ).toLocaleDateString(
            'en-CA',
            {
                timeZone:
                    'Asia/Seoul'
            }
        );


    const today =
        new Date()
            .toLocaleDateString(
                'en-CA',
                {
                    timeZone:
                        'Asia/Seoul'
                }
            );


    const [
        endYear,
        endMonth,
        endDay
    ] =
        endDate
            .split('-')
            .map(Number);


    const [
        todayYear,
        todayMonth,
        todayDay
    ] =
        today
            .split('-')
            .map(Number);


    const end =
        Date.UTC(
            endYear,
            endMonth - 1,
            endDay
        );


    const now =
        Date.UTC(
            todayYear,
            todayMonth - 1,
            todayDay
        );


    const days =
        Math.round(
            (end - now) /
            86400000
        );


    return Math.max(
        days,
        0
    );

}


export default function MembershipClient({
    loggedIn,
    email,
    membership
}) {

    const router =
        useRouter();


    /*
     * 로그아웃
     */
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


    /*
     * 멤버십 이용기간
     */
    const accessUntil =
        getAccessUntil(
            membership
        );


    const daysRemaining =
        getDaysRemaining(
            accessUntil
        );


    /*
     * 실제 이용 가능한 멤버십인지 확인
     */
    const membershipActive =
        Boolean(
            membership &&
            membership.status ===
                'active' &&
            (
                daysRemaining ===
                    null ||
                daysRemaining >
                    0
            )
        );


    return (

        <section className="section top-section">


            {/* 상단 소개 */}

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



            {/* ======================================
                MY MEMBERSHIP
            ====================================== */}

            <div
                className="content-card"
                style={{
                    marginBottom: 22
                }}
            >

                <p className="eyebrow">
                    MY MEMBERSHIP
                </p>


                {/* 로그인 전 */}

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


                /*
                 * 이용 중
                 */
                ) : membershipActive ? (

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
                                    marginBottom: 14
                                }}
                            >
                                Dear Sunshine Monthly Song Club
                            </strong>


                            <div
                                style={{
                                    display: 'grid',
                                    gap: 9,
                                    fontSize: 14
                                }}
                            >

                                <div>

                                    <strong>
                                        상태
                                    </strong>{' '}

                                    이용 중

                                </div>


                                {membership.starts_at && (

                                    <div>

                                        <strong>
                                            이용 시작일
                                        </strong>{' '}

                                        {formatDate(
                                            membership.starts_at
                                        )}

                                    </div>

                                )}


                                {accessUntil && (

                                    <div>

                                        <strong>
                                            이용 종료일
                                        </strong>{' '}

                                        {formatDate(
                                            accessUntil
                                        )}

                                    </div>

                                )}

                            </div>



                            {/* 남은 기간 D-Day */}

                            {daysRemaining !== null && (

                                <div
                                    style={{
                                        marginTop: 18,
                                        padding: '15px 14px',
                                        borderRadius: 14,
                                        background: '#fff2bd',
                                        textAlign: 'center'
                                    }}
                                >

                                    <div
                                        style={{
                                            fontSize: 22,
                                            fontWeight: 800,
                                            color: '#4a2d1b'
                                        }}
                                    >

                                        {
                                            daysRemaining > 0
                                                ? `D-${daysRemaining}`
                                                : '이용기간 종료'
                                        }

                                    </div>


                                    <div
                                        style={{
                                            marginTop: 4,
                                            fontSize: 13,
                                            color: '#75675c'
                                        }}
                                    >

                                        {
                                            daysRemaining > 0
                                                ? `${daysRemaining}일 남았어요`
                                                : '이용권 기간이 종료되었습니다.'
                                        }

                                    </div>

                                </div>

                            )}

                        </div>


                        <p
                            className="muted"
                            style={{
                                marginTop: 14,
                                marginBottom: 0,
                                fontSize: 13,
                                lineHeight: 1.7
                            }}
                        >
                            모든 이용권은 자동결제되지 않습니다.
                            <br />
                            이용기간 종료 후 원하실 때
                            센터에서 다시 등록하실 수 있어요.
                        </p>

                    </>


                /*
                 * 로그인했지만 현재 이용권 없음
                 */
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


                        {
                            membership &&
                            daysRemaining === 0 && (

                                <div
                                    style={{
                                        marginTop: 14,
                                        padding: 14,
                                        borderRadius: 14,
                                        background: '#fff8ea',
                                        fontSize: 14,
                                        lineHeight: 1.7
                                    }}
                                >
                                    이전 Song Club 이용기간이
                                    종료되었습니다.
                                    <br />
                                    계속 이용하시려면
                                    센터에서 재등록해주세요.
                                </div>

                            )
                        }

                    </>

                )}

            </div>



            {/* ======================================
                Song Club 소개 / 가격
            ====================================== */}

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



                {
                    /*
                     * 이용 중이면 결제/가격 선택 대신
                     * 현재 이용 중 표시
                     */
                    membershipActive ? (

                        <button
                            type="button"
                            className="secondary-button wide"
                            disabled
                        >
                            ☀️ 현재 Song Club 이용 중
                        </button>


                    /*
                     * 로그인했지만 멤버십이 없으면
                     * 가격표 및 센터 결제 안내
                     */
                    ) : loggedIn ? (

                        <MembershipPlans />


                    /*
                     * 로그인하지 않은 경우
                     */
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
                            로그인 후 멤버십 보기
                        </button>

                    )
                }

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