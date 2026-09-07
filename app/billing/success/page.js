import {
    Suspense
} from 'react';

import BillingSuccessClient
    from '../../../components/BillingSuccessClient';


export const dynamic =
    'force-dynamic';


export default function BillingSuccessPage() {

    return (

        <Suspense
            fallback={
                <section className="section top-section">
                    <div className="content-card">
                        결제수단 등록을 확인하고 있어요...
                    </div>
                </section>
            }
        >
            <BillingSuccessClient />
        </Suspense>

    );
}
