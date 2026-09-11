'use client';

import {
    useRouter
} from 'next/navigation';

import {
    createBrowserSupabase
} from '../lib/supabase-browser';

import MembershipPlans
    from './MembershipPlans';


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


    return (
        membership.current_period_end ||
        membership.ends_at ||
        null
    );

}


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


    const accessUntil =
        getAccessUntil(
            membership
        );


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



            {/* 현재 멤버십 상태 */}

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
                            자동결제되지 않습니다.
                            <br />
                            이용기간이 끝난 후 원하실 때
                            다시 멤버십을 구매할 수 있어요.
                        </p>

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



            {/* Song Club 소개 및 가격 */}

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
                    membership ? (

                        <button
                            type="button"
                            className="secondary-button wide"
                            disabled
                        >
                            현재 Song Club 이용 중
                        </button>

                    ) : loggedIn ? (

                        <MembershipPlans />

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