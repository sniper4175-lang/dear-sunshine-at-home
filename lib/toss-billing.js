const TOSS_API_BASE =
    'https://api.tosspayments.com';


function getSecretKey() {

    const secretKey =
        process.env
            .TOSS_SECRET_KEY;


    if (!secretKey) {

        throw new Error(
            'TOSS_SECRET_KEY가 설정되지 않았습니다.'
        );

    }


    return secretKey;
}


function authorizationHeader() {

    return `Basic ${Buffer
        .from(
            `${getSecretKey()}:`,
            'utf8'
        )
        .toString(
            'base64'
        )}`;
}


async function readJsonResponse(
    response
) {

    const text =
        await response.text();


    if (!text) {
        return {};
    }


    try {
        return JSON.parse(
            text
        );
    } catch {
        return {
            message: text
        };
    }
}


function tossError(
    data,
    response,
    fallbackCode,
    fallbackMessage
) {

    const error =
        new Error(
            data?.message ||
            fallbackMessage
        );


    error.code =
        data?.code ||
        fallbackCode;


    error.status =
        response.status;


    error.data =
        data;


    return error;
}


export async function issueBillingKey({
    authKey,
    customerKey
}) {

    const response =
        await fetch(
            `${TOSS_API_BASE}/v1/billing/authorizations/issue`,
            {
                method:
                    'POST',

                headers: {
                    Authorization:
                        authorizationHeader(),

                    'Content-Type':
                        'application/json'
                },

                body:
                    JSON.stringify({
                        authKey,
                        customerKey
                    }),

                cache:
                    'no-store'
            }
        );


    const data =
        await readJsonResponse(
            response
        );


    if (!response.ok) {
        throw tossError(
            data,
            response,
            'BILLING_KEY_ISSUE_FAILED',
            '빌링키 발급에 실패했습니다.'
        );
    }


    return data;
}


export async function chargeBillingKey({
    billingKey,
    customerKey,
    amount,
    orderId,
    orderName,
    customerEmail
}) {

    const controller =
        new AbortController();


    const timeoutId =
        setTimeout(
            () => controller.abort(),
            65000
        );


    try {

        const response =
            await fetch(
                `${TOSS_API_BASE}/v1/billing/${encodeURIComponent(
                    billingKey
                )}`,
                {
                    method:
                        'POST',

                    headers: {
                        Authorization:
                            authorizationHeader(),

                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({
                            amount,
                            customerKey,
                            orderId,
                            orderName,
                            customerEmail:
                                customerEmail ||
                                undefined
                        }),

                    cache:
                        'no-store',

                    signal:
                        controller.signal
                }
            );


        const data =
            await readJsonResponse(
                response
            );


        if (!response.ok) {
            throw tossError(
                data,
                response,
                'BILLING_CHARGE_FAILED',
                '자동결제 승인에 실패했습니다.'
            );
        }


        return data;

    } catch (error) {

        if (
            error?.name ===
            'AbortError'
        ) {

            const timeoutError =
                new Error(
                    '토스페이먼츠 자동결제 응답 시간이 초과되었습니다.'
                );


            timeoutError.code =
                'BILLING_CHARGE_TIMEOUT';


            throw timeoutError;
        }


        throw error;

    } finally {

        clearTimeout(
            timeoutId
        );
    }
}


export async function getPaymentByOrderId(
    orderId
) {

    const response =
        await fetch(
            `${TOSS_API_BASE}/v1/payments/orders/${encodeURIComponent(
                orderId
            )}`,
            {
                method:
                    'GET',

                headers: {
                    Authorization:
                        authorizationHeader()
                },

                cache:
                    'no-store'
            }
        );


    const data =
        await readJsonResponse(
            response
        );


    if (
        response.status === 404 ||
        data?.code === 'NOT_FOUND_PAYMENT'
    ) {
        return null;
    }


    if (!response.ok) {
        throw tossError(
            data,
            response,
            'PAYMENT_LOOKUP_FAILED',
            '결제 조회에 실패했습니다.'
        );
    }


    return data;
}
