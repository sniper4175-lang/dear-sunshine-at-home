export const metadata = {
    title: '이용약관 | Dear Sunshine'
};


const REGULAR_MONTHLY_PRICE = 16900;

function formatWon(value) {
    return `${value.toLocaleString('ko-KR')}원`;
}


export default function TermsPage() {

    return (

        <section className="section top-section">

            <p className="eyebrow">
                TERMS OF SERVICE
            </p>


            <h1>
                이용약관
            </h1>


            <p className="page-copy">
                본 약관은 Dear Sunshine Monthly Song Club의
                이용과 관련한 기본 사항을 정합니다.
            </p>


            <div
                className="content-card"
                style={{
                    lineHeight: 1.9
                }}
            >

                <h2>
                    제1조 목적
                </h2>

                <p>
                    본 약관은 디어 선샤인 영어 발달놀이 & 북클럽이
                    제공하는 Dear Sunshine Monthly Song Club
                    온라인 콘텐츠 서비스의 이용조건과
                    이용자 및 운영자의 권리·의무를 정하는 것을 목적으로 합니다.
                </p>


                <h2>
                    제2조 서비스 내용
                </h2>

                <p>
                    Song Club은 Dear Sunshine 수업과 연계된
                    영어 노래 및 관련 자료를 온라인으로 제공하는
                    회원 전용 서비스입니다.
                </p>

                <p>
                    제공되는 콘텐츠에는 다음이 포함될 수 있습니다.
                </p>

                <ul>
                    <li>영어 노래 음원</li>
                    <li>Lyrics</li>
                    <li>Play Ideas</li>
                    <li>Printable Materials</li>
                    <li>기타 수업 연계 콘텐츠</li>
                </ul>


                <h2>
                    제3조 회원가입 및 계정
                </h2>

                <p>
                    이용자는 정확한 이메일 주소를 사용하여
                    회원가입해야 합니다.
                </p>

                <p>
                    계정은 본인 또는 해당 가정의 이용을 위한 것이며,
                    계정 정보를 타인에게 무단 공유하거나
                    다수의 제3자와 공동 이용해서는 안 됩니다.
                </p>


                <h2>
                    제4조 이용권 등록
                </h2>

                <p>
                    Song Club은 센터에서 이용권 결제 확인 후
                    관리자가 회원 계정을 활성화하는 방식으로 운영됩니다.
                </p>

                <p>
                    이용권의 정가는 다음과 같습니다.
                </p>

                <ul>
                    <li>
                        1개월 이용권 정가: {formatWon(REGULAR_MONTHLY_PRICE)}
                    </li>
                    <li>
                        6개월 이용권 정가: {formatWon(REGULAR_MONTHLY_PRICE * 6)}
                    </li>
                    <li>
                        12개월 이용권 정가: {formatWon(REGULAR_MONTHLY_PRICE * 12)}
                    </li>
                </ul>

                <p>
                    실제 결제 금액은 프로모션 등 적용 조건에 따라
                    달라질 수 있으며, 이용권의 이용기간, 결제 금액 및
                    적용 조건은 결제 시 안내되는 내용을 따릅니다.
                </p>


                <h2>
                    제5조 이용기간
                </h2>

                <p>
                    이용기간은 관리자에 등록된 시작일과 종료일을 기준으로 합니다.
                </p>

                <p>
                    이용기간이 종료되면 해당 계정의 Song Club 콘텐츠
                    이용 권한이 종료될 수 있습니다.
                </p>


                <h2>
                    제6조 프로그램별 콘텐츠 이용
                </h2>

                <p>
                    회원에게는 등록된 프로그램에 따라
                    Sunshine Toddler 또는 Melody Book Club의
                    콘텐츠 이용 권한이 부여됩니다.
                </p>

                <p>
                    프로그램 변경이 필요한 경우
                    Dear Sunshine 센터에 문의해 주세요.
                </p>


                <h2>
                    제7조 콘텐츠 저작권 및 이용 제한
                </h2>

                <p>
                    Song Club에서 제공되는 음원, 가사, 이미지,
                    플래시 카드, 워크시트 등 모든 콘텐츠의 저작권은
                    Dear Sunshine 또는 정당한 권리자에게 있습니다.
                </p>

                <p>
                    이용자는 개인적·가정 내 이용 범위에서
                    콘텐츠를 이용할 수 있으며,
                    다음 행위는 금지됩니다.
                </p>

                <ul>
                    <li>음원 또는 자료를 제3자에게 무단 배포하는 행위</li>
                    <li>콘텐츠를 재판매하거나 상업적으로 이용하는 행위</li>
                    <li>무단 복제, 재업로드 또는 공개 게시하는 행위</li>
                    <li>서비스의 정상적인 운영을 방해하는 행위</li>
                </ul>


                <h2>
                    제8조 서비스 변경 및 중단
                </h2>

                <p>
                    콘텐츠 구성, 공개 일정, 서비스 기능은
                    운영상 필요한 경우 변경될 수 있습니다.
                </p>

                <p>
                    서버 점검, 장애, 외부 서비스 장애 등으로 인해
                    일시적으로 서비스 이용이 제한될 수 있습니다.
                </p>


                <h2>
                    제9조 이용 제한
                </h2>

                <p>
                    이용자가 약관을 위반하거나
                    계정 공유, 무단 복제 등 부정 이용이 확인되는 경우
                    서비스 이용이 제한될 수 있습니다.
                </p>


                <h2>
                    제10조 환불
                </h2>

                <p>
                    이용권 환불에 관한 사항은
                    별도의 '이용권·환불 안내'에 따릅니다.
                </p>


                <h2>
                    제11조 문의
                </h2>

                <p>
                    서비스 이용 관련 문의는 아래 연락처로 접수해 주세요.
                </p>

                <p>
                    전화: 010-8247-6447
                    <br />
                    이메일: syeonjamie@gmail.com
                </p>


                <hr
                    style={{
                        margin: '28px 0',
                        border: 0,
                        borderTop: '1px solid rgba(0,0,0,0.08)'
                    }}
                />


                <p
                    className="muted"
                    style={{
                        marginBottom: 0
                    }}
                >
                    시행일: 2026년 9월 12일
                </p>

            </div>

        </section>

    );

}
