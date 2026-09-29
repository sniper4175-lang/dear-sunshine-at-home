export default function HomePackageLoading() {
    return (
        <section className="section top-section">
            <p className="eyebrow">
                DEAR SUNSHINE HOME PACKAGE
            </p>
            <h1>Home Package</h1>

            <div
                className="content-card"
                style={{
                    textAlign: 'center',
                    padding: '32px 18px'
                }}
            >
                <div
                    aria-hidden="true"
                    style={{
                        fontSize: 34,
                        marginBottom: 10
                    }}
                >
                    🏠
                </div>
                <p
                    className="muted"
                    style={{ margin: 0 }}
                >
                    Home Package를 불러오는 중이에요…
                </p>
            </div>
        </section>
    );
}
