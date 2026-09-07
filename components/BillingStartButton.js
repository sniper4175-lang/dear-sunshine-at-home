'use client';

import {
    useState
} from 'react';


const TOSS_SDK_URL =
    'https://js.tosspayments.com/v2/standard';


function loadTossPaymentsSdk() {

    if (
        typeof window !==
        'undefined' &&
        window.TossPayments
    ) {

        return Promise.resolve(
            window.TossPayments
        );

    }


    return new Promise(
        (
            resolve,
            reject
        ) => {

            const existing =
                document.querySelector(
                    `script[src="${TOSS_SDK_URL}"]`
                );


            if (existing) {

                existing.addEventListener(
                    'load',
                    () =>
                        resolve(
                            window.TossPayments
                        ),
                    {
                        once: true
                    }
                );


                existing.addEventListener(
                    'error',
                    () =>
                        reject(
                            new Error(
                                '토스페이먼츠 SDK를 불러오지 못했습니다.'
                            )
                        ),
                    {
                        once: true
                    }
                );


                return;

            }


            const script =
                document.createElement(
                    'script'
                );


            script.src =
                TOSS_SDK_URL;


            script.async =
                true;


            script.onload =
                () =>
                    resolve(
                        window.TossPayments
                    );


            script.onerror =
                () =>
                    reject(
                        new Error(
                            '토스페이먼츠 SDK를 불러오지 못했습니다.'
                        )
                    );


            document.head.appendChild(
                script
            );

        }
    );
}


export default function BillingStartButton({
    disabled = false
}) {

    const [
        loading,
        setLoading
    ] =
        useState(
            false
        );


    async function startBilling() {

        if (
            loading ||
            disabled
        ) {
            return;
        }


        try {

            setLoading(
                true
            );


            /*
             * customerKey는 브라우저에서 임의 생성하지 않고
             * 로그인 사용자를 확인한 서버에서 준비합니다.
             */
            const prepareResponse =
                await fetch(
                    '/api/billing/prepare',
                    {
                        method:
                            'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        }
                    }
                );


            const prepared =
                await prepareResponse
                    .json();


            if (
                !prepareResponse.ok
            ) {

                throw new Error(
                    prepared?.error ||
                    '결제수단 등록을 준비하지 못했습니다.'
                );

            }


            const TossPayments =
                await loadTossPaymentsSdk();


            if (!TossPayments) {

                throw new Error(
                    '토스페이먼츠 SDK를 초기화하지 못했습니다.'
                );

            }


            const tossPayments =
                TossPayments(
                    prepared.clientKey
                );


            const payment =
                tossPayments.payment({
                    customerKey:
                        prepared.customerKey
                });


            const origin =
                window.location.origin;


            /*
             * 이 단계에서는 결제하지 않습니다.
             * 카드 인증 -> 빌링키 발급을 위한 결제수단 등록만 진행합니다.
             */
            await payment.requestBillingAuth({
                method:
                    'CARD',

                successUrl:
                    `${origin}/billing/success`,

                failUrl:
                    `${origin}/billing/fail`,

                customerEmail:
                    prepared.customerEmail ||
                    undefined
            });


        } catch (error) {

            console.error(
                'start billing error:',
                error
            );


            alert(
                error?.message ||
                '결제수단 등록을 시작하지 못했습니다.'
            );


            setLoading(
                false
            );

        }

    }


    return (

        <button
            type="button"
            className="primary-button wide"
            disabled={
                disabled ||
                loading
            }
            onClick={
                startBilling
            }
        >
            {
                loading
                    ? '결제수단 등록창 여는 중...'
                    : '7일 무료체험 시작하기'
            }
        </button>

    );
}
