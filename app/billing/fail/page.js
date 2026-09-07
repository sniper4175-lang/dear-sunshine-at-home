import {
    Suspense
} from 'react';

import BillingFailClient
    from '../../../components/BillingFailClient';


export const dynamic =
    'force-dynamic';


export default function BillingFailPage() {

    return (

        <Suspense
            fallback={
                <section className="section top-section">
                    <div className="content-card">
                        결제수단 등록 결과를 확인하고 있어요...
                    </div>
                </section>
            }
        >
            <BillingFailClient />
        </Suspense>

    );
}
