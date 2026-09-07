'use client';

import {
    useEffect,
    useRef,
    useState
} from 'react';

import Link
    from 'next/link';

import {
    useSearchParams
} from 'next/navigation';


export default function BillingSuccessClient() {

    const searchParams =
        useSearchParams();


    const started =
        useRef(
            false
        );


    const [
        state,
        setState
    ] =
        useState({
            status:
                'processing',

            message:
                '결제수단을 안전하게 등록하고 있어요.'
        });


    useEffect(
        () => {

            if (
                started.current
            ) {
                return;
            }


            started.current =
                true;


            async function issue() {

                const authKey =
                    searchParams.get(
                        'authKey'
                    );


                const customerKey =
                    searchParams.get(
                        'customerKey'
                    );


                if (
                    !authKey ||
                    !customerKey
                ) {

                    setState({
                        status:
                            'error',

                        message:
                            '결제 인증 정보가 없습니다.'
                    });


                    return;

                }


                try {

                    const response =
                        await fetch(
                            '/api/billing/issue',
                            {
                                method:
                                    'POST',

                                headers: {
                                    'Content-Type':
                                        'application/json'
                                },

                                body:
                                    JSON.stringify({
                                        authKey,
                                        customerKey
                                    })
                            }
                        );


                    const data =
                        await response
                            .json();


                    if (!response.ok) {

                        throw new Error(
                            data?.error ||
                            '결제수단 등록을 완료하지 못했습니다.'
                        );

                    }


                    setState({
                        status:
                            'success',

                        message:
                            '7일 무료체험이 시작됐어요!'
                    });


                } catch (error) {

                    setState({
                        status:
                            'error',

                        message:
                            error?.message ||
                            '결제수단 등록을 완료하지 못했습니다.'
                    });

                }

            }


            issue();

        },
        [
            searchParams
        ]
    );


    return (

        <section className="section top-section">

            <div
                className="content-card"
                style={{
                    textAlign:
                        'center'
                }}
            >

                <p className="eyebrow">
                    SONG CLUB
                </p>


                <h1>
                    {
                        state.status ===
                        'success'
                            ? '☀️ 무료체험 시작 완료'
                            : state.status ===
                                'error'
                                ? '결제수단 등록 확인'
                                : '등록 처리 중'
                    }
                </h1>


                <p className="page-copy">
                    {state.message}
                </p>


                {state.status ===
                    'success' && (

                    <>

                        <p className="muted">
                            오늘 결제되는 금액은 0원이며,
                            7일 무료체험 종료 후 월 12,900원
                            자동결제가 예정됩니다.
                        </p>


                        <Link
                            href="/library"
                            className="primary-button wide"
                        >
                            노래 들으러 가기
                        </Link>

                    </>

                )}


                {state.status ===
                    'error' && (

                    <Link
                        href="/membership"
                        className="secondary-button wide"
                    >
                        멤버십으로 돌아가기
                    </Link>

                )}

            </div>

        </section>

    );
}
