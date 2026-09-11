'use client';

import Link
    from 'next/link';

import {
    useSearchParams
} from 'next/navigation';


export default function BillingFailClient() {

    const searchParams =
        useSearchParams();


    const message =
        searchParams.get(
            'message'
        ) ||
        '결제가 완료되지 않았습니다.';


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
                    PAYMENT
                </p>


                <h1>
                    결제가 취소되었어요
                </h1>


                <p className="page-copy">
                    {message}
                </p>


                <p
                    className="muted"
                    style={{
                        lineHeight: 1.7
                    }}
                >
                    결제는 완료되지 않았어요.
                    <br />
                    이용권을 구매하려면
                    멤버십 페이지에서 다시 시도해주세요.
                </p>


                <Link
                    href="/membership"
                    className="primary-button wide"
                >
                    멤버십으로 돌아가기
                </Link>

            </div>

        </section>

    );

}