import MembershipPaymentButton
    from './MembershipPaymentButton';


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
                    background: '#fff'
                }}
            >

                <div
                    style={{
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
                            marginTop: 4,
                            color: '#8d8175',
                            fontSize: 13
                        }}
                    >
                        1개월 이용권
                    </div>

                </div>


                <div
                    style={{
                        marginTop: 18
                    }}
                >
                    <MembershipPaymentButton
                        plan="monthly"
                    />
                </div>

            </div>



            {/* 6개월 */}

            <div
                style={{
                    padding: 20,
                    border:
                        '1px solid #f0ddd0',
                    borderRadius: 20,
                    background: '#fff'
                }}
            >

                <div
                    style={{
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
                            marginTop: 4,
                            color: '#8d8175',
                            fontSize: 13
                        }}
                    >
                        월 12,250원
                    </div>


                    <div
                        style={{
                            display:
                                'inline-block',
                            marginTop: 9,
                            padding:
                                '5px 10px',
                            borderRadius: 999,
                            background:
                                '#fff6e7',
                            fontSize: 12,
                            fontWeight: 700
                        }}
                    >
                        약 5% SAVE! ⭐
                    </div>

                </div>


                <div
                    style={{
                        marginTop: 18
                    }}
                >
                    <MembershipPaymentButton
                        plan="sixMonths"
                    />
                </div>

            </div>



            {/* 12개월 */}

            <div
                style={{
                    padding: 20,
                    border:
                        '1px solid #d6eee7',
                    borderRadius: 20,
                    background: '#fff'
                }}
            >

                <div
                    style={{
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
                            marginTop: 4,
                            color: '#8d8175',
                            fontSize: 13
                        }}
                    >
                        월 약 11,600원
                    </div>


                    <div
                        style={{
                            display:
                                'inline-block',
                            marginTop: 9,
                            padding:
                                '5px 10px',
                            borderRadius: 999,
                            background:
                                '#eaf9f5',
                            fontSize: 12,
                            fontWeight: 700
                        }}
                    >
                        약 10% SAVE! ⭐
                    </div>

                </div>


                <div
                    style={{
                        marginTop: 18
                    }}
                >
                    <MembershipPaymentButton
                        plan="twelveMonths"
                    />
                </div>

            </div>



            {/* 자동결제 안내 */}

            <p
                style={{
                    margin: 0,
                    textAlign: 'center',
                    color: '#8d8175',
                    fontSize: 12,
                    lineHeight: 1.7
                }}
            >
                모든 멤버십은 1회 결제 상품이며
                자동으로 갱신되지 않습니다.
                <br />
                이용기간 종료 후 원하실 때
                다시 구매하실 수 있어요.
            </p>

        </div>

    );

}