import {
    NextResponse
} from 'next/server';

import {
    requireAdmin,
    clearAdminToken
} from '../../../../lib/supabase-server';

import {
    adminDb
} from '../../../../lib/supabase-admin';

import {
    cleanPhone,
    hashPin
} from '../../../../lib/security';


const HOME_PACKAGE_DURATION_WEEKS = {
    home_8: 10,
    home_12: 15,
    home_20: 25
};

const HOME_PACKAGE_PRICES = {
    home_8: 29000,
    home_12: 39000,
    home_20: 59000
};

function todayKST() {
    return new Date().toLocaleDateString(
        'en-CA',
        {
            timeZone: 'Asia/Seoul'
        }
    );
}

async function insertExtraRevenue(
    db,
    {
        category,
        userId,
        description,
        amount,
        sourceType,
        sourceId
    }
) {
    const numericAmount = Number(amount);

    if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
    ) {
        return null;
    }

    const fullPayload = {
        revenue_date: todayKST(),
        category,
        user_id: userId || null,
        description: description || category,
        amount: numericAmount,
        payment_method: 'center',
        source_type: sourceType || null,
        source_id: sourceId || null
    };

    const fullResult = await db
        .from('ds_extra_revenue')
        .insert(fullPayload)
        .select('id,revenue_date,category,user_id,description,amount,payment_method,source_type,source_id,created_at')
        .single();

    if (!fullResult.error) {
        return fullResult.data;
    }

    /* 구버전 수익 테이블과도 호환 */
    const schemaMismatch =
        ['PGRST204', '42703'].includes(
            String(fullResult.error?.code || '')
        ) ||
        /column|schema cache/i.test(
            String(fullResult.error?.message || '')
        );

    if (schemaMismatch) {
        const fallbackResult = await db
            .from('ds_extra_revenue')
            .insert({
                revenue_date: fullPayload.revenue_date,
                category: fullPayload.category,
                user_id: fullPayload.user_id,
                description: fullPayload.description,
                amount: fullPayload.amount
            })
            .select('id,revenue_date,category,user_id,description,amount,created_at')
            .single();

        if (!fallbackResult.error) {
            return fallbackResult.data;
        }

        throw fallbackResult.error;
    }

    throw fullResult.error;
}

function calculateHomePackageEndDate(startsAt, planCode) {
    const weeks = HOME_PACKAGE_DURATION_WEEKS[planCode];

    if (!weeks || !/^\d{4}-\d{2}-\d{2}$/.test(String(startsAt || ''))) {
        return null;
    }

    const [year, month, day] = String(startsAt).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + weeks * 7);

    return [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, '0'),
        String(date.getUTCDate()).padStart(2, '0')
    ].join('-');
}


const ALLOWED_DAYS = [
    '',
    '월요일',
    '화요일',
    '수요일',
    '목요일',
    '금요일',
    '토요일',
    '일요일'
];


function validTime(value) {

    if (!value) {
        return true;
    }

    const m =
        /^(\d{2}):(\d{2})$/.exec(
            value
        );

    if (!m) {
        return false;
    }

    const h =
        Number(m[1]);

    const min =
        Number(m[2]);

    // 기본은 10분 단위,
    // 11:15는 예외적으로 허용
    const isAllowedMinute =
        min % 10 === 0 ||
        value === '11:15';

    return (
        h >= 0 &&
        h <= 23 &&
        min >= 0 &&
        min <= 59 &&
        isAllowedMinute
    );
}



/*
 * =====================================================
 * Song Club Storage 자동 연결 helpers
 * =====================================================
 */

function getAudioContentKey(audioPath) {

    const raw =
        String(audioPath || '')
            .split('/')
            .pop() || '';

    return raw
        .replace(/\.[^/.]+$/, '')
        .normalize('NFC')
        .trim();
}


async function listFilesInStorageFolder(
    db,
    bucket,
    folderPath
) {

    if (
        !bucket ||
        !folderPath
    ) {
        return [];
    }


    const {
        data,
        error
    } =
        await db
            .storage
            .from(bucket)
            .list(
                folderPath,
                {
                    limit: 500,
                    offset: 0,
                    sortBy: {
                        column: 'name',
                        order: 'asc'
                    }
                }
            );


    if (error) {
        throw error;
    }


    return (data || [])
        .filter(
            file =>
                file.id !== null
        )
        .map(
            file => ({
                name:
                    file.name,
                path:
                    `${folderPath}/${file.name}`,
                bucket
            })
        );
}


async function findMatchingContentFolder(
    db,
    bucket,
    program,
    contentKey
) {

    const candidates = [
        `${program}/${contentKey}`,
        contentKey
    ];


    for (
        const folderPath
        of candidates
    ) {

        try {

            const files =
                await listFilesInStorageFolder(
                    db,
                    bucket,
                    folderPath
                );


            if (
                files.length > 0
            ) {
                return {
                    folderPath,
                    files
                };
            }

        } catch (error) {

            /*
             * 존재하지 않는 경로는 빈 목록과 동일하게 취급합니다.
             * bucket 자체 오류는 아래 최종 결과에서 따로 표시합니다.
             */
            console.warn(
                `[Song Club] ${bucket}/${folderPath} 조회 실패`,
                error?.message || error
            );

        }
    }


    return {
        folderPath:
            `${program}/${contentKey}`,
        files: []
    };
}


async function resolvePlayIdeasBucket(db) {

    const envBucket =
        String(
            process.env.DEAR_SUNSHINE_PLAY_IDEAS_BUCKET || ''
        ).trim();

    const preferred = [
        envBucket,
        'dear-sunshine-play-ideas',
        'dear-sunshine-playideas',
        'dear-sunshine-play-idea',
        'dear-sunshine-play-guides',
        'dear-sunshine-activities',
        'play-ideas'
    ].filter(Boolean);


    try {

        const {
            data: buckets,
            error
        } =
            await db
                .storage
                .listBuckets();


        if (error) {
            throw error;
        }


        const list =
            buckets || [];

        const exact =
            preferred.find(
                candidate =>
                    list.some(
                        bucket =>
                            bucket.id === candidate ||
                            bucket.name === candidate
                    )
            );


        if (exact) {
            return exact;
        }


        const fuzzy =
            list.find(
                bucket => {

                    const value =
                        String(
                            bucket.id ||
                            bucket.name ||
                            ''
                        )
                            .toLowerCase();

                    return (
                        (
                            value.includes('play') &&
                            (
                                value.includes('idea') ||
                                value.includes('guide')
                            )
                        ) ||
                        value.includes('activit')
                    );
                }
            );


        return fuzzy?.id ||
            fuzzy?.name ||
            null;

    } catch (error) {

        console.warn(
            '[Song Club] 놀이 아이디어 bucket 자동 탐색 실패',
            error?.message || error
        );

        return envBucket ||
            'dear-sunshine-play-ideas';
    }
}


function calculateExpiry(
    startDate,
    baseCount
) {

    const weeksMap = {
        8: 10,
        12: 15,
        20: 25
    };

    const weeks =
        weeksMap[
        Number(baseCount)
        ];

    if (
        !startDate ||
        !weeks
    ) {
        return null;
    }


    const d =
        new Date(
            `${startDate}T00:00:00Z`
        );


    if (
        Number.isNaN(
            d.getTime()
        )
    ) {
        return null;
    }


    d.setUTCDate(
        d.getUTCDate() +
        weeks * 7
    );


    return d
        .toISOString()
        .slice(0, 10);
}



function adminActionErrorMessage(error, actionName) {
    const code = String(error?.code || '').trim();
    const message = String(error?.message || '').trim();

    if (code === '23505') {
        return '이미 같은 회원 상태 또는 권한이 등록되어 있습니다. 기존 Song Club 회원 정보를 확인해주세요.';
    }

    if (
        ['PGRST204', '42703', '42P01', 'PGRST205'].includes(code) ||
        /schema cache|column .*does not exist|relation .*does not exist/i.test(message)
    ) {
        return '데이터베이스 구조가 현재 관리자 코드와 맞지 않습니다. 함께 제공한 Song Club DB 보정 SQL을 먼저 실행해주세요.';
    }

    const action = String(actionName || '관리 작업').trim();

    return code
        ? `${action} 처리 중 오류가 발생했습니다. (오류코드: ${code})`
        : `${action} 처리 중 서버 오류가 발생했습니다.`;
}

export async function POST(req) {

    if (
        !await requireAdmin()
    ) {
        return NextResponse.json(
            {
                error:
                    '로그인이 필요합니다.'
            },
            {
                status: 401
            }
        );
    }


    let currentAction = '';

    try {

        const b =
            await req.json();

        currentAction =
            String(b?.action || '').trim();

        const db =
            adminDb();


        /*
         * 로그아웃
         */
        if (
            b.action ===
            'logout'
        ) {

            await clearAdminToken();

            return NextResponse.json({
                ok: true
            });
        }



        /*
         * =====================================
         * Song Club / Home Package 수익 취소
         * =====================================
         * 상품 이용 권한은 그대로 두고, 수익 관리에 기록된
         * 해당 결제 수익만 삭제합니다.
         */
        if (b.action === 'deleteExtraRevenue') {

            const revenueId =
                String(b.revenueId || '').trim();

            if (!revenueId) {
                return NextResponse.json(
                    {
                        error: '취소할 수익 내역을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }

            const {
                data: revenueRow,
                error: revenueLookupError
            } = await db
                .from('ds_extra_revenue')
                .select('id,revenue_date,category,user_id,description,amount,payment_method,source_type,source_id,created_at')
                .eq('id', revenueId)
                .maybeSingle();

            if (revenueLookupError) {
                throw revenueLookupError;
            }

            if (!revenueRow) {
                return NextResponse.json(
                    {
                        error: '이미 취소되었거나 존재하지 않는 수익 내역입니다.'
                    },
                    {
                        status: 404
                    }
                );
            }

            const normalizedRevenueCategory =
                String(revenueRow.category || '')
                    .trim()
                    .toLowerCase()
                    .replace(/[\s-]+/g, '_');

            if (
                !['song_club', 'home_package'].includes(
                    normalizedRevenueCategory
                )
            ) {
                return NextResponse.json(
                    {
                        error: 'Song Club 또는 Home Package 수익만 이 화면에서 취소할 수 있습니다.'
                    },
                    {
                        status: 400
                    }
                );
            }

            const { error: deleteRevenueError } = await db
                .from('ds_extra_revenue')
                .delete()
                .eq('id', revenueId);

            if (deleteRevenueError) {
                throw deleteRevenueError;
            }

            return NextResponse.json({
                ok: true,
                deletedRevenue: revenueRow
            });
        }


        /* DS_STUDENT_NAME_AUTH_USERS_PATCH */
        /*
         * Song Club / Home Package 관리자용 회원 목록
         * Supabase Auth user_metadata.student_name을 함께 내려줍니다.
         */
        if (b.action === 'listAtHomeAuthUsers') {

            const allUsers = [];
            const perPage = 200;
            let page = 1;

            while (page <= 50) {
                const {
                    data,
                    error
                } = await db.auth.admin.listUsers({
                    page,
                    perPage
                });

                if (error) {
                    throw error;
                }

                const rows = data?.users || [];
                allUsers.push(...rows);

                if (rows.length < perPage) {
                    break;
                }

                page += 1;
            }

            const users = allUsers
                .map((user) => ({
                    id: user.id,
                    email: user.email || '',
                    studentName: String(
                        user.user_metadata?.student_name ||
                        user.user_metadata?.studentName ||
                        ''
                    ).trim()
                }))
                .sort((a, b) => {
                    const aKey = a.studentName || a.email || a.id;
                    const bKey = b.studentName || b.email || b.id;
                    return String(aKey).localeCompare(String(bKey), 'ko');
                });

            return NextResponse.json({
                ok: true,
                users
            });
        }


        /*
         * =====================================
         * 체험수업 등록
         * =====================================
         */
        if (
            b.action ===
            'addTrial'
        ) {

            const studentName =
                String(
                    b.studentName || ''
                ).trim();

            const phone =
                b.phone
                    ? cleanPhone(
                        b.phone
                    )
                    : null;

            const className =
                String(
                    b.className || ''
                ).trim();

            const trialDate =
                String(
                    b.trialDate || ''
                );

            const trialTime =
                String(
                    b.trialTime || ''
                );

            const paidAmount =
                Number(
                    b.paidAmount
                );


            if (
                !studentName ||
                !className ||
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    trialDate
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '학생 이름, 클래스, 체험 날짜를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            if (
                phone &&
                !/^01\d{8,9}$/.test(
                    phone
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '휴대폰 번호를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            if (
                trialTime &&
                !validTime(
                    trialTime
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '체험 시간은 10분 단위로 선택해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            if (
                !Number.isFinite(
                    paidAmount
                ) ||
                paidAmount < 0
            ) {
                return NextResponse.json(
                    {
                        error:
                            '체험 수업료를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const {
                error
            } =
                await db
                    .from(
                        'trial_classes'
                    )
                    .insert({
                        student_name:
                            studentName,

                        phone:
                            phone || null,

                        class_name:
                            className,

                        trial_date:
                            trialDate,

                        trial_time:
                            trialTime || null,

                        paid_amount:
                            paidAmount,

                        status:
                            'attended'
                    });


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok: true
            });
        }



        /*
         * 체험수업 취소
         */
        if (
            b.action ===
            'cancelTrial'
        ) {

            if (!b.id) {
                return NextResponse.json(
                    {
                        error:
                            '체험수업 기록을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const {
                error
            } =
                await db
                    .from(
                        'trial_classes'
                    )
                    .update({
                        status:
                            'cancelled'
                    })
                    .eq(
                        'id',
                        b.id
                    );


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok: true
            });
        }



        /*
         * =====================================
         * 신규 정규 등록
         * =====================================
         */
        if (
            b.action ===
            'addEnrollment'
        ) {

            const phone =
                cleanPhone(
                    b.phone
                );


            if (
                !/^01\d{8,9}$/.test(
                    phone
                ) ||
                !b.studentName ||
                !b.className
            ) {
                return NextResponse.json(
                    {
                        error:
                            '입력 정보를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            if (
                !ALLOWED_DAYS.includes(
                    b.regularDay || ''
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '정규 요일을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            if (
                !validTime(
                    b.regularTime
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '정규 수업 시간을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const baseCount =
                Number(
                    b.baseCount
                );

            const bonusCount =
                Number(
                    b.bonusCount || 0
                );

            const totalCount =
                Number(
                    b.totalCount
                );

            const paidAmount =
                Number(
                    b.paidAmount
                );


            if (
                ![
                    8,
                    12,
                    20
                ].includes(
                    baseCount
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '기본 수강권은 8회, 12회, 20회 중 선택해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            if (
                ![
                    0,
                    1,
                    2,
                    3
                ].includes(
                    bonusCount
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '이벤트 추가 횟수를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            if (
                totalCount !==
                baseCount +
                bonusCount
            ) {
                return NextResponse.json(
                    {
                        error:
                            '총 이용 횟수를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            if (
                !Number.isFinite(
                    paidAmount
                ) ||
                paidAmount < 0
            ) {
                return NextResponse.json(
                    {
                        error:
                            '총 납부금액을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            if (
                !b.startDate
            ) {
                return NextResponse.json(
                    {
                        error:
                            '수강권 시작일을 선택해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const expiresAt =
                calculateExpiry(
                    b.startDate,
                    baseCount
                );


            if (!expiresAt) {
                return NextResponse.json(
                    {
                        error:
                            '이용기한을 계산할 수 없습니다.'
                    },
                    {
                        status: 400
                    }
                );
            }


            let {
                data: parent,
                error: parentError
            } =
                await db
                    .from('parents')
                    .select('id')
                    .eq(
                        'phone',
                        phone
                    )
                    .maybeSingle();


            if (parentError) {
                throw parentError;
            }


            if (!parent) {

                const r =
                    await db
                        .from('parents')
                        .insert({
                            name:
                                '학부모',

                            phone,

                            phone_last4:
                                phone.slice(-4),

                            access_pin_hash:
                                null
                        })
                        .select('id')
                        .single();


                if (r.error) {
                    throw r.error;
                }


                parent =
                    r.data;
            }


            const sr =
                await db
                    .from('students')
                    .insert({
                        parent_id:
                            parent.id,

                        name:
                            String(
                                b.studentName
                            ).trim(),

                        class_name:
                            b.className,

                        regular_day:
                            b.regularDay ||
                            null,

                        regular_time:
                            b.regularTime ||
                            null
                    })
                    .select('id')
                    .single();


            if (sr.error) {
                throw sr.error;
            }


            const pr =
                await db
                    .from('passes')
                    .insert({
                        student_id:
                            sr.data.id,

                        base_count:
                            baseCount,

                        bonus_count:
                            bonusCount,

                        total_count:
                            totalCount,

                        paid_amount:
                            paidAmount,

                        start_date:
                            b.startDate,

                        expires_at:
                            expiresAt
                    })
                    .select('id')
                    .single();


            if (pr.error) {
                throw pr.error;
            }


            return NextResponse.json({
                ok: true
            });
        }



        /*
         * =====================================
         * 클래스 / 정규일정 수정
         * =====================================
         */
        if (
            b.action ===
            'updateStudentSchedule'
        ) {

            if (
                !b.studentId ||
                !b.className
            ) {
                return NextResponse.json(
                    {
                        error:
                            '학생과 클래스를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            if (
                !ALLOWED_DAYS.includes(
                    b.regularDay || ''
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '정규 요일을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            if (
                !validTime(
                    b.regularTime
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '정규 수업 시간은 10분 단위로 선택해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const {
                error
            } =
                await db
                    .from('students')
                    .update({
                        class_name:
                            b.className,

                        regular_day:
                            b.regularDay ||
                            null,

                        regular_time:
                            b.regularTime ||
                            null
                    })
                    .eq(
                        'id',
                        b.studentId
                    );


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok: true
            });
        }



        /*
         * =====================================
         * PIN 수정
         * =====================================
         */
        if (
            b.action ===
            'updateParentPin'
        ) {

            const pin =
                String(
                    b.pin || ''
                );


            if (
                !b.studentId ||
                !/^\d{4}$/.test(
                    pin
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '새 확인번호 숫자 4자리를 입력해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const {
                data: student,
                error: studentError
            } =
                await db
                    .from('students')
                    .select(
                        'parent_id'
                    )
                    .eq(
                        'id',
                        b.studentId
                    )
                    .single();


            if (
                studentError ||
                !student
            ) {
                return NextResponse.json(
                    {
                        error:
                            '학생 정보를 확인할 수 없습니다.'
                    },
                    {
                        status: 404
                    }
                );
            }


            const {
                error
            } =
                await db
                    .from('parents')
                    .update({
                        access_pin_hash:
                            hashPin(pin)
                    })
                    .eq(
                        'id',
                        student.parent_id
                    );


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok: true
            });
        }



        /*
         * =====================================
         * 휴대폰 번호 수정
         * =====================================
         */
        if (
            b.action ===
            'updateParentPhone'
        ) {

            const phone =
                cleanPhone(
                    b.phone
                );


            if (
                !b.studentId ||
                !/^01\d{8,9}$/.test(
                    phone
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '새 휴대폰 번호를 정확히 입력해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const {
                data: student,
                error: studentError
            } =
                await db
                    .from('students')
                    .select(
                        'parent_id'
                    )
                    .eq(
                        'id',
                        b.studentId
                    )
                    .single();


            if (
                studentError ||
                !student
            ) {
                return NextResponse.json(
                    {
                        error:
                            '학생 정보를 확인할 수 없습니다.'
                    },
                    {
                        status: 404
                    }
                );
            }


            const {
                data: existing,
                error: existingError
            } =
                await db
                    .from('parents')
                    .select('id')
                    .eq(
                        'phone',
                        phone
                    )
                    .neq(
                        'id',
                        student.parent_id
                    )
                    .maybeSingle();


            if (existingError) {
                throw existingError;
            }


            if (existing) {
                return NextResponse.json(
                    {
                        error:
                            '이미 다른 학부모에게 등록된 휴대폰 번호입니다.'
                    },
                    {
                        status: 409
                    }
                );
            }


            const {
                error
            } =
                await db
                    .from('parents')
                    .update({
                        phone,

                        phone_last4:
                            phone.slice(-4)
                    })
                    .eq(
                        'id',
                        student.parent_id
                    );


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok: true
            });
        }



        /*
         * =====================================
         * 이용기한 수정
         * =====================================
         */
        if (
            b.action ===
            'updatePassExpiry'
        ) {

            if (
                !b.passId ||
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    String(
                        b.expiresAt || ''
                    )
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '변경할 이용기한을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const {
                data: pass,
                error: passError
            } =
                await db
                    .from('passes')
                    .select(
                        'id,start_date'
                    )
                    .eq(
                        'id',
                        b.passId
                    )
                    .single();


            if (
                passError ||
                !pass
            ) {
                return NextResponse.json(
                    {
                        error:
                            '수강권 정보를 찾을 수 없습니다.'
                    },
                    {
                        status: 404
                    }
                );
            }


            if (
                pass.start_date &&
                b.expiresAt <
                pass.start_date
            ) {
                return NextResponse.json(
                    {
                        error:
                            '이용기한은 시작일보다 빠를 수 없습니다.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const {
                error
            } =
                await db
                    .from('passes')
                    .update({
                        expires_at:
                            b.expiresAt,

                        status:
                            'active'

                    })
                    .eq(
                        'id',
                        b.passId
                    );


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok: true
            });
        }


        /*
        * =====================================
        * 시작일 + 이용기한 수정
        * =====================================
        */
        if (
            b.action ===
            'updatePassStartDate'
        ) {

            const startDate =
                String(
                    b.startDate || ''
                );

            const expiresAt =
                String(
                    b.expiresAt || ''
                );


            if (
                !b.passId ||
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    startDate
                ) ||
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    expiresAt
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '변경할 시작일과 이용기한을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            if (
                expiresAt <
                startDate
            ) {
                return NextResponse.json(
                    {
                        error:
                            '이용기한은 시작일보다 빠를 수 없습니다.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const {
                data: pass,
                error: passError
            } =
                await db
                    .from('passes')
                    .select(
                        'id'
                    )
                    .eq(
                        'id',
                        b.passId
                    )
                    .single();


            if (
                passError ||
                !pass
            ) {
                return NextResponse.json(
                    {
                        error:
                            '수강권 정보를 찾을 수 없습니다.'
                    },
                    {
                        status: 404
                    }
                );
            }


            const {
                error
            } =
                await db
                    .from('passes')
                    .update({
                        start_date:
                            startDate,

                        expires_at:
                            expiresAt
                    })
                    .eq(
                        'id',
                        b.passId
                    );


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok: true
            });
        }


        /*
        * =====================================
        * 수강 종료
        * =====================================
        */
        if (
            b.action ===
            'deactivateStudent'
        ) {

            if (!b.studentId) {
                return NextResponse.json(
                    {
                        error:
                            '학생 정보를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const reason =
                String(
                    b.reason || ''
                ).trim() ||
                '재등록 안 함';


            const {
                error
            } =
                await db
                    .from('students')
                    .update({
                        enrollment_status:
                            'inactive',

                        inactive_reason:
                            reason,

                        inactive_at:
                            new Date().toISOString()
                    })
                    .eq(
                        'id',
                        b.studentId
                    );


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok: true
            });
        }


        /*
        * =====================================
        * 수강 종료 학생 → 다시 수강 중으로 복구
        * =====================================
        */
        if (
            b.action ===
            'reactivateStudent'
        ) {

            if (!b.studentId) {
                return NextResponse.json(
                    {
                        error:
                            '학생 정보를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const {
                error
            } =
                await db
                    .from('students')
                    .update({
                        enrollment_status:
                            'active',

                        inactive_reason:
                            null,

                        inactive_at:
                            null
                    })
                    .eq(
                        'id',
                        b.studentId
                    );


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok: true
            });
        }


        /*
         * =====================================
         * 현재 수강권 납부금액 수정
         * =====================================
         */
        if (
            b.action ===
            'updatePaidAmount'
        ) {

            const amount =
                Number(
                    b.paidAmount
                );


            if (
                !b.passId ||
                !Number.isFinite(
                    amount
                ) ||
                amount < 0
            ) {
                return NextResponse.json(
                    {
                        error:
                            '납부금액을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const {
                error
            } =
                await db
                    .from('passes')
                    .update({
                        paid_amount:
                            amount
                    })
                    .eq(
                        'id',
                        b.passId
                    );


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok: true
            });
        }



        /*
         * 수강권 정보 변경
         */
        if (
            b.action ===
            'updatePassPlan'
        ) {
            const baseCount =
                Number(
                    b.baseCount
                );

            const bonusCount =
                Number(
                    b.bonusCount
                );

            const paidAmount =
                Number(
                    b.paidAmount
                );

            if (
                !b.passId ||
                ![8, 12, 20].includes(
                    baseCount
                ) ||
                ![0, 1, 2, 3].includes(
                    bonusCount
                ) ||
                !Number.isFinite(
                    paidAmount
                ) ||
                paidAmount < 0
            ) {
                return NextResponse.json(
                    {
                        error:
                            '수강권 정보를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }

            const totalCount =
                baseCount +
                bonusCount;


            const {
                data: pass,
                error: passError
            } =
                await db
                    .from('passes')
                    .select(
                        'id,used_count'
                    )
                    .eq(
                        'id',
                        b.passId
                    )
                    .single();


            if (
                passError ||
                !pass
            ) {
                return NextResponse.json(
                    {
                        error:
                            '수강권을 찾을 수 없습니다.'
                    },
                    {
                        status: 404
                    }
                );
            }


            if (
                Number(
                    pass.used_count
                ) >
                totalCount
            ) {
                return NextResponse.json(
                    {
                        error:
                            `이미 ${pass.used_count}회를 사용하여 총 ${totalCount}회 수강권으로 변경할 수 없습니다.`
                    },
                    {
                        status: 400
                    }
                );
            }


            const {
                error
            } =
                await db
                    .from('passes')
                    .update({
                        base_count:
                            baseCount,

                        bonus_count:
                            bonusCount,

                        total_count:
                            totalCount,

                        paid_amount:
                            paidAmount,

                        status:
                            Number(
                                pass.used_count
                            ) >=
                                totalCount
                                ? 'completed'
                                : 'active'
                    })
                    .eq(
                        'id',
                        b.passId
                    );


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok: true
            });
        }



        /*
        * =====================================
        * 관리자 출석
        * =====================================
        */
        if (
            b.action ===
            'addAttendance'
        ) {

            if (
                !b.studentId ||
                !b.attendanceDate
            ) {
                return NextResponse.json(
                    {
                        error:
                            '학생과 출석일을 선택해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const {
                data: student,
                error: studentError
            } =
                await db
                    .from('students')
                    .select(
                        'id,regular_time'
                    )
                    .eq(
                        'id',
                        b.studentId
                    )
                    .single();


            if (
                studentError ||
                !student
            ) {
                return NextResponse.json(
                    {
                        error:
                            '학생 정보를 확인할 수 없습니다.'
                    },
                    {
                        status: 404
                    }
                );
            }


            const attendanceTime =
                b.attendanceTime ||
                (
                    student.regular_time
                        ? String(
                            student.regular_time
                        ).slice(0, 5)
                        : '12:00'
                );


            if (
                !validTime(
                    attendanceTime
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '출석 시간을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const {
                error
            } =
                await db.rpc(
                    'admin_add_attendance',
                    {
                        p_student_id:
                            b.studentId,

                        p_attendance_date:
                            b.attendanceDate,

                        p_attendance_time:
                            attendanceTime,

                        p_time_unknown:
                            Boolean(
                                b.timeUnknown
                            )
                    }
                );


            if (error) {

                console.error(
                    'admin_add_attendance RPC ERROR:',
                    error
                );

                if (
                    error.message?.includes(
                        'ALREADY_ATTENDED'
                    )
                ) {
                    return NextResponse.json(
                        {
                            error:
                                '이미 해당 날짜에 출석 처리되어 있습니다.'
                        },
                        {
                            status: 409
                        }
                    );
                }


                if (
                    error.message?.includes(
                        'NO_ACTIVE_PASS'
                    )
                ) {
                    return NextResponse.json(
                        {
                            error:
                                '사용 가능한 수강권이 없습니다.'
                        },
                        {
                            status: 400
                        }
                    );
                }


                return NextResponse.json(
                    {
                        error:
                            `출석 DB 오류: ${error.message || '알 수 없는 오류'}`,

                        details:
                            error.details || null,

                        hint:
                            error.hint || null,

                        code:
                            error.code || null
                    },
                    {
                        status: 500
                    }
                );
            }


            return NextResponse.json({
                ok: true
            });
        }



        /*
         * 출석 취소 + 1회 복구
         */
        if (
            b.action ===
            'deleteAttendance'
        ) {

            if (!b.id) {
                return NextResponse.json(
                    {
                        error:
                            '출석 기록을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const {
                error
            } =
                await db.rpc(
                    'cancel_attendance',
                    {
                        p_attendance_id:
                            b.id
                    }
                );


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok: true
            });
        }


        /*
        * =====================================
        * 학생 수강 종료
        * =====================================
        */
        if (b.action === "deactivateStudent") {
        if (!b.studentId) {
            return NextResponse.json(
            {
                error: "학생 정보를 확인해주세요.",
            },
            {
                status: 400,
            },
            );
        }

        const { error } = await db
            .from("students")
            .update({
            enrollment_status: "inactive",
            inactive_at: new Date().toISOString(),
            inactive_reason: b.reason
                ? String(b.reason).trim()
                : "재등록 안 함",
            })
            .eq("id", b.studentId);

        if (error) {
            throw error;
        }

        return NextResponse.json({
            ok: true,
        });
        }


        /*
        * =====================================
        * 종료 학생 다시 활성화
        * =====================================
        */
        if (b.action === "reactivateStudent") {
        if (!b.studentId) {
            return NextResponse.json(
            {
                error: "학생 정보를 확인해주세요.",
            },
            {
                status: 400,
            },
            );
        }

        const { error } = await db
            .from("students")
            .update({
            enrollment_status: "active",
            inactive_at: null,
            inactive_reason: null,
            })
            .eq("id", b.studentId);

        if (error) {
            throw error;
        }

        return NextResponse.json({
            ok: true,
        });
        }

        /*
        * =====================================
        * 기존 학생 재등록
        * 새 수강권 생성
        * =====================================
        */
        if (b.action === "renewEnrollment") {
        const studentId =
            String(b.studentId || "").trim();

        const className =
            String(b.className || "").trim();

        const regularDay =
            String(b.regularDay || "").trim();

        const regularTime =
            String(b.regularTime || "").trim();

        const baseCount =
            Number(b.baseCount);

        const bonusCount =
            Number(b.bonusCount || 0);

        const totalCount =
            Number(b.totalCount);

        const paidAmount =
            Number(b.paidAmount);

        const startDate =
            String(b.startDate || "");

        const expiresAt =
            String(b.expiresAt || "");

        if (!studentId) {
            return NextResponse.json(
            {
                error:
                "학생 정보를 확인해주세요.",
            },
            {
                status: 400,
            },
            );
        }

        if (!className) {
            return NextResponse.json(
            {
                error:
                "클래스를 선택해주세요.",
            },
            {
                status: 400,
            },
            );
        }

        if (
            !ALLOWED_DAYS.includes(
                regularDay,
            )
        ) {
            return NextResponse.json(
            {
                error:
                "정규 출석 요일을 확인해주세요.",
            },
            {
                status: 400,
            },
            );
        }

        if (
            !validTime(
                regularTime,
            )
        ) {
            return NextResponse.json(
            {
                error:
                "정규 수업 시간을 확인해주세요.",
            },
            {
                status: 400,
            },
            );
        }

        if (
            ![8, 12, 20].includes(
            baseCount,
            )
        ) {
            return NextResponse.json(
            {
                error:
                "기본 수강권을 확인해주세요.",
            },
            {
                status: 400,
            },
            );
        }

        if (
            ![0, 1, 2, 3].includes(
            bonusCount,
            )
        ) {
            return NextResponse.json(
            {
                error:
                "이벤트 추가 횟수를 확인해주세요.",
            },
            {
                status: 400,
            },
            );
        }

        if (
            totalCount !==
            baseCount + bonusCount
        ) {
            return NextResponse.json(
            {
                error:
                "총 이용 횟수를 확인해주세요.",
            },
            {
                status: 400,
            },
            );
        }

        if (
            !Number.isFinite(
            paidAmount,
            ) ||
            paidAmount < 0
        ) {
            return NextResponse.json(
            {
                error:
                "총 납부금액을 확인해주세요.",
            },
            {
                status: 400,
            },
            );
        }

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(
            startDate,
            ) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(
            expiresAt,
            )
        ) {
            return NextResponse.json(
            {
                error:
                "시작일과 이용기한을 확인해주세요.",
            },
            {
                status: 400,
            },
            );
        }

        if (expiresAt < startDate) {
            return NextResponse.json(
            {
                error:
                "이용기한은 시작일보다 빠를 수 없습니다.",
            },
            {
                status: 400,
            },
            );
        }

        /*
        * 학생이 실제 존재하는지 확인
        */
        const {
        data: student,
        error: studentError,
        } = await db
        .from("students")
        .select("id")
        .eq("id", studentId)
        .single();

        if (
            studentError ||
            !student
        ) {
            return NextResponse.json(
            {
                error:
                "학생 정보를 찾을 수 없습니다.",
            },
            {
                status: 404,
            },
            );
        }

        /*
        * 새 수강권 생성
        *
        * 기존 수강권은 수정하거나 삭제하지 않음.
        * 따라서 과거 출석/수익 기록 유지.
        */
        const {
            data: newPass,
            error: passError,
        } = await db
            .from("passes")
            .insert({
            student_id:
                studentId,

            base_count:
                baseCount,

            bonus_count:
                bonusCount,

            total_count:
                totalCount,

            used_count:
                0,

            paid_amount:
                paidAmount,

            start_date:
                startDate,

            expires_at:
                expiresAt,

            status:
                "active",
            })
            .select("id")
            .single();

        if (passError) {
            throw passError;
        }

        /*
        * 혹시 수강 종료 상태였던 학생이면
        * 다시 현재 수강생으로 복구
        *
        * enrollment_status 컬럼을
        * 이미 추가한 경우에 사용.
        */
        const {
            error: scheduleUpdateError,
        } = await db
            .from("students")
            .update({
            class_name:
                className,

            regular_day:
                regularDay || null,

            regular_time:
                regularTime || null,
            })
            .eq(
            "id",
            studentId,
            );

        if (scheduleUpdateError) {
            await db
                .from("passes")
                .delete()
                .eq("id", newPass.id);

            throw scheduleUpdateError;
        }

        const {
            error: studentUpdateError,
        } = await db
            .from("students")
            .update({
            enrollment_status:
                "active",

            inactive_at:
                null,

            inactive_reason:
                null,
            })
            .eq(
            "id",
            studentId,
            );

        /*
        * enrollment_status 컬럼을 아직
        * Supabase에 만들지 않았다면
        * 위 update 부분만 삭제하면 됨.
        */
        if (studentUpdateError) {
            console.error(
            "학생 활성화 처리:",
            studentUpdateError,
            );
        }

        return NextResponse.json({
            ok: true,

            passId:
            newPass.id,

            schedule: {
                className,
                regularDay,
                regularTime,
            },
        });
        }

        /*
         * =====================================
         * 콘텐츠 등록
         * =====================================
         */
        if (
            b.action ===
            'addContent'
        ) {

            const slug =
                String(
                    b.slug || ''
                ).trim();

            const title =
                String(
                    b.title || ''
                ).trim();

            const program =
                String(
                    b.program || ''
                ).trim();

            const subtitle =
                String(
                    b.subtitle || ''
                ).trim();

            const category =
                String(
                    b.category || ''
                ).trim();

            const emoji =
                String(
                    b.emoji || ''
                ).trim();

            const audioPath =
                String(
                    b.audioPath || ''
                ).trim();

            const lyricsPath =
                String(
                    b.lyricsPath || ''
                ).trim();

            const printablePath =
                String(
                    b.printablePath || ''
                ).trim();

            const releaseDate =
                String(
                    b.releaseDate || ''
                );


            if (
                !slug ||
                !title ||
                !program ||
                !audioPath
            ) {

                return NextResponse.json(
                    {
                        error:
                            '슬러그, 곡 제목, 프로그램, 음원 경로를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );

            }


            if (
                releaseDate &&
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    releaseDate
                )
            ) {

                return NextResponse.json(
                    {
                        error:
                            '공개일을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );

            }


            const {
                error
            } =
                await db
                    .from(
                        'ds_content_songs'
                    )
                    .insert({

                        slug,

                        title,

                        subtitle:
                            subtitle || null,

                        program,

                        category:
                            category || null,

                        emoji:
                            emoji || null,

                        audio_path:
                            audioPath,

                        lyrics_path:
                            lyricsPath || null,

                        printable_path:
                            printablePath || null,

                        lyrics:
                            Array.isArray(
                                b.lyrics
                            )
                                ? b.lyrics
                                : [],

                        activities:
                            Array.isArray(
                                b.activities
                            )
                                ? b.activities
                                : [],

                        is_basic:
                            Boolean(
                                b.isBasic
                            ),

                        is_popular:
                            Boolean(
                                b.isPopular
                            ),

                        is_upcoming:
                            Boolean(
                                b.isUpcoming
                            ),

                        premium_only:
                            Boolean(
                                b.premiumOnly
                            ),

                        release_date:
                            releaseDate ||
                            new Date()
                                .toISOString()
                                .slice(0, 10),

                        is_published:
                            Boolean(
                                b.isPublished
                            ),

                        updated_at:
                            new Date()
                                .toISOString()

                    });


            if (error) {

                if (
                    error.code ===
                    '23505'
                ) {

                    return NextResponse.json(
                        {
                            error:
                                '이미 사용 중인 slug입니다.'
                        },
                        {
                            status: 409
                        }
                    );

                }

                throw error;

            }


            return NextResponse.json({
                ok: true
            });

        }



        /*
         * =====================================
         * 콘텐츠 수정
         * =====================================
         */
        if (
            b.action ===
            'updateContent'
        ) {

            if (!b.id) {

                return NextResponse.json(
                    {
                        error:
                            '수정할 콘텐츠를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );

            }


            const slug =
                String(
                    b.slug || ''
                ).trim();

            const title =
                String(
                    b.title || ''
                ).trim();

            const program =
                String(
                    b.program || ''
                ).trim();

            const audioPath =
                String(
                    b.audioPath || ''
                ).trim();


            if (
                !slug ||
                !title ||
                !program ||
                !audioPath
            ) {

                return NextResponse.json(
                    {
                        error:
                            '슬러그, 곡 제목, 프로그램, 음원 경로를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );

            }


            const {
                error
            } =
                await db
                    .from(
                        'ds_content_songs'
                    )
                    .update({

                        slug,

                        title,

                        subtitle:
                            String(
                                b.subtitle || ''
                            ).trim() ||
                            null,

                        program,

                        category:
                            String(
                                b.category || ''
                            ).trim() ||
                            null,

                        emoji:
                            String(
                                b.emoji || ''
                            ).trim() ||
                            null,

                        audio_path:
                            audioPath,

                        lyrics_path:
                            String(
                                b.lyricsPath || ''
                            ).trim() ||
                            null,

                        printable_path:
                            String(
                                b.printablePath || ''
                            ).trim() ||
                            null,

                        lyrics:
                            Array.isArray(
                                b.lyrics
                            )
                                ? b.lyrics
                                : [],

                        activities:
                            Array.isArray(
                                b.activities
                            )
                                ? b.activities
                                : [],

                        release_date:
                            b.releaseDate ||
                            null,

                        is_basic:
                            Boolean(
                                b.isBasic
                            ),

                        is_popular:
                            Boolean(
                                b.isPopular
                            ),

                        is_upcoming:
                            Boolean(
                                b.isUpcoming
                            ),

                        premium_only:
                            Boolean(
                                b.premiumOnly
                            ),

                        is_published:
                            Boolean(
                                b.isPublished
                            ),

                        updated_at:
                            new Date()
                                .toISOString()

                    })
                    .eq(
                        'id',
                        b.id
                    );


            if (error) {

                if (
                    error.code ===
                    '23505'
                ) {

                    return NextResponse.json(
                        {
                            error:
                                '이미 사용 중인 slug입니다.'
                        },
                        {
                            status: 409
                        }
                    );

                }

                throw error;

            }


            return NextResponse.json({
                ok: true
            });

        }


        /*
         * =====================================
         * COMING UP NEXT 표시 여부 변경
         * =====================================
         */
        if (
            b.action ===
            'setContentUpcoming'
        ) {

            if (!b.id) {

                return NextResponse.json(
                    {
                        error:
                            '콘텐츠를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );

            }


            const {
                error
            } =
                await db
                    .from(
                        'ds_content_songs'
                    )
                    .update({
                        is_upcoming:
                            Boolean(
                                b.isUpcoming
                            ),

                        updated_at:
                            new Date()
                                .toISOString()
                    })
                    .eq(
                        'id',
                        b.id
                    );


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok: true
            });

        }        


        /*
         * =====================================
         * 콘텐츠 삭제
         * =====================================
         */
        if (
            b.action ===
            'deleteContent'
        ) {

            if (!b.id) {

                return NextResponse.json(
                    {
                        error:
                            '삭제할 콘텐츠를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );

            }


            const {
                error
            } =
                await db
                    .from(
                        'ds_content_songs'
                    )
                    .delete()
                    .eq(
                        'id',
                        b.id
                    );


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok: true
            });

        }


        /*
         * =====================================
         * Sunshine Toddler / Melody Book Club 자료 자동 연결
         * =====================================
         *
         * 음원 파일명(확장자 제외)을 contentKey로 사용하고,
         * 가사지 / 활동지 / 놀이 아이디어 Storage에서
         * 같은 이름의 폴더 안 파일을 전부 찾습니다.
         *
         * DB 컬럼 추가 없이 매번 Storage를 직접 확인합니다.
         */
        if (
            b.action ===
            'detectContentResources'
        ) {

            const program =
                String(
                    b.program || ''
                ).trim();

            const audioPath =
                String(
                    b.audioPath || ''
                ).trim();


            if (
                ![
                    'Sunshine Toddler',
                    'Melody Book Club'
                ].includes(program)
            ) {

                return NextResponse.json(
                    {
                        error:
                            '자동 자료 연결을 지원하지 않는 프로그램입니다.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const contentKey =
                getAudioContentKey(
                    audioPath
                );


            if (!contentKey) {

                return NextResponse.json(
                    {
                        error:
                            '선택한 음원 파일명을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }


            const playIdeasBucket =
                await resolvePlayIdeasBucket(
                    db
                );


            const [
                lyricsResult,
                printableResult,
                playIdeasResult
            ] =
                await Promise.all([

                    findMatchingContentFolder(
                        db,
                        'dear-sunshine-lyrics',
                        program,
                        contentKey
                    ),

                    findMatchingContentFolder(
                        db,
                        'dear-sunshine-printables',
                        program,
                        contentKey
                    ),

                    playIdeasBucket
                        ? findMatchingContentFolder(
                            db,
                            playIdeasBucket,
                            program,
                            contentKey
                        )
                        : Promise.resolve({
                            folderPath:
                                `${program}/${contentKey}`,
                            files: []
                        })

                ]);


            return NextResponse.json({
                ok: true,
                contentKey,
                audio: {
                    name:
                        audioPath
                            .split('/')
                            .pop(),
                    path:
                        audioPath,
                    bucket:
                        'dear-sunshine-audio'
                },
                lyrics: {
                    bucket:
                        'dear-sunshine-lyrics',
                    folderPath:
                        lyricsResult.folderPath,
                    files:
                        lyricsResult.files
                },
                printables: {
                    bucket:
                        'dear-sunshine-printables',
                    folderPath:
                        printableResult.folderPath,
                    files:
                        printableResult.files
                },
                playIdeas: {
                    bucket:
                        playIdeasBucket,
                    folderPath:
                        playIdeasResult.folderPath,
                    files:
                        playIdeasResult.files
                }
            });

        }


        /*
         * =====================================
         * 콘텐츠 Storage 파일 목록 조회
         * =====================================
         */
        if (
            b.action ===
            'listContentFiles'
        ) {

            const program =
                String(
                    b.program || ''
                ).trim();


            if (
                ![
                    'Sunshine Toddler',
                    'Melody Book Club'
                ].includes(
                    program
                )
            ) {

                return NextResponse.json(
                    {
                        error:
                            '프로그램을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );

            }


            /*
             * 음원 목록
             */
            const {
                data: audioFiles,
                error: audioError
            } =
                await db
                    .storage
                    .from(
                        'dear-sunshine-audio'
                    )
                    .list(
                        program,
                        {
                            limit: 500,
                            offset: 0,
                            sortBy: {
                                column: 'name',
                                order: 'asc'
                            }
                        }
                    );


            if (audioError) {
                throw audioError;
            }


            /*
             * 가사지 목록
             */
            const {
                data: lyricsFiles,
                error: lyricsError
            } =
                await db
                    .storage
                    .from(
                        'dear-sunshine-lyrics'
                    )
                    .list(
                        program,
                        {
                            limit: 500,
                            offset: 0,
                            sortBy: {
                                column: 'name',
                                order: 'asc'
                            }
                        }
                    );


            if (lyricsError) {
                throw lyricsError;
            }


            /*
             * 활동지 목록
             */
            const {
                data: printableFiles,
                error: printableError
            } =
                await db
                    .storage
                    .from(
                        'dear-sunshine-printables'
                    )
                    .list(
                        program,
                        {
                            limit: 500,
                            offset: 0,
                            sortBy: {
                                column: 'name',
                                order: 'asc'
                            }
                        }
                    );


            if (printableError) {
                throw printableError;
            }


            /*
             * 파일 경로 정리
             */
            const audio =
                (audioFiles || [])
                    .filter(
                        file =>
                            file.id !== null
                    )
                    .map(
                        file => ({
                            name:
                                file.name,

                            path:
                                `${program}/${file.name}`
                        })
                    );


            const lyrics =
                (lyricsFiles || [])
                    .filter(
                        file =>
                            file.id !== null
                    )
                    .map(
                        file => ({
                            name:
                                file.name,

                            path:
                                `${program}/${file.name}`
                        })
                    );


            const printables =
                (printableFiles || [])
                    .filter(
                        file =>
                            file.id !== null
                    )
                    .map(
                        file => ({
                            name:
                                file.name,

                            path:
                                `${program}/${file.name}`
                        })
                    );


            return NextResponse.json({
                ok: true,
                audio,
                lyrics,
                printables
            });

        }

        /*
         * =====================================
         * Song Club 멤버십 추가
         * =====================================
         */
        if (
            b.action ===
            'addAtHomeMembership'
        ) {

            if (!b.userId) {

                return NextResponse.json(
                    {
                        error:
                            '회원을 선택해주세요.'
                    },
                    {
                        status: 400
                    }
                );

            }


            if (
                ![
                    'basic',
                    'premium'
                ].includes(
                    b.plan
                )
            ) {

                return NextResponse.json(
                    {
                        error:
                            '요금제를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );

            }


            const {
                data: existing,
                error: existingError
            } =
                await db
                    .from(
                        'ds_content_memberships'
                    )
                    .select(
                        'id'
                    )
                    .eq(
                        'user_id',
                        b.userId
                    )
                    .in(
                        'status',
                        [
                            'trialing',
                            'active',
                            'past_due',
                            'paused'
                        ]
                    )
                    .limit(1)
                    .maybeSingle();


            if (existingError) {
                throw existingError;
            }


            if (existing) {

                return NextResponse.json(
                    {
                        error:
                            '이미 이용 중이거나 일시중지된 Song Club 멤버십이 있는 회원입니다.'
                    },
                    {
                        status: 409
                    }
                );

            }


            const {
                data: membership,
                error
            } =
                await db
                    .from(
                        'ds_content_memberships'
                    )
                    .insert({

                        user_id:
                            b.userId,

                        plan:
                            b.plan,

                        status:
                            'active',

                        starts_at:
                            b.startsAt
                                ? `${b.startsAt}T00:00:00+09:00`
                                : new Date()
                                    .toISOString(),

                        ends_at:
                            b.endsAt
                                ? `${b.endsAt}T23:59:59+09:00`
                                : null

                    })
                    .select(
                        'id,user_id,plan,status,starts_at,ends_at,created_at'
                    )
                    .single();


            if (error) {
                throw error;
            }

            let revenueWarning = null;

            try {
                await insertExtraRevenue(
                    db,
                    {
                        category:
                            'Song Club',
                        userId:
                            b.userId,
                        description:
                            String(
                                b.revenueDescription ||
                                'Song Club 등록'
                            ).trim(),
                        amount:
                            b.revenueAmount,
                        sourceType:
                            'song_club_membership',
                        sourceId:
                            membership.id
                    }
                );
            } catch (revenueError) {
                console.error(
                    'Song Club revenue insert warning:',
                    revenueError
                );

                revenueWarning =
                    'Song Club 이용권은 정상 활성화됐지만 수익 기록 저장에 실패했습니다. 함께 제공한 DB 보정 SQL을 실행한 뒤 수익 관리에서 확인해주세요.';
            }


            return NextResponse.json({
                ok: true,
                membershipId:
                    membership.id,
                warning:
                    revenueWarning
            });

        }

        /*
         * =====================================
         * Song Club 멤버십 수정
         * =====================================
         */
        if (
            b.action ===
            'updateAtHomeMembership'
        ) {

            if (!b.id) {

                return NextResponse.json(
                    {
                        error:
                            '회원 정보를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );

            }


            if (
                ![
                    'basic',
                    'premium'
                ].includes(
                    b.plan
                )
            ) {

                return NextResponse.json(
                    {
                        error:
                            '요금제를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );

            }


            if (
                ![
                    'active',
                    'paused',
                    'cancelled',
                    'expired'
                ].includes(
                    b.status
                )
            ) {

                return NextResponse.json(
                    {
                        error:
                            '회원 상태를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );

            }


            let previousMembership = null;

            if (Number(b.revenueAmount) > 0) {
                const {
                    data: previous,
                    error: previousError
                } = await db
                    .from(
                        'ds_content_memberships'
                    )
                    .select(
                        'id,user_id,plan,status,starts_at,ends_at'
                    )
                    .eq(
                        'id',
                        b.id
                    )
                    .single();

                if (previousError) {
                    throw previousError;
                }

                previousMembership = previous;
            }

            const {
                data: updatedMembership,
                error
            } =
                await db
                    .from(
                        'ds_content_memberships'
                    )
                    .update({

                        plan:
                            b.plan,

                        status:
                            b.status,

                        starts_at:
                            b.startsAt
                                ? `${b.startsAt}T00:00:00+09:00`
                                : null,

                        ends_at:
                            b.endsAt
                                ? `${b.endsAt}T23:59:59+09:00`
                                : null

                    })
                    .eq(
                        'id',
                        b.id
                    )
                    .select(
                        'id,user_id,plan,status,starts_at,ends_at'
                    )
                    .single();


            if (error) {
                throw error;
            }

            let revenueWarning = null;

            if (Number(b.revenueAmount) > 0) {
                try {
                    await insertExtraRevenue(
                        db,
                        {
                            category:
                                'Song Club',
                            userId:
                                updatedMembership.user_id,
                            description:
                                String(
                                    b.revenueDescription ||
                                    'Song Club 연장'
                                ).trim(),
                            amount:
                                b.revenueAmount,
                            sourceType:
                                'song_club_membership',
                            sourceId:
                                updatedMembership.id
                        }
                    );
                } catch (revenueError) {
                    console.error(
                        'Song Club renewal revenue warning:',
                        revenueError
                    );

                    revenueWarning =
                        'Song Club 이용기간은 정상 반영됐지만 수익 기록 저장에 실패했습니다. 함께 제공한 DB 보정 SQL을 실행한 뒤 수익 관리에서 확인해주세요.';
                }
            }


            return NextResponse.json({
                ok: true,
                warning:
                    revenueWarning
            });

        }

        /*
        * =====================================
        * Song Club 전체 프로그램 권한 조회
        * 회원 검색/필터 탭에서 사용
        * =====================================
        */
        if (
            b.action ===
            'getAtHomeProgramMap'
        ) {

            const {
                data,
                error
            } =
                await db
                    .from(
                        'ds_user_program_access'
                    )
                    .select(
                        'user_id,program'
                    );


            if (error) {
                throw error;
            }


            const programsByUser = {};

            for (
                const row of
                data || []
            ) {
                if (
                    !programsByUser[
                        row.user_id
                    ]
                ) {
                    programsByUser[
                        row.user_id
                    ] = [];
                }

                if (
                    !programsByUser[
                        row.user_id
                    ].includes(
                        row.program
                    )
                ) {
                    programsByUser[
                        row.user_id
                    ].push(
                        row.program
                    );
                }
            }


            return NextResponse.json({
                ok: true,
                programsByUser
            });

        }


        /*
        * =====================================
        * Song Club 프로그램 권한 조회
        * =====================================
        */
        if (
            b.action ===
            'getAtHomePrograms'
        ) {

            if (
                !b.userId
            ) {

                return NextResponse.json(
                    {
                        error:
                            '회원 정보를 확인해주세요.'
                    },
                    {
                        status:
                            400
                    }
                );

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
                        b.userId
                    );


            if (error) {
                throw error;
            }


            return NextResponse.json({
                ok:
                    true,

                programs:
                    (
                        data ||
                        []
                    ).map(
                        row =>
                            row.program
                    )
            });

        }

        /*
        * =====================================
        * Song Club 프로그램 권한 저장
        * =====================================
        */
        if (
            b.action ===
            'setAtHomePrograms'
        ) {

            if (
                !b.userId
            ) {

                return NextResponse.json(
                    {
                        error:
                            '회원 정보를 확인해주세요.'
                    },
                    {
                        status:
                            400
                    }
                );

            }


            const allowedPrograms =
                [
                    'Sunshine Toddler',
                    'Melody Book Club'
                ];


            /*
             * Song Club은 회원당 Sunshine Toddler / Melody Book Club을
             * 각각 선택하거나 두 클래스를 모두 이용할 수 있습니다.
             */
            const requestedPrograms =
                Array.isArray(b.programs)
                    ? b.programs
                    : [b.program].filter(Boolean);

            const programs =
                [...new Set(requestedPrograms)]
                    .filter(
                        program =>
                            allowedPrograms.includes(
                                program
                            )
                    )
                    .slice(0, 2);

            /*
            * 기존 권한 삭제
            */
            const {
                error: deleteError
            } =
                await db
                    .from(
                        'ds_user_program_access'
                    )
                    .delete()
                    .eq(
                        'user_id',
                        b.userId
                    );


            if (
                deleteError
            ) {
                throw deleteError;
            }


            /*
            * 선택한 프로그램 다시 등록
            */
            if (
                programs.length >
                0
            ) {

                const rows =
                    programs.map(
                        program => ({
                            user_id:
                                b.userId,

                            program
                        })
                    );


                const {
                    error: insertError
                } =
                    await db
                        .from(
                            'ds_user_program_access'
                        )
                        .insert(
                            rows
                        );


                if (
                    insertError
                ) {
                    throw insertError;
                }

            }


            return NextResponse.json({
                ok:
                    true
            });

        }


        

        /*
         * =====================================
         * Home Package 관리자 데이터 조회
         * =====================================
         */
        if (
            b.action ===
            'getHomePackageAdminData'
        ) {

            const {
                data: products,
                error: productsError
            } =
                await db
                    .from(
                        'ds_user_products'
                    )
                    .select(
                        'id,user_id,product_type,plan_code,program,status,starts_at,ends_at,release_weeks,created_at,updated_at'
                    )
                    .eq(
                        'product_type',
                        'home_package'
                    )
                    .order(
                        'created_at',
                        {
                            ascending: false
                        }
                    );

            if (productsError) {
                return NextResponse.json(
                    {
                        error:
                            'Home Package 테이블을 읽지 못했습니다. Supabase SQL Editor에서 supabase/home-package-mode.sql을 먼저 실행해주세요.'
                    },
                    {
                        status: 409
                    }
                );
            }

            const {
                data: programLinks,
                error: programLinksError
            } =
                await db
                    .from(
                        'ds_home_package_user_programs'
                    )
                    .select(
                        'product_id,program'
                    );

            if (programLinksError) {
                return NextResponse.json(
                    {
                        error:
                            'Home Package 다중 클래스 설정 테이블이 없습니다. 제공한 SQL을 Supabase SQL Editor에서 한 번 실행해주세요.'
                    },
                    {
                        status: 409
                    }
                );
            }

            const programsByProduct = {};

            (programLinks || []).forEach(
                row => {
                    if (!programsByProduct[row.product_id]) {
                        programsByProduct[row.product_id] = [];
                    }

                    if (
                        row.program &&
                        !programsByProduct[row.product_id].includes(row.program)
                    ) {
                        programsByProduct[row.product_id].push(row.program);
                    }
                }
            );

            (products || []).forEach(
                product => {
                    if (
                        !programsByProduct[product.id] ||
                        programsByProduct[product.id].length === 0
                    ) {
                        programsByProduct[product.id] = product.program
                            ? [product.program]
                            : [];
                    }
                }
            );

            const {
                data: tracks,
                error: tracksError
            } =
                await db
                    .from(
                        'ds_home_package_tracks'
                    )
                    .select(
                        'id,program,song_id,unlock_week,position,created_at'
                    )
                    .order(
                        'program',
                        {
                            ascending: true
                        }
                    )
                    .order(
                        'unlock_week',
                        {
                            ascending: true
                        }
                    )
                    .order(
                        'position',
                        {
                            ascending: true
                        }
                    );

            if (tracksError) {
                return NextResponse.json(
                    {
                        error:
                            'Home Package 곡 구성 테이블을 읽지 못했습니다. Supabase SQL을 확인해주세요.'
                    },
                    {
                        status: 409
                    }
                );
            }

            let accountBonusRows = [];
            let accountBonusReady = true;

            const {
                data: accountBonusData,
                error: accountBonusError
            } =
                await db
                    .from(
                        'ds_user_bonus_songs'
                    )
                    .select(
                        'user_id,song_id,created_at'
                    )
                    .order(
                        'created_at',
                        {
                            ascending: true
                        }
                    );

            if (accountBonusError) {
                accountBonusReady = false;

                if (
                    ![
                        '42P01',
                        'PGRST205'
                    ].includes(
                        String(accountBonusError.code || '')
                    )
                ) {
                    console.error(
                        'Account bonus songs load error:',
                        accountBonusError
                    );
                }
            } else {
                accountBonusRows =
                    accountBonusData || [];
            }

            return NextResponse.json({
                ok: true,
                products:
                    products || [],
                tracks:
                    tracks || [],
                programsByProduct,
                accountBonusRows,
                accountBonusReady
            });
        }


        /*
         * =====================================
         * 이메일 계정별 추가곡 저장
         * =====================================
         */
        if (
            b.action ===
            'saveAccountBonusSongs'
        ) {
            const userId =
                String(
                    b.userId || ''
                ).trim();

            if (!userId) {
                return NextResponse.json(
                    {
                        error:
                            '회원 이메일을 선택해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }

            const songIds =
                [
                    ...new Set(
                        (
                            Array.isArray(b.songIds)
                                ? b.songIds
                                : []
                        )
                            .map(
                                value =>
                                    String(value || '').trim()
                            )
                            .filter(Boolean)
                    )
                ];

            /*
             * 잘못된 song_id가 들어가도 FK 오류 대신
             * 관리자에게 명확한 메시지를 보여줍니다.
             */
            if (songIds.length > 0) {
                const {
                    data: existingSongs,
                    error: songLookupError
                } =
                    await db
                        .from(
                            'ds_content_songs'
                        )
                        .select('id')
                        .in(
                            'id',
                            songIds
                        );

                if (songLookupError) {
                    throw songLookupError;
                }

                if (
                    (existingSongs || []).length !==
                    songIds.length
                ) {
                    return NextResponse.json(
                        {
                            error:
                                '선택한 추가곡 중 현재 콘텐츠에 없는 곡이 있습니다. 화면을 새로고침 후 다시 저장해주세요.'
                        },
                        {
                            status: 400
                        }
                    );
                }
            }

            const {
                error: deleteBonusError
            } =
                await db
                    .from(
                        'ds_user_bonus_songs'
                    )
                    .delete()
                    .eq(
                        'user_id',
                        userId
                    );

            if (deleteBonusError) {
                if (
                    [
                        '42P01',
                        'PGRST205'
                    ].includes(
                        String(deleteBonusError.code || '')
                    )
                ) {
                    return NextResponse.json(
                        {
                            error:
                                '계정별 추가곡 테이블이 없습니다. 제공한 SQL을 Supabase SQL Editor에서 한 번 실행해주세요.'
                        },
                        {
                            status: 409
                        }
                    );
                }

                throw deleteBonusError;
            }

            if (songIds.length > 0) {
                const rows =
                    songIds.map(
                        songId => ({
                            user_id:
                                userId,
                            song_id:
                                songId
                        })
                    );

                const {
                    error: insertBonusError
                } =
                    await db
                        .from(
                            'ds_user_bonus_songs'
                        )
                        .insert(
                            rows
                        );

                if (insertBonusError) {
                    throw insertBonusError;
                }
            }

            return NextResponse.json({
                ok: true,
                userId,
                songIds
            });
        }


        /*
         * =====================================
         * Home Package 회원 활성화
         * =====================================
         */
        if (
            b.action ===
            'createHomePackageProduct'
        ) {

            const allowedPlans = [
                'home_8',
                'home_12',
                'home_20'
            ];

            const allowedPrograms = [
                'Sunshine Toddler',
                'Melody Book Club'
            ];

            const userId =
                String(
                    b.userId || ''
                ).trim();

            const planCode =
                String(
                    b.planCode || ''
                ).trim();

            const programs =
                Array.isArray(b.programs)
                    ? b.programs
                        .map(item => String(item || '').trim())
                        .filter(item => allowedPrograms.includes(item))
                    : [String(b.program || '').trim()]
                        .filter(item => allowedPrograms.includes(item));

            const uniquePrograms =
                [...new Set(programs)];

            const program =
                uniquePrograms[0] || '';

            const startsAt =
                String(
                    b.startsAt || ''
                ).slice(0, 10);

            const requestedEndsAt =
                String(
                    b.endsAt || ''
                ).slice(0, 10);

            const endsAt =
                requestedEndsAt ||
                calculateHomePackageEndDate(
                    startsAt,
                    planCode
                );

            if (!userId) {
                return NextResponse.json(
                    {
                        error:
                            '회원을 선택해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }

            if (
                !allowedPlans.includes(
                    planCode
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            'Home Package 상품을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }

            if (
                uniquePrograms.length === 0
            ) {
                return NextResponse.json(
                    {
                        error:
                            '이용 클래스를 1개 이상 선택해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }

            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    startsAt
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '시작일을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }

            if (
                endsAt &&
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    endsAt
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '종료일을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }

            if (
                endsAt &&
                endsAt < startsAt
            ) {
                return NextResponse.json(
                    {
                        error:
                            '종료일은 시작일보다 빠를 수 없습니다.'
                    },
                    {
                        status: 400
                    }
                );
            }

            const {
                data: existing,
                error: existingError
            } =
                await db
                    .from(
                        'ds_user_products'
                    )
                    .select(
                        'id'
                    )
                    .eq(
                        'user_id',
                        userId
                    )
                    .eq(
                        'product_type',
                        'home_package'
                    )
                    .eq(
                        'status',
                        'active'
                    )
                    .maybeSingle();

            if (existingError) {
                throw existingError;
            }

            if (existing) {
                return NextResponse.json(
                    {
                        error:
                            '이미 이용 중인 Home Package가 있는 회원입니다.'
                    },
                    {
                        status: 409
                    }
                );
            }

            const {
                data,
                error
            } =
                await db
                    .from(
                        'ds_user_products'
                    )
                    .insert({
                        user_id:
                            userId,
                        product_type:
                            'home_package',
                        plan_code:
                            planCode,
                        program,
                        status:
                            'active',
                        starts_at:
                            startsAt,
                        ends_at:
                            endsAt
                    })
                    .select(
                        'id,user_id,product_type,plan_code,program,status,starts_at,ends_at,release_weeks,created_at,updated_at'
                    )
                    .single();

            if (error) {
                throw error;
            }

            const {
                error: linkError
            } =
                await db
                    .from(
                        'ds_home_package_user_programs'
                    )
                    .insert(
                        uniquePrograms.map(
                            item => ({
                                product_id: data.id,
                                program: item
                            })
                        )
                    );

            if (linkError) {
                await db
                    .from('ds_user_products')
                    .delete()
                    .eq('id', data.id);

                throw linkError;
            }

            try {
                const planLabels = {
                    home_8: '8회 Home Package',
                    home_12: '12회 Home Package',
                    home_20: '20회 Home Package'
                };

                await insertExtraRevenue(
                    db,
                    {
                        category:
                            'Home Package',
                        userId,
                        description:
                            `${planLabels[planCode] || 'Home Package'} 등록`,
                        amount:
                            HOME_PACKAGE_PRICES[planCode],
                        sourceType:
                            'home_package_product',
                        sourceId:
                            data.id
                    }
                );
            } catch (revenueError) {
                await db
                    .from('ds_home_package_user_programs')
                    .delete()
                    .eq('product_id', data.id);

                await db
                    .from('ds_user_products')
                    .delete()
                    .eq('id', data.id);

                throw revenueError;
            }

            return NextResponse.json({
                ok: true,
                product: data,
                programs: uniquePrograms
            });
        }


        /*
         * =====================================
         * Home Package 회원 수정
         * =====================================
         */
        if (
            b.action ===
            'updateHomePackageProduct'
        ) {

            const allowedPlans = [
                'home_8',
                'home_12',
                'home_20'
            ];

            const allowedPrograms = [
                'Sunshine Toddler',
                'Melody Book Club'
            ];

            const allowedStatuses = [
                'active',
                'paused',
                'cancelled',
                'expired'
            ];

            const id =
                String(
                    b.id || ''
                ).trim();

            const planCode =
                String(
                    b.planCode || ''
                ).trim();

            const programs =
                Array.isArray(b.programs)
                    ? b.programs
                        .map(item => String(item || '').trim())
                        .filter(item => allowedPrograms.includes(item))
                    : [String(b.program || '').trim()]
                        .filter(item => allowedPrograms.includes(item));

            const uniquePrograms =
                [...new Set(programs)];

            const program =
                uniquePrograms[0] || '';

            const status =
                String(
                    b.status || ''
                ).trim();

            const startsAt =
                String(
                    b.startsAt || ''
                ).slice(0, 10);

            const requestedEndsAt =
                String(
                    b.endsAt || ''
                ).slice(0, 10);

            const endsAt =
                requestedEndsAt ||
                calculateHomePackageEndDate(
                    startsAt,
                    planCode
                );

            if (!id) {
                return NextResponse.json(
                    {
                        error:
                            'Home Package 회원 정보를 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }

            if (
                !allowedPlans.includes(
                    planCode
                ) ||
                uniquePrograms.length === 0 ||
                !allowedStatuses.includes(
                    status
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '상품, 프로그램 또는 상태 값을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }

            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    startsAt
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '시작일을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }

            if (
                endsAt &&
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    endsAt
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '종료일을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }

            if (
                endsAt &&
                endsAt < startsAt
            ) {
                return NextResponse.json(
                    {
                        error:
                            '종료일은 시작일보다 빠를 수 없습니다.'
                    },
                    {
                        status: 400
                    }
                );
            }

            const {
                data,
                error
            } =
                await db
                    .from(
                        'ds_user_products'
                    )
                    .update({
                        plan_code:
                            planCode,
                        program,
                        status,
                        starts_at:
                            startsAt,
                        ends_at:
                            endsAt,
                        updated_at:
                            new Date()
                                .toISOString()
                    })
                    .eq(
                        'id',
                        id
                    )
                    .select(
                        'id,user_id,product_type,plan_code,program,status,starts_at,ends_at,release_weeks,created_at,updated_at'
                    )
                    .single();

            if (error) {
                if (
                    String(
                        error.code || ''
                    ) === '23505'
                ) {
                    return NextResponse.json(
                        {
                            error:
                                '이 회원에게 이미 다른 활성 Home Package가 있습니다.'
                        },
                        {
                            status: 409
                        }
                    );
                }

                throw error;
            }

            const {
                error: deleteLinksError
            } =
                await db
                    .from(
                        'ds_home_package_user_programs'
                    )
                    .delete()
                    .eq(
                        'product_id',
                        id
                    );

            if (deleteLinksError) {
                throw deleteLinksError;
            }

            const {
                error: insertLinksError
            } =
                await db
                    .from(
                        'ds_home_package_user_programs'
                    )
                    .insert(
                        uniquePrograms.map(
                            item => ({
                                product_id: id,
                                program: item
                            })
                        )
                    );

            if (insertLinksError) {
                throw insertLinksError;
            }

            return NextResponse.json({
                ok: true,
                product: data,
                programs: uniquePrograms
            });
        }


        /*
         * =====================================
         * Home Package 곡 구성 저장
         * =====================================
         */
        if (
            b.action ===
            'saveHomePackageTrackSchedule'
        ) {

            const allowedPrograms = [
                'Sunshine Toddler',
                'Melody Book Club'
            ];

            const program =
                String(
                    b.program || ''
                ).trim();

            if (
                !allowedPrograms.includes(
                    program
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '프로그램을 확인해주세요.'
                    },
                    {
                        status: 400
                    }
                );
            }

            const rawTracks =
                Array.isArray(
                    b.tracks
                )
                    ? b.tracks
                    : [];

            /*
             * Home Package 곡 위치 규칙
             *
             * unlock_week = 0
             *   position 1~3  : 공통 기본곡
             *   position 4~8  : 12회 전용 기본곡 (최대 5곡)
             *   position 9~13 : 20회 전용 기본곡 (최대 5곡)
             *
             * unlock_week = 1~21
             *   position 1~3  : 주차 기본곡/추가곡
             */
            const tracks =
                rawTracks
                    .map(
                        row => ({
                            song_id:
                                String(
                                    row.songId || ''
                                ).trim(),
                            unlock_week:
                                Number(
                                    row.unlockWeek
                                ),
                            position:
                                Number(
                                    row.position || 1
                                )
                        })
                    )
                    .filter(
                        row => {
                            if (
                                !row.song_id ||
                                !Number.isInteger(row.unlock_week) ||
                                row.unlock_week < 0 ||
                                row.unlock_week > 21 ||
                                !Number.isInteger(row.position)
                            ) {
                                return false;
                            }

                            if (row.unlock_week === 0) {
                                return row.position >= 1 && row.position <= 13;
                            }

                            return row.position >= 1 && row.position <= 3;
                        }
                    );

            const commonBaseTracks =
                tracks.filter(
                    row =>
                        row.unlock_week === 0 &&
                        row.position >= 1 &&
                        row.position <= 3
                );

            const plan12BaseTracks =
                tracks.filter(
                    row =>
                        row.unlock_week === 0 &&
                        row.position >= 4 &&
                        row.position <= 8
                );

            const plan20BaseTracks =
                tracks.filter(
                    row =>
                        row.unlock_week === 0 &&
                        row.position >= 9 &&
                        row.position <= 13
                );

            if (
                commonBaseTracks.length < 2 ||
                commonBaseTracks.length > 3 ||
                !commonBaseTracks.some(
                    row =>
                        row.position === 1
                ) ||
                !commonBaseTracks.some(
                    row =>
                        row.position === 2
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '기본곡 1, 2는 필수이며 공통 기본곡은 최대 3곡까지 지정할 수 있습니다.'
                    },
                    {
                        status: 400
                    }
                );
            }

            if (plan12BaseTracks.length > 5) {
                return NextResponse.json(
                    {
                        error:
                            '12회 전용 기본곡은 최대 5곡까지 지정할 수 있습니다.'
                    },
                    {
                        status: 400
                    }
                );
            }

            if (plan20BaseTracks.length > 5) {
                return NextResponse.json(
                    {
                        error:
                            '20회 전용 기본곡은 최대 5곡까지 지정할 수 있습니다.'
                    },
                    {
                        status: 400
                    }
                );
            }

            /* 같은 슬롯에는 한 곡만 저장 */
            const slotKeys =
                tracks.map(
                    row =>
                        `${row.unlock_week}:${row.position}`
                );

            if (
                new Set(slotKeys).size !==
                slotKeys.length
            ) {
                return NextResponse.json(
                    {
                        error:
                            '같은 위치에 곡이 중복 지정되어 있습니다.'
                    },
                    {
                        status: 400
                    }
                );
            }

            /*
             * 공통곡 + 주차곡은 한 곡을 한 번만 사용합니다.
             * 12회 전용과 20회 전용은 서로 다른 상품이므로
             * 같은 곡을 양쪽 혜택에 지정하는 것은 허용합니다.
             */
            const sharedTracks =
                tracks.filter(
                    row =>
                        row.unlock_week > 0 ||
                        (
                            row.unlock_week === 0 &&
                            row.position >= 1 &&
                            row.position <= 3
                        )
                );

            const sharedSongIds =
                sharedTracks.map(
                    row =>
                        row.song_id
                );

            if (
                new Set(sharedSongIds).size !==
                sharedSongIds.length
            ) {
                return NextResponse.json(
                    {
                        error:
                            '공통 기본곡 또는 주차별 곡에 같은 노래를 중복 지정할 수 없습니다.'
                    },
                    {
                        status: 400
                    }
                );
            }

            const plan12SongIds =
                plan12BaseTracks.map(
                    row =>
                        row.song_id
                );

            if (
                new Set(plan12SongIds).size !==
                plan12SongIds.length
            ) {
                return NextResponse.json(
                    {
                        error:
                            '12회 전용 기본곡에 같은 노래를 중복 지정할 수 없습니다.'
                    },
                    {
                        status: 400
                    }
                );
            }

            const plan20SongIds =
                plan20BaseTracks.map(
                    row =>
                        row.song_id
                );

            if (
                new Set(plan20SongIds).size !==
                plan20SongIds.length
            ) {
                return NextResponse.json(
                    {
                        error:
                            '20회 전용 기본곡에 같은 노래를 중복 지정할 수 없습니다.'
                    },
                    {
                        status: 400
                    }
                );
            }

            const songIds =
                tracks.map(
                    row =>
                        row.song_id
                );

            const uniqueSongIds =
                [...new Set(songIds)];

            const {
                data: songRows,
                error: songError
            } =
                await db
                    .from(
                        'ds_content_songs'
                    )
                    .select(
                        'id,program'
                    )
                    .in(
                        'id',
                        uniqueSongIds
                    );

            if (songError) {
                throw songError;
            }

            if (
                (songRows || []).length !==
                uniqueSongIds.length ||
                (songRows || []).some(
                    row =>
                        row.program !== program
                )
            ) {
                return NextResponse.json(
                    {
                        error:
                            '선택한 곡 중 현재 프로그램에 속하지 않은 곡이 있습니다.'
                    },
                    {
                        status: 400
                    }
                );
            }

            const {
                error: deleteError
            } =
                await db
                    .from(
                        'ds_home_package_tracks'
                    )
                    .delete()
                    .eq(
                        'program',
                        program
                    );

            if (deleteError) {
                throw deleteError;
            }

            const rows =
                tracks.map(
                    row => ({
                        program,
                        song_id:
                            row.song_id,
                        unlock_week:
                            row.unlock_week,
                        position:
                            row.position
                    })
                );

            if (
                rows.length > 0
            ) {
                const {
                    error: insertError
                } =
                    await db
                        .from(
                            'ds_home_package_tracks'
                        )
                        .insert(
                            rows
                        );

                if (insertError) {
                    throw insertError;
                }
            }

            return NextResponse.json({
                ok: true,
                saved: {
                    commonBase: commonBaseTracks.length,
                    plan12Base: plan12BaseTracks.length,
                    plan20Base: plan20BaseTracks.length,
                    weekly: tracks.filter(row => row.unlock_week > 0).length,
                    total: rows.length
                }
            });
        }


        /*
         * =====================================
         * 지원하지 않는 작업
         * =====================================
         */
        return NextResponse.json(
            {
                error:
                    '지원하지 않는 작업입니다.'
            },
            {
                status: 400
            }
        );


    } catch (e) {

        console.error(
            'Admin manage error:',
            {
                action:
                    currentAction,
                code:
                    e?.code || null,
                message:
                    e?.message || null,
                details:
                    e?.details || null,
                hint:
                    e?.hint || null
            }
        );

        return NextResponse.json(
            {
                error:
                    adminActionErrorMessage(
                        e,
                        currentAction
                    )
            },
            {
                status: 500
            }
        );

    }
}