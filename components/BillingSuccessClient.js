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


const PLAN_LABELS = {

    monthly:
        '1개월 이용권',

    sixMonths:
        '6개월 이용권',

    twelveMonths:
        '12개월 이용권'

};


export default function BillingSuccessClient() {

    const searchParams =
        useSearchParams();


    const started =
        useRef(false);


    const [
        state,
        setState
    ] =
        useState({
            status:
                'processing',

            message:
                '결제를 안전하게 처리하고 있어요.',

            plan:
                null
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


            async function confirmPayment() {

                const paymentKey =
                    searchParams.get(
                        'paymentKey'
                    );


                const orderId =
                    searchParams.get(
                        'orderId'
                    );


                const amount =
                    searchParams.get(
                        'amount'
                    );


                if (
                    !paymentKey ||
                    !orderId ||
                    !amount
                ) {

                    setState({
                        status:
                            'error',

                        message:
                            '결제 정보를 확인할 수 없습니다.',

                        plan:
                            null
                    });


                    return;

                }


                try {

                    const response =
                        await fetch(
                            '/api/billing/confirm',
                            {
                                method:
                                    'POST',

                                headers: {
                                    'Content-Type':
                                        'application/json'
                                },

                                body:
                                    JSON.stringify({
                                        paymentKey,
                                        orderId,

                                        amount:
                                            Number(
                                                amount
                                            )
                                    })
                            }
                        );


                    const data =
                        await response
                            .json();


                    if (
                        !response.ok ||
                        !data?.ok
                    ) {

                        throw new Error(
                            data?.error ||
                            '결제를 완료하지 못했습니다.'
                        );

                    }


                    setState({
                        status:
                            'success',

                        message:
                            `${data.planLabel || 'Song Club 이용권'} 결제가 완료됐어요!`,

                        plan:
                            data.plan
                    });


                } catch (error) {

                    console.error(
                        'payment confirm error:',
                        error
                    );


                    setState({
                        status:
                            'error',

                        message:
                            error?.message ||
                            '결제를 완료하지 못했습니다.',

                        plan:
                            null
                    });

                }

            }


            confirmPayment();

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
                            ? '☀️ 멤버십 결제 완료'
                            : state.status ===
                                'error'
                                ? '결제를 확인해주세요'
                                : '결제 처리 중'
                    }
                </h1>


                <p className="page-copy">
                    {state.message}
                </p>


                {
                    state.status ===
                    'success' && (

                        <>

                            <div
                                style={{
                                    margin:
                                        '22px 0',

                                    padding:
                                        18,

                                    borderRadius:
                                        16,

                                    background:
                                        '#fff8ea',

                                    lineHeight:
                                        1.8
                                }}
                            >

                                <strong>
                                    {
                                        PLAN_LABELS[
                                            state.plan
                                        ] ||
                                        'Song Club 이용권'
                                    }
                                </strong>

                                <br />

                                선택하신 기간 동안
                                Song Club을 이용할 수 있어요.

                                <br />

                                <span
                                    style={{
                                        fontSize:
                                            13
                                    }}
                                >
                                    회원 페이지에서 이용기간을 확인할 수 있습니다.
                                </span>

                            </div>


                            <Link
                                href="/library"
                                className="primary-button wide"
                            >
                                노래 들으러 가기
                            </Link>


                            <Link
                                href="/membership"
                                className="secondary-button wide"
                                style={{
                                    marginTop:
                                        10
                                }}
                            >
                                내 멤버십 확인하기
                            </Link>

                        </>

                    )
                }


                {
                    state.status ===
                    'error' && (

                        <>

                            <p
                                className="muted"
                                style={{
                                    lineHeight:
                                        1.7
                                }}
                            >
                                결제 승인 과정에서 문제가 발생했습니다.
                                <br />
                                중복 결제 방지를 위해
                                다시 결제하기 전에 결제 내역을 확인해주세요.
                            </p>


                            <Link
                                href="/membership"
                                className="secondary-button wide"
                            >
                                멤버십으로 돌아가기
                            </Link>

                        </>

                    )
                }

            </div>

        </section>

    );

}