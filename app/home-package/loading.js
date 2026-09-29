export default function HomePackageLoading() {
    return (
        <section className="section top-section">
            <p className="eyebrow">
                DEAR SUNSHINE SONG CLUB
            </p>
            <h1>Song Club</h1>

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
                    ☀️
                </div>
                <p
                    className="muted"
                    style={{ margin: 0 }}
                >
                    Song Club을 불러오는 중이에요…
                </p>
            </div>
        </section>
    );
}
