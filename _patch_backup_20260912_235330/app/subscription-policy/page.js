export const metadata = {
    title: 'Song Club 이용권 안내 | Dear Sunshine'
};


export default function SubscriptionPage() {

    return (

        <section className="section top-section">

            <p className="eyebrow">
                MEMBERSHIP
            </p>


            <h1>
                Song Club 이용권 안내
            </h1>


            <p className="page-copy">
                Dear Sunshine Song Club은
                자동결제 방식이 아닌 기간제 이용권으로 운영됩니다.
                <br />
                센터에서 결제 확인 후 회원 계정의 이용기간이 활성화됩니다.
            </p>



            {/* 이용권 가격 */}

            <div
                className="content-card"
                style={{
                    marginTop: 22,
                    marginBottom: 18,
                    textAlign: 'center',
                    background: '#fff8ea'
                }}
            >

                <p className="eyebrow">
                    MEMBERSHIP PASS
                </p>


                <h2>
                    원하는 기간만 이용하세요 ☀️
                </h2>


                <div
                    style={{
                        display: 'grid',
                        gap: 10,
                        marginTop: 18,
                        lineHeight: 1.7
                    }}
                >

                    <div>
                        <strong>
                            1개월
                        </strong>
                        {' · '}
                        12,900원
                    </div>


                    <div>
                        <strong>
                            6개월
                        </strong>
                        {' · '}
                        73,500원
                        {' '}
                        <span
                            style={{
                                fontSize: 12,
                                color: '#c87b12'
                            }}
                        >
                            (월 12,250원 · 약 5% SAVE)
                        </span>
                    </div>


                    <div>
                        <strong>
                            12개월
                        </strong>
                        {' · '}
                        139,000원
                        {' '}
                        <span
                            style={{
                                fontSize: 12,
                                color: '#148b71'
                            }}
                        >
                            (월 약 11,600원 · 약 10% SAVE)
                        </span>
                    </div>

                </div>


                <p
                    className="muted"
                    style={{
                        marginTop: 16,
                        marginBottom: 0,
                        lineHeight: 1.7
                    }}
                >
                    모든 이용권은 1회 결제 상품이며
                    자동으로 갱신되지 않습니다.
                </p>

            </div>



            {/* 1 */}

            <div
                className="content-card"
                style={{
                    marginBottom: 18
                }}
            >

                <h2>
                    1. 등록 및 이용 시작
                </h2>


                <p
                    style={{
                        lineHeight: 1.9
                    }}
                >
                    Song Club 이용을 원하시는 경우
                    Dear Sunshine 센터에서 이용권을 결제합니다.
                    결제가 확인되면 관리자에서 회원 계정을 활성화하며,
                    활성화된 이용기간 동안 해당 회원에게 지정된
                    Sunshine Toddler 또는 Melody Book Club 콘텐츠를
                    이용할 수 있습니다.
                </p>

            </div>



            {/* 2 */}

            <div
                className="content-card"
                style={{
                    marginBottom: 18
                }}
            >

                <h2>
                    2. 이용기간
                </h2>


                <p
                    style={{
                        lineHeight: 1.9
                    }}
                >
                    이용기간은 관리자에서 등록된 시작일과 종료일을
                    기준으로 적용됩니다.
                    회원 페이지에서 이용 시작일, 종료일,
                    남은 이용기간을 확인할 수 있습니다.
                </p>


                <p
                    style={{
                        lineHeight: 1.9,
                        marginBottom: 0
                    }}
                >
                    이용기간이 종료되면 Song Club 콘텐츠 이용 권한도
                    종료됩니다. 계속 이용을 원하시는 경우
                    센터에서 새로운 이용권을 등록해주세요.
                </p>

            </div>



            {/* 3 */}

            <div
                className="content-card"
                style={{
                    marginBottom: 18
                }}
            >

                <h2>
                    3. 자동결제 및 자동갱신 없음
                </h2>


                <p
                    style={{
                        lineHeight: 1.9,
                        marginBottom: 0
                    }}
                >
                    Dear Sunshine Song Club은 현재
                    자동결제 또는 자동갱신 방식으로 운영되지 않습니다.
                    이용기간 종료 후 별도의 결제가 자동으로 발생하지 않으며,
                    원하실 때 센터를 통해 다시 등록하실 수 있습니다.
                </p>

            </div>



            {/* 4 */}

            <div
                className="content-card"
                style={{
                    marginBottom: 18
                }}
            >

                <h2>
                    4. 이용 프로그램
                </h2>


                <p
                    style={{
                        lineHeight: 1.9,
                        marginBottom: 0
                    }}
                >
                    Song Club 가입 시
                    Sunshine Toddler 또는 Melody Book Club 중
                    등록된 프로그램의 콘텐츠를 이용할 수 있습니다.
                    이용 프로그램 변경이 필요한 경우
                    Dear Sunshine 센터로 문의해주세요.
                </p>

            </div>



            {/* 5 */}

            <div
                className="content-card"
                style={{
                    marginBottom: 18
                }}
            >

                <h2>
                    5. 환불 및 이용 중단
                </h2>


                <p
                    style={{
                        lineHeight: 1.9,
                        marginBottom: 0
                    }}
                >
                    이용권의 환불 또는 이용 중단이 필요한 경우
                    Dear Sunshine 센터로 문의해주세요.
                    환불 가능 여부와 금액은 결제 시 안내된
                    이용조건 및 실제 이용기간을 기준으로 확인 후 안내드립니다.
                </p>

            </div>



            <div
                style={{
                    padding: '16px 18px',
                    borderRadius: 16,
                    background: '#fff8ea',
                    textAlign: 'center',
                    fontSize: 13,
                    lineHeight: 1.8
                }}
            >

                <strong>
                    ☀️ Dear Sunshine Song Club
                </strong>

                <br />

                결제 및 이용권 관련 문의는
                Dear Sunshine 센터로 부탁드립니다.

            </div>

        </section>

    );

}
