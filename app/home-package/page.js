import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentMembership } from '../../lib/membership';
import HomePackageHome from '../../components/HomePackageHome';

export const dynamic = 'force-dynamic';

export default async function HomePackagePage() {
    const { user, homePackage, songClubMembership } = await getCurrentMembership({
        includeBillingProfile: false
    });

    if (!user) {
        redirect('/login?next=/home-package');
    }

    if (!homePackage && songClubMembership) {
        redirect('/library');
    }

    if (!homePackage) {
        return (
            <div className="ds-home-package-mobile">
                <header className="ds-mobile-brand">
                    <span className="ds-mobile-brand-sun">☀️</span>
                    <span>
                        <strong>Dear Sunshine</strong>
                        <small>Sing · Play · Grow</small>
                    </span>
                </header>

                <section className="section top-section">
                    <p className="eyebrow">DEAR SUNSHINE SONG CLUB</p>
                    <h1>Song Club</h1>
                    <div className="content-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 42, marginBottom: 10 }}>☀️</div>
                        <h2>등록된 Song Club이 없어요</h2>
                        <p className="page-copy">
                            Song Club 이용권이 등록된 계정이라면 센터에서 이용권 연결 후 바로 사용할 수 있어요.
                        </p>
                        <Link href="/my" className="primary-button">
                            MY 확인하기
                        </Link>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <HomePackageHome homePackage={homePackage} />
    );
}
