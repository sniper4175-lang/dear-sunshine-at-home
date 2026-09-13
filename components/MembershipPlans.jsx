export default function MembershipPlans() {

    return (

        <div
            style={{
                display: 'grid',
                gap: 18
            }}
        >

            {/* Opening Special */}

            <div
                style={{
                    padding: '22px 18px',
                    borderRadius: 18,
                    background: '#fff7e5',
                    textAlign: 'center'
                }}
            >

                <div
                    style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        borderRadius: 999,
                        background: '#f82674',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 13,
                        marginBottom: 12
                    }}
                >
                    OPENING SPECIAL
                </div>


                <div
                    style={{
                        color: '#75675c',
                        fontSize: 14,
                        marginBottom: 5
                    }}
                >
                    정가 월{' '}

                    <span
                        style={{
                            textDecoration:
                                'line-through'
                        }}
                    >
                        16,900원
                    </span>

                </div>


                <div
                    style={{
                        color: '#ef1b69',
                        fontSize: 30,
                        fontWeight: 800
                    }}
                >
                    월 12,900원
                </div>


                <div
                    style={{
                        marginTop: 10,
                        fontSize: 15,
                        fontWeight: 700
                    }}
                >
                    🎉 9월 12일 OPEN!
                </div>


                <div
                    style={{
                        marginTop: 5,
                        color: '#76675b',
                        fontSize: 13
                    }}
                >
                    10월 10일까지 가입 시
                    오픈 특가로 만나보세요!
                </div>

            </div>



            {/* 1개월 */}

            <div
                style={{
                    padding: 20,
                    border:
                        '1px solid #f0ddd0',
                    borderRadius: 20,
                    background: '#fff',
                    textAlign: 'center'
                }}
            >

                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: '#ef2870'
                    }}
                >
                    1개월
                </div>


                <div
                    style={{
                        marginTop: 8,
                        fontSize: 28,
                        fontWeight: 800
                    }}
                >
                    12,900원
                </div>


                <div
                    style={{
                        marginTop: 5,
                        color: '#8d8175',
                        fontSize: 13
                    }}
                >
                    1개월 이용권
                </div>

            </div>



            {/* 6개월 */}

            <div
                style={{
                    padding: 20,
                    border:
                        '1px solid #f0ddd0',
                    borderRadius: 20,
                    background: '#fff',
                    textAlign: 'center'
                }}
            >

                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: '#ee8b17'
                    }}
                >
                    6개월
                </div>


                <div
                    style={{
                        marginTop: 8,
                        fontSize: 28,
                        fontWeight: 800
                    }}
                >
                    73,500원
                </div>


                <div
                    style={{
                        marginTop: 5,
                        color: '#8d8175',
                        fontSize: 13
                    }}
                >
                    월 12,250원
                </div>


                <div
                    style={{
                        display: 'inline-block',
                        marginTop: 9,
                        padding: '5px 10px',
                        borderRadius: 999,
                        background: '#fff6e7',
                        fontSize: 12,
                        fontWeight: 700
                    }}
                >
                    약 5% SAVE! ⭐
                </div>

            </div>



            {/* 12개월 */}

            <div
                style={{
                    padding: 20,
                    border:
                        '1px solid #d6eee7',
                    borderRadius: 20,
                    background: '#fff',
                    textAlign: 'center'
                }}
            >

                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: '#18a884'
                    }}
                >
                    12개월
                </div>


                <div
                    style={{
                        marginTop: 8,
                        fontSize: 28,
                        fontWeight: 800
                    }}
                >
                    139,000원
                </div>


                <div
                    style={{
                        marginTop: 5,
                        color: '#8d8175',
                        fontSize: 13
                    }}
                >
                    월 약 11,600원
                </div>


                <div
                    style={{
                        display: 'inline-block',
                        marginTop: 9,
                        padding: '5px 10px',
                        borderRadius: 999,
                        background: '#eaf9f5',
                        fontSize: 12,
                        fontWeight: 700
                    }}
                >
                    약 10% SAVE! ⭐
                </div>

            </div>



            {/* 결제 안내 */}

            <div
                style={{
                    marginTop: 2,
                    padding: '18px 16px',
                    borderRadius: 16,
                    background: '#fff8ea',
                    textAlign: 'center',
                    lineHeight: 1.8
                }}
            >

                <strong
                    style={{
                        display: 'block',
                        marginBottom: 5
                    }}
                >
                    ☀️ Song Club 등록 안내
                </strong>

                <span
                    style={{
                        color: '#75675c',
                        fontSize: 13
                    }}
                >
                    Song Club 이용권은
                    Dear Sunshine 센터에서 결제 후
                    이용하실 수 있습니다.
                    <br />

                    결제 확인 후 회원 계정이
                    활성화됩니다.
                    <br />

                    이용권별 이용기간과 금액을 확인한 후
                    원하는 이용권을 선택해 주세요.
                </span>

            </div>

        </div>

    );

}