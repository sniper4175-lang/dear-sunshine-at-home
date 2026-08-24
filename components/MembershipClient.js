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


    const currentPlan =
        membership?.plan || null;


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


    function selectBasic() {

        if (!requireLogin()) {
            return;
        }


        /*
         * 다음 단계에서
         * 실제 Basic 결제로 연결
         */
        alert(
            'Basic 결제 기능은 다음 단계에서 연결합니다.'
        );

    }


    function selectPremium() {

        if (!requireLogin()) {
            return;
        }


        /*
         * 다음 단계에서
         * 실제 Premium 결제로 연결
         */
        alert(
            'Premium 결제 기능은 다음 단계에서 연결합니다.'
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
                아이가 좋아했던 영어노래를
                집에서도 자연스럽게 이어주세요.
            </p>



            {/* 현재 회원 상태 */}

            <div
                className="content-card"
                style={{
                    marginBottom:
                        22
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

                ) : (

                    <>

                        <h2>
                            {
                                currentPlan ===
                                'premium'
                                    ? 'Premium 이용 중'
                                    : currentPlan ===
                                        'basic'
                                        ? 'Basic 이용 중'
                                        : '가입된 멤버십 없음'
                            }
                        </h2>


                        <p className="muted">
                            {email}
                        </p>


                        {membership && (

                            <div
                                style={{
                                    marginTop:
                                        14,

                                    padding:
                                        14,

                                    borderRadius:
                                        14,

                                    background:
                                        '#fff8ea'
                                }}
                            >

                                <strong>
                                    현재 요금제:{' '}
                                    {
                                        currentPlan ===
                                        'premium'
                                            ? 'Premium'
                                            : 'Basic'
                                    }
                                </strong>


                                {membership.ends_at && (

                                    <p
                                        style={{
                                            marginBottom:
                                                0
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

                        )}

                    </>

                )}

            </div>



            {/* Basic */}

            <div
                className="content-card"
                style={{
                    marginBottom:
                        18
                }}
            >

                <p className="eyebrow">
                    BASIC
                </p>


                <h2>
                    Basic
                </h2>


                <p className="page-copy">
                    최근 3개월 동안 공개된
                    Dear Sunshine 영어노래를
                    스트리밍으로 이용해요.
                </p>


                <div
                    style={{
                        margin:
                            '18px 0',

                        lineHeight:
                            1.9
                    }}
                >
                    ✓ 최근 3개월 음원 스트리밍
                    <br />
                    ✓ 가사지 보기
                    <br />
                    ✓ 홈 영어놀이 콘텐츠
                </div>


                <button
                    type="button"
                    className={
                        currentPlan ===
                        'basic'
                            ? 'secondary-button'
                            : 'primary-button wide'
                    }
                    disabled={
                        currentPlan ===
                        'basic'
                    }
                    onClick={
                        selectBasic
                    }
                >

                    {
                        currentPlan ===
                        'basic'
                            ? '현재 이용 중'
                            : 'Basic 시작하기'
                    }

                </button>

            </div>



            {/* Premium */}

            <div
                className="content-card"
                style={{
                    marginBottom:
                        18
                }}
            >

                <p className="eyebrow">
                    PREMIUM
                </p>


                <h2>
                    Premium
                </h2>


                <p className="page-copy">
                    공개된 전체 Dear Sunshine
                    음원을 자유롭게 이용해요.
                </p>


                <div
                    style={{
                        margin:
                            '18px 0',

                        lineHeight:
                            1.9
                    }}
                >
                    ✓ 전체 음원 스트리밍
                    <br />
                    ✓ 전체 가사지
                    <br />
                    ✓ Premium 전용 콘텐츠
                    <br />
                    ✓ 추후 다운로드 기능 제공
                </div>


                <button
                    type="button"
                    className={
                        currentPlan ===
                        'premium'
                            ? 'secondary-button'
                            : 'primary-button wide'
                    }
                    disabled={
                        currentPlan ===
                        'premium'
                    }
                    onClick={
                        selectPremium
                    }
                >

                    {
                        currentPlan ===
                        'premium'
                            ? '현재 이용 중'
                            : 'Premium 시작하기'
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
                        width:
                            '100%',

                        marginTop:
                            10
                    }}
                >
                    로그아웃
                </button>

            )}


        </section>

    );
}