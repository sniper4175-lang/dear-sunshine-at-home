'use client';

import {
    useState
} from 'react';


const TOSS_SDK_URL =
    'https://js.tosspayments.com/v2/standard';


const PLANS = {

    monthly: {
        months: 1,
        amount: 12900,
        orderName:
            'Dear Sunshine Song Club 1개월 이용권',
        buttonText:
            '1개월 12,900원 결제하기'
    },

    sixMonths: {
        months: 6,
        amount: 73500,
        orderName:
            'Dear Sunshine Song Club 6개월 이용권',
        buttonText:
            '6개월 73,500원 결제하기'
    },

    twelveMonths: {
        months: 12,
        amount: 139000,
        orderName:
            'Dear Sunshine Song Club 12개월 이용권',
        buttonText:
            '12개월 139,000원 결제하기'
    }

};


function loadTossPaymentsSdk() {

    if (
        typeof window !== 'undefined' &&
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


function createOrderId(plan) {

    const randomId =
        typeof crypto !== 'undefined' &&
        crypto.randomUUID
            ? crypto
                .randomUUID()
                .replaceAll('-', '')
            : `${Date.now()}_${Math.random()
                .toString(36)
                .slice(2)}`;


    return `sunshine_${plan}_${randomId}`;

}


export default function MembershipPaymentButton({
    plan = 'monthly',
    disabled = false
}) {

    const [
        loading,
        setLoading
    ] =
        useState(false);


    const selectedPlan =
        PLANS[plan];


    async function startPayment() {

        if (
            loading ||
            disabled ||
            !selectedPlan
        ) {

            return;

        }


        try {

            setLoading(true);


            /*
             * 로그인 사용자 및
             * Toss clientKey/customerKey 준비
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
                        },

                        body:
                            JSON.stringify({
                                plan
                            })
                    }
                );


            const prepared =
                await prepareResponse.json();


            if (
                !prepareResponse.ok
            ) {

                throw new Error(
                    prepared?.error ||
                    '결제를 준비하지 못했습니다.'
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
             * 자동결제가 아닌 1회 결제
             */
            await payment.requestPayment({

                method:
                    'CARD',

                amount: {
                    currency:
                        'KRW',

                    value:
                        selectedPlan.amount
                },

                orderId:
                    createOrderId(
                        plan
                    ),

                orderName:
                    selectedPlan.orderName,

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
                'payment start error:',
                error
            );


            alert(
                error?.message ||
                '결제를 시작하지 못했습니다.'
            );


            setLoading(false);

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
                startPayment
            }
        >
            {
                loading
                    ? '결제창 여는 중...'
                    : selectedPlan.buttonText
            }
        </button>

    );
}