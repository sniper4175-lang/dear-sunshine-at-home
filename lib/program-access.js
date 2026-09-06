/*
 * 서버 전용 프로그램 권한 조회
 * ds_user_program_access를 단일 기준으로 사용합니다.
 */
export async function getUserPrograms(
    db,
    userId
) {

    if (
        !db ||
        !userId
    ) {
        return [];
    }


    const {
        data,
        error
    } =
        await db
            .from(
                'ds_user_program_access'
            )
            .select(
                'program'
            )
            .eq(
                'user_id',
                userId
            );


    if (error) {

        console.error(
            'getUserPrograms error:',
            {
                message:
                    error?.message,

                code:
                    error?.code,

                details:
                    error?.details,

                hint:
                    error?.hint
            }
        );


        throw new Error(
            'PROGRAM_ACCESS_LOOKUP_FAILED'
        );

    }


    return [
        ...new Set(
            (
                data ||
                []
            )
                .map(
                    row =>
                        row.program
                )
                .filter(
                    Boolean
                )
        )
    ];
}
