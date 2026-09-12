export const metadata = {
    title: '개인정보처리방침 | Dear Sunshine'
};


export default function PrivacyPage() {

    return (

        <section className="section top-section">

            <p className="eyebrow">
                PRIVACY POLICY
            </p>


            <h1>
                개인정보처리방침
            </h1>


            <p className="page-copy">
                디어 선샤인 영어 발달놀이 & 북클럽은
                이용자의 개인정보를 중요하게 생각하며,
                관련 법령에 따라 안전하게 처리하기 위해 노력합니다.
            </p>


            <div
                className="content-card"
                style={{
                    lineHeight: 1.9
                }}
            >

                <h2>
                    1. 수집하는 개인정보 항목
                </h2>

                <p>
                    Dear Sunshine Monthly Song Club 이용을 위해
                    다음과 같은 개인정보를 수집할 수 있습니다.
                </p>

                <ul>
                    <li>이메일 주소</li>
                    <li>회원 식별정보</li>
                    <li>Song Club 이용권 상태 및 이용기간</li>
                    <li>이용 프로그램 정보 (Sunshine Toddler / Melody Book Club)</li>
                    <li>서비스 이용기록 및 로그인 기록</li>
                </ul>


                <h2>
                    2. 개인정보의 이용 목적
                </h2>

                <ul>
                    <li>회원가입 및 본인 계정 확인</li>
                    <li>Song Club 이용권 활성화 및 이용기간 관리</li>
                    <li>회원별 이용 가능한 콘텐츠 제공</li>
                    <li>서비스 관련 안내 및 고객문의 응대</li>
                    <li>서비스 안정성 및 오류 확인</li>
                </ul>


                <h2>
                    3. 개인정보의 보유 및 이용기간
                </h2>

                <p>
                    개인정보는 서비스 제공에 필요한 기간 동안 보유하며,
                    회원 탈퇴 또는 개인정보 삭제 요청 시
                    관련 법령상 보관 의무가 있는 경우를 제외하고
                    지체 없이 삭제합니다.
                </p>

                <p>
                    법령에 따라 일정 기간 보관이 필요한 정보가 있는 경우에는
                    해당 법령에서 정한 기간 동안 별도로 보관할 수 있습니다.
                </p>


                <h2>
                    4. 개인정보의 제3자 제공
                </h2>

                <p>
                    Dear Sunshine은 원칙적으로 이용자의 개인정보를
                    외부에 판매하거나 임의로 제공하지 않습니다.
                </p>

                <p>
                    다만, 이용자의 동의가 있거나
                    법령에 따라 제공이 필요한 경우에는
                    필요한 범위 내에서 제공할 수 있습니다.
                </p>


                <h2>
                    5. 개인정보 처리의 위탁
                </h2>

                <p>
                    서비스 운영을 위해 서버, 데이터베이스,
                    이메일 인증 등 외부 서비스를 이용할 수 있습니다.
                    위탁이 필요한 경우 관련 법령에 따라
                    개인정보가 안전하게 처리되도록 관리합니다.
                </p>


                <h2>
                    6. 이용자의 권리
                </h2>

                <p>
                    이용자는 자신의 개인정보에 대해
                    열람, 정정, 삭제, 처리정지 등을 요청할 수 있습니다.
                </p>

                <p>
                    관련 요청은 아래 고객문의 연락처 또는 이메일로
                    접수해 주세요.
                </p>


                <h2>
                    7. 개인정보의 안전성 확보조치
                </h2>

                <p>
                    Dear Sunshine은 개인정보 보호를 위해
                    접근 권한 관리, 인증 절차,
                    서비스 접근 제한 등 필요한 보호조치를 적용합니다.
                </p>


                <h2>
                    8. 개인정보 보호책임자
                </h2>

                <p>
                    성명: 경서연
                    <br />
                    직책: 대표
                    <br />
                    전화: 010-8247-6447
                    <br />
                    이메일: syeonjamie@gmail.com
                </p>


                <h2>
                    9. 개인정보처리방침 변경
                </h2>

                <p>
                    본 개인정보처리방침은 서비스 운영 또는
                    관련 법령 변경에 따라 수정될 수 있으며,
                    중요한 변경사항이 있는 경우 서비스 내에서 안내합니다.
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
