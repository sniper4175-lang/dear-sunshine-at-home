export default function LibraryLoading() {
    return (
        <section className="section top-section">
            <p className="eyebrow">SONGS</p>
            <h1>노래</h1>

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
                        fontSize: 32,
                        marginBottom: 10
                    }}
                >
                    ♫
                </div>
                <p
                    className="muted"
                    style={{ margin: 0 }}
                >
                    노래를 불러오는 중이에요…
                </p>
            </div>
        </section>
    );
}
