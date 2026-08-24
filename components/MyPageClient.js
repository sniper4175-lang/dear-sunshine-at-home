'use client';

import {
    useRouter
} from 'next/navigation';

import Link from 'next/link';

import {
    createBrowserSupabase
} from '../lib/supabase-browser';


function formatDate(
    value
) {

    if (!value) {
        return '무제한';
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return '-';
    }


    return date
        .toLocaleDateString(
            'ko-KR',
            {
                timeZone:
                    'Asia/Seoul',

                year:
                    'numeric',

                month:
                    '2-digit',

                day:
                    '2-digit'
            }
        );

}


export default function MyPageClient({
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


        router.replace(
            '/login'
        );

        router.refresh();

    }


    /*
     * 로그인하지 않은 경우
     */
    if (!loggedIn) {

        return (

            <main
                style={{
                    maxWidth: 520,
                    margin: '0 auto',
                    padding: '50px 20px 110px'
                }}
            >

                <div
                    style={{
                        textAlign: 'center'
                    }}
                >

                    <div
                        style={{
                            fontSize: 50,
                            marginBottom: 12
                        }}
                    >
                        ☀️
                    </div>


                    <p className="eyebrow">
                        MY SUNSHINE
                    </p>


                    <h1>
                        내 계정
                    </h1>


                    <p className="page-copy">
                        로그인 후 현재 멤버십과
                        이용 정보를 확인할 수 있어요.
                    </p>


                    <Link
                        href="/login"
                        className="primary-button"
                    >
                        로그인하기
                    </Link>

                </div>

            </main>

        );

    }


    const isPremium =
        membership?.plan ===
        'premium';


    const isBasic =
        membership?.plan ===
        'basic';


    return (

        <main
            style={{
                maxWidth: 520,
                margin: '0 auto',
                padding: '40px 20px 110px'
            }}
        >

            {/* 상단 */}

            <div
                style={{
                    textAlign: 'center',
                    marginBottom: 28
                }}
            >

                <div
                    style={{
                        fontSize: 48,
                        marginBottom: 8
                    }}
                >
                    ☀️
                </div>


                <p className="eyebrow">
                    MY SUNSHINE
                </p>


                <h1>
                    내 계정
                </h1>

            </div>



            {/* 계정 정보 */}

            <section
                className="content-card"
                style={{
                    marginBottom: 18
                }}
            >

                <p className="eyebrow">
                    ACCOUNT
                </p>


                <h2>
                    {email}
                </h2>


                <p
                    style={{
                        marginBottom: 0,
                        color: '#8d8175'
                    }}
                >
                    DEAR SUNSHINE MONTHLY SONG CLUB 회원
                </p>

            </section>



            {/* 멤버십 없음 */}

            {!membership && (

                <section
                    className="content-card"
                    style={{
                        marginBottom: 18,
                        textAlign: 'center'
                    }}
                >

                    <div
                        style={{
                            fontSize: 34,
                            marginBottom: 10
                        }}
                    >
                        🔒
                    </div>


                    <p className="eyebrow">
                        MEMBERSHIP
                    </p>


                    <h2>
                        이용 중인 멤버십이 없어요
                    </h2>


                    <p className="page-copy">
                        Basic 또는 Premium 멤버십이
                        등록되면 음원과 활동자료를
                        이용할 수 있어요.
                    </p>


                    <Link
                        href="/membership"
                        className="primary-button"
                    >
                        멤버십 보기
                    </Link>

                </section>

            )}



            {/* 멤버십 있음 */}

            {membership && (

                <section
                    className="content-card"
                    style={{
                        marginBottom: 18
                    }}
                >

                    <p className="eyebrow">
                        MY MEMBERSHIP
                    </p>


                    <div
                        style={{
                            display: 'flex',
                            justifyContent:
                                'space-between',
                            alignItems:
                                'center',
                            gap: 12,
                            flexWrap: 'wrap'
                        }}
                    >

                        <div>

                            <h2
                                style={{
                                    marginBottom: 6
                                }}
                            >
                                {
                                    isPremium
                                        ? '✨ Premium'
                                        : '☀️ Basic'
                                }
                            </h2>


                            <p
                                style={{
                                    margin: 0,
                                    color: '#8d8175'
                                }}
                            >
                                {
                                    isPremium
                                        ? '전체 Dear Sunshine 콘텐츠를 이용하고 있어요.'
                                        : '최근 공개된 Dear Sunshine 콘텐츠를 이용하고 있어요.'
                                }
                            </p>

                        </div>


                        <div
                            style={{
                                padding: '7px 12px',
                                borderRadius: 999,
                                background:
                                    '#eef8ef',
                                fontSize: 13,
                                fontWeight: 800
                            }}
                        >
                            🟢 이용중
                        </div>

                    </div>


                    <div
                        style={{
                            marginTop: 22,
                            paddingTop: 18,
                            borderTop:
                                '1px solid #eee',
                            display: 'grid',
                            gap: 14
                        }}
                    >

                        <div
                            style={{
                                display: 'flex',
                                justifyContent:
                                    'space-between',
                                gap: 20
                            }}
                        >
                            <span
                                style={{
                                    color:
                                        '#8d8175'
                                }}
                            >
                                이용 시작일
                            </span>

                            <strong>
                                {
                                    formatDate(
                                        membership.starts_at
                                    )
                                }
                            </strong>
                        </div>


                        <div
                            style={{
                                display: 'flex',
                                justifyContent:
                                    'space-between',
                                gap: 20
                            }}
                        >
                            <span
                                style={{
                                    color:
                                        '#8d8175'
                                }}
                            >
                                이용 종료일
                            </span>

                            <strong>
                                {
                                    formatDate(
                                        membership.ends_at
                                    )
                                }
                            </strong>
                        </div>

                    </div>

                </section>

            )}



            {/* Premium 혜택 */}

            {isPremium && (

                <section
                    className="content-card"
                    style={{
                        marginBottom: 18
                    }}
                >

                    <p className="eyebrow">
                        PREMIUM BENEFITS
                    </p>


                    <h2>
                        Premium 혜택
                    </h2>


                    <div
                        style={{
                            lineHeight: 2
                        }}
                    >
                        ✓ 공개된 전체 음원 스트리밍
                        <br />
                        ✓ 가사지 보기
                        <br />
                        ✓ 활동자료 이용
                        <br />
                        ✓ Premium 전용 콘텐츠
                        <br />
                        ✓ 음원 다운로드
                    </div>

                </section>

            )}



            {/* Basic 혜택 */}

            {isBasic && (

                <section
                    className="content-card"
                    style={{
                        marginBottom: 18
                    }}
                >

                    <p className="eyebrow">
                        BASIC
                    </p>


                    <h2>
                        Basic 이용 안내
                    </h2>


                    <div
                        style={{
                            lineHeight: 2
                        }}
                    >
                        ✓ 최근 3개월 음원 스트리밍
                        <br />
                        ✓ 가사지 보기
                        <br />
                        ✓ 활동자료 이용
                    </div>


                    <Link
                        href="/membership"
                        className="primary-button"
                        style={{
                            marginTop: 14
                        }}
                    >
                        Premium 알아보기
                    </Link>

                </section>

            )}



            {/* 계정 메뉴 */}

            <section
                className="content-card"
                style={{
                    marginBottom: 18
                }}
            >

                <p className="eyebrow">
                    ACCOUNT
                </p>


                <h2>
                    계정 관리
                </h2>


                <div
                    style={{
                        display: 'grid',
                        gap: 10
                    }}
                >

                    <Link
                        href="/forgot-password"
                        className="secondary-button"
                        style={{
                            textAlign: 'center'
                        }}
                    >
                        비밀번호 변경
                    </Link>


                    <button
                        type="button"
                        className="secondary-button"
                        onClick={
                            logout
                        }
                    >
                        로그아웃
                    </button>

                </div>

            </section>

        </main>

    );
}