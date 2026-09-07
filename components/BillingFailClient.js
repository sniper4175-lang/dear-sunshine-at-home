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
        '결제수단 등록이 완료되지 않았습니다.';


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
                    BILLING
                </p>


                <h1>
                    결제수단 등록이 취소되었어요
                </h1>


                <p className="page-copy">
                    {message}
                </p>


                <p className="muted">
                    결제는 발생하지 않았어요.
                    다시 시도하려면 멤버십 페이지로 돌아가주세요.
                </p>


                <Link
                    href="/membership"
                    className="primary-button wide"
                >
                    다시 시도하기
                </Link>

            </div>

        </section>

    );
}
