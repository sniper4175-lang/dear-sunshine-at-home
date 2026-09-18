"use client";

import { useEffect, useRef, useState } from "react";

const CLASS_OPTIONS = [
  "Sunshine Baby",
  "Sunshine Toddler",
  "Early Toddler",
  "Melody Book Club",
  "Disney English Step-up",
];

const DAY_OPTIONS = [
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
  "일요일",
];

const DAY_MAP = {
  0: "일요일",
  1: "월요일",
  2: "화요일",
  3: "수요일",
  4: "목요일",
  5: "금요일",
  6: "토요일",
};
function makeTimeOptions() {
  const arr = [];

  for (let h = 8; h <= 21; h++) {
    for (let m = 0; m < 60; m += 10) {
      arr.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      );
    }
  }

  // 11:15 수업시간 추가
  arr.push("11:15");

  // 시간순으로 정렬
  arr.sort();

  return arr;
}

const TIME_OPTIONS = makeTimeOptions();

function todayKST() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });
}

function dateKey(v) {
  return new Date(v).toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });
}

function parseDate(v) {
  if (!v) return null;

  const [y, m, d] = v.split("-").map(Number);

  return new Date(y, m - 1, d);
}

function formatDate(d) {
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, "0")}-` +
    `${String(d.getDate()).padStart(2, "0")}`
  );
}

function addDays(d, n) {
  const x = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
  );

  x.setDate(x.getDate() + n);

  return x;
}

function getMonday(d) {
  const x = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
  );

  const day = x.getDay();

  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));

  return x;
}

function formatShortDate(v) {
  const d = parseDate(v);

  if (!d) return "";

  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatRegularTime(v) {
  return v ? String(v).slice(0, 5) : "";
}

function scheduleText(s) {
  const day = s.regular_day;

  const time = formatRegularTime(s.regular_time);

  if (day && time) {
    return `${day} ${time}`;
  }

  return day || time || "정규 일정 미등록";
}

function dayOfDate(v) {
  const d = parseDate(v);

  return d ? DAY_MAP[d.getDay()] : "";
}

function calculateExpiry(startDate, baseCount) {
  const map = {
    8: 10,
    12: 15,
    20: 25,
  };

  const weeks = map[Number(baseCount)];

  if (!startDate || !weeks) {
    return "";
  }

  const d = parseDate(startDate);

  d.setDate(d.getDate() + weeks * 7);

  return formatDate(d);
}

function daysUntil(v) {
  if (!v) return null;

  return Math.round(
    (parseDate(v) - parseDate(todayKST())) / 86400000,
  );
}

function isExpiringSoon(s) {
  const n = daysUntil(s.expires_at);

  return n !== null && n >= 0 && n <= 7;
}

function expiryWarningText(s) {
  const n = daysUntil(s.expires_at);

  if (n === null) {
    return "";
  }

  if (n === 0) {
    return "오늘까지";
  }

  return `${n}일 남음`;
}

function money(v) {
  return (
    Math.round(Number(v || 0)).toLocaleString("ko-KR") +
    "원"
  );
}

/* DS_STUDENT_NAME_ADMIN_PATCH */
function authUserStudentName(user) {
  return String(
    user?.studentName ||
      user?.student_name ||
      user?.user_metadata?.student_name ||
      user?.user_metadata?.studentName ||
      "",
  ).trim();
}

function authUserDisplay(user) {
  if (!user) return "";

  const name = authUserStudentName(user);
  const email = user.email || user.id || "";

  return name
    ? `${name} · ${email}`
    : email;
}

function uniqueStudentList(students, passes = []) {
  const studentMap = new Map();

  /*
   * 학생 기본정보를 먼저 한 명당 하나씩 모음
   */
  students.forEach((s) => {
    if (!studentMap.has(s.student_id)) {
      studentMap.set(s.student_id, {
        ...s,
      });
    }
  });

  const today = todayKST();

  return Array.from(studentMap.values()).map((student) => {
    /*
     * 이 학생의 모든 수강권
     *
     * 시작일 → 생성일 순으로 오래된 수강권부터 정렬
     */
    const studentPasses = passes
      .filter((p) => p.student_id === student.student_id)
      .sort((a, b) => {
        const aStart = a.start_date || "9999-12-31";
        const bStart = b.start_date || "9999-12-31";

        if (aStart !== bStart) {
          return aStart.localeCompare(bStart);
        }

        const aCreated = a.created_at || "";
        const bCreated = b.created_at || "";

        return aCreated.localeCompare(bCreated);
      });

    /*
     * 실제 DB에 가장 최근 등록된 수강권
     * → "최근 수강권 등록순" / 등록일 필터용
     */
    const latestCreatedPass =
      studentPasses.length > 0
        ? [...studentPasses].sort((a, b) =>
            String(b.created_at || "").localeCompare(
              String(a.created_at || ""),
            ),
          )[0]
        : null;

    const latestPassCreatedAt =
      latestCreatedPass?.created_at || null;

    /*
     * 가장 최근 시작 수강권
     * → 모든 수강권이 끝난 학생의 표시용
     */
    const latestPass =
      studentPasses.length > 0
        ? studentPasses[studentPasses.length - 1]
        : null;

    /*
     * 현재 날짜에 사용할 수 있는 수강권 선택
     *
     * 1) 정상 이용기간 안의 수강권
     * 2) 만료됐더라도 정확히 1회 남고,
     *    이미 시작된 더 새로운 수강권이 있으면
     *    재등록 이월 1회로 간주
     *
     * studentPasses가 오래된 순서이므로
     * 기존권을 신규권보다 먼저 선택함.
     */
    const usablePass = studentPasses.find((p, index) => {
      const remaining =
        Number(p.total_count || 0) -
        Number(p.used_count || 0);

      if (remaining <= 0) {
        return false;
      }

      const started =
        !p.start_date ||
        p.start_date <= today;

      if (!started) {
        return false;
      }

      const notExpired =
        !p.expires_at ||
        p.expires_at >= today;

      if (notExpired) {
        return true;
      }

      /*
       * 재등록 이월 1회
       */
      if (remaining !== 1) {
        return false;
      }

      const hasStartedNewerPass =
        studentPasses
          .slice(index + 1)
          .some((newer) => {
            const newerRemaining =
              Number(newer.total_count || 0) -
              Number(newer.used_count || 0);

            const newerStarted =
              !newer.start_date ||
              newer.start_date <= today;

            return (
              newerRemaining > 0 &&
              newerStarted
            );
          });

      return hasStartedNewerPass;
    });

    /*
     * 아직 시작 전인 가장 가까운 수강권
     */
    const futurePass = studentPasses.find((p) => {
      const remaining =
        Number(p.total_count || 0) -
        Number(p.used_count || 0);

      return (
        remaining > 0 &&
        p.start_date &&
        p.start_date > today
      );
    });

    /*
     * "재등록 완료" 판정용 신규 수강권
     *
     * 핵심:
     * 신규 수강권 시작일이 미래가 아니어도 됨.
     * 현재 사용해야 하는 기존권 뒤에
     * 남은 횟수가 있는 더 새로운 수강권이 있으면
     * 재등록 완료로 판단.
     */
    let renewalPass = null;

    if (usablePass) {
      const usableIndex = studentPasses.findIndex(
        (p) => p.id === usablePass.id,
      );

      renewalPass =
        studentPasses
          .slice(usableIndex + 1)
          .find((p) => {
            const remaining =
              Number(p.total_count || 0) -
              Number(p.used_count || 0);

            return remaining > 0;
          }) || null;
    }

    /*
     * 기존 수강권을 모두 사용한 뒤에는 usablePass가 곧 새 수강권이 되어
     * 위 로직만으로는 재등록 완료 여부를 잃어버릴 수 있음.
     *
     * 수강권 이력이 2개 이상이고, DB에 가장 최근 등록된 수강권에
     * 남은 횟수가 있다면 현재 사용 중인 수강권 자체도 재등록권으로 인정.
     * → 오윤재처럼 재등록 직후 기존권이 소진된 학생도
     *    학생 현황의 '재등록 완료' 필터에 표시됨.
     */
    if (!renewalPass && studentPasses.length >= 2 && latestCreatedPass) {
      const latestCreatedRemaining =
        Number(latestCreatedPass.total_count || 0) -
        Number(latestCreatedPass.used_count || 0);

      if (latestCreatedRemaining > 0) {
        renewalPass = latestCreatedPass;
      }
    }

    const hasRenewalPass =
      Boolean(renewalPass);

    /*
     * 학생 현황에서 사용할 대표 수강권
     */
    const currentPass =
      usablePass ||
      futurePass ||
      latestPass;

    /*
     * 수강권이 전혀 없는 학생
     */
    if (!currentPass) {
      return {
        ...student,

        pass_id: null,

        base_count: null,
        bonus_count: null,

        total_count: 0,
        used_count: 0,
        remaining_count: 0,

        start_date: null,
        expires_at: null,

        pass_status: null,

        has_future_pass: false,
        future_pass: null,

        has_renewal_pass: false,
        renewal_pass: null,

        latest_pass_created_at:
          latestPassCreatedAt,
      };
    }

    const remainingCount = Math.max(
      Number(currentPass.total_count || 0) -
        Number(currentPass.used_count || 0),
      0,
    );

    return {
      ...student,

      /*
       * 학생 현황에서 사용할 대표 수강권
       */
      pass_id: currentPass.id,

      base_count:
        currentPass.base_count,

      bonus_count:
        currentPass.bonus_count,

      total_count:
        Number(
          currentPass.total_count || 0,
        ),

      used_count:
        Number(
          currentPass.used_count || 0,
        ),

      remaining_count:
        remainingCount,

      start_date:
        currentPass.start_date,

      expires_at:
        currentPass.expires_at,

      pass_status:
        currentPass.status,

      latest_pass_created_at:
        latestPassCreatedAt,

      /*
       * 미래 시작 재등록권
       * → 학생행의 "새 수강권 OO 시작" 표시용
       */
      has_future_pass:
        Boolean(
          renewalPass?.start_date &&
          renewalPass.start_date > today,
        ),

      future_pass:
        renewalPass?.start_date &&
        renewalPass.start_date > today
          ? renewalPass
          : null,

      /*
       * 재등록 완료
       *
       * 신규권 시작일이 오늘/과거여도
       * 기존권 뒤에 새 수강권이 있으면 true.
       */
      has_renewal_pass:
        hasRenewalPass,

      renewal_pass:
        renewalPass,
    };
  });
}

function attendanceTimeText(a) {
  if (a.time_unknown) {
    return "시간 모름";
  }

  return new Date(a.attended_at).toLocaleTimeString(
    "ko-KR",
    {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function revenueForAttendance(a) {
  if (
    a.revenue_amount === null ||
    a.revenue_amount === undefined
  ) {
    return 0;
  }

  return Number(a.revenue_amount);
}

function isStudentPassActiveOnDate(s, date) {
  if (s.start_date && date < s.start_date) {
    return false;
  }

  if (s.expires_at && date > s.expires_at) {
    return false;
  }

  return true;
}

function getScheduledDateTime(date, time) {
  if (!date || !time) {
    return null;
  }

  return new Date(`${date}T${time}:00+09:00`);
}

export default function AdminClient({ initial }) {
  const [d, setD] = useState({
    students: initial.students || [],

    attendance: initial.attendance || [],

    parents: initial.parents || [],

    passes: initial.passes || [],

    trials: initial.trials || [],

    contents: initial.contents || [],

    memberships: initial.memberships || [],

    authUsers: initial.authUsers || [],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadAtHomeAuthUsers() {
      try {
        const response = await fetch("/api/admin/manage", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            action: "listAtHomeAuthUsers",
          }),
        });

        if (!response.ok) {
          return;
        }

        const result = await response.json();

        if (
          !cancelled &&
          Array.isArray(result.users)
        ) {
          setD((current) => ({
            ...current,
            authUsers: result.users,
          }));
        }
      } catch (error) {
        console.warn(
          "Song Club/Home Package 회원 이름을 불러오지 못했습니다.",
          error,
        );
      }
    }

    loadAtHomeAuthUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const [tab, setTab] = useState("students");

  const [msg, setMsg] = useState("");

  const [loading, setLoading] = useState(false);

  const [studentSearch, setStudentSearch] = useState("");

  const [studentDayFilter, setStudentDayFilter] =
    useState("all");

  const [studentClassFilter, setStudentClassFilter] =
    useState("all");

  const [studentRemainingFilter, setStudentRemainingFilter] =
    useState("all");

  const [studentExpiryFilter, setStudentExpiryFilter] =
    useState("all");

  const [
    studentRegistrationFilter,
    setStudentRegistrationFilter,
  ] = useState("all");

  const [
    studentStatusFilter,
    setStudentStatusFilter,
  ] = useState("all");    

  const [attendanceSearch, setAttendanceSearch] =
    useState("");

  const [attendanceClassFilter, setAttendanceClassFilter] =
    useState("all");

  const [attendanceStatusFilter, setAttendanceStatusFilter] =
    useState("all");

  const [attendancePeriodFilter, setAttendancePeriodFilter] =
    useState("all");

  const [attendanceSort, setAttendanceSort] =
    useState("newest");

  const [studentSort, setStudentSort] =
    useState("name");  

  const [renewalFilter, setRenewalFilter] = useState("all");

  const [attendanceStudent, setAttendanceStudent] =
    useState(null);

  const [attendanceDate, setAttendanceDate] =
    useState(todayKST());

  const [attendanceTime, setAttendanceTime] = useState("");

  const [editingStudent, setEditingStudent] =
    useState(null);

  const [scheduleForm, setScheduleForm] = useState({
    className: "",
    regularDay: "",
    regularTime: "",
  });

  const [pinStudent, setPinStudent] = useState(null);

  const [newPin, setNewPin] = useState("");

  const [phoneStudent, setPhoneStudent] = useState(null);

  const [newPhone, setNewPhone] = useState("");

  const [startDateStudent, setStartDateStudent] = useState(null);

  const [newStartDate, setNewStartDate] = useState("");

  const [startDateExpiry, setStartDateExpiry] = useState("");

  const [expiryStudent, setExpiryStudent] = useState(null);

  const [newExpiry, setNewExpiry] = useState("");

  const [paymentStudent, setPaymentStudent] =
    useState(null);

  const [paidAmountEdit, setPaidAmountEdit] = useState("");

  const now = new Date();

  const [calendarYear, setCalendarYear] = useState(
    now.getFullYear(),
  );

  const [calendarMonth, setCalendarMonth] = useState(
    now.getMonth() + 1,
  );

  const [calendarStudent, setCalendarStudent] =
    useState("all");

  const [selectedCalendarDate, setSelectedCalendarDate] =
    useState(null);

  const [weeklyStart, setWeeklyStart] = useState(
    formatDate(getMonday(parseDate(todayKST()))),
  );

  const [revenueMode, setRevenueMode] = useState("week");

  const [revenueWeekStart, setRevenueWeekStart] = useState(
    formatDate(getMonday(parseDate(todayKST()))),
  );

  const td = parseDate(todayKST());

  const [revenueYear, setRevenueYear] = useState(
    td.getFullYear(),
  );

  const [revenueMonth, setRevenueMonth] = useState(
    td.getMonth() + 1,
  );

  const ADMIN_VIEW_KEY = "dearSunshineAdminView";

  function saveAdminViewState(tabOverride = null) {
    if (typeof window === "undefined") {
      return;
    }

    sessionStorage.setItem(
      ADMIN_VIEW_KEY,
      JSON.stringify({
        tab: tabOverride || tab,

        studentSearch,

        studentDayFilter,
        studentClassFilter,
        studentRemainingFilter,
        studentExpiryFilter,

        studentRegistrationFilter,
        studentStatusFilter,

        studentSort,

        attendanceSearch,
        attendanceClassFilter,
        attendanceStatusFilter,
        attendancePeriodFilter,
        attendanceSort,

        scrollY: window.scrollY,
      }),
    );
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved =
      sessionStorage.getItem(ADMIN_VIEW_KEY);

    if (!saved) {
      return;
    }

    try {
      const state = JSON.parse(saved);

      if (state.tab) {
        setTab(state.tab);
      }

      if (state.studentSearch != null) {
        setStudentSearch(state.studentSearch);
      }

      if (state.studentDayFilter) {
        setStudentDayFilter(
          state.studentDayFilter,
        );
      }

      if (state.studentClassFilter) {
        setStudentClassFilter(
          state.studentClassFilter,
        );
      }

      if (state.studentRemainingFilter) {
        setStudentRemainingFilter(
          state.studentRemainingFilter,
        );
      }

      if (state.studentExpiryFilter) {
        setStudentExpiryFilter(
          state.studentExpiryFilter,
        );
      }

      if (
        state.studentRegistrationFilter
      ) {
        setStudentRegistrationFilter(
          state.studentRegistrationFilter,
        );
      }

      if (state.studentStatusFilter) {
        setStudentStatusFilter(
          state.studentStatusFilter,
        );
      }

      if (state.studentSort) {
        setStudentSort(state.studentSort);
      }

      if (state.attendanceSearch != null) {
        setAttendanceSearch(
          state.attendanceSearch,
        );
      }

      if (state.attendanceClassFilter) {
        setAttendanceClassFilter(
          state.attendanceClassFilter,
        );
      }

      if (state.attendanceStatusFilter) {
        setAttendanceStatusFilter(
          state.attendanceStatusFilter,
        );
      }

      if (state.attendancePeriodFilter) {
        setAttendancePeriodFilter(
          state.attendancePeriodFilter,
        );
      }

      if (state.attendanceSort) {
        setAttendanceSort(
          state.attendanceSort,
        );
      }

      const scrollY =
        Number(state.scrollY || 0);

      setTimeout(() => {
        window.scrollTo({
          top: scrollY,
          behavior: "auto",
        });
      }, 100);
    } catch (e) {
      console.error(
        "관리자 화면 상태 복원 실패:",
        e,
      );
    }
  }, []);
  
  async function action(body) {
    setMsg("");
    setLoading(true);

    try {
      const r = await fetch("/api/admin/manage", {
        method: "POST",

        headers: {
          "content-type": "application/json",
        },

        body: JSON.stringify(body),
      });

      let x = {};

      try {
        x = await r.json();
      } catch {
        x = {};
      }

      if (!r.ok) {
        setMsg(x.error || "처리 중 오류가 발생했습니다.");
        return false;
      }

      if (body.action !== "logout") {
        if (body.action === "deactivateStudent") {
          /*
           * 수강 종료 처리 후 새로고침되면
           * 수강 종료 학생 탭으로 바로 이동
           */
          saveAdminViewState("inactive");
        } else if (body.action === "reactivateStudent") {
          /*
           * 수강 종료 학생 복구 후에는
           * 학생 현황 탭으로 바로 이동
           */
          saveAdminViewState("students");
        } else {
          saveAdminViewState();
        }
      }

      location.reload();

      return true;
    } catch (e) {
      console.error(e);

      setMsg("서버 연결 중 오류가 발생했습니다.");

      return false;
    } finally {
      setLoading(false);
    }
  }

  async function addAttendance(
    student,
    customDate = null,
    customTime = null,
  ) {
    const date = customDate || attendanceDate;

    const selected =
      customTime ||
      attendanceTime ||
      formatRegularTime(student.regular_time) ||
      "UNKNOWN";

    if (!date) {
      setMsg("출석일을 선택해주세요.");

      return;
    }

    const unknown = selected === "UNKNOWN";

    const saveTime = unknown
      ? formatRegularTime(student.regular_time) || "12:00"
      : selected;

    const display = unknown ? "시간 모름" : saveTime;

    if (
      !confirm(
        `${student.student_name} 학생을 출석 등록할까요?\n\n출석일: ${date}\n출석시간: ${display}\n정규 일정: ${scheduleText(student)}\n\n등록하면 잔여 횟수가 1회 차감됩니다.`,
      )
    ) {
      return;
    }

    await action({
      action: "addAttendance",

      studentId: student.student_id,

      attendanceDate: date,

      attendanceTime: saveTime,

      timeUnknown: unknown,
    });
  }

  async function deleteAttendance(a) {
    const s = d.students.find(
      (x) => x.student_id === a.student_id,
    );

    if (
      !confirm(
        `${s?.student_name || "학생"} 학생의 ${dateKey(a.attended_at)} ${attendanceTimeText(a)} 출석을 취소할까요?\n\n1회가 복구되고 수익에서도 제외됩니다.`,
      )
    ) {
      return;
    }

    await action({
      action: "deleteAttendance",

      id: a.id,
    });
  }

  function openAttendance(s) {
    if (attendanceStudent === s.student_id) {
      setAttendanceStudent(null);

      return;
    }

    setAttendanceStudent(s.student_id);

    setAttendanceDate(todayKST());

    setAttendanceTime(
      formatRegularTime(s.regular_time) || "",
    );
  }

  function openScheduleEditor(s) {
    if (editingStudent === s.student_id) {
      setEditingStudent(null);

      return;
    }

    setEditingStudent(s.student_id);

    setScheduleForm({
      className: s.class_name || "",

      regularDay: s.regular_day || "",

      regularTime: formatRegularTime(s.regular_time),
    });
  }

  async function saveSchedule(s) {
    await action({
      action: "updateStudentSchedule",

      studentId: s.student_id,

      className: scheduleForm.className,

      regularDay: scheduleForm.regularDay,

      regularTime: scheduleForm.regularTime,
    });
  }

  function openPinEditor(s) {
    setPinStudent(
      pinStudent === s.student_id ? null : s.student_id,
    );

    setNewPin("");
  }

  async function saveParentPin(s) {
    if (!/^\d{4}$/.test(newPin)) {
      setMsg("새 확인번호 숫자 4자리를 입력해주세요.");

      return;
    }

    if (
      !confirm(
        `${s.student_name} 학생 학부모의 확인번호를 변경할까요?`,
      )
    ) {
      return;
    }

    await action({
      action: "updateParentPin",

      studentId: s.student_id,

      pin: newPin,
    });
  }

  function openPhoneEditor(s) {
    setPhoneStudent(
      phoneStudent === s.student_id ? null : s.student_id,
    );

    setNewPhone("");
  }

  async function saveParentPhone(s) {
    const phone = newPhone.replace(/\D/g, "");

    if (!/^01\d{8,9}$/.test(phone)) {
      setMsg("새 휴대폰 번호를 정확히 입력해주세요.");

      return;
    }

    if (
      !confirm(
        `${s.student_name} 학생 학부모의 휴대폰 번호를 ${phone}으로 변경할까요?`,
      )
    ) {
      return;
    }

    await action({
      action: "updateParentPhone",

      studentId: s.student_id,

      phone,
    });
  }

  function getBaseCountForExpiry(s) {
    if (s.base_count != null) {
      return Number(s.base_count);
    }

    const total = Number(s.total_count || 0);

    if ([8, 9, 10, 11].includes(total)) {
      return 8;
    }

    if ([12, 13, 14, 15].includes(total)) {
      return 12;
    }

    if ([20, 21, 22, 23].includes(total)) {
      return 20;
    }

    return null;
  }

  function calculateStartDateExpiry(s, startDate) {
    const baseCount = getBaseCountForExpiry(s);

    if (!baseCount || !startDate) {
      return "";
    }

    return calculateExpiry(
      startDate,
      baseCount,
    );
  }

  function openStartDateEditor(s) {
    const key = `${s.student_id}-${s.pass_id || ""}`;

    if (startDateStudent === key) {
      setStartDateStudent(null);

      setNewStartDate("");

      setStartDateExpiry("");

      return;
    }

    const startDate = s.start_date || "";

    setStartDateStudent(key);

    setNewStartDate(startDate);

    /*
     * 시작일 수정 폼을 열면
     * 현재 수강권 횟수 기준으로 이용기한을 다시 계산해서 제안.
     * 계산값은 아래 날짜 input에서 직접 수정 가능.
     */
    setStartDateExpiry(
      calculateStartDateExpiry(
        s,
        startDate,
      ) ||
      s.expires_at ||
      "",
    );
  }

  function changeStartDateForEditor(s, value) {
    setNewStartDate(value);

    /*
     * 시작일이 바뀔 때마다
     * 수강권 기본횟수 기준 이용기한을 자동 계산.
     */
    const calculated =
      calculateStartDateExpiry(
        s,
        value,
      );

    setStartDateExpiry(
      calculated || "",
    );
  }

  async function saveStartDate(s) {
    if (
      !s.pass_id ||
      !newStartDate ||
      !startDateExpiry
    ) {
      setMsg(
        "변경할 시작일과 이용기한을 확인해주세요.",
      );

      return;
    }

    if (
      startDateExpiry <
      newStartDate
    ) {
      setMsg(
        "이용기한은 시작일보다 빠를 수 없습니다.",
      );

      return;
    }

    if (
      !confirm(
        `${s.student_name} 학생의 수강권 날짜를 변경할까요?\n\n` +
        `시작일: ${newStartDate}\n` +
        `이용기한: ${startDateExpiry}\n\n` +
        `이용기한은 수강권 횟수 기준 자동 계산값이며, 직접 수정한 날짜가 있으면 그 날짜로 저장됩니다.`,
      )
    ) {
      return;
    }

    await action({
      action: "updatePassStartDate",

      passId: s.pass_id,

      startDate: newStartDate,

      expiresAt: startDateExpiry,
    });
  }

  function openExpiryEditor(s) {
    const key = `${s.student_id}-${s.pass_id || ""}`;

    if (expiryStudent === key) {
      setExpiryStudent(null);

      setNewExpiry("");

      return;
    }

    setExpiryStudent(key);

    setNewExpiry(s.expires_at || "");
  }

  async function saveExpiry(s) {
    if (!s.pass_id || !newExpiry) {
      setMsg("변경할 이용기한을 확인해주세요.");

      return;
    }

    if (
      !confirm(
        `${s.student_name} 학생의 이용기한을 ${newExpiry}로 변경할까요?`,
      )
    ) {
      return;
    }

    await action({
      action: "updatePassExpiry",

      passId: s.pass_id,

      expiresAt: newExpiry,
    });
  }

  function openPaymentEditor(s) {
    const key = `${s.student_id}-${s.pass_id || ""}`;

    const pass = d.passes.find((p) => p.id === s.pass_id);

    if (paymentStudent === key) {
      setPaymentStudent(null);

      setPaidAmountEdit("");

      return;
    }

    setPaymentStudent(key);

    setPaidAmountEdit(pass?.paid_amount ?? "");
  }

  async function savePaidAmount(s) {
    if (!s.pass_id || paidAmountEdit === "") {
      setMsg("납부금액을 입력해주세요.");

      return;
    }

    if (
      !confirm(
        `${s.student_name} 학생 수강권의 납부금액을 ${money(paidAmountEdit)}으로 변경할까요?\n\n과거 출석 수익은 바뀌지 않고 앞으로 새로 등록되는 출석부터 적용됩니다.`,
      )
    ) {
      return;
    }

    await action({
      action: "updatePaidAmount",

      passId: s.pass_id,

      paidAmount: Number(paidAmountEdit),
    });
  }

  const activeStudents = d.students.filter(
    (s) => (s.enrollment_status || "active") === "active",
  );

  const inactiveStudents = d.students.filter(
    (s) => s.enrollment_status === "inactive",
  );

  /*
   * 학생 현황 / 재등록 관리 / 미출석 관리에는
   * 현재 수강 중(active)인 학생만 포함.
   *
   * 수강 종료(inactive) 학생은 별도의
   * "수강 종료 학생" 탭에서만 표시.
   */
  const displayStudents = uniqueStudentList(
    activeStudents,
    d.passes || [],
  );

  const filteredStudents =
    displayStudents
      .filter((s) => {
        const q =
          studentSearch
            .trim()
            .toLowerCase();

        /*
        * 1. 텍스트 검색
        */
        const matchesSearch =
          !q ||
          [
            s.student_name,
            s.class_name,
            s.phone_masked,
            s.regular_day,
            s.regular_time,
          ].some((v) =>
            String(v || "")
              .toLowerCase()
              .includes(q),
          );

        if (!matchesSearch) {
          return false;
        }


        /*
        * 2. 요일
        */
        if (
          studentDayFilter !== "all" &&
          s.regular_day !==
            studentDayFilter
        ) {
          return false;
        }


        /*
        * 3. 클래스
        */
        if (
          studentClassFilter !== "all" &&
          s.class_name !==
            studentClassFilter
        ) {
          return false;
        }


        /*
        * 4. 잔여회차
        */
        const remaining =
          Number(
            s.remaining_count || 0,
          );

        if (
          studentRemainingFilter ===
            "1" &&
          remaining !== 1
        ) {
          return false;
        }

        if (
          studentRemainingFilter ===
            "2" &&
          remaining !== 2
        ) {
          return false;
        }

        if (
          studentRemainingFilter ===
            "3orLess" &&
          remaining > 3
        ) {
          return false;
        }

        if (
          studentRemainingFilter ===
            "4plus" &&
          remaining < 4
        ) {
          return false;
        }


        /*
        * 5. 이용기한
        */
        const expiryDays =
          daysUntil(s.expires_at);

        if (
          studentExpiryFilter === "7"
        ) {
          if (
            expiryDays === null ||
            expiryDays < 0 ||
            expiryDays > 7
          ) {
            return false;
          }
        }

        if (
          studentExpiryFilter === "14"
        ) {
          if (
            expiryDays === null ||
            expiryDays < 0 ||
            expiryDays > 14
          ) {
            return false;
          }
        }

        if (
          studentExpiryFilter === "30"
        ) {
          if (
            expiryDays === null ||
            expiryDays < 0 ||
            expiryDays > 30
          ) {
            return false;
          }
        }

        if (
          studentExpiryFilter ===
            "none" &&
          s.expires_at
        ) {
          return false;
        }


        /*
        * 6. 최근 수강권 등록일
        */
        if (
          studentRegistrationFilter !==
          "all"
        ) {
          if (
            !s.latest_pass_created_at
          ) {
            return false;
          }

          const registeredDate =
            String(
              s.latest_pass_created_at,
            ).slice(0, 10);

          const registeredDaysAgo =
            Math.floor(
              (
                parseDate(todayKST()) -
                parseDate(
                  registeredDate,
                )
              ) /
                86400000,
            );

          if (
            studentRegistrationFilter ===
              "today" &&
            registeredDaysAgo !== 0
          ) {
            return false;
          }

          if (
            studentRegistrationFilter ===
              "3" &&
            (
              registeredDaysAgo < 0 ||
              registeredDaysAgo > 2
            )
          ) {
            return false;
          }

          if (
            studentRegistrationFilter ===
              "7" &&
            (
              registeredDaysAgo < 0 ||
              registeredDaysAgo > 6
            )
          ) {
            return false;
          }

          if (
            studentRegistrationFilter ===
              "30" &&
            (
              registeredDaysAgo < 0 ||
              registeredDaysAgo > 29
            )
          ) {
            return false;
          }
        }


        /*
        * 7. 학생 상태
        */

        // 재등록 필요
        if (
          studentStatusFilter ===
          "renewalNeeded"
        ) {
          if (
            remaining > 2 ||
            remaining < 0 ||
            s.has_renewal_pass
          ) {
            return false;
          }
        }


        // 재등록 완료
        if (
          studentStatusFilter ===
          "renewed"
        ) {
          if (!s.has_renewal_pass) {
            return false;
          }
        }


        // 아직 시작 전
        if (
          studentStatusFilter ===
          "upcoming"
        ) {
          if (
            !s.start_date ||
            s.start_date <= todayKST()
          ) {
            return false;
          }
        }


        return true;
      })

      /*
      * 정렬
      */
      .sort((a, b) => {
        /*
        * 이름순
        */
        if (
          studentSort === "name"
        ) {
          return String(
            a.student_name || "",
          ).localeCompare(
            String(
              b.student_name || "",
            ),
            "ko",
          );
        }


        /*
        * 요일·시간순
        */
        if (
          studentSort ===
          "schedule"
        ) {
          const dayA =
            DAY_OPTIONS.indexOf(
              a.regular_day,
            );

          const dayB =
            DAY_OPTIONS.indexOf(
              b.regular_day,
            );

          if (dayA !== dayB) {
            return dayA - dayB;
          }

          return formatRegularTime(
            a.regular_time,
          ).localeCompare(
            formatRegularTime(
              b.regular_time,
            ),
          );
        }


        /*
        * 잔여회차 적은 순
        */
        if (
          studentSort ===
          "remaining"
        ) {
          return (
            Number(
              a.remaining_count || 0,
            ) -
            Number(
              b.remaining_count || 0,
            )
          );
        }


        /*
        * 이용기한 빠른 순
        */
        if (
          studentSort === "expiry"
        ) {
          return String(
            a.expires_at ||
              "9999-12-31",
          ).localeCompare(
            String(
              b.expires_at ||
                "9999-12-31",
            ),
          );
        }


        /*
        * 시작일 빠른 순
        */
        if (
          studentSort === "start"
        ) {
          return String(
            a.start_date ||
              "9999-12-31",
          ).localeCompare(
            String(
              b.start_date ||
                "9999-12-31",
            ),
          );
        }


        /*
        * 가장 최근 수강권 등록순
        */
        if (
          studentSort ===
          "recentRegistration"
        ) {
          return String(
            b.latest_pass_created_at ||
              "",
          ).localeCompare(
            String(
              a.latest_pass_created_at ||
                "",
            ),
          );
        }

        return 0;
      });

  const renewalStudents = displayStudents.filter((s) => {
    const r = Number(s.remaining_count);

    return (
      r === 0 ||
      r === 1 ||
      r === 2 ||
      isExpiringSoon(s)
    );
  });

  const currentMonday = getMonday(parseDate(todayKST()));

  const currentWeekDays = Array.from(
    {
      length: 7,
    },
    (_, i) => {
      const x = addDays(currentMonday, i);

      return {
        date: formatDate(x),

        dayName: DAY_MAP[x.getDay()],
      };
    },
  );

  const currentWeekMissingCount = getMissingCountForWeek({
    students: displayStudents,

    attendance: d.attendance,

    weekDays: currentWeekDays,
  });

  const todayAttendance = d.attendance.filter(
    (a) =>
      a.status === "present" &&
      dateKey(a.attended_at) === todayKST(),
  );

  const todayTrials = d.trials.filter(
    (t) =>
      t.status === "attended" &&
      t.trial_date === todayKST(),
  );

  return (
    <main className="wide">
      <header>
        <a href="/">← 학부모 화면</a>

        <div>
          <h1>디어 선샤인 관리자</h1>

          <p>학생·수강권·출석·체험·수익 관리</p>
        </div>

        <button
          className="small ghost"
          disabled={loading}
          onClick={() =>
            action({
              action: "logout",
            })
          }
        >
          로그아웃
        </button>
      </header>

      <div className="stats">
        <article>
          <span>등록 학생</span>

          <b>{activeStudents.length}명</b>
        </article>

        <article>
          <span>오늘 정규 출석</span>

          <b>{todayAttendance.length}명</b>
        </article>

        <article>
          <span>오늘 체험</span>

          <b>{todayTrials.length}명</b>
        </article>

        <article>
          <span>재등록 확인</span>

          <b>{renewalStudents.length}명</b>
        </article>

        <article>
          <span>이번 주 미출석</span>

          <b>{currentWeekMissingCount}명</b>
        </article>
      </div>

      <nav className="tabs">
        {[
          ["students", "학생·수강권"],

          [
            "renewal",
            `재등록 관리${
              renewalStudents.length
                ? ` (${renewalStudents.length})`
                : ""
            }`,
          ],

          [
            "inactive",
            `수강 종료 학생${
              inactiveStudents.length
                ? ` (${inactiveStudents.length})`
                : ""
            }`,
          ],

          [
            "missing",
            `미출석 관리${
              currentWeekMissingCount
                ? ` (${currentWeekMissingCount})`
                : ""
            }`,
          ],

          ["attendance", "출석 기록"],

          ["calendar", "출석 달력"],

          ["trial", "체험수업"],

          ["revenue", "수익 관리"],

          ["add", "신규 등록"],

          ["content", "콘텐츠 관리"],

          ["athomeMembers", "Song Club 회원"],

          ["homePackageMembers", "Home Package 회원"],
        ].map(([k, label]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </nav>

      {msg && <p className="error">{msg}</p>}

      {tab === "students" && (
        <section className="panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h2>학생 현황</h2>

            <span className="hint">
              {filteredStudents.length}명 표시
            </span>
          </div>

          <input
            className="normal"
            type="search"
            value={studentSearch}
            onChange={(e) =>
              setStudentSearch(e.target.value)
            }
            placeholder="학생 이름, 클래스, 요일, 시간, 휴대폰 번호 검색"
            style={{
              width: "100%",
              marginBottom: 18,
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 20,
              alignItems: "center",
            }}
          >
            {/* 요일 */}
            <select
              className="normal"
              value={studentDayFilter}
              onChange={(e) =>
                setStudentDayFilter(
                  e.target.value,
                )
              }
            >
              <option value="all">
                요일 전체
              </option>

              {DAY_OPTIONS.map((day) => (
                <option
                  key={day}
                  value={day}
                >
                  {day}
                </option>
              ))}
            </select>


            {/* 클래스 */}
            <select
              className="normal"
              value={studentClassFilter}
              onChange={(e) =>
                setStudentClassFilter(
                  e.target.value,
                )
              }
            >
              <option value="all">
                클래스 전체
              </option>

              {CLASS_OPTIONS.map(
                (className) => (
                  <option
                    key={className}
                    value={className}
                  >
                    {className}
                  </option>
                ),
              )}
            </select>


            {/* 잔여회차 */}
            <select
              className="normal"
              value={
                studentRemainingFilter
              }
              onChange={(e) =>
                setStudentRemainingFilter(
                  e.target.value,
                )
              }
            >
              <option value="all">
                잔여회차 전체
              </option>

              <option value="1">
                1회 남음
              </option>

              <option value="2">
                2회 남음
              </option>

              <option value="3orLess">
                3회 이하
              </option>

              <option value="4plus">
                4회 이상
              </option>
            </select>


            {/* 이용기한 */}
            <select
              className="normal"
              value={studentExpiryFilter}
              onChange={(e) =>
                setStudentExpiryFilter(
                  e.target.value,
                )
              }
            >
              <option value="all">
                이용기한 전체
              </option>

              <option value="7">
                7일 이내 만료
              </option>

              <option value="14">
                14일 이내 만료
              </option>

              <option value="30">
                30일 이내 만료
              </option>

              <option value="none">
                이용기한 없음
              </option>
            </select>


            {/* 수강권 등록 */}
            <select
              className="normal"
              value={
                studentRegistrationFilter
              }
              onChange={(e) =>
                setStudentRegistrationFilter(
                  e.target.value,
                )
              }
            >
              <option value="all">
                수강권 등록 전체
              </option>

              <option value="today">
                오늘 등록
              </option>

              <option value="3">
                최근 3일 등록
              </option>

              <option value="7">
                최근 7일 등록
              </option>

              <option value="30">
                최근 30일 등록
              </option>
            </select>


            {/* 학생 상태 */}
            <select
              className="normal"
              value={studentStatusFilter}
              onChange={(e) =>
                setStudentStatusFilter(
                  e.target.value,
                )
              }
            >
              <option value="all">
                상태 전체
              </option>

              <option value="renewalNeeded">
                재등록 필요
              </option>

              <option value="renewed">
                재등록 완료
              </option>

              <option value="upcoming">
                시작 예정
              </option>
            </select>


            {/* 정렬 */}
            <select
              className="normal"
              value={studentSort}
              onChange={(e) =>
                setStudentSort(
                  e.target.value,
                )
              }
            >
              <option value="name">
                이름순
              </option>

              <option value="schedule">
                수업 요일·시간순
              </option>

              <option value="remaining">
                잔여회차 적은 순
              </option>

              <option value="expiry">
                이용기한 빠른 순
              </option>

              <option value="start">
                시작일 빠른 순
              </option>

              <option value="recentRegistration">
                최근 수강권 등록순
              </option>
            </select>


            {/* 초기화 */}
            <button
              type="button"
              className="mini ghost"
              onClick={() => {
                setStudentSearch("");

                setStudentDayFilter(
                  "all",
                );

                setStudentClassFilter(
                  "all",
                );

                setStudentRemainingFilter(
                  "all",
                );

                setStudentExpiryFilter(
                  "all",
                );

                setStudentRegistrationFilter(
                  "all",
                );

                setStudentStatusFilter(
                  "all",
                );

                setStudentSort("name");
              }}
            >
              필터 초기화
            </button>
          </div>

          {filteredStudents.map((s) => (
            <StudentRow
              key={`${s.student_id}-${s.pass_id || ""}`}
              s={s}
              passes={d.passes}
              loading={loading}
              action={action}
              attendanceStudent={attendanceStudent}
              attendanceDate={attendanceDate}
              attendanceTime={attendanceTime}
              setAttendanceDate={setAttendanceDate}
              setAttendanceTime={setAttendanceTime}
              openAttendance={openAttendance}
              addAttendance={addAttendance}
              editingStudent={editingStudent}
              openScheduleEditor={openScheduleEditor}
              scheduleForm={scheduleForm}
              setScheduleForm={setScheduleForm}
              saveSchedule={saveSchedule}
              pinStudent={pinStudent}
              newPin={newPin}
              setNewPin={setNewPin}
              openPinEditor={openPinEditor}
              saveParentPin={saveParentPin}
              phoneStudent={phoneStudent}
              newPhone={newPhone}
              setNewPhone={setNewPhone}
              openPhoneEditor={openPhoneEditor}
              saveParentPhone={saveParentPhone}
              startDateStudent={startDateStudent}
              newStartDate={newStartDate}
              setNewStartDate={setNewStartDate}
              startDateExpiry={startDateExpiry}
              setStartDateExpiry={setStartDateExpiry}
              setStartDateStudent={setStartDateStudent}
              openStartDateEditor={openStartDateEditor}
              changeStartDateForEditor={changeStartDateForEditor}
              saveStartDate={saveStartDate}
              expiryStudent={expiryStudent}
              newExpiry={newExpiry}
              setNewExpiry={setNewExpiry}
              setExpiryStudent={setExpiryStudent}
              openExpiryEditor={openExpiryEditor}
              saveExpiry={saveExpiry}
              paymentStudent={paymentStudent}
              paidAmountEdit={paidAmountEdit}
              setPaidAmountEdit={setPaidAmountEdit}
              setPaymentStudent={setPaymentStudent}
              openPaymentEditor={openPaymentEditor}
              savePaidAmount={savePaidAmount}
              setCalendarStudent={setCalendarStudent}
              setSelectedCalendarDate={
                setSelectedCalendarDate
              }
              saveAdminViewState={
                saveAdminViewState
              }              
              setTab={setTab}
            />
          ))}
        </section>
      )}

      {tab === "renewal" && (
        <Renewal
          students={renewalStudents}
          filter={renewalFilter}
          setFilter={setRenewalFilter}
          setStudentSearch={setStudentSearch}
          setTab={setTab}
        />
      )}

      {tab === "inactive" && (
        <section className="panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h2>수강 종료 학생</h2>

            <span className="hint">
              {inactiveStudents.length}명
            </span>
          </div>

          <p className="hint">
            재등록하지 않는 학생입니다.
            기존 출석·수강권·수익 기록은 그대로 보관됩니다.
          </p>

          {inactiveStudents.length === 0 ? (
            <p className="hint">
              수강 종료 학생이 없습니다.
            </p>
          ) : (
            inactiveStudents.map((s) => (
              <div
                key={s.student_id}
                style={{
                  borderBottom: "1px solid #eee",
                  padding: "18px 0",
                }}
              >
                <div className="adminrow">
                  <div>
                    <b>{s.student_name}</b>

                    <span>
                      {s.class_name || "-"}
                      {" · "}
                      {scheduleText(s)}
                    </span>

                    <span>
                      {s.phone_masked || ""}
                    </span>
                  </div>

                  <div className="right">
                    <b>수강 종료</b>

                    {s.inactive_reason && (
                      <span>
                        사유: {s.inactive_reason}
                      </span>
                    )}

                    {s.inactive_at && (
                      <span>
                        종료일{" "}
                        {String(s.inactive_at).slice(0, 10)}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                  }}
                >
                  <button
                    className="mini"
                    disabled={loading}
                    onClick={() => {
                      if (
                        !confirm(
                          `${s.student_name} 학생을 다시 현재 수강생으로 복구할까요?`,
                        )
                      ) {
                        return;
                      }

                      action({
                        action: "reactivateStudent",
                        studentId: s.student_id,
                      });
                    }}
                  >
                    재등록 · 수강 중으로 복구
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {tab === "missing" && (
        <WeeklyAttendanceManagement
          students={displayStudents}
          attendance={d.attendance}
          weekStart={weeklyStart}
          setWeekStart={setWeeklyStart}
          onAddAttendance={addAttendance}
          setStudentSearch={setStudentSearch}
          setTab={setTab}
        />
      )}

      {tab === "attendance" && (
        <AttendanceList
          attendance={d.attendance}
          students={d.students}
          onDelete={deleteAttendance}

          search={attendanceSearch}
          setSearch={setAttendanceSearch}

          classFilter={attendanceClassFilter}
          setClassFilter={setAttendanceClassFilter}

          statusFilter={attendanceStatusFilter}
          setStatusFilter={setAttendanceStatusFilter}

          periodFilter={attendancePeriodFilter}
          setPeriodFilter={setAttendancePeriodFilter}

          sort={attendanceSort}
          setSort={setAttendanceSort}
        />
      )}

      {tab === "calendar" && (
        <AttendanceCalendar
          students={d.students}
          attendance={d.attendance}
          year={calendarYear}
          month={calendarMonth}
          setYear={setCalendarYear}
          setMonth={setCalendarMonth}
          studentFilter={calendarStudent}
          setStudentFilter={setCalendarStudent}
          selectedDate={selectedCalendarDate}
          setSelectedDate={setSelectedCalendarDate}
          onDelete={deleteAttendance}
          onAddAttendance={addAttendance}
        />
      )}

      {tab === "trial" && (
        <TrialManagement
          trials={d.trials}
          loading={loading}
          action={action}
        />
      )}

      {tab === "revenue" && (
        <RevenueManagement
          students={d.students}
          attendance={d.attendance}
          trials={d.trials}
          mode={revenueMode}
          setMode={setRevenueMode}
          weekStart={revenueWeekStart}
          setWeekStart={setRevenueWeekStart}
          year={revenueYear}
          setYear={setRevenueYear}
          month={revenueMonth}
          setMonth={setRevenueMonth}
        />
      )}

      {tab === "add" && (
        <AddForm
          onSubmit={action}
        />
      )}

      {tab === "content" && (
        <ContentManagement
          contents={d.contents}
          loading={loading}
          action={action}
        />
      )}

      {tab === "athomeMembers" && (
        <AtHomeMemberManagement
          memberships={d.memberships}
          authUsers={d.authUsers}
          loading={loading}
          action={action}
        />
      )}

      {tab === "homePackageMembers" && (
        <HomePackageMemberManagement
          authUsers={d.authUsers}
          contents={d.contents}
          loading={loading}
        />
      )}
    </main>
  );
}
function StudentRow(props) {
  const {
    s,
    passes,
    loading,
    action,

    saveAdminViewState,

    attendanceStudent,
    attendanceDate,
    attendanceTime,
    setAttendanceDate,
    setAttendanceTime,
    openAttendance,
    addAttendance,

    editingStudent,
    openScheduleEditor,
    scheduleForm,
    setScheduleForm,
    saveSchedule,

    pinStudent,
    newPin,
    setNewPin,
    openPinEditor,
    saveParentPin,

    phoneStudent,
    newPhone,
    setNewPhone,
    openPhoneEditor,
    saveParentPhone,

    startDateStudent,
    newStartDate,
    setNewStartDate,
    startDateExpiry,
    setStartDateExpiry,
    setStartDateStudent,
    openStartDateEditor,
    changeStartDateForEditor,
    saveStartDate,

    expiryStudent,
    newExpiry,
    setNewExpiry,
    setExpiryStudent,
    openExpiryEditor,
    saveExpiry,

    paymentStudent,
    paidAmountEdit,
    setPaidAmountEdit,
    setPaymentStudent,
    openPaymentEditor,
    savePaidAmount,

    setCalendarStudent,
    setSelectedCalendarDate,
    setTab,
  } = props;

  const PASS_PRICES = {
    8: 384000,
    12: 547000,
    20: 864000,
  };

  const currentBaseCount = Number(
    s.base_count ||
      ([8, 9, 10].includes(Number(s.total_count))
        ? 8
        : [12, 13, 14].includes(Number(s.total_count))
          ? 12
          : [20, 21, 22].includes(Number(s.total_count))
            ? 20
            : 12),
  );

  const currentBonusCount =
    s.bonus_count != null
      ? Number(s.bonus_count)
      : Math.max(
          Number(s.total_count || 0) - currentBaseCount,
          0,
        );

  const [passPlanOpen, setPassPlanOpen] = useState(false);

  const [passPlan, setPassPlan] = useState({
    baseCount: currentBaseCount,

    bonusCount: currentBonusCount,

    paidAmount: "",
  });

  function openPassPlanEditor() {
    const currentPass = passes.find(
      (p) => p.id === s.pass_id,
    );

    setPassPlan({
      baseCount: currentBaseCount,

      bonusCount: currentBonusCount,

      paidAmount: String(
        currentPass?.paid_amount ??
          PASS_PRICES[currentBaseCount] ??
          "",
      ),
    });

    setPassPlanOpen(!passPlanOpen);
  }

  async function savePassPlan() {
    const totalCount =
      Number(passPlan.baseCount) +
      Number(passPlan.bonusCount);

    const usedCount = Number(s.used_count || 0);

    if (totalCount <= usedCount) {
      alert(
        `이미 ${usedCount}회를 사용했습니다.\n총 이용횟수는 최소 ${usedCount + 1}회 이상이어야 합니다.`,
      );

      return;
    }

    const currentPass = passes.find(
      (p) => p.id === s.pass_id,
    );

    if (!currentPass) {
      alert("현재 수강권을 찾을 수 없습니다.");

      return;
    }

    const baseChanged =
      Number(passPlan.baseCount) !== currentBaseCount;

    const expiryNotice = baseChanged
      ? "\n\n기본 수강권 종류가 변경되어 시작일 기준으로 이용기한도 새 수강권 기간에 맞게 다시 계산됩니다."
      : "\n\n이벤트 추가 횟수만 변경하는 경우 이용기한은 변경되지 않습니다.";

    if (
      !confirm(
        `${s.student_name} 학생의 수강권을 변경할까요?\n\n` +
          `기본 수강권: ${passPlan.baseCount}회\n` +
          `이벤트 추가: +${passPlan.bonusCount}회\n` +
          `총 이용횟수: ${totalCount}회\n` +
          `이미 사용: ${usedCount}회\n` +
          `변경 후 잔여: ${totalCount - usedCount}회\n` +
          `총 납부금액: ${money(passPlan.paidAmount)}` +
          expiryNotice,
      )
    ) {
      return;
    }

    try {
      const r = await fetch("/api/admin/manage", {
        method: "POST",

        headers: {
          "content-type": "application/json",
        },

        body: JSON.stringify({
          action: "updatePassPlan",

          passId: s.pass_id,

          baseCount: Number(passPlan.baseCount),

          bonusCount: Number(passPlan.bonusCount),

          paidAmount: Number(passPlan.paidAmount),
        }),
      });

      const result = await r.json();

      if (!r.ok) {
        alert(
          result.error || "수강권 변경에 실패했습니다.",
        );

        return;
      }

      saveAdminViewState?.();

      location.reload();
    } catch (e) {
      console.error(e);

      alert("수강권 변경 중 오류가 발생했습니다.");
    }
  }

  const pass = passes.find((p) => p.id === s.pass_id);

  const currentPerVisit =
    pass?.paid_amount != null &&
    Number(pass.total_count) > 0
      ? Number(pass.paid_amount) / Number(pass.total_count)
      : null;

  return (
    <div
      style={{
        borderBottom: "1px solid #eee",
        padding: "18px 0",
      }}
    >
      <div className="adminrow">
        <div>
          <b>{s.student_name}</b>

          <span>
            {s.class_name}
            {" · "}
            {scheduleText(s)}
          </span>

          <span>{s.phone_masked}</span>
        </div>

        <div className="right">
          <b>
            {s.total_count}회 중 {s.remaining_count}회 남음
          </b>

          <span>
            시작일 {s.start_date || "시작일 없음"}
          </span>

          {s.has_future_pass && s.future_pass && (
            <span
              style={{
                color: "#a76600",
                fontWeight: 700,
              }}
            >
              ☀️ 재등록 완료 · 새 수강권{" "}
              {s.future_pass.start_date} 시작
            </span>
          )}          

          <span>
            이용기한 {s.expires_at || "기한 없음"}
          </span>

          {isExpiringSoon(s) && (
            <b
              style={{
                color: "#c0392b",
              }}
            >
              ⚠ 이용기한 {expiryWarningText(s)}
            </b>
          )}

          {currentPerVisit !== null && (
            <span>
              현재 수강권 회당 기준 {money(currentPerVisit)}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          className="mini"
          onClick={() => openAttendance(s)}
        >
          + 출석 입력
        </button>

        <button
          className="mini ghost"
          onClick={() => {
            setCalendarStudent(s.student_id);

            setSelectedCalendarDate(null);

            setTab("calendar");
          }}
        >
          출석 달력 보기
        </button>

        <button
          className="mini ghost"
          onClick={() => openScheduleEditor(s)}
        >
          클래스·요일·시간 수정
        </button>

        <button
          className="mini ghost"
          onClick={() => openStartDateEditor(s)}
        >
          시작일 수정
        </button>

        <button
          className="mini ghost"
          onClick={() => openExpiryEditor(s)}
        >
          이용기한 수정
        </button>

        <button
          className="mini ghost"
          onClick={() => openPhoneEditor(s)}
        >
          휴대폰 번호 수정
        </button>

        <button
          className="mini ghost"
          onClick={() => openPinEditor(s)}
        >
          확인번호 수정
        </button>

        <button
          className="mini ghost"
          onClick={openPassPlanEditor}
        >
          수강권 수정
        </button>

        <button
          className="mini ghost"
          disabled={loading}
          onClick={async () => {
            const reason = prompt(
              `${s.student_name} 학생을 수강 종료로 이동할까요?\n\n종료 사유를 입력해주세요.`,
              "재등록 안 함",
            );

            if (reason === null) {
              return;
            }

            if (
              !confirm(
                `${s.student_name} 학생을 현재 학생 현황에서 제외하고\n'수강 종료 학생' 탭으로 이동할까요?\n\n기존 출석·수익 기록은 삭제되지 않습니다.`,
              )
            ) {
              return;
            }

            await action({
              action: "deactivateStudent",
              studentId: s.student_id,
              reason,
            });
          }}
        >
          수강 종료
        </button>        
      </div>

      {attendanceStudent === s.student_id && (
        <EditBox title="출석 입력">
          <label>
            출석일
            <input
              className="normal"
              type="date"
              value={attendanceDate}
              onChange={(e) =>
                setAttendanceDate(e.target.value)
              }
            />
          </label>

          <label>
            출석 시간
            <select
              className="normal"
              value={attendanceTime}
              onChange={(e) =>
                setAttendanceTime(e.target.value)
              }
            >
              <option value="">시간 선택</option>

              <option value="UNKNOWN">시간 모름</option>

              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <ScheduleNotice
            student={s}
            date={attendanceDate}
            time={attendanceTime}
          />

          <button
            disabled={
              loading || !attendanceDate || !attendanceTime
            }
            onClick={() => addAttendance(s)}
          >
            출석 등록
          </button>
        </EditBox>
      )}

      {editingStudent === s.student_id && (
        <EditBox title="클래스·정규 일정 수정">
          <label>
            클래스
            <select
              className="normal"
              value={scheduleForm.className}
              onChange={(e) =>
                setScheduleForm({
                  ...scheduleForm,
                  className: e.target.value,
                })
              }
            >
              {CLASS_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label>
            정규 출석 요일
            <select
              className="normal"
              value={scheduleForm.regularDay}
              onChange={(e) =>
                setScheduleForm({
                  ...scheduleForm,
                  regularDay: e.target.value,
                })
              }
            >
              <option value="">미지정</option>

              {DAY_OPTIONS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>

          <label>
            정규 수업 시간
            <select
              className="normal"
              value={scheduleForm.regularTime}
              onChange={(e) =>
                setScheduleForm({
                  ...scheduleForm,
                  regularTime: e.target.value,
                })
              }
            >
              <option value="">미지정</option>

              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <button
            disabled={loading}
            onClick={() => saveSchedule(s)}
          >
            저장하기
          </button>
        </EditBox>
      )}

      {startDateStudent ===
        `${s.student_id}-${s.pass_id || ""}` && (
        <EditBox title="시작일 · 이용기한 수정">
          <p>
            현재 시작일{" "}
            <b>{s.start_date || "시작일 없음"}</b>
            {" · "}
            현재 이용기한{" "}
            <b>{s.expires_at || "기한 없음"}</b>
          </p>

          <label>
            시작일
            <input
              className="normal"
              type="date"
              value={newStartDate}
              onChange={(e) =>
                changeStartDateForEditor(
                  s,
                  e.target.value,
                )
              }
              style={{
                width: "100%",
                marginTop: 7,
              }}
            />
          </label>

          <label>
            이용기한
            <input
              className="normal"
              type="date"
              min={newStartDate || undefined}
              value={startDateExpiry}
              onChange={(e) =>
                setStartDateExpiry(
                  e.target.value,
                )
              }
              style={{
                width: "100%",
                marginTop: 7,
              }}
            />
          </label>

          <p className="hint">
            시작일을 선택하면 현재 수강권의 기본 이용횟수에 따라
            이용기한이 자동 계산됩니다. 필요하면 계산된 이용기한을
            직접 수정한 뒤 저장할 수 있습니다.
          </p>

          <button
            disabled={
              loading ||
              !newStartDate ||
              !startDateExpiry ||
              (
                newStartDate === s.start_date &&
                startDateExpiry === s.expires_at
              )
            }
            onClick={() => saveStartDate(s)}
          >
            날짜 변경
          </button>

          <button
            className="ghost"
            onClick={() => {
              setStartDateStudent(null);

              setNewStartDate("");

              setStartDateExpiry("");
            }}
          >
            취소
          </button>
        </EditBox>
      )}

      {expiryStudent ===
        `${s.student_id}-${s.pass_id || ""}` && (
        <EditBox title="이용기한 수정">
          <p>
            현재 이용기한{" "}
            <b>{s.expires_at || "기한 없음"}</b>
          </p>

          <input
            className="normal"
            type="date"
            min={s.start_date || undefined}
            value={newExpiry}
            onChange={(e) => setNewExpiry(e.target.value)}
          />

          <button
            disabled={
              loading ||
              !newExpiry ||
              newExpiry === s.expires_at
            }
            onClick={() => saveExpiry(s)}
          >
            이용기한 변경
          </button>

          <button
            className="ghost"
            onClick={() => {
              setExpiryStudent(null);

              setNewExpiry("");
            }}
          >
            취소
          </button>
        </EditBox>
      )}

      {phoneStudent === s.student_id && (
        <EditBox title="학부모 휴대폰 번호 수정">
          <p className="hint">
            현재 등록 번호:{" "}
            <b>{s.phone_masked || "확인 불가"}</b>
          </p>

          <input
            className="normal"
            inputMode="numeric"
            value={newPhone}
            onChange={(e) =>
              setNewPhone(
                e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 11),
              )
            }
            placeholder="01012345678"
          />

          <button
            disabled={loading || newPhone.length < 10}
            onClick={() => saveParentPhone(s)}
          >
            휴대폰 번호 변경
          </button>
        </EditBox>
      )}

      {pinStudent === s.student_id && (
        <EditBox title="학부모 확인번호 수정">
          <input
            className="normal"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength="4"
            style={{ WebkitTextSecurity: "disc" }}
            value={newPin}
            onChange={(e) =>
              setNewPin(
                e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 4),
              )
            }
            placeholder="••••"
          />

          <button
            disabled={loading || newPin.length !== 4}
            onClick={() => saveParentPin(s)}
          >
            확인번호 변경
          </button>
        </EditBox>
      )}
      {passPlanOpen && (
        <EditBox title="수강권 수정">
          <label>
            기본 수강권
            <select
              className="normal"
              value={passPlan.baseCount}
              onChange={(e) => {
                const baseCount = Number(e.target.value);

                setPassPlan({
                  ...passPlan,

                  baseCount,

                  /*
                   * 수강권 종류 변경 시
                   * 기본 가격 자동 입력
                   *
                   * 필요하면 아래 총 납부금액에서
                   * 관리자가 다시 수정 가능
                   */
                  paidAmount: String(
                    PASS_PRICES[baseCount],
                  ),
                });
              }}
            >
              <option value={8}>8회 · 384,000원</option>

              <option value={12}>12회 · 547,000원</option>

              <option value={20}>20회 · 864,000원</option>
            </select>
          </label>

          <label>
            이벤트 추가 횟수
            <select
              className="normal"
              value={passPlan.bonusCount}
              onChange={(e) =>
                setPassPlan({
                  ...passPlan,

                  bonusCount: Number(e.target.value),
                })
              }
            >
              <option value={0}>추가 없음</option>

              <option value={1}>+1회</option>

              <option value={2}>+2회</option>

              <option value={3}>+3회</option>
            </select>
          </label>

          <label>
            총 이용횟수
            <input
              className="normal"
              readOnly
              value={`${
                Number(passPlan.baseCount) +
                Number(passPlan.bonusCount)
              }회`}
            />
          </label>

          <label>
            이미 사용한 횟수
            <input
              className="normal"
              readOnly
              value={`${Number(s.used_count || 0)}회`}
            />
          </label>

          <label>
            변경 후 잔여 횟수
            <input
              className="normal"
              readOnly
              value={`${Math.max(
                Number(passPlan.baseCount) +
                  Number(passPlan.bonusCount) -
                  Number(s.used_count || 0),
                0,
              )}회`}
            />
          </label>

          <label>
            총 납부금액
            <input
              className="normal"
              type="number"
              min="0"
              step="100"
              value={passPlan.paidAmount}
              onChange={(e) =>
                setPassPlan({
                  ...passPlan,

                  paidAmount: e.target.value,
                })
              }
            />
          </label>

          <p className="hint">
            기본 수강권을 선택하면 8회 384,000원 · 12회
            547,000원 · 20회 864,000원이 자동 입력됩니다.
            특별 할인 등 필요한 경우 총 납부금액은 직접
            수정할 수 있습니다.
          </p>

          <p className="hint">
            이벤트 +1회 또는 +2회는 총 이용횟수만 증가하며
            이용기한은 늘어나지 않습니다.
          </p>

          <p className="hint">
            기본 수강권 종류 자체를 변경하면 시작일 기준으로
            이용기한이 새 수강권 기간 (8회 10주 · 12회 15주
            · 20회 25주)에 맞춰 다시 계산됩니다.
          </p>

          <button
            onClick={savePassPlan}
            disabled={passPlan.paidAmount === ""}
          >
            변경 저장
          </button>

          <button
            className="ghost"
            onClick={() => setPassPlanOpen(false)}
          >
            취소
          </button>
        </EditBox>
      )}
    </div>
  );
}

function EditBox({ title, children }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: 16,
        borderRadius: 14,
        background: "#f7f7f7",
      }}
    >
      <h3
        style={{
          marginTop: 0,
        }}
      >
        {title}
      </h3>

      <div className="formgrid">{children}</div>
    </div>
  );
}

function ScheduleNotice({ student, date, time }) {
  if (time === "UNKNOWN") {
    return (
      <p className="hint">
        출석 시간은 '시간 모름'으로 기록됩니다.
      </p>
    );
  }

  if (!student?.regular_day) {
    return (
      <p className="hint">
        정규 일정이 등록되어 있지 않습니다.
      </p>
    );
  }

  const sameDay = dayOfDate(date) === student.regular_day;

  const rt = formatRegularTime(student.regular_time);

  const sameTime = !rt || !time || rt === time;

  if (sameDay && sameTime) {
    return (
      <p
        className="hint"
        style={{
          color: "#2e7d32",
          fontWeight: 700,
        }}
      >
        ✓ 정규 일정과 일치합니다. ({student.regular_day}
        {rt ? ` ${rt}` : ""})
      </p>
    );
  }

  return (
    <p
      className="hint"
      style={{
        color: "#a76600",
      }}
    >
      ※ 정규 일정은 {student.regular_day}
      {rt ? ` ${rt}` : ""}
      입니다. 보강 또는 변경 출석으로 등록할 수 있습니다.
    </p>
  );
}

function Renewal({
  students,
  filter,
  setFilter,
  setStudentSearch,
  setTab,
}) {
  const PASS_PRICES = {
    8: 384000,
    12: 547000,
    20: 864000,
  };

  const WEEKS_MAP = {
    8: 10,
    12: 15,
    20: 25,
  };

  const [forms, setForms] = useState({});
  const [openStudentId, setOpenStudentId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [message, setMessage] = useState("");

  function initialForm() {
    return {
      baseCount: 12,
      bonusCount: 0,
      paidAmount: String(PASS_PRICES[12]),
      startDate: todayKST(),
    };
  }

  function getForm(s) {
    return forms[s.student_id] || initialForm();
  }

  function change(studentId, patch) {
    setForms((prev) => ({
      ...prev,

      [studentId]: {
        ...(prev[studentId] || initialForm()),
        ...patch,
      },
    }));
  }

  function openRenewal(s) {
    if (openStudentId === s.student_id) {
      setOpenStudentId(null);
      return;
    }

    setForms((prev) => ({
      ...prev,

      [s.student_id]:
        prev[s.student_id] || initialForm(),
    }));

    setOpenStudentId(s.student_id);
    setMessage("");
  }

  async function submitRenewal(s) {
    const f = getForm(s);

    const baseCount = Number(f.baseCount);
    const bonusCount = Number(f.bonusCount);

    const totalCount =
      baseCount + bonusCount;

    const paidAmount =
      Number(f.paidAmount || 0);

    const expiresAt =
      calculateExpiry(
        f.startDate,
        baseCount,
      );

    if (!f.startDate) {
      setMessage("시작일을 선택해주세요.");
      return;
    }

    if (
      !Number.isFinite(paidAmount) ||
      paidAmount < 0
    ) {
      setMessage("총 납부금액을 확인해주세요.");
      return;
    }

    if (!expiresAt) {
      setMessage("이용기한을 계산할 수 없습니다.");
      return;
    }

    const perVisit =
      totalCount > 0
        ? paidAmount / totalCount
        : 0;

    if (
      !confirm(
        `${s.student_name} 학생을 재등록할까요?\n\n` +
          `기본 수강권: ${baseCount}회\n` +
          `이벤트 추가: +${bonusCount}회\n` +
          `총 이용횟수: ${totalCount}회\n` +
          `총 납부금액: ${money(paidAmount)}\n` +
          `회당 수익: ${money(perVisit)}\n` +
          `시작일: ${f.startDate}\n` +
          `이용기한: ${expiresAt}`,
      )
    ) {
      return;
    }

    setLoadingId(s.student_id);
    setMessage("");

    try {
      const r = await fetch(
        "/api/admin/manage",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json",
          },

          body: JSON.stringify({
            action: "renewEnrollment",

            studentId: s.student_id,

            baseCount,
            bonusCount,
            totalCount,
            paidAmount,

            startDate: f.startDate,
            expiresAt,
          }),
        },
      );

      const result = await r.json();

      if (!r.ok) {
        throw new Error(
          result.error ||
            "재등록에 실패했습니다.",
        );
      }

      setMessage(
        `${s.student_name} 학생의 재등록이 완료되었습니다.`,
      );

      setOpenStudentId(null);

      setTimeout(() => {
        location.reload();
      }, 600);
    } catch (e) {
      console.error(e);

      setMessage(
        e.message ||
          "재등록 중 오류가 발생했습니다.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  const filtered = students.filter((s) => {
    if (filter === "0") {
      return Number(s.remaining_count) === 0;
    }

    if (filter === "1") {
      return Number(s.remaining_count) === 1;
    }

    if (filter === "2") {
      return Number(s.remaining_count) === 2;
    }

    if (filter === "expiry") {
      return isExpiringSoon(s);
    }

    return true;
  });

  return (
    <section className="panel">
      <h2>재등록 관리</h2>

      <p className="hint">
        재등록할 학생을 선택하면 기존 학생 정보는 그대로
        유지하고 새로운 수강권만 등록할 수 있습니다.
      </p>

      {message && (
        <p
          className="hint"
          style={{
            fontWeight: 700,
          }}
        >
          {message}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <button
          className={
            filter === "all"
              ? "mini"
              : "mini ghost"
          }
          onClick={() => setFilter("all")}
        >
          전체
        </button>

        <button
          className={
            filter === "0"
              ? "mini"
              : "mini ghost"
          }
          onClick={() => setFilter("0")}
        >
          0회 남음
        </button>

        <button
          className={
            filter === "1"
              ? "mini"
              : "mini ghost"
          }
          onClick={() => setFilter("1")}
        >
          1회 남음
        </button>

        <button
          className={
            filter === "2"
              ? "mini"
              : "mini ghost"
          }
          onClick={() => setFilter("2")}
        >
          2회 남음
        </button>

        <button
          className={
            filter === "expiry"
              ? "mini"
              : "mini ghost"
          }
          onClick={() => setFilter("expiry")}
        >
          이용기한 7일 이내
        </button>
      </div>

      {filtered.length === 0 && (
        <p className="hint">
          재등록 대상 학생이 없습니다.
        </p>
      )}

      {filtered.map((s) => {
        const f = getForm(s);

        const totalCount =
          Number(f.baseCount) +
          Number(f.bonusCount);

        const paidAmount =
          Number(f.paidAmount || 0);

        const perVisit =
          totalCount > 0
            ? paidAmount / totalCount
            : 0;

        const expiresAt =
          calculateExpiry(
            f.startDate,
            f.baseCount,
          );

        const opened =
          openStudentId === s.student_id;

        return (
          <div
            key={`${s.student_id}-${s.pass_id || ""}`}
            style={{
              padding: 18,
              marginBottom: 16,
              border: "1px solid #eee",
              borderRadius: 16,
            }}
          >
            <div className="adminrow">
              <div>
                <b>{s.student_name}</b>

                <span>
                  {s.class_name}
                  {" · "}
                  {scheduleText(s)}
                </span>

                <span>
                  {s.phone_masked || ""}
                </span>
              </div>

              <div className="right">
                <b>
                  {s.remaining_count}회 남음
                </b>

                <span>
                  이용기한{" "}
                  {s.expires_at || "-"}
                </span>

                {isExpiringSoon(s) && (
                  <b
                    style={{
                      color: "#c0392b",
                    }}
                  >
                    ⚠ {expiryWarningText(s)}
                  </b>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 14,
                flexWrap: "wrap",
              }}
            >
              <button
                className="mini"
                type="button"
                onClick={() =>
                  openRenewal(s)
                }
              >
                {opened
                  ? "재등록 화면 닫기"
                  : "재등록하기"}
              </button>

              <button
                className="mini ghost"
                type="button"
                onClick={() => {
                  setStudentSearch(
                    s.student_name,
                  );

                  setTab("students");
                }}
              >
                학생 관리
              </button>
            </div>

            {opened && (
              <div
                style={{
                  marginTop: 18,
                  padding: 18,
                  borderRadius: 16,
                  background: "#fff8ed",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                  }}
                >
                  ☀️ {s.student_name} 재등록
                </h3>

                <p className="hint">
                  아래 학생 정보는 기존 정보를 그대로
                  사용합니다.
                </p>

                <div className="formgrid">

                  <label>
                    학부모 휴대폰 번호
                    <input
                      className="normal"
                      readOnly
                      value={
                        s.phone_masked ||
                        "등록된 번호"
                      }
                    />
                  </label>

                  <label>
                    학생 이름
                    <input
                      className="normal"
                      readOnly
                      value={
                        s.student_name || ""
                      }
                    />
                  </label>

                  <label>
                    클래스
                    <input
                      className="normal"
                      readOnly
                      value={
                        s.class_name || ""
                      }
                    />
                  </label>

                  <label>
                    정규 출석 요일
                    <input
                      className="normal"
                      readOnly
                      value={
                        s.regular_day ||
                        "미지정"
                      }
                    />
                  </label>

                  <label>
                    정규 수업 시간
                    <input
                      className="normal"
                      readOnly
                      value={
                        formatRegularTime(
                          s.regular_time,
                        ) || "미지정"
                      }
                    />
                  </label>

                  <label>
                    기본 수강권
                    <select
                      className="normal"
                      value={f.baseCount}
                      onChange={(e) => {
                        const baseCount =
                          Number(
                            e.target.value,
                          );

                        change(
                          s.student_id,
                          {
                            baseCount,

                            paidAmount:
                              String(
                                PASS_PRICES[
                                  baseCount
                                ],
                              ),
                          },
                        );
                      }}
                    >
                      <option value={8}>
                        8회 · 384,000원 · 10주
                      </option>

                      <option value={12}>
                        12회 · 547,000원 · 15주
                      </option>

                      <option value={20}>
                        20회 · 864,000원 · 25주
                      </option>
                    </select>
                  </label>

                  <label>
                    이벤트 추가 횟수
                    <select
                      className="normal"
                      value={f.bonusCount}
                      onChange={(e) =>
                        change(
                          s.student_id,
                          {
                            bonusCount:
                              Number(
                                e.target.value,
                              ),
                          },
                        )
                      }
                    >
                      <option value={0}>
                        추가 없음
                      </option>

                      <option value={1}>
                        +1회
                      </option>

                      <option value={2}>
                        +2회
                      </option>

                      <option value={3}>
                        +3회
                      </option>
                    </select>
                  </label>

                  <label>
                    총 이용 횟수
                    <input
                      className="normal"
                      readOnly
                      value={`${totalCount}회`}
                    />
                  </label>

                  <label>
                    총 납부금액 · 자동입력
                    <input
                      className="normal"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="100"
                      value={f.paidAmount}
                      onChange={(e) =>
                        change(
                          s.student_id,
                          {
                            paidAmount:
                              e.target.value,
                          },
                        )
                      }
                    />
                  </label>

                  <label>
                    회당 수익 · 자동계산
                    <input
                      className="normal"
                      readOnly
                      value={
                        f.paidAmount !== ""
                          ? money(perVisit)
                          : ""
                      }
                    />
                  </label>

                  <label>
                    시작일
                    <input
                      className="normal"
                      type="date"
                      value={f.startDate}
                      onChange={(e) =>
                        change(
                          s.student_id,
                          {
                            startDate:
                              e.target.value,
                          },
                        )
                      }
                    />
                  </label>

                  <label>
                    이용기한 · 자동계산
                    <input
                      className="normal"
                      type="date"
                      readOnly
                      value={expiresAt}
                    />
                  </label>
                </div>

                {f.startDate &&
                  expiresAt && (
                    <div
                      style={{
                        marginTop: 18,
                        padding: 18,
                        borderRadius: 14,
                        background: "#fff",
                        lineHeight: 1.8,
                      }}
                    >
                      <b>
                        ☀️ 재등록 내용
                      </b>

                      <p>
                        기본{" "}
                        {f.baseCount}회
                        {" + "}
                        이벤트{" "}
                        {f.bonusCount}회
                        <br />

                        총 이용횟수{" "}
                        <b>
                          {totalCount}회
                        </b>
                        <br />

                        총 납부금액{" "}
                        <b>
                          {money(
                            paidAmount,
                          )}
                        </b>
                        <br />

                        회당 수익{" "}
                        <b>
                          {money(
                            perVisit,
                          )}
                        </b>
                        <br />

                        이용기간{" "}
                        <b>
                          {f.startDate}
                          {" ~ "}
                          {expiresAt}
                        </b>

                        <br />

                        <span className="hint">
                          이용기한은 이벤트
                          추가 횟수와 관계없이
                          기본{" "}
                          {f.baseCount}회
                          기준{" "}
                          {
                            WEEKS_MAP[
                              f.baseCount
                            ]
                          }
                          주입니다.
                        </span>
                      </p>
                    </div>
                  )}

                <button
                  style={{
                    marginTop: 16,
                  }}
                  disabled={
                    loadingId ===
                      s.student_id ||
                    !f.startDate ||
                    f.paidAmount === ""
                  }
                  onClick={() =>
                    submitRenewal(s)
                  }
                >
                  {loadingId ===
                  s.student_id
                    ? "재등록 처리 중..."
                    : "재등록 완료"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function AttendanceList({
  attendance,
  students,
  onDelete,

  search,
  setSearch,

  classFilter,
  setClassFilter,

  statusFilter,
  setStatusFilter,

  periodFilter,
  setPeriodFilter,

  sort,
  setSort,
}) {
  const today = todayKST();

  /*
   * 출석 기록에 실제 존재하는 클래스만
   * 필터 목록에 표시
   */
  const attendanceClasses = Array.from(
    new Set(
      attendance
        .map((a) => a.class_name)
        .filter(Boolean),
    ),
  ).sort();


  const filteredAttendance = attendance
    .filter((a) => {
      const student = students.find(
        (s) =>
          s.student_id ===
          a.student_id,
      );

      const studentName =
        student?.student_name ||
        "";

      const attendedDate =
        dateKey(a.attended_at);

      const q =
        search
          .trim()
          .toLowerCase();


      /*
       * 1. 텍스트 검색
       *
       * 학생 이름
       * 클래스
       * 날짜
       */
      const matchesSearch =
        !q ||
        [
          studentName,
          a.class_name,
          attendedDate,
        ].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(q),
        );

      if (!matchesSearch) {
        return false;
      }


      /*
       * 2. 클래스
       */
      if (
        classFilter !== "all" &&
        a.class_name !==
          classFilter
      ) {
        return false;
      }


      /*
       * 3. 상태
       */
      if (
        statusFilter ===
          "present" &&
        a.status !== "present"
      ) {
        return false;
      }

      if (
        statusFilter ===
          "cancelled" &&
        a.status === "present"
      ) {
        return false;
      }


      /*
       * 4. 기간
       */
      if (
        periodFilter !== "all"
      ) {
        const todayDate =
          parseDate(today);

        const attendanceDate =
          parseDate(attendedDate);

        if (
          !todayDate ||
          !attendanceDate
        ) {
          return false;
        }

        const diffDays =
          Math.floor(
            (
              todayDate -
              attendanceDate
            ) /
              86400000,
          );

        if (
          periodFilter ===
            "today" &&
          diffDays !== 0
        ) {
          return false;
        }

        if (
          periodFilter === "7" &&
          (
            diffDays < 0 ||
            diffDays > 6
          )
        ) {
          return false;
        }

        if (
          periodFilter === "30" &&
          (
            diffDays < 0 ||
            diffDays > 29
          )
        ) {
          return false;
        }
      }

      return true;
    })

    /*
     * 5. 정렬
     */
    .sort((a, b) => {
      if (sort === "newest") {
        return (
          new Date(b.attended_at) -
          new Date(a.attended_at)
        );
      }

      if (sort === "oldest") {
        return (
          new Date(a.attended_at) -
          new Date(b.attended_at)
        );
      }

      if (sort === "name") {
        const studentA =
          students.find(
            (s) =>
              s.student_id ===
              a.student_id,
          );

        const studentB =
          students.find(
            (s) =>
              s.student_id ===
              b.student_id,
          );

        return String(
          studentA?.student_name ||
            "",
        ).localeCompare(
          String(
            studentB?.student_name ||
              "",
          ),
          "ko",
        );
      }

      if (sort === "class") {
        return String(
          a.class_name || "",
        ).localeCompare(
          String(
            b.class_name || "",
          ),
        );
      }
      return 0;
    });


  return (
    <section className="panel">
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2>출석 기록</h2>

        <span className="hint">
          {filteredAttendance.length}건 표시
        </span>
      </div>


      {/* 텍스트 검색 */}
      <input
        className="normal"
        type="search"
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
        placeholder="학생 이름, 클래스, 날짜 검색"
        style={{
          width: "100%",
          marginBottom: 12,
        }}
      />


      {/* 필터 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        {/* 클래스 */}
        <select
          className="normal"
          value={classFilter}
          onChange={(e) =>
            setClassFilter(
              e.target.value,
            )
          }
        >
          <option value="all">
            클래스 전체
          </option>

          {attendanceClasses.map(
            (className) => (
              <option
                key={className}
                value={className}
              >
                {className}
              </option>
            ),
          )}
        </select>


        {/* 상태 */}
        <select
          className="normal"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value,
            )
          }
        >
          <option value="all">
            상태 전체
          </option>

          <option value="present">
            정상 출석
          </option>

          <option value="cancelled">
            취소됨
          </option>
        </select>


        {/* 기간 */}
        <select
          className="normal"
          value={periodFilter}
          onChange={(e) =>
            setPeriodFilter(
              e.target.value,
            )
          }
        >
          <option value="all">
            기간 전체
          </option>

          <option value="today">
            오늘
          </option>

          <option value="7">
            최근 7일
          </option>

          <option value="30">
            최근 30일
          </option>
        </select>


        {/* 정렬 */}
        <select
          className="normal"
          value={sort}
          onChange={(e) =>
            setSort(e.target.value)
          }
        >
          <option value="newest">
            최신 출석순
          </option>

          <option value="oldest">
            오래된 출석순
          </option>

          <option value="name">
            학생 이름순
          </option>

          <option value="class">
            클래스순
          </option>
        </select>


        {/* 초기화 */}
        <button
          type="button"
          className="mini ghost"
          onClick={() => {
            setSearch("");
            setClassFilter("all");
            setStatusFilter("all");
            setPeriodFilter("all");
            setSort("newest");
          }}
        >
          필터 초기화
        </button>
      </div>


      {attendance.length === 0 ? (
        <p className="hint">
          아직 출석 기록이 없습니다.
        </p>
      ) : filteredAttendance.length ===
        0 ? (
        <p className="hint">
          조건에 맞는 출석 기록이 없습니다.
        </p>
      ) : (
        filteredAttendance.map(
          (a) => {
            const s =
              students.find(
                (x) =>
                  x.student_id ===
                  a.student_id,
              );

            return (
              <div
                className="adminrow"
                key={a.id}
              >
                <div>
                  <b>
                    {s?.student_name ||
                      "학생"}
                  </b>

                  <span>
                    {dateKey(
                      a.attended_at,
                    )}
                    {" · "}
                    {attendanceTimeText(
                      a,
                    )}
                    {" · "}
                    {a.class_name}
                  </span>

                  {a.status ===
                    "present" && (
                    <span>
                      확정 수익:{" "}
                      {a.revenue_amount ==
                      null
                        ? "미설정"
                        : money(
                            a.revenue_amount,
                          )}
                    </span>
                  )}
                </div>

                {a.status ===
                "present" ? (
                  <button
                    className="mini danger"
                    onClick={() =>
                      onDelete(a)
                    }
                  >
                    취소·1회 복구
                  </button>
                ) : (
                  <em>취소됨</em>
                )}
              </div>
            );
          },
        )
      )}
    </section>
  );
}

function getMissingCountForWeek({
  students,
  attendance,
  weekDays,
}) {
  const now = new Date();

  let count = 0;

  const unique = students;

  weekDays.forEach((day) => {
    unique
      .filter(
        (s) =>
          s.regular_day === day.dayName &&
          s.regular_time &&
          isStudentPassActiveOnDate(s, day.date),
      )
      .forEach((s) => {
        const attended = attendance.some(
          (a) =>
            a.student_id === s.student_id &&
            a.status === "present" &&
            dateKey(a.attended_at) === day.date,
        );

        if (attended) {
          return;
        }

        const at = getScheduledDateTime(
          day.date,
          formatRegularTime(s.regular_time),
        );

        if (at && at < now) {
          count++;
        }
      });
  });

  return count;
}

function WeeklyAttendanceManagement({
  students,
  attendance,
  weekStart,
  setWeekStart,
  onAddAttendance,
  setStudentSearch,
  setTab,
}) {
  const monday = parseDate(weekStart);

  const weekDays = Array.from(
    {
      length: 7,
    },
    (_, i) => {
      const x = addDays(monday, i);

      return {
        date: formatDate(x),

        dayName: DAY_MAP[x.getDay()],
      };
    },
  );

  const weekEnd = weekDays[6].date;

  const today = todayKST();

  const now = new Date();

  const unique = students;

  const days = weekDays.map((day) => {
    const scheduled = unique
      .filter(
        (s) =>
          s.regular_day === day.dayName &&
          s.regular_time &&
          isStudentPassActiveOnDate(s, day.date),
      )
      .sort((a, b) =>
        formatRegularTime(a.regular_time).localeCompare(
          formatRegularTime(b.regular_time),
        ),
      );

    const rows = scheduled.map((s) => {
      const a = attendance.find(
        (x) =>
          x.student_id === s.student_id &&
          x.status === "present" &&
          dateKey(x.attended_at) === day.date,
      );

      if (a) {
        return {
          student: s,
          status: "attended",
          attendance: a,
        };
      }

      const at = getScheduledDateTime(
        day.date,
        formatRegularTime(s.regular_time),
      );

      return {
        student: s,

        status: at && at < now ? "missing" : "scheduled",
      };
    });

    return {
      ...day,
      rows,
    };
  });

  const attended = days.reduce(
    (n, d) =>
      n +
      d.rows.filter((x) => x.status === "attended").length,
    0,
  );

  const missing = days.reduce(
    (n, d) =>
      n +
      d.rows.filter((x) => x.status === "missing").length,
    0,
  );

  const scheduled = days.reduce(
    (n, d) =>
      n +
      d.rows.filter((x) => x.status === "scheduled").length,
    0,
  );

  return (
    <section className="panel">
      <h2>미출석 관리</h2>

      <p className="hint">
        월요일부터 일요일까지 정규 일정과 실제 출석을
        비교합니다.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <b>✓ 출석 {attended}</b>

        <b>⚠ 미출석 {missing}</b>

        <b>예정 {scheduled}</b>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <button
          className="mini ghost"
          onClick={() =>
            setWeekStart(formatDate(addDays(monday, -7)))
          }
        >
          ‹ 이전 주
        </button>

        <strong>
          {formatShortDate(weekStart)}
          {" ~ "}
          {formatShortDate(weekEnd)}
        </strong>

        <button
          className="mini ghost"
          onClick={() =>
            setWeekStart(formatDate(addDays(monday, 7)))
          }
        >
          다음 주 ›
        </button>

        <button
          className="mini"
          onClick={() =>
            setWeekStart(
              formatDate(getMonday(parseDate(todayKST()))),
            )
          }
        >
          이번 주
        </button>
      </div>

      {days.map((day) => (
        <div
          key={day.date}
          style={{
            marginBottom: 18,

            border:
              day.date === today
                ? "2px solid #efc06c"
                : "1px solid #eee",

            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",

              background:
                day.date === today ? "#fff8e8" : "#fafafa",

              display: "flex",

              justifyContent: "space-between",
            }}
          >
            <b>{day.dayName}</b>

            <span>
              {formatShortDate(day.date)}

              {day.date === today ? " · 오늘" : ""}
            </span>
          </div>

          {day.rows.length === 0 && (
            <div
              style={{
                padding: 16,
              }}
            >
              <span className="hint">
                등록된 정규 학생이 없습니다.
              </span>
            </div>
          )}

          {day.rows.map(
            ({ student, status, attendance: a }) => (
              <div
                className="adminrow"
                key={`${day.date}-${student.student_id}`}
                style={{
                  padding: "14px 16px",

                  borderTop: "1px solid #eee",
                }}
              >
                <div>
                  <b>
                    {formatRegularTime(
                      student.regular_time,
                    )}
                    {" · "}
                    {student.student_name}
                  </b>

                  <span>{student.class_name}</span>
                </div>

                <div className="right">
                  {status === "attended" && (
                    <>
                      <b
                        style={{
                          color: "#2e7d32",
                        }}
                      >
                        ✓ 출석
                      </b>

                      <span>{attendanceTimeText(a)}</span>
                    </>
                  )}

                  {status === "missing" && (
                    <>
                      <b
                        style={{
                          color: "#c0392b",
                        }}
                      >
                        ⚠ 미출석
                      </b>

                      <button
                        className="mini"
                        onClick={() =>
                          onAddAttendance(
                            student,
                            day.date,
                            formatRegularTime(
                              student.regular_time,
                            ),
                          )
                        }
                      >
                        출석 입력
                      </button>

                      <button
                        className="mini ghost"
                        onClick={() =>
                          onAddAttendance(
                            student,
                            day.date,
                            "UNKNOWN",
                          )
                        }
                      >
                        시간 모름
                      </button>
                    </>
                  )}

                  {status === "scheduled" && (
                    <b
                      style={{
                        color: "#777",
                      }}
                    >
                      예정
                    </b>
                  )}

                  <button
                    className="mini ghost"
                    onClick={() => {
                      setStudentSearch(
                        student.student_name,
                      );

                      setTab("students");
                    }}
                  >
                    학생 정보
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      ))}
    </section>
  );
}

function AttendanceCalendar({
  students,
  attendance,
  year,
  month,
  setYear,
  setMonth,
  studentFilter,
  setStudentFilter,
  selectedDate,
  setSelectedDate,
  onDelete,
  onAddAttendance,
}) {
  const [addStudentId, setAddStudentId] = useState("");

  const [addAttendanceTime, setAddAttendanceTime] =
    useState("");

  const unique = uniqueStudentList(students);

  const selectedStudent = unique.find(
    (s) => s.student_id === addStudentId,
  );

  const firstDay = new Date(year, month - 1, 1).getDay();

  const daysInMonth = new Date(year, month, 0).getDate();

  const present = attendance.filter(
    (a) =>
      a.status === "present" &&
      (studentFilter === "all" ||
        a.student_id === studentFilter),
  );

  const cells = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push(
      <div
        key={`blank-${i}`}
        style={{
          minHeight: 100,
        }}
      />,
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const rows = present.filter(
      (a) => dateKey(a.attended_at) === key,
    );

    cells.push(
      <button
        key={key}
        type="button"
        onClick={() => setSelectedDate(key)}
        style={{
          minHeight: 100,
          padding: 8,
          borderRadius: 12,

          border:
            selectedDate === key
              ? "2px solid #efb55f"
              : "1px solid #eee",

          background: rows.length ? "#fff8e8" : "#fff",

          textAlign: "left",
        }}
      >
        <b>{day}</b>

        {rows.slice(0, 3).map((a) => {
          const s = students.find(
            (x) => x.student_id === a.student_id,
          );

          return (
            <div
              key={a.id}
              style={{
                fontSize: 11,
                marginTop: 5,
              }}
            >
              ● {s?.student_name || "학생"}
            </div>
          );
        })}

        {rows.length > 3 && (
          <div
            style={{
              fontSize: 10,
              marginTop: 4,
              color: "#777",
            }}
          >
            +{rows.length - 3}명
          </div>
        )}
      </button>,
    );
  }

  const selectedRows = selectedDate
    ? present.filter(
        (a) => dateKey(a.attended_at) === selectedDate,
      )
    : [];

  function prev() {
    if (month === 1) {
      setYear(year - 1);

      setMonth(12);
    } else {
      setMonth(month - 1);
    }

    setSelectedDate(null);
  }

  function next() {
    if (month === 12) {
      setYear(year + 1);

      setMonth(1);
    } else {
      setMonth(month + 1);
    }

    setSelectedDate(null);
  }

  return (
    <section className="panel">
      <h2>출석 달력</h2>

      <select
        className="normal"
        value={studentFilter}
        onChange={(e) => {
          setStudentFilter(e.target.value);

          setSelectedDate(null);
        }}
      >
        <option value="all">전체 학생</option>

        {unique.map((s) => (
          <option key={s.student_id} value={s.student_id}>
            {s.student_name}
            {" · "}
            {scheduleText(s)}
          </option>
        ))}
      </select>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
          margin: "20px 0",
        }}
      >
        <button className="mini ghost" onClick={prev}>
          ‹
        </button>

        <strong>
          {year}년 {month}월
        </strong>

        <button className="mini ghost" onClick={next}>
          ›
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          textAlign: "center",
          fontWeight: 700,
          fontSize: 13,
          marginBottom: 6,
        }}
      >
        {["일", "월", "화", "수", "목", "금", "토"].map(
          (x) => (
            <div key={x}>{x}</div>
          ),
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,minmax(0,1fr))",
          gap: 6,
        }}
      >
        {cells}
      </div>

      {selectedDate && (
        <div
          style={{
            marginTop: 24,
            padding: 18,
            borderRadius: 16,
            background: "#faf8f5",
          }}
        >
          <h3>{selectedDate} 출석</h3>

          <div className="formgrid">
            <label>
              학생
              <select
                className="normal"
                value={addStudentId}
                onChange={(e) => {
                  const id = e.target.value;

                  setAddStudentId(id);

                  const s = unique.find(
                    (x) => x.student_id === id,
                  );

                  setAddAttendanceTime(
                    formatRegularTime(s?.regular_time) ||
                      "",
                  );
                }}
              >
                <option value="">출석할 학생 선택</option>

                {unique.map((s) => (
                  <option
                    key={s.student_id}
                    value={s.student_id}
                  >
                    {s.student_name}
                    {" · "}
                    {scheduleText(s)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              출석 시간
              <select
                className="normal"
                value={addAttendanceTime}
                onChange={(e) =>
                  setAddAttendanceTime(e.target.value)
                }
              >
                <option value="">시간 선택</option>

                <option value="UNKNOWN">시간 모름</option>

                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedStudent && (
            <ScheduleNotice
              student={selectedStudent}
              date={selectedDate}
              time={addAttendanceTime}
            />
          )}

          <button
            disabled={
              !selectedStudent || !addAttendanceTime
            }
            onClick={() =>
              onAddAttendance(
                selectedStudent,
                selectedDate,
                addAttendanceTime,
              )
            }
          >
            + 이 날짜로 출석 등록
          </button>

          <div
            style={{
              marginTop: 20,
            }}
          >
            {selectedRows.length === 0 && (
              <p className="hint">
                이 날짜의 출석 기록이 없습니다.
              </p>
            )}

            {selectedRows.map((a) => {
              const s = students.find(
                (x) => x.student_id === a.student_id,
              );

              return (
                <div className="adminrow" key={a.id}>
                  <div>
                    <b>{s?.student_name || "학생"}</b>

                    <span>
                      {a.class_name}
                      {" · "}
                      {attendanceTimeText(a)}
                    </span>
                  </div>

                  <button
                    className="mini danger"
                    onClick={() => onDelete(a)}
                  >
                    취소·1회 복구
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function TrialManagement({ trials, loading, action }) {
  const [form, setForm] = useState({
    studentName: "",
    phone: "",
    className: "Sunshine Toddler",
    trialDate: todayKST(),
    trialTime: "",
    paidAmount: "43000",
  });

  const [search, setSearch] = useState("");

  const filtered = trials.filter((t) => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return true;
    }

    return [
      t.student_name,
      t.phone,
      t.class_name,
      t.trial_date,
    ].some((v) =>
      String(v || "")
        .toLowerCase()
        .includes(q),
    );
  });

  async function submit() {
    if (!form.studentName.trim()) {
      alert("학생 이름을 입력해주세요.");

      return;
    }

    if (!form.trialDate) {
      alert("체험 날짜를 선택해주세요.");

      return;
    }

    if (form.paidAmount === "") {
      alert("체험 수업료를 입력해주세요.");

      return;
    }

    await action({
      action: "addTrial",

      studentName: form.studentName,

      phone: form.phone,

      className: form.className,

      trialDate: form.trialDate,

      trialTime: form.trialTime,

      paidAmount: Number(form.paidAmount),
    });
  }

  return (
    <section className="panel">
      <h2>체험수업</h2>

      <p className="hint">
        체험수업은 정규 수강권과 별도로 관리됩니다. 잔여
        횟수와 이용기한에는 영향을 주지 않고, 체험 완료
        수업료는 수익 관리에 자동 합산됩니다.
      </p>

      <div
        style={{
          padding: 18,
          borderRadius: 16,
          background: "#fff8ed",
          marginBottom: 26,
        }}
      >
        <h3
          style={{
            marginTop: 0,
          }}
        >
          체험수업 등록
        </h3>

        <div className="formgrid">
          <label>
            학생 이름
            <input
              className="normal"
              value={form.studentName}
              onChange={(e) =>
                setForm({
                  ...form,
                  studentName: e.target.value,
                })
              }
              placeholder="학생 이름"
            />
          </label>

          <label>
            학부모 휴대폰 번호
            <input
              className="normal"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) =>
                setForm({
                  ...form,

                  phone: e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 11),
                })
              }
              placeholder="선택 입력"
            />
          </label>

          <label>
            체험 클래스
            <select
              className="normal"
              value={form.className}
              onChange={(e) =>
                setForm({
                  ...form,
                  className: e.target.value,
                })
              }
            >
              {CLASS_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label>
            체험 날짜
            <input
              className="normal"
              type="date"
              value={form.trialDate}
              onChange={(e) =>
                setForm({
                  ...form,
                  trialDate: e.target.value,
                })
              }
            />
          </label>

          <label>
            체험 시간
            <select
              className="normal"
              value={form.trialTime}
              onChange={(e) =>
                setForm({
                  ...form,
                  trialTime: e.target.value,
                })
              }
            >
              <option value="">시간 미지정</option>

              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label>
            체험 수업료
            <input
              className="normal"
              type="number"
              min="0"
              step="100"
              inputMode="numeric"
              value={form.paidAmount}
              onChange={(e) =>
                setForm({
                  ...form,
                  paidAmount: e.target.value,
                })
              }
              placeholder="예: 43000"
            />
          </label>
        </div>

        <button
          disabled={
            loading ||
            !form.studentName.trim() ||
            !form.trialDate ||
            form.paidAmount === ""
          }
          onClick={submit}
        >
          체험수업 등록
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <h3
          style={{
            margin: 0,
          }}
        >
          체험수업 기록
        </h3>

        <span className="hint">{filtered.length}건</span>
      </div>

      <input
        className="normal"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="학생 이름, 휴대폰, 클래스, 날짜 검색"
        style={{
          width: "100%",
          marginBottom: 18,
        }}
      />

      {filtered.length === 0 && (
        <p className="hint">등록된 체험수업이 없습니다.</p>
      )}

      {filtered.map((t) => (
        <div className="adminrow" key={t.id}>
          <div>
            <b>{t.student_name}</b>

            <span>
              {t.trial_date}
              {" · "}
              {t.trial_time
                ? formatRegularTime(t.trial_time)
                : "시간 미지정"}
              {" · "}
              {t.class_name}
            </span>

            {t.phone && <span>{t.phone}</span>}
          </div>

          <div className="right">
            <b>{money(t.paid_amount)}</b>

            {t.status === "attended" ? (
              <button
                className="mini danger"
                disabled={loading}
                onClick={() =>
                  confirm(
                    `${t.student_name} 체험수업을 취소할까요?\n\n취소하면 수익 합계에서도 제외됩니다.`,
                  ) &&
                  action({
                    action: "cancelTrial",

                    id: t.id,
                  })
                }
              >
                체험 취소
              </button>
            ) : (
              <em>취소됨</em>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

function RevenueManagement({
  students,
  attendance,
  trials,
  mode,
  setMode,
  weekStart,
  setWeekStart,
  year,
  setYear,
  month,
  setMonth,
}) {
  const weekStartDate = parseDate(weekStart);

  const weekEnd = formatDate(addDays(weekStartDate, 6));

  const weeklyAttendance = attendance.filter(
    (a) =>
      a.status === "present" &&
      dateKey(a.attended_at) >= weekStart &&
      dateKey(a.attended_at) <= weekEnd,
  );

  const weeklyTrials = trials.filter(
    (t) =>
      t.status === "attended" &&
      t.trial_date >= weekStart &&
      t.trial_date <= weekEnd,
  );

  const weeklyRegularRevenue = weeklyAttendance.reduce(
    (sum, a) => sum + revenueForAttendance(a),
    0,
  );

  const weeklyTrialRevenue = weeklyTrials.reduce(
    (sum, t) => sum + Number(t.paid_amount || 0),
    0,
  );

  const weeklyRevenue =
    weeklyRegularRevenue + weeklyTrialRevenue;

  const weekDays = Array.from(
    {
      length: 7,
    },
    (_, i) => {
      const d = addDays(weekStartDate, i);

      const key = formatDate(d);

      const regularRows = weeklyAttendance.filter(
        (a) => dateKey(a.attended_at) === key,
      );

      const trialRows = weeklyTrials.filter(
        (t) => t.trial_date === key,
      );

      return {
        key,

        label: DAY_MAP[d.getDay()],

        regularCount: regularRows.length,

        trialCount: trialRows.length,

        regularRevenue: regularRows.reduce(
          (sum, a) => sum + revenueForAttendance(a),
          0,
        ),

        trialRevenue: trialRows.reduce(
          (sum, t) => sum + Number(t.paid_amount || 0),
          0,
        ),
      };
    },
  );

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  const monthlyAttendance = attendance.filter(
    (a) =>
      a.status === "present" &&
      dateKey(a.attended_at).slice(0, 7) === monthKey,
  );

  const monthlyTrials = trials.filter(
    (t) =>
      t.status === "attended" &&
      t.trial_date.slice(0, 7) === monthKey,
  );

  const monthlyRegularRevenue = monthlyAttendance.reduce(
    (sum, a) => sum + revenueForAttendance(a),
    0,
  );

  const monthlyTrialRevenue = monthlyTrials.reduce(
    (sum, t) => sum + Number(t.paid_amount || 0),
    0,
  );

  const monthlyRevenue =
    monthlyRegularRevenue + monthlyTrialRevenue;

  const detailAttendance =
    mode === "week" ? weeklyAttendance : monthlyAttendance;

  const detailTrials =
    mode === "week" ? weeklyTrials : monthlyTrials;

  const missingRevenueCount = detailAttendance.filter(
    (a) =>
      a.revenue_amount === null ||
      a.revenue_amount === undefined,
  ).length;

  function studentName(id) {
    return (
      students.find((s) => s.student_id === id)
        ?.student_name || "학생"
    );
  }

  function previousMonth() {
    if (month === 1) {
      setYear(year - 1);

      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setYear(year + 1);

      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  }

  function currentMonth() {
    const d = parseDate(todayKST());

    setYear(d.getFullYear());

    setMonth(d.getMonth() + 1);
  }

  const detailRows = [
    ...detailAttendance.map((a) => ({
      key: `regular-${a.id}`,

      date: dateKey(a.attended_at),

      type: "정규",

      name: studentName(a.student_id),

      className: a.class_name,

      amount:
        a.revenue_amount == null
          ? null
          : Number(a.revenue_amount),
    })),

    ...detailTrials.map((t) => ({
      key: `trial-${t.id}`,

      date: t.trial_date,

      type: "체험",

      name: t.student_name,

      className: t.class_name,

      amount: Number(t.paid_amount || 0),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="panel">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2>수익 관리</h2>

          <p className="hint">
            정규수업은 출석 당시 확정된 회당 수익,
            체험수업은 실제 입력한 체험 수업료를 합산합니다.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <button
            className={
              mode === "week" ? "mini" : "mini ghost"
            }
            onClick={() => setMode("week")}
          >
            주간 보기
          </button>

          <button
            className={
              mode === "month" ? "mini" : "mini ghost"
            }
            onClick={() => setMode("month")}
          >
            월간 보기
          </button>
        </div>
      </div>

      {mode === "week" && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              margin: "20px 0",
            }}
          >
            <button
              className="mini ghost"
              onClick={() =>
                setWeekStart(
                  formatDate(addDays(weekStartDate, -7)),
                )
              }
            >
              ‹ 지난주
            </button>

            <strong>
              {formatShortDate(weekStart)}
              {" ~ "}
              {formatShortDate(weekEnd)}
            </strong>

            <button
              className="mini ghost"
              onClick={() =>
                setWeekStart(
                  formatDate(addDays(weekStartDate, 7)),
                )
              }
            >
              다음주 ›
            </button>

            <button
              className="mini"
              onClick={() =>
                setWeekStart(
                  formatDate(
                    getMonday(parseDate(todayKST())),
                  ),
                )
              }
            >
              이번주
            </button>
          </div>

          <RevenueSummary
            title="주간 수익"
            total={weeklyRevenue}
            regular={weeklyRegularRevenue}
            trial={weeklyTrialRevenue}
            regularCount={weeklyAttendance.length}
            trialCount={weeklyTrials.length}
          />

          <h3>일별 수익</h3>

          {weekDays.map((x) => (
            <div className="adminrow" key={x.key}>
              <div>
                <b>{x.label}</b>

                <span>
                  {formatShortDate(x.key)}
                  {" · "}
                  정규 {x.regularCount}건{" · "}
                  체험 {x.trialCount}건
                </span>
              </div>

              <div className="right">
                <b>
                  {money(x.regularRevenue + x.trialRevenue)}
                </b>

                <span>
                  정규 {money(x.regularRevenue)}
                  {" · "}
                  체험 {money(x.trialRevenue)}
                </span>
              </div>
            </div>
          ))}
        </>
      )}

      {mode === "month" && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              margin: "20px 0",
            }}
          >
            <button
              className="mini ghost"
              onClick={previousMonth}
            >
              ‹ 지난달
            </button>

            <strong>
              {year}년 {month}월
            </strong>

            <button
              className="mini ghost"
              onClick={nextMonth}
            >
              다음달 ›
            </button>

            <button className="mini" onClick={currentMonth}>
              이번달
            </button>
          </div>

          <RevenueSummary
            title="월간 수익"
            total={monthlyRevenue}
            regular={monthlyRegularRevenue}
            trial={monthlyTrialRevenue}
            regularCount={monthlyAttendance.length}
            trialCount={monthlyTrials.length}
          />
        </>
      )}

      {missingRevenueCount > 0 && (
        <div
          style={{
            padding: 14,
            marginBottom: 20,
            borderRadius: 12,
            background: "#fff4e5",
          }}
        >
          <b>
            ⚠ 수익 미설정 과거 정규 출석{" "}
            {missingRevenueCount}건
          </b>

          <p
            className="hint"
            style={{
              marginBottom: 0,
            }}
          >
            이 기록은 당시 실제 회당 금액이 없어 현재
            합계에는 0원으로 처리됩니다. 현재 가격을 과거
            출석에 자동 소급 적용하지 않습니다.
          </p>
        </div>
      )}

      <h3
        style={{
          marginTop: 28,
        }}
      >
        상세 수익 내역
      </h3>

      {detailRows.length === 0 && (
        <p className="hint">
          이 기간의 수익 기록이 없습니다.
        </p>
      )}

      {detailRows.map((row) => (
        <div className="adminrow" key={row.key}>
          <div>
            <b>{row.name}</b>

            <span>
              {row.date}
              {" · "}
              {row.className}
              {" · "}
              {row.type}
            </span>
          </div>

          <div className="right">
            <b>
              {row.amount === null
                ? "수익 미설정"
                : money(row.amount)}
            </b>
          </div>
        </div>
      ))}
    </section>
  );
}

function RevenueSummary({
  title,
  total,
  regular,
  trial,
  regularCount,
  trialCount,
}) {
  return (
    <div
      style={{
        padding: 22,
        borderRadius: 16,
        background: "#fff8ed",
        marginBottom: 24,
      }}
    >
      <span>{title}</span>

      <br />

      <b
        style={{
          fontSize: 30,
        }}
      >
        {money(total)}
      </b>

      <p
        style={{
          marginBottom: 4,
        }}
      >
        정규수업 {money(regular)}
        {" · "}
        체험수업 {money(trial)}
      </p>

      <p
        className="hint"
        style={{
          marginBottom: 0,
        }}
      >
        정규 출석 {regularCount}건{" · "}
        체험 {trialCount}건
      </p>
    </div>
  );
}

function AddForm({ onSubmit }) {
  const PASS_PRICES = {
    8: 384000,
    12: 547000,
    20: 864000,
  };

  const [f, setF] = useState({
    phone: "",
    studentName: "",
    className: "Sunshine Toddler",
    regularDay: "",
    regularTime: "",
    baseCount: 12,
    bonusCount: 0,
    paidAmount: "",
    startDate: "",
  });

  const weeksMap = {
    8: 10,
    12: 15,
    20: 25,
  };

  const totalCount =
    Number(f.baseCount) + Number(f.bonusCount);

  const paidAmount = Number(f.paidAmount || 0);

  const perVisit = totalCount ? paidAmount / totalCount : 0;

  const expiresAt = calculateExpiry(
    f.startDate,
    f.baseCount,
  );

  return (
    <section className="panel">
      <h2>학생·수강권 등록</h2>

      <p className="hint">
        신규 학부모는 등록 후 학부모 화면에서 최초 1회
        확인번호 4자리를 직접 설정합니다.
      </p>

      <div className="formgrid">
        <label>
          학부모 휴대폰 번호
          <input
            className="normal"
            inputMode="numeric"
            value={f.phone}
            onChange={(e) =>
              setF({
                ...f,

                phone: e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 11),
              })
            }
            placeholder="01012345678"
          />
        </label>

        <label>
          학생 이름
          <input
            className="normal"
            value={f.studentName}
            onChange={(e) =>
              setF({
                ...f,

                studentName: e.target.value,
              })
            }
          />
        </label>

        <label>
          클래스
          <select
            className="normal"
            value={f.className}
            onChange={(e) =>
              setF({
                ...f,

                className: e.target.value,
              })
            }
          >
            {CLASS_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label>
          정규 출석 요일
          <select
            className="normal"
            value={f.regularDay}
            onChange={(e) =>
              setF({
                ...f,

                regularDay: e.target.value,
              })
            }
          >
            <option value="">미지정</option>

            {DAY_OPTIONS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>

        <label>
          정규 수업 시간
          <select
            className="normal"
            value={f.regularTime}
            onChange={(e) =>
              setF({
                ...f,

                regularTime: e.target.value,
              })
            }
          >
            <option value="">미지정</option>

            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label>
          기본 수강권
          <select
            className="normal"
            value={f.baseCount}
            onChange={(e) => {
              const baseCount = Number(e.target.value);

              setF({
                ...f,

                baseCount,

                // 수강권을 바꾸면
                // 해당 가격으로 자동 변경
                paidAmount: String(PASS_PRICES[baseCount]),
              });
            }}
          >
            <option value={8}>
              8회 · 384,000원 · 10주
            </option>

            <option value={12}>
              12회 · 547,000원 · 15주
            </option>

            <option value={20}>
              20회 · 864,000원 · 25주
            </option>
          </select>
        </label>

        <label>
          이벤트 추가 횟수
          <select
            className="normal"
            value={f.bonusCount}
            onChange={(e) =>
              setF({
                ...f,

                bonusCount: Number(e.target.value),
              })
            }
          >
            <option value={0}>추가 없음</option>

            <option value={1}>+1회</option>

            <option value={2}>+2회</option>

            <option value={3}>+3회</option>
          </select>
        </label>

        <label>
          총 이용 횟수
          <input
            className="normal"
            readOnly
            value={`${totalCount}회`}
          />
        </label>

        <label>
          총 납부금액
          <input
            className="normal"
            type="number"
            inputMode="numeric"
            min="0"
            step="100"
            value={f.paidAmount}
            onChange={(e) =>
              setF({
                ...f,

                // 자동 입력된 금액을
                // 관리자가 필요하면 직접 수정 가능
                paidAmount: e.target.value,
              })
            }
            placeholder="총 납부금액"
          />
        </label>

        <label>
          회당 수익 · 자동계산
          <input
            className="normal"
            readOnly
            value={
              f.paidAmount !== "" ? money(perVisit) : ""
            }
          />
        </label>

        <label>
          시작일
          <input
            className="normal"
            type="date"
            value={f.startDate}
            onChange={(e) =>
              setF({
                ...f,

                startDate: e.target.value,
              })
            }
          />
        </label>

        <label>
          이용기한 · 자동계산
          <input
            className="normal"
            type="date"
            readOnly
            value={expiresAt}
          />
        </label>
      </div>

      {f.startDate && expiresAt && (
        <div
          style={{
            margin: "18px 0",

            padding: 18,

            borderRadius: 14,

            background: "#fff8ed",

            lineHeight: 1.8,
          }}
        >
          <b>☀️ 등록 내용</b>

          <p>
            기본 {f.baseCount}회{" + "}
            이벤트 {f.bonusCount}회
            <br />총 이용횟수 <b>{totalCount}회</b>
            <br />총 납부금액 <b>{money(paidAmount)}</b>
            <br />
            회당 수익 <b>{money(perVisit)}</b>
            <br />
            이용기간{" "}
            <b>
              {f.startDate}
              {" ~ "}
              {expiresAt}
            </b>
            <br />
            <span className="hint">
              이용기한은 이벤트 추가 횟수와 관계없이 기본{" "}
              {f.baseCount}회 기준 {weeksMap[f.baseCount]}
              주입니다.
            </span>
          </p>
        </div>
      )}

      <button
        disabled={
          f.phone.length < 10 ||
          !f.studentName ||
          !f.startDate ||
          f.paidAmount === ""
        }
        onClick={() =>
          onSubmit({
            action: "addEnrollment",

            phone: f.phone,

            studentName: f.studentName,

            className: f.className,

            regularDay: f.regularDay,

            regularTime: f.regularTime,

            baseCount: Number(f.baseCount),

            bonusCount: Number(f.bonusCount),

            totalCount,

            paidAmount: Number(f.paidAmount),

            startDate: f.startDate,
          })
        }
      >
        등록하기
      </button>

      <p className="hint">
        출석이 등록되는 순간의 회당 수익이 출석 기록에 확정
        저장됩니다. 이후 수강권 금액을 수정해도 이미 발생한
        과거 수익은 변경되지 않습니다.
      </p>
    </section>
  );
}

/*
 * =====================================================
 * 콘텐츠 관리
 * =====================================================
 */

function ContentManagement({ contents, loading, action }) {
  const EMPTY_FORM = {
    id: "",
    slug: "",
    title: "",
    subtitle: "",
    program: "Sunshine Toddler",
    category: "",
    emoji: "☀️",
    audioPath: "",
    lyricsPath: "",
    printablePath: "",

    lyricsText: "",
    activitiesText: "",

    releaseDate: todayKST(),
    isPopular: false,
    isUpcoming: false,
    isPublished: false,
  };

  const [form, setForm] = useState(EMPTY_FORM);

  const [editingId, setEditingId] = useState(null);

  const [formOpen, setFormOpen] = useState(false);

  /*
   * 콘텐츠 등록/수정 폼 위치
   */
  const formRef = useRef(null);

  /*
   * 등록/수정 폼으로 이동
   */
  function scrollToForm() {
    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",

        block: "start",
      });
    }, 100);
  }

  const [audioFiles, setAudioFiles] = useState([]);

  const [lyricsFiles, setLyricsFiles] = useState([]);

  const [printableFiles, setPrintableFiles] = useState([]);

  const [storageLoading, setStorageLoading] =
    useState(false);

  const [linkedResources, setLinkedResources] =
    useState(null);

  const [resourceLinkLoading, setResourceLinkLoading] =
    useState(false);

  const [resourceLinkError, setResourceLinkError] =
    useState("");

  async function detectLinkedResources(program, audioPath) {
    if (
      !["Sunshine Toddler", "Melody Book Club"].includes(program) ||
      !audioPath
    ) {
      setLinkedResources(null);
      setResourceLinkError("");
      return;
    }

    setResourceLinkLoading(true);
    setResourceLinkError("");

    try {
      const response = await fetch("/api/admin/manage", {
        method: "POST",

        headers: {
          "content-type": "application/json",
        },

        body: JSON.stringify({
          action: "detectContentResources",
          program,
          audioPath,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "연결 자료를 확인하지 못했습니다.",
        );
      }

      setLinkedResources(result);

      /*
       * 기존 Song Club과의 호환을 위해
       * 첫 번째 가사지/활동지 파일은 기존 단일 path 컬럼에도
       * 자동으로 넣어둡니다.
       * 여러 파일 전체 목록은 Storage 폴더를 기준으로 감지합니다.
       */
      setForm((current) => {
        if (
          current.program !== program ||
          current.audioPath !== audioPath
        ) {
          return current;
        }

        return {
          ...current,
          lyricsPath:
            result.lyrics?.files?.[0]?.path || "",
          printablePath:
            result.printables?.files?.[0]?.path || "",
        };
      });
    } catch (e) {
      console.error(e);

      setLinkedResources(null);
      setResourceLinkError(
        e instanceof Error
          ? e.message
          : "연결 자료를 확인하지 못했습니다.",
      );
    } finally {
      setResourceLinkLoading(false);
    }
  }

  useEffect(() => {
    if (
      ["Sunshine Toddler", "Melody Book Club"].includes(form.program) &&
      form.audioPath
    ) {
      detectLinkedResources(
        form.program,
        form.audioPath,
      );
    } else {
      setLinkedResources(null);
      setResourceLinkError("");
    }
  }, [form.program, form.audioPath]);

  async function loadStorageFiles(program) {
    if (!program) {
      return;
    }

    setStorageLoading(true);

    try {
      const response = await fetch("/api/admin/manage", {
        method: "POST",

        headers: {
          "content-type": "application/json",
        },

        body: JSON.stringify({
          action: "listContentFiles",

          program,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(
          result.error ||
            "Storage 파일을 불러오지 못했습니다.",
        );

        return;
      }

      setAudioFiles(result.audio || []);

      setLyricsFiles(result.lyrics || []);

      setPrintableFiles(result.printables || []);
    } catch (e) {
      console.error(e);

      alert(
        "Storage 파일을 불러오는 중 오류가 발생했습니다.",
      );
    } finally {
      setStorageLoading(false);
    }
  }

  function updateField(key, value) {
    setForm({
      ...form,
      [key]: value,
    });
  }

  function resetForm() {
    setForm(EMPTY_FORM);

    setEditingId(null);

    setFormOpen(false);

    setLinkedResources(null);
    setResourceLinkError("");
  }

  function openNew() {
    const defaultProgram = "Sunshine Toddler";

    setForm({
      ...EMPTY_FORM,

      program: defaultProgram,

      releaseDate: todayKST(),
    });

    setEditingId(null);

    setFormOpen(true);

    loadStorageFiles(defaultProgram);

    scrollToForm();
  }

  function openEdit(content) {
    setForm({
      id: content.id,

      slug: content.slug || "",

      title: content.title || "",

      subtitle: content.subtitle || "",

      program: content.program || "Sunshine Toddler",

      category: content.category || "",

      emoji: content.emoji || "☀️",

      audioPath: content.audio_path || "",

      lyricsPath: content.lyrics_path || "",

      printablePath: content.printable_path || "",

      lyricsText: Array.isArray(content.lyrics)
        ? content.lyrics.join("\n")
        : "",

      activitiesText: Array.isArray(content.activities)
        ? content.activities
            .map(
              (item) =>
                `${item.title} | ${item.description}`,
            )
            .join("\n")
        : "",

      releaseDate: content.release_date || todayKST(),

      isPopular: Boolean(content.is_popular),

      isUpcoming: Boolean(content.is_upcoming),

      isPublished: Boolean(content.is_published),
    });

    setEditingId(content.id);

    setFormOpen(true);

    loadStorageFiles(content.program || "Sunshine Toddler");

    scrollToForm();
  }

  async function saveContent() {
    if (
      !form.slug.trim() ||
      !form.title.trim() ||
      !form.program.trim() ||
      !form.audioPath.trim()
    ) {
      alert(
        "슬러그, 곡 제목, 프로그램, 음원 Storage 경로를 확인해주세요.",
      );

      return;
    }

    const lyrics = form.lyricsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const activities = form.activitiesText
      .split("\n")
      .map((line) => {
        const [title, ...rest] = line.split("|");

        const description = rest.join("|").trim();

        if (!title?.trim()) {
          return null;
        }

        return {
          title: title.trim(),

          description,
        };
      })
      .filter(Boolean);

    const actionName = editingId
      ? "updateContent"
      : "addContent";

    const ok = await action({
      action: actionName,

      id: editingId,

      slug: form.slug.trim(),

      title: form.title.trim(),

      subtitle: form.subtitle.trim(),

      program: form.program,

      category: form.category.trim(),

      emoji: form.emoji.trim(),

      audioPath: form.audioPath.trim(),

      lyricsPath: form.lyricsPath.trim(),

      printablePath: form.printablePath.trim(),

      lyrics,

      activities,

      releaseDate: form.releaseDate,

      isPopular: form.isPopular,

      isUpcoming: form.isUpcoming,

      /*
       * 단일 Song Club 멤버십으로 통합.
       * 기존 DB/API 호환을 위해 premiumOnly는 항상 false로 저장.
       */
      premiumOnly: false,

      isPublished: form.isPublished,
    });

    if (ok) {
      resetForm();
    }
  }

  async function deleteContent(content) {
    if (
      !confirm(
        `${content.title} 콘텐츠를 삭제할까요?\n\nSupabase Storage의 실제 MP3/가사지 파일은 삭제되지 않습니다.`,
      )
    ) {
      return;
    }

    await action({
      action: "deleteContent",

      id: content.id,
    });
  }

  async function toggleUpcoming(content) {
    const nextValue =
      !Boolean(content.is_upcoming);

    const label = nextValue
      ? "COMING UP NEXT에 표시"
      : "COMING UP NEXT에서 해제";

    if (
      !confirm(
        `${content.title} 곡을 ${label}할까요?`,
      )
    ) {
      return;
    }

    await action({
      action: "setContentUpcoming",

      id: content.id,

      isUpcoming: nextValue,
    });
  }

  return (
    <section className="panel">
      <div
        style={{
          display: "flex",

          justifyContent: "space-between",

          alignItems: "center",

          gap: 12,

          flexWrap: "wrap",

          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              marginBottom: 6,
            }}
          >
            콘텐츠 관리
          </h2>

          <p
            className="hint"
            style={{
              margin: 0,
            }}
          >
            Dear Sunshine Song Club에서 사용할 음원과 가사지
            정보를 관리합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={openNew}
          disabled={loading}
        >
          + 새 콘텐츠 등록
        </button>
      </div>

      {formOpen && (
        <div ref={formRef} className="admin-content-form">
          <EditBox
            title={
              editingId ? "콘텐츠 수정" : "새 콘텐츠 등록"
            }
          >
            <label>
              프로그램
              <select
                className="normal"
                value={form.program}
                onChange={(e) => {
                  const program = e.target.value;

                  setForm({
                    ...form,

                    program,

                    audioPath: "",

                    lyricsPath: "",

                    printablePath: "",
                  });

                  loadStorageFiles(program);
                }}
              >
                <option value="Sunshine Toddler">
                  Sunshine Toddler
                </option>

                <option value="Melody Book Club">
                  Melody Book Club
                </option>
              </select>
            </label>

            <label>
              곡 제목
              <input
                className="normal"
                value={form.title}
                onChange={(e) =>
                  updateField("title", e.target.value)
                }
                placeholder="Excavator Song"
              />
            </label>

            <label>
              Slug
              <input
                className="normal"
                value={form.slug}
                onChange={(e) =>
                  updateField("slug", e.target.value)
                }
                placeholder="toddler-excavator-song"
              />
            </label>

            <label>
              설명
              <input
                className="normal"
                value={form.subtitle}
                onChange={(e) =>
                  updateField("subtitle", e.target.value)
                }
                placeholder="굴착기의 움직임을 노래와 함께 표현해요."
              />
            </label>

            <label>
              카테고리
              <input
                className="normal"
                value={form.category}
                onChange={(e) =>
                  updateField("category", e.target.value)
                }
                placeholder="탈것"
              />
            </label>

            <label>
              이모지
              <input
                className="normal"
                value={form.emoji}
                onChange={(e) =>
                  updateField("emoji", e.target.value)
                }
                placeholder="🚜"
              />
            </label>

            <label>
              음원 파일
              <select
                className="normal"
                value={form.audioPath}
                onChange={(e) =>
                  updateField("audioPath", e.target.value)
                }
                disabled={storageLoading}
              >
                <option value="">
                  {storageLoading
                    ? "파일 불러오는 중..."
                    : "음원 선택"}
                </option>

                {audioFiles.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.name}
                  </option>
                ))}
              </select>
            </label>

            {["Sunshine Toddler", "Melody Book Club"].includes(form.program) ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  border: "1px solid #eadfd6",
                  borderRadius: 14,
                  padding: 16,
                  background: "#fffaf6",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <b>🔗 {form.program} 자료 자동 연결</b>

                  <button
                    type="button"
                    className="mini ghost"
                    disabled={
                      resourceLinkLoading ||
                      !form.audioPath
                    }
                    onClick={() =>
                      detectLinkedResources(
                        form.program,
                        form.audioPath,
                      )
                    }
                  >
                    다시 확인
                  </button>
                </div>

                <p
                  className="hint"
                  style={{ margin: "8px 0 12px" }}
                >
                  선택한 음원 제목과 같은 이름의 Storage 폴더를
                  찾아 가사지, 활동지, 놀이 아이디어를 자동으로
                  연결합니다.
                </p>

                {resourceLinkLoading && (
                  <p className="hint">
                    폴더 안 자료 확인 중...
                  </p>
                )}

                {resourceLinkError && (
                  <p
                    style={{
                      margin: "8px 0",
                      color: "#b42318",
                    }}
                  >
                    ⚠️ {resourceLinkError}
                  </p>
                )}

                {linkedResources && (
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div>
                      <b>🎵 음원 ✓</b>
                      <div className="hint">
                        {linkedResources.audio?.name ||
                          form.audioPath.split("/").pop()}
                      </div>
                    </div>

                    {[
                      [
                        "📝",
                        "가사지",
                        linkedResources.lyrics,
                      ],
                      [
                        "🎨",
                        "활동지",
                        linkedResources.printables,
                      ],
                      [
                        "💡",
                        "놀이 아이디어",
                        linkedResources.playIdeas,
                      ],
                    ].map(([icon, label, group]) => {
                      const files = group?.files || [];

                      return (
                        <div key={label}>
                          <b>
                            {icon} {label} {files.length > 0
                              ? `✓ ${files.length}개 자동 연결`
                              : "— 자료 없음"}
                          </b>

                          <div className="hint">
                            폴더: {group?.folderPath || "-"}
                          </div>

                          {files.map((file) => (
                            <div
                              key={`${file.bucket}-${file.path}`}
                              className="hint"
                              style={{ paddingLeft: 8 }}
                            >
                              • {file.name}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <label>
                가사지 파일
                <select
                  className="normal"
                  value={form.lyricsPath}
                  onChange={(e) =>
                    updateField("lyricsPath", e.target.value)
                  }
                  disabled={storageLoading}
                >
                  <option value="">
                    {storageLoading
                      ? "파일 불러오는 중..."
                      : "가사지 선택"}
                  </option>

                  {lyricsFiles.map((file) => (
                    <option key={file.path} value={file.path}>
                      {file.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              텍스트 가사
              <textarea
                className="normal"
                value={form.lyricsText}
                onChange={(e) =>
                  updateField("lyricsText", e.target.value)
                }
                placeholder={`한 줄에 가사 한 줄씩 입력해주세요.

예)
How is the weather today?
Is it sunny?
Is it rainy?`}
                rows={8}
                style={{
                  width: "100%",

                  resize: "vertical",
                }}
              />
            </label>

            <label>
              활동 가이드
              <textarea
                className="normal"
                value={form.activitiesText}
                onChange={(e) =>
                  updateField(
                    "activitiesText",
                    e.target.value,
                  )
                }
                placeholder={`한 줄에 활동 하나씩 입력해주세요.
제목 | 설명 형식입니다.

예)
창밖 날씨 찾아보기 | 창밖을 보고 sunny, rainy, cloudy 중 오늘 날씨를 말해보세요.
날씨 카드 고르기 | 노래에서 들리는 날씨 카드를 찾아보세요.`}
                rows={8}
                style={{
                  width: "100%",

                  resize: "vertical",
                }}
              />
            </label>

            {!['Sunshine Toddler', 'Melody Book Club'].includes(form.program) && (
              <label>
                활동지 파일
                <select
                  className="normal"
                  value={form.printablePath}
                  onChange={(e) =>
                    updateField(
                      "printablePath",
                      e.target.value,
                    )
                  }
                  disabled={storageLoading}
                >
                  <option value="">
                    {storageLoading
                      ? "파일 불러오는 중..."
                      : "활동지 선택"}
                  </option>

                  {printableFiles.map((file) => (
                    <option key={file.path} value={file.path}>
                      {file.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              공개일
              <input
                className="normal"
                type="date"
                value={form.releaseDate}
                onChange={(e) =>
                  updateField("releaseDate", e.target.value)
                }
              />
            </label>

            <label
              style={{
                display: "flex",

                alignItems: "center",

                gap: 8,
              }}
            >
              <input
                type="checkbox"
                checked={form.isPopular}
                onChange={(e) =>
                  updateField("isPopular", e.target.checked)
                }
              />
              인기곡
            </label>

            <label
              style={{
                display: "flex",

                alignItems: "center",

                gap: 8,
              }}
            >
              <input
                type="checkbox"
                checked={form.isUpcoming}
                onChange={(e) =>
                  updateField(
                    "isUpcoming",
                    e.target.checked,
                  )
                }
              />
              COMING UP NEXT에 표시
            </label>

            <p
              className="hint"
              style={{
                marginTop: -4,
                marginBottom: 12,
              }}
            >
              다음 달 공개 예정곡으로 직접 지정합니다.
              공개일도 다음 달 날짜로 설정해주세요.
            </p>

            <label
              style={{
                display: "flex",

                alignItems: "center",

                gap: 8,
              }}
            >
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) =>
                  updateField(
                    "isPublished",
                    e.target.checked,
                  )
                }
              />
              앱에 공개
            </label>

            <button
              type="button"
              disabled={loading || resourceLinkLoading}
              onClick={saveContent}
            >
              {editingId ? "수정 저장" : "콘텐츠 등록"}
            </button>

            <button
              type="button"
              className="ghost"
              onClick={resetForm}
            >
              취소
            </button>
          </EditBox>
        </div>
      )}

      {contents.length === 0 && (
        <p className="hint">
          아직 등록된 콘텐츠가 없습니다.
        </p>
      )}

      {contents.map((content) => (
        <div
          key={content.id}
          style={{
            padding: "18px 0",

            borderBottom: "1px solid #eee",
          }}
        >
          <div className="adminrow">
            <div>
              <b>
                {content.emoji || "🎵"} {content.title}
              </b>

              <span>
                {content.program || "프로그램 미지정"}
                {content.category
                  ? ` · ${content.category}`
                  : ""}
              </span>

              <span>
                공개일 {content.release_date || "-"}
              </span>

              <span>
                음원:{" "}
                {content.audio_path ? "✓ 등록" : "미등록"}
                {" · "}
                가사지:{" "}
                {content.lyrics_path ? "✓ 등록" : "미등록"}
              </span>
            </div>

            <div className="right">
              <b>
                {content.is_published
                  ? "🟢 공개"
                  : "⚪ 비공개"}
              </b>

              {content.is_popular && <span>⭐ 인기곡</span>}

              {content.is_upcoming && (
                <span>⏭️ COMING UP NEXT</span>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",

              gap: 8,

              flexWrap: "wrap",

              marginTop: 12,
            }}
          >
            <button
              type="button"
              className="mini ghost"
              onClick={() => openEdit(content)}
            >
              수정
            </button>

            <button
              type="button"
              className={
                content.is_upcoming
                  ? "mini"
                  : "mini ghost"
              }
              onClick={() => toggleUpcoming(content)}
              disabled={loading}
            >
              {content.is_upcoming
                ? "✅ 다음 달 예고 해제"
                : "＋ 다음 달 예고 지정"}
            </button>

            <button
              type="button"
              className="mini danger"
              onClick={() => deleteContent(content)}
            >
              삭제
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

/*
 * =====================================================
 * Song Club 회원 관리
 * =====================================================
 */

function AtHomeMemberManagement({
  memberships,
  authUsers,
  loading,
  action,
}) {
  /*
   * =====================================================
   * Dear Sunshine Song Club 운영 방식
   * =====================================================
   *
   * - 앱 내부 결제 없음
   * - 센터에서 직접 결제 확인
   * - 원장이 관리자 페이지에서 이용권 활성화
   * - 1개월 / 3개월 / 6개월 / 12개월
   * - 자동결제 없음
   *
   * DB의 plan 컬럼은 기존 API 호환을 위해 basic을 사용합니다.
   */
  const LEGACY_SINGLE_PLAN = "basic";

  const MEMBERSHIP_OPTIONS = [
    {
      months: 1,
      label: "1개월",
      price: 12900,
    },
    {
      months: 3,
      label: "3개월",
      price: 38000,
    },
    {
      months: 6,
      label: "6개월",
      price: 73500,
    },
    {
      months: 12,
      label: "12개월",
      price: 139000,
    },
  ];

  /*
   * 회원 한 명당 Song Club 음원 클래스는 1개만 선택합니다.
   * 선택된 값은 ds_user_program_access에 저장됩니다.
   */
  const PROGRAM_OPTIONS = [
    "Sunshine Toddler",
    "Melody Book Club",
  ];

  const [programEditing, setProgramEditing] =
    useState(null);

  const [programForm, setProgramForm] =
    useState([]);

  const [programLoading, setProgramLoading] =
    useState(false);

  const [editing, setEditing] =
    useState(null);

  const [form, setForm] =
    useState({
      status: "active",
      startsAt: "",
      endsAt: "",
    });

  const [newMemberUserId, setNewMemberUserId] =
    useState("");

  const [newMemberPrograms, setNewMemberPrograms] =
    useState([]);

  const [activationLoading, setActivationLoading] =
    useState(false);

  const [memberSearch, setMemberSearch] =
    useState("");

  const [memberProgramFilter, setMemberProgramFilter] =
    useState("all");

  const [memberProgramMap, setMemberProgramMap] =
    useState({});

  /*
   * YYYY-MM-DD 형식에 달(month)을 더합니다.
   *
   * 1/31 + 1개월처럼 다음 달에 같은 날짜가 없는 경우에는
   * 그 달의 마지막 날짜를 사용합니다.
   */
  function addMonthsToDateString(
    dateString,
    months,
  ) {
    const date =
      parseDate(
        String(dateString || "").slice(0, 10),
      );

    if (!date) {
      return "";
    }

    const originalDay =
      date.getDate();

    date.setDate(1);

    date.setMonth(
      date.getMonth() + Number(months || 0),
    );

    const lastDay =
      new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
      ).getDate();

    date.setDate(
      Math.min(
        originalDay,
        lastDay,
      ),
    );

    return formatDate(date);
  }

  function getMembershipStart(member) {
    if (!member?.starts_at) {
      return "";
    }

    return String(
      member.starts_at,
    ).slice(0, 10);
  }

  function getMembershipEnd(member) {
    const value =
      member?.ends_at ||
      member?.current_period_end ||
      null;

    if (!value) {
      return "";
    }

    return String(value).slice(0, 10);
  }

  /*
   * 오늘을 기준으로 남은 이용일을 표시합니다.
   *
   *  5  → 5일 남음
   *  0  → 오늘까지
   * -1  → 기간 만료
   */
  function getMembershipDays(member) {
    const end =
      getMembershipEnd(member);

    if (!end) {
      return null;
    }

    return Math.round(
      (
        parseDate(end) -
        parseDate(todayKST())
      ) /
        86400000,
    );
  }

  function isCurrentlyActive(member) {
    if (
      !member ||
      member.status !== "active"
    ) {
      return false;
    }

    const days =
      getMembershipDays(member);

    /*
     * 종료일이 없는 과거 데이터는
     * active 상태라면 이용 중으로 표시합니다.
     */
    return (
      days === null ||
      days >= 0
    );
  }

  function statusText(member) {
    if (
      member.status === "active" &&
      isCurrentlyActive(member)
    ) {
      return "🟢 이용 중";
    }

    if (
      member.status === "active" &&
      !isCurrentlyActive(member)
    ) {
      return "⚪ 기간 만료";
    }

    if (
      member.status === "paused"
    ) {
      return "⏸️ 일시중지";
    }

    if (
      member.status === "cancelled"
    ) {
      return "⚪ 이용 종료";
    }

    if (
      member.status === "expired"
    ) {
      return "⚪ 기간 만료";
    }

    if (
      member.status === "trialing"
    ) {
      return "⚪ 이전 무료체험 기록";
    }

    return `⚪ ${member.status || "중지"}`;
  }

  function remainingText(member) {
    const days =
      getMembershipDays(member);

    if (days === null) {
      return "종료일 없음";
    }

    if (days > 0) {
      return `${days}일 남음`;
    }

    if (days === 0) {
      return "오늘까지";
    }

    return "기간 만료";
  }

  function getUserEmail(userId) {
    return (
      authUsers.find(
        (user) =>
          user.id === userId,
      )?.email ||
      userId
    );
  }

  function getUserName(userId) {
    return authUserStudentName(
      authUsers.find(
        (user) => user.id === userId,
      ),
    );
  }

  /*
   * 같은 user_id로 과거 멤버십 행이 여러 개 존재할 수 있으므로
   * 관리자 화면에서는 가장 최근 행 하나만 보여줍니다.
   *
   * 과거 행은 삭제하지 않고 DB에 그대로 보관됩니다.
   */
  const latestMemberships =
    (() => {
      const sorted =
        [...(memberships || [])]
          .sort(
            (a, b) =>
              String(
                b.created_at || "",
              ).localeCompare(
                String(
                  a.created_at || "",
                ),
              ),
          );

      const seen =
        new Set();

      return sorted.filter(
        (member) => {
          if (
            seen.has(
              member.user_id,
            )
          ) {
            return false;
          }

          seen.add(
            member.user_id,
          );

          return true;
        },
      );
    })();

  const memberUserIds =
    new Set(
      (memberships || []).map(
        (member) =>
          member.user_id,
      ),
    );

  /*
   * 멤버십 이력이 한 번도 없는 회원만
   * "새 Song Club 회원" 목록에 표시합니다.
   *
   * 과거 이용 이력이 있는 회원은 아래 기존 회원 카드에서
   * 다시 활성화할 수 있습니다.
   */
  const availableUsers =
    authUsers
      .filter(
        (user) =>
          !memberUserIds.has(
            user.id,
          ),
      )
      .sort((a, b) =>
        authUserDisplay(a).localeCompare(
          authUserDisplay(b),
          "ko",
        ),
      );

  async function loadMemberProgramMap() {
    try {
      const response =
        await fetch(
          "/api/admin/manage",
          {
            method: "POST",
            headers: {
              "content-type":
                "application/json",
            },
            body: JSON.stringify({
              action:
                "getAtHomeProgramMap",
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "음원 클래스 정보를 불러오지 못했습니다.",
        );
      }

      setMemberProgramMap(
        data.programsByUser || {},
      );
    } catch (error) {
      console.error(error);
      setMemberProgramMap({});
    }
  }

  useEffect(() => {
    loadMemberProgramMap();
  }, []);

  function getMemberPrograms(userId) {
    const programs =
      memberProgramMap?.[userId];

    return Array.isArray(programs)
      ? programs
      : [];
  }

  const filteredMemberships =
    latestMemberships.filter(
      (member) => {
        const q =
          memberSearch
            .trim()
            .toLowerCase();

        const programs =
          getMemberPrograms(
            member.user_id,
          );

        if (
          memberProgramFilter !== "all" &&
          !programs.includes(
            memberProgramFilter,
          )
        ) {
          return false;
        }

        if (!q) {
          return true;
        }

        const email = String(
          getUserEmail(member.user_id) || "",
        ).toLowerCase();

        const studentName = String(
          getUserName(member.user_id) || "",
        ).toLowerCase();

        const programText =
          programs
            .join(" ")
            .toLowerCase();

        return (
          email.includes(q) ||
          studentName.includes(q) ||
          programText.includes(q)
        );
      },
    );

  /*
   * action()은 성공 후 페이지를 새로고침하므로,
   * 신규 활성화 중 음원 클래스 권한을 먼저 저장할 때는
   * 새로고침 없는 요청을 별도로 사용합니다.
   */
  async function postAdminActionNoReload(body) {
    const response =
      await fetch(
        "/api/admin/manage",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify(body),
        },
      );

    let data = {};

    try {
      data =
        await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
          "처리 중 오류가 발생했습니다.",
      );
    }

    return data;
  }

  /*
   * 처음 Song Club을 등록하는 회원
   */
  async function activateNewMembership(
    months,
  ) {
    if (!newMemberUserId) {
      alert(
        "회원 이메일을 먼저 선택해주세요.",
      );

      return;
    }

    if (
      newMemberPrograms.length === 0
    ) {
      alert(
        "이용할 음원 클래스를 1개 이상 선택해주세요.",
      );

      return;
    }

    const option =
      MEMBERSHIP_OPTIONS.find(
        (item) =>
          item.months === months,
      );

    if (!option) {
      return;
    }

    const startsAt =
      todayKST();

    const endsAt =
      addMonthsToDateString(
        startsAt,
        months,
      );

    const email =
      getUserEmail(
        newMemberUserId,
      );

    const selectedProgramsText =
      newMemberPrograms.join(" + ");

    if (
      !confirm(
        `${email} 회원의 Song Club을 활성화할까요?\n\n` +
          `음원 클래스: ${selectedProgramsText}\n` +
          `이용권: ${option.label}\n` +
          `센터 결제금액: ${money(option.price)}\n` +
          `시작일: ${startsAt}\n` +
          `종료일: ${endsAt}\n\n` +
          `학부모는 선택한 클래스의 음원을 이용할 수 있습니다.\n` +
          `앱에서는 자동결제가 발생하지 않습니다.`,
      )
    ) {
      return;
    }

    setActivationLoading(true);

    try {
      /*
       * 먼저 해당 학부모의 음원 클래스 권한을
       * 선택한 모든 클래스로 정확히 저장합니다.
       * 기존 권한이 있어도 API가 교체해줍니다.
       */
      await postAdminActionNoReload({
        action:
          "setAtHomePrograms",

        userId:
          newMemberUserId,

        programs:
          newMemberPrograms,
      });

      /*
       * 그 다음 멤버십을 활성화합니다.
       * action() 성공 후 페이지가 자동 새로고침됩니다.
       */
      await action({
        action:
          "addAtHomeMembership",

        userId:
          newMemberUserId,

        plan:
          LEGACY_SINGLE_PLAN,

        startsAt,

        endsAt,
      });
    } catch (error) {
      console.error(error);

      alert(
        error?.message ||
          "Song Club 활성화 중 오류가 발생했습니다.",
      );
    } finally {
      setActivationLoading(false);
    }
  }

  /*
   * 기존 회원의 이용기간을 연장하거나
   * 만료/중지된 회원을 다시 활성화합니다.
   *
   * 이용 중이고 종료일이 아직 지나지 않았다면
   * "현재 종료일" 뒤에 선택한 개월 수를 붙입니다.
   *
   * 만료되었거나 중지된 회원은 오늘부터 새로 시작합니다.
   */
  async function activateOrExtendMembership(
    member,
    months,
  ) {
    const option =
      MEMBERSHIP_OPTIONS.find(
        (item) =>
          item.months === months,
      );

    if (!option) {
      return;
    }

    const today =
      todayKST();

    const currentEnd =
      getMembershipEnd(
        member,
      );

    const extending =
      isCurrentlyActive(
        member,
      ) &&
      Boolean(currentEnd);

    const startsAt =
      extending
        ? (
            getMembershipStart(
              member,
            ) || today
          )
        : today;

    const baseDate =
      extending
        ? currentEnd
        : today;

    const endsAt =
      addMonthsToDateString(
        baseDate,
        months,
      );

    const email =
      getUserEmail(
        member.user_id,
      );

    const verb =
      extending
        ? "연장"
        : "활성화";

    if (
      !confirm(
        `${email} 회원의 Song Club을 ${verb}할까요?\n\n` +
          `이용권: ${option.label}\n` +
          `센터 결제금액: ${money(option.price)}\n` +
          (
            extending
              ? `현재 종료일: ${currentEnd}\n새 종료일: ${endsAt}`
              : `시작일: ${startsAt}\n종료일: ${endsAt}`
          ) +
          `\n\n앱에서는 자동결제가 발생하지 않습니다.`,
      )
    ) {
      return;
    }

    await action({
      action:
        "updateAtHomeMembership",

      id:
        member.id,

      plan:
        LEGACY_SINGLE_PLAN,

      status:
        "active",

      startsAt,

      endsAt,
    });
  }

  function openEdit(member) {
    setEditing(member);

    const allowedStatuses =
      [
        "active",
        "paused",
        "cancelled",
        "expired",
      ];

    setForm({
      status:
        allowedStatuses.includes(
          member.status,
        )
          ? member.status
          : (
              isCurrentlyActive(
                member,
              )
                ? "active"
                : "expired"
            ),

      startsAt:
        getMembershipStart(
          member,
        ),

      endsAt:
        getMembershipEnd(
          member,
        ),
    });
  }

  async function save() {
    if (!editing) {
      return;
    }

    if (
      form.startsAt &&
      form.endsAt &&
      form.endsAt <
        form.startsAt
    ) {
      alert(
        "종료일은 시작일보다 빠를 수 없습니다.",
      );

      return;
    }

    const ok =
      await action({
        action:
          "updateAtHomeMembership",

        id:
          editing.id,

        /*
         * 기존 DB 스키마 호환용.
         * 사용자 화면에서는 Basic/Premium을 구분하지 않습니다.
         */
        plan:
          LEGACY_SINGLE_PLAN,

        status:
          form.status,

        startsAt:
          form.startsAt,

        endsAt:
          form.endsAt,
      });

    if (ok) {
      setEditing(null);
    }
  }

  async function pauseMembership(
    member,
  ) {
    const email =
      getUserEmail(
        member.user_id,
      );

    if (
      !confirm(
        `${email} 회원의 Song Club 이용을 중지할까요?\n\n` +
          `중지 후에는 학부모가 Song Club 콘텐츠를 이용할 수 없습니다.`,
      )
    ) {
      return;
    }

    await action({
      action:
        "updateAtHomeMembership",

      id:
        member.id,

      plan:
        LEGACY_SINGLE_PLAN,

      status:
        "paused",

      startsAt:
        getMembershipStart(
          member,
        ),

      endsAt:
        getMembershipEnd(
          member,
        ),
    });
  }

  async function openProgramEdit(member) {
    setProgramLoading(true);

    try {
      const response =
        await fetch(
          "/api/admin/manage",
          {
            method: "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "getAtHomePrograms",

                userId:
                  member.user_id,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "프로그램 정보를 불러오지 못했습니다.",
        );

        return;
      }

      const savedPrograms =
        Array.isArray(data.programs)
          ? data.programs
          : [];

      setProgramForm(
        savedPrograms.filter(
          (program) =>
            PROGRAM_OPTIONS.includes(
              program,
            ),
        ),
      );

      setProgramEditing(
        member,
      );
    } catch (error) {
      console.error(error);

      alert(
        "프로그램 정보를 불러오지 못했습니다.",
      );
    } finally {
      setProgramLoading(false);
    }
  }

  function toggleProgram(program) {
    if (
      !PROGRAM_OPTIONS.includes(
        program,
      )
    ) {
      return;
    }

    setProgramForm(
      (previous) => {
        if (
          previous.includes(
            program,
          )
        ) {
          return previous.filter(
            (item) =>
              item !== program,
          );
        }

        return [
          ...previous,
          program,
        ];
      },
    );
  }

  async function savePrograms() {
    if (!programEditing) {
      return;
    }

    if (programForm.length === 0) {
      alert(
        "이용할 음원 클래스를 1개 이상 선택해주세요.",
      );

      return;
    }

    const ok =
      await action({
        action:
          "setAtHomePrograms",

        userId:
          programEditing.user_id,

        programs:
          programForm,
      });

    if (ok) {
      setMemberProgramMap(
        (current) => ({
          ...current,
          [programEditing.user_id]:
            [...programForm],
        }),
      );
      setProgramEditing(null);
    }
  }

  return (
    <section className="panel">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2>
            Song Club 회원 관리
          </h2>

          <p
            className="hint"
            style={{
              marginBottom: 0,
            }}
          >
            센터에서 결제를 확인한 뒤
            학부모 계정을 1개월·3개월·6개월·12개월로
            활성화합니다.
            <br />
            앱에서는 결제나 자동결제가
            발생하지 않습니다.
          </p>
        </div>

        <div
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            background: "#fff7e5",
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          <b>
            현재 회원{" "}
            {
              latestMemberships.filter(
                isCurrentlyActive,
              ).length
            }
            명
          </b>
          <br />
          전체 이용 이력{" "}
          {latestMemberships.length}
          명
        </div>
      </div>

      {/* =====================================
          신규 회원 활성화
      ====================================== */}

      <EditBox title="☀️ 새 Song Club 회원 활성화">
        <p className="hint">
          학부모가 Song Club 앱에서 회원가입과 이메일 인증을
          완료한 뒤, 센터 결제를 확인하고 아래에서 계정을
          선택해주세요.
        </p>

        <label>
          학생 이름 / 회원 이메일
          <select
            className="normal"
            value={
              newMemberUserId
            }
            onChange={(e) =>
              setNewMemberUserId(
                e.target.value,
              )
            }
          >
            <option value="">
              회원 선택
            </option>

            {availableUsers.map(
              (user) => (
                <option
                  key={user.id}
                  value={user.id}
                >
                  {authUserDisplay(user)}
                </option>
              ),
            )}
          </select>
        </label>

        {availableUsers.length ===
          0 && (
          <p className="hint">
            새로 활성화할 회원이 없습니다.
            과거 이용 이력이 있는 회원은 아래 기존 회원 목록에서
            다시 활성화해주세요.
          </p>
        )}

        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            background: "#fff8ea",
          }}
        >
          <b>1. 이용할 음원 클래스 선택</b>

          <p
            className="hint"
            style={{
              marginTop: 6,
              marginBottom: 12,
            }}
          >
            한 클래스만 선택하거나 두 클래스를 모두 선택할 수 있습니다.
            선택한 클래스의 음원만 학부모 화면에 보여요.
          </p>

          {PROGRAM_OPTIONS.map(
            (program) => (
              <label
                key={program}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  value={program}
                  checked={
                    newMemberPrograms.includes(
                      program,
                    )
                  }
                  onChange={() =>
                    setNewMemberPrograms(
                      (previous) => {
                        if (
                          previous.includes(
                            program,
                          )
                        ) {
                          return previous.filter(
                            (item) =>
                              item !== program,
                          );
                        }

                        return [
                          ...previous,
                          program,
                        ];
                      },
                    )
                  }
                />

                <strong>
                  {program}
                </strong>
              </label>
            ),
          )}
        </div>

        <div
          style={{
            marginTop: 16,
            marginBottom: 4,
            fontWeight: 700,
          }}
        >
          2. 이용기간 선택
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            marginTop: 14,
          }}
        >
          {MEMBERSHIP_OPTIONS.map(
            (option) => (
              <button
                key={
                  option.months
                }
                type="button"
                disabled={
                  loading ||
                  activationLoading ||
                  !newMemberUserId ||
                  newMemberPrograms.length === 0
                }
                onClick={() =>
                  activateNewMembership(
                    option.months,
                  )
                }
              >
                {option.label} 활성화
                <br />
                <span
                  style={{
                    fontSize: 12,
                    opacity: 0.8,
                  }}
                >
                  {money(
                    option.price,
                  )}
                </span>
              </button>
            ),
          )}
        </div>
      </EditBox>

      {/* =====================================
          기존 회원 검색
      ====================================== */}

      <div
        style={{
          marginTop: 24,
          marginBottom: 14,
        }}
      >
        <input
          className="normal"
          type="search"
          value={memberSearch}
          onChange={(e) =>
            setMemberSearch(
              e.target.value,
            )
          }
          placeholder="학생 이름 · 학부모 이메일 · 클래스 검색"
          style={{
            width: "100%",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 10,
          }}
        >
          {[
            ["all", "전체"],
            ["Sunshine Toddler", "Sunshine Toddler"],
            ["Melody Book Club", "Melody Book Club"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="mini"
              onClick={() =>
                setMemberProgramFilter(
                  value,
                )
              }
              style={{
                background:
                  memberProgramFilter === value
                    ? "#f8b942"
                    : "#fff7e8",
                color: "#2c241d",
                border:
                  memberProgramFilter === value
                    ? "1px solid #e7a72d"
                    : "1px solid #f0dcc0",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {latestMemberships.length ===
        0 && (
        <p className="hint">
          등록된 Song Club 회원이 없습니다.
        </p>
      )}

      {latestMemberships.length >
        0 &&
        filteredMemberships.length ===
          0 && (
          <p className="hint">
            검색 결과가 없습니다.
          </p>
        )}

      {/* =====================================
          기존 회원 목록
      ====================================== */}

      {filteredMemberships.map(
        (member) => {
          const days =
            getMembershipDays(
              member,
            );

          const active =
            isCurrentlyActive(
              member,
            );

          const start =
            getMembershipStart(
              member,
            );

          const end =
            getMembershipEnd(
              member,
            );

          return (
            <div
              key={member.id}
              style={{
                padding: "20px 0",
                borderBottom:
                  "1px solid #eee",
              }}
            >
              <div className="adminrow">
                <div>
                  <b>
                    ☀️ Monthly Song Club
                  </b>

                  <span>
                    학생 이름:{" "}
                    <b>
                      {getUserName(member.user_id) || "미등록"}
                    </b>
                  </span>

                  <span>
                    이메일:{" "}
                    <b>
                      {getUserEmail(
                        member.user_id,
                      )}
                    </b>
                  </span>

                  <span>
                    음원 클래스:{" "}
                    <b>
                      {getMemberPrograms(
                        member.user_id,
                      ).length > 0
                        ? getMemberPrograms(
                            member.user_id,
                          ).join(" + ")
                        : "미지정"}
                    </b>
                  </span>

                  <span>
                    시작일:{" "}
                    {start || "-"}
                  </span>

                  <span>
                    종료일:{" "}
                    {end || "없음"}
                  </span>

                  <span>
                    남은 기간:{" "}
                    <b
                      style={{
                        color:
                          active &&
                          days !==
                            null &&
                          days <= 7
                            ? "#c56d00"
                            : undefined,
                      }}
                    >
                      {remainingText(
                        member,
                      )}
                    </b>
                  </span>
                </div>

                <div className="right">
                  <b>
                    {statusText(
                      member,
                    )}
                  </b>
                </div>
              </div>

              {/* 이용권 활성화 / 연장 */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                {MEMBERSHIP_OPTIONS.map(
                  (option) => (
                    <button
                      key={
                        option.months
                      }
                      type="button"
                      className="mini"
                      disabled={loading}
                      onClick={() =>
                        activateOrExtendMembership(
                          member,
                          option.months,
                        )
                      }
                    >
                      {active
                        ? `${option.label} 연장`
                        : `${option.label} 활성화`}
                      {" · "}
                      {money(
                        option.price,
                      )}
                    </button>
                  ),
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  className="mini ghost"
                  onClick={() =>
                    openEdit(member)
                  }
                >
                  날짜 · 상태 수정
                </button>

                <button
                  type="button"
                  className="mini ghost"
                  disabled={
                    programLoading
                  }
                  onClick={() =>
                    openProgramEdit(
                      member,
                    )
                  }
                >
                  음원 클래스
                </button>

                {active && (
                  <button
                    type="button"
                    className="mini danger"
                    disabled={loading}
                    onClick={() =>
                      pauseMembership(
                        member,
                      )
                    }
                  >
                    이용 중지
                  </button>
                )}
              </div>

              {/* 날짜/상태 직접 수정 */}

              {editing?.id ===
                member.id && (
                <EditBox title="Song Club 회원 수정">
                  <label>
                    상태
                    <select
                      className="normal"
                      value={
                        form.status
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          status:
                            e.target
                              .value,
                        })
                      }
                    >
                      <option value="active">
                        이용 중
                      </option>

                      <option value="paused">
                        일시중지
                      </option>

                      <option value="expired">
                        기간 만료
                      </option>

                      <option value="cancelled">
                        이용 종료
                      </option>
                    </select>
                  </label>

                  <label>
                    시작일
                    <input
                      className="normal"
                      type="date"
                      value={
                        form.startsAt
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          startsAt:
                            e.target
                              .value,
                        })
                      }
                    />
                  </label>

                  <label>
                    종료일
                    <input
                      className="normal"
                      type="date"
                      value={
                        form.endsAt
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          endsAt:
                            e.target
                              .value,
                        })
                      }
                    />
                  </label>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={save}
                    >
                      저장
                    </button>

                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        setEditing(
                          null,
                        )
                      }
                    >
                      취소
                    </button>
                  </div>
                </EditBox>
              )}

              {/* 이용 가능한 음원 클래스 */}

              {programEditing?.id ===
                member.id && (
                <EditBox title="이용 가능한 음원 클래스">
                  <p className="hint">
                    이 회원이 이용할 음원 클래스를 선택해주세요.
                    한 클래스만 선택하거나 두 클래스를 모두 선택할 수 있습니다.
                  </p>

                  <label
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      gap: 10,
                      marginBottom: 12,
                      cursor:
                        "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        programForm.includes(
                          "Sunshine Toddler",
                        )
                      }
                      onChange={() =>
                        toggleProgram(
                          "Sunshine Toddler",
                        )
                      }
                    />

                    <strong>
                      Sunshine Toddler
                    </strong>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      gap: 10,
                      marginBottom: 16,
                      cursor:
                        "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        programForm.includes(
                          "Melody Book Club",
                        )
                      }
                      onChange={() =>
                        toggleProgram(
                          "Melody Book Club",
                        )
                      }
                    />

                    <strong>
                      Melody Book Club
                    </strong>
                  </label>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      disabled={loading}
                      onClick={
                        savePrograms
                      }
                    >
                      저장
                    </button>

                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        setProgramEditing(
                          null,
                        )
                      }
                    >
                      취소
                    </button>
                  </div>
                </EditBox>
              )}
            </div>
          );
        },
      )}
    </section>
  );
}



/*
 * =====================================================
 * Home Package 회원 관리
 * =====================================================
 *
 * 기존 Song Club 회원가입 계정을 그대로 사용합니다.
 * 별도 회원가입은 필요하지 않습니다.
 *
 * Home Package 규칙
 * - 기본곡: unlock_week = 0, 최대 3곡
 * - 이후 각 주차: unlock_week = 1 ~ 21, 주차별 최대 3곡
 * - 8회: 8주차까지
 * - 12회: 12주차까지
 * - 20회: 21주차까지
 */
function HomePackageMemberManagement({
  authUsers,
  contents,
  loading,
}) {
  const PLAN_OPTIONS = [
    { code: "home_8", label: "8회 Home Package", weeks: 8, durationWeeks: 10, price: 29000 },
    { code: "home_12", label: "12회 Home Package", weeks: 12, durationWeeks: 15, price: 39000 },
    { code: "home_20", label: "20회 Home Package", weeks: 21, durationWeeks: 25, price: 59000 },
  ];

  const PROGRAM_OPTIONS = [
    "Sunshine Toddler",
    "Melody Book Club",
  ];

  const [adminData, setAdminData] = useState({
    products: [],
    tracks: [],
  });

  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dataError, setDataError] = useState("");

  const [newForm, setNewForm] = useState({
    userId: "",
    planCode: "home_8",
    program: "Sunshine Toddler",
    startsAt: todayKST(),
    endsAt: (() => {
      const date = parseDate(todayKST());
      date.setDate(date.getDate() + 10 * 7);
      return formatDate(date);
    })(),
  });

  const [memberSearch, setMemberSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    planCode: "home_8",
    program: "Sunshine Toddler",
    status: "active",
    startsAt: "",
    endsAt: "",
  });

  const [scheduleProgram, setScheduleProgram] = useState("Sunshine Toddler");
  const [schedule, setSchedule] = useState(() => emptySchedule());

  function emptySchedule() {
    const weeks = {};
    for (let week = 1; week <= 21; week += 1) {
      weeks[week] = {
        1: "",
        2: "",
        3: "",
      };
    }
    return {
      base1: "",
      base2: "",
      base3: "",
      weeks,
    };
  }

  function planLabel(code) {
    return PLAN_OPTIONS.find((item) => item.code === code)?.label || code || "Home Package";
  }

  function calculateEndDate(startsAt, planCode) {
    if (!startsAt) return "";

    const durationWeeks =
      PLAN_OPTIONS.find((item) => item.code === planCode)?.durationWeeks || 0;

    if (!durationWeeks) return "";

    const date = parseDate(startsAt);
    if (!date || Number.isNaN(date.getTime())) return "";

    date.setDate(date.getDate() + durationWeeks * 7);
    return formatDate(date);
  }

  function statusLabel(status) {
    if (status === "active") return "🟢 이용 중";
    if (status === "paused") return "⏸️ 일시중지";
    if (status === "cancelled") return "⚪ 이용 종료";
    if (status === "expired") return "⚪ 기간 만료";
    return status || "-";
  }

  function getUserEmail(userId) {
    return (
      (authUsers || []).find((user) => user.id === userId)?.email ||
      userId ||
      "알 수 없는 회원"
    );
  }

  function getUserName(userId) {
    return authUserStudentName(
      (authUsers || []).find((user) => user.id === userId),
    );
  }

  async function post(body) {
    const response = await fetch("/api/admin/manage", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    let result = {};
    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!response.ok) {
      throw new Error(result.error || "처리 중 오류가 발생했습니다.");
    }

    return result;
  }

  async function loadAdminData() {
    setDataLoading(true);
    setDataError("");

    try {
      const result = await post({
        action: "getHomePackageAdminData",
      });

      setAdminData({
        products: result.products || [],
        tracks: result.tracks || [],
      });
    } catch (error) {
      console.error(error);
      setDataError(error?.message || "Home Package 정보를 불러오지 못했습니다.");
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    const next = emptySchedule();

    (adminData.tracks || [])
      .filter((row) => row.program === scheduleProgram)
      .forEach((row) => {
        const week = Number(row.unlock_week || 0);
        const position = Number(row.position || 1);

        if (week === 0) {
          if (position === 1) next.base1 = row.song_id;
          if (position === 2) next.base2 = row.song_id;
          if (position === 3) next.base3 = row.song_id;
          return;
        }

        if (
          week >= 1 &&
          week <= 21 &&
          position >= 1 &&
          position <= 3
        ) {
          next.weeks[week][position] = row.song_id;
        }
      });

    setSchedule(next);
  }, [adminData.tracks, scheduleProgram]);

  const songsForSchedule = (contents || [])
    .filter((song) => song.program === scheduleProgram)
    .sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "ko"));

  const latestProducts = (() => {
    const rows = [...(adminData.products || [])].sort((a, b) =>
      String(b.created_at || "").localeCompare(String(a.created_at || "")),
    );
    const seen = new Set();
    return rows.filter((row) => {
      if (seen.has(row.user_id)) return false;
      seen.add(row.user_id);
      return true;
    });
  })();

  const filteredProducts = latestProducts.filter((row) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    const email = String(getUserEmail(row.user_id) || "").toLowerCase();
    const studentName = String(getUserName(row.user_id) || "").toLowerCase();
    return email.includes(q) || studentName.includes(q);
  });

  const activeUserIds = new Set(
    (adminData.products || [])
      .filter((row) => row.status === "active")
      .map((row) => row.user_id),
  );

  const selectableUsers = [...(authUsers || [])]
    .sort((a, b) => authUserDisplay(a).localeCompare(authUserDisplay(b), "ko"))
    .filter((user) => !activeUserIds.has(user.id));

  async function createProduct() {
    if (!newForm.userId) {
      alert("회원 이메일을 선택해주세요.");
      return;
    }

    if (!newForm.startsAt) {
      alert("Home Package 시작일을 선택해주세요.");
      return;
    }

    const option = PLAN_OPTIONS.find((item) => item.code === newForm.planCode);
    const email = getUserEmail(newForm.userId);

    if (!confirm(
      `${email} 회원에게 Home Package를 활성화할까요?\n\n` +
      `상품: ${option?.label || newForm.planCode}\n` +
      `프로그램: ${newForm.program}\n` +
      `센터 결제금액: ${money(option?.price || 0)}\n` +
      `시작일: ${newForm.startsAt}\n` +
      `${newForm.endsAt ? `종료일: ${newForm.endsAt}\n` : "종료일: 별도 지정 없음\n"}` +
      `\n기본곡은 즉시 열리고 이후 주차별로 지정한 곡이 자동으로 열립니다.`,
    )) {
      return;
    }

    setSaving(true);
    try {
      await post({
        action: "createHomePackageProduct",
        userId: newForm.userId,
        planCode: newForm.planCode,
        program: newForm.program,
        startsAt: newForm.startsAt,
        endsAt: newForm.endsAt || null,
      });

      setNewForm({
        userId: "",
        planCode: "home_8",
        program: "Sunshine Toddler",
        startsAt: todayKST(),
        endsAt: calculateEndDate(todayKST(), "home_8"),
      });

      await loadAdminData();
      alert("Home Package가 활성화되었습니다.");
    } catch (error) {
      console.error(error);
      alert(error?.message || "Home Package 활성화에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function openEditProduct(product) {
    setEditingProduct(product);
    setEditForm({
      planCode: product.plan_code || "home_8",
      program: product.program || "Sunshine Toddler",
      status: product.status || "active",
      startsAt: String(product.starts_at || "").slice(0, 10),
      endsAt:
        String(product.ends_at || "").slice(0, 10) ||
        calculateEndDate(
          String(product.starts_at || "").slice(0, 10),
          product.plan_code || "home_8",
        ),
    });
  }

  async function saveProductEdit() {
    if (!editingProduct) return;

    if (!editForm.startsAt) {
      alert("시작일을 입력해주세요.");
      return;
    }

    if (editForm.endsAt && editForm.endsAt < editForm.startsAt) {
      alert("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    setSaving(true);
    try {
      await post({
        action: "updateHomePackageProduct",
        id: editingProduct.id,
        planCode: editForm.planCode,
        program: editForm.program,
        status: editForm.status,
        startsAt: editForm.startsAt,
        endsAt: editForm.endsAt || null,
      });

      setEditingProduct(null);
      await loadAdminData();
      alert("Home Package 회원 정보가 수정되었습니다.");
    } catch (error) {
      console.error(error);
      alert(error?.message || "회원 정보를 수정하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(product, status) {
    const label = status === "paused" ? "일시중지" : status === "active" ? "다시 활성화" : "이용 종료";

    if (!confirm(`${getUserEmail(product.user_id)} 회원의 Home Package를 ${label}할까요?`)) {
      return;
    }

    setSaving(true);
    try {
      await post({
        action: "updateHomePackageProduct",
        id: product.id,
        planCode: product.plan_code,
        program: product.program,
        status,
        startsAt: String(product.starts_at || "").slice(0, 10),
        endsAt: product.ends_at ? String(product.ends_at).slice(0, 10) : null,
      });
      await loadAdminData();
    } catch (error) {
      console.error(error);
      alert(error?.message || "상태를 변경하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function updateWeekSong(week, position, songId) {
    setSchedule((current) => ({
      ...current,
      weeks: {
        ...current.weeks,
        [week]: {
          ...current.weeks[week],
          [position]: songId,
        },
      },
    }));
  }

  async function saveSchedule() {
    if (!schedule.base1 || !schedule.base2) {
      alert("Home Package 기본곡 1, 2를 모두 선택해주세요.");
      return;
    }

    const selectedSongIds = [
      schedule.base1,
      schedule.base2,
      schedule.base3,
      ...Array.from(
        { length: 21 },
        (_, index) => {
          const week =
            index + 1;
          const songs =
            schedule.weeks[week] || {};
          return [
            songs[1],
            songs[2],
            songs[3],
          ];
        },
      ).flat(),
    ].filter(Boolean);

    if (new Set(selectedSongIds).size !== selectedSongIds.length) {
      alert("같은 노래를 기본곡 또는 여러 주차에 중복 지정할 수 없습니다.");
      return;
    }

    const tracks = [
      { songId: schedule.base1, unlockWeek: 0, position: 1 },
      { songId: schedule.base2, unlockWeek: 0, position: 2 },
      schedule.base3
        ? { songId: schedule.base3, unlockWeek: 0, position: 3 }
        : null,
      ...Array.from(
        { length: 21 },
        (_, index) => {
          const week =
            index + 1;
          const songs =
            schedule.weeks[week] || {};

          return [
            1,
            2,
            3,
          ].map(
            (position) =>
              songs[position]
                ? {
                    songId:
                      songs[position],
                    unlockWeek:
                      week,
                    position,
                  }
                : null,
          );
        },
      ).flat(),
    ].filter(Boolean);

    const baseCount =
      tracks.filter(
        (row) =>
          row.unlockWeek === 0,
      ).length;

    const weeklyCount =
      tracks.length - baseCount;

    if (!confirm(
      `${scheduleProgram} Home Package 곡 구성을 저장할까요?\n\n` +
      `기본곡 ${baseCount}곡 + 주차별 등록곡 ${weeklyCount}곡\n` +
      `각 주차에는 최대 3곡까지 지정할 수 있습니다.\n` +
      `8회 상품은 8주차까지, 12회는 12주차까지, 20회는 21주차까지 자동 적용됩니다.`,
    )) {
      return;
    }

    setSaving(true);
    try {
      await post({
        action: "saveHomePackageTrackSchedule",
        program: scheduleProgram,
        tracks,
      });
      await loadAdminData();
      alert("Home Package 곡 구성이 저장되었습니다.");
    } catch (error) {
      console.error(error);
      alert(error?.message || "곡 구성을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ marginBottom: 6 }}>Home Package 회원 관리</h2>
          <p className="hint" style={{ margin: 0 }}>
            기존 Song Club 가입 계정을 그대로 사용합니다. 새 회원가입 없이 상품만 연결하면 됩니다.
          </p>
        </div>

        <div
          style={{
            background: "#fff7e8",
            borderRadius: 14,
            padding: "10px 14px",
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          <b>현재 이용 중 {latestProducts.filter((row) => row.status === "active").length}명</b>
          <br />
          전체 이용 이력 {(adminData.products || []).length}건
        </div>
      </div>

      {dataError && (
        <div
          style={{
            border: "1px solid #f2c8c8",
            background: "#fff5f5",
            borderRadius: 12,
            padding: 14,
            marginBottom: 18,
            color: "#9f3030",
          }}
        >
          {dataError}
          <div className="hint" style={{ marginTop: 6 }}>
            처음 적용하는 경우 Supabase SQL Editor에서 supabase/home-package-mode.sql을 한 번 실행해주세요.
          </div>
        </div>
      )}

      <EditBox title="🏠 새 Home Package 회원 활성화">
        <label>
          학생 이름 / 회원 이메일
          <select
            className="normal"
            value={newForm.userId}
            onChange={(event) => setNewForm({ ...newForm, userId: event.target.value })}
          >
            <option value="">회원 선택</option>
            {selectableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {authUserDisplay(user)}
              </option>
            ))}
          </select>
        </label>

        <label>
          이용 상품
          <select
            className="normal"
            value={newForm.planCode}
            onChange={(event) => {
              const planCode = event.target.value;
              setNewForm((current) => ({
                ...current,
                planCode,
                endsAt: calculateEndDate(current.startsAt, planCode),
              }));
            }}
          >
            {PLAN_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label} · {money(option.price)}
              </option>
            ))}
          </select>
        </label>

        <label>
          이용 클래스
          <select
            className="normal"
            value={newForm.program}
            onChange={(event) => setNewForm({ ...newForm, program: event.target.value })}
          >
            {PROGRAM_OPTIONS.map((program) => (
              <option key={program} value={program}>{program}</option>
            ))}
          </select>
        </label>

        <label>
          시작일
          <input
            className="normal"
            type="date"
            value={newForm.startsAt}
            onChange={(event) => {
              const startsAt = event.target.value;
              setNewForm((current) => ({
                ...current,
                startsAt,
                endsAt: calculateEndDate(startsAt, current.planCode),
              }));
            }}
          />
        </label>

        <label>
          종료일 (자동 계산 · 수정 가능)
          <input
            className="normal"
            type="date"
            value={newForm.endsAt}
            onChange={(event) =>
              setNewForm((current) => ({
                ...current,
                endsAt: event.target.value,
              }))
            }
          />
          <span className="hint" style={{ display: "block", marginTop: 5 }}>
            기본값: 8회 10주 · 12회 15주 · 20회 25주 / 필요하면 직접 변경할 수 있어요.
          </span>
        </label>

        <div style={{ display: "flex", alignItems: "end" }}>
          <button
            type="button"
            onClick={createProduct}
            disabled={loading || saving || dataLoading}
            style={{ width: "100%" }}
          >
            {saving ? "처리 중..." : "Home Package 활성화"}
          </button>
        </div>
      </EditBox>

      <div style={{ height: 22 }} />

      <EditBox title="🎵 Home Package 곡 구성">
        <div style={{ gridColumn: "1 / -1" }}>
          <p className="hint" style={{ marginTop: 0 }}>
            한 번만 구성해두면 회원별로 곡을 직접 넣을 필요가 없습니다. 기본곡과 각 주차는 최대 3곡까지 지정할 수 있고, 8회는 8주차까지, 12회는 12주차까지, 20회는 21주차까지 자동으로 열립니다.
          </p>
        </div>

        <label>
          프로그램
          <select
            className="normal"
            value={scheduleProgram}
            onChange={(event) => setScheduleProgram(event.target.value)}
          >
            {PROGRAM_OPTIONS.map((program) => (
              <option key={program} value={program}>{program}</option>
            ))}
          </select>
        </label>

        <div />

        <SongSelect
          label="기본곡 1 · 즉시 공개"
          value={schedule.base1}
          songs={songsForSchedule}
          onChange={(value) => setSchedule((current) => ({ ...current, base1: value }))}
        />

        <SongSelect
          label="기본곡 2 · 즉시 공개"
          value={schedule.base2}
          songs={songsForSchedule}
          onChange={(value) => setSchedule((current) => ({ ...current, base2: value }))}
        />

        {Array.from({ length: 21 }, (_, index) => index + 1).map((week) => (
          <SongSelect
            key={week}
            label={`${week}주차 신곡${week === 8 ? " · 8회 마지막" : week === 12 ? " · 12회 마지막" : week === 21 ? " · 20회 마지막" : ""}`}
            value={schedule.weeks[week]?.[1] || ""}
            songs={songsForSchedule}
            allowEmpty
            onChange={(value) => updateWeekSong(week, 1, value)}
          />
        ))}

        <details
          style={{
            gridColumn: "1 / -1",
            marginTop: 8,
            border: "1px solid #f0dcc0",
            borderRadius: 14,
            padding: "14px 16px",
            background: "#fffaf2",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            ➕ 추가곡 옵션 · 기본곡/주차별 최대 3곡
          </summary>

          <p
            className="hint"
            style={{
              marginTop: 10,
              marginBottom: 14,
            }}
          >
            기본곡은 기존 2곡에 1곡을 더 추가할 수 있고,
            각 주차는 기존 신곡에 추가곡 2곡을 더 지정할 수 있어요.
            비워둔 칸은 공개되지 않습니다.
          </p>

          <div
            style={{
              display: "grid",
              // 모바일에서는 1열로 자연스럽게 줄어들고,
              // 넓은 화면에서는 여러 열을 유지합니다.
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 14,
              width: "100%",
              minWidth: 0,
            }}
          >
            <SongSelect
              label="기본곡 3 · 선택"
              value={schedule.base3}
              songs={songsForSchedule}
              allowEmpty
              onChange={(value) =>
                setSchedule(
                  (current) => ({
                    ...current,
                    base3: value,
                  }),
                )
              }
            />

            {Array.from(
              { length: 21 },
              (_, index) =>
                index + 1,
            ).map((week) => (
              <div
                key={`extras-${week}`}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "#ffffff",
                  border: "1px solid #f3e5d1",
                  minWidth: 0,
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                <b
                  style={{
                    display: "block",
                    marginBottom: 10,
                  }}
                >
                  {week}주차 추가곡
                </b>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <SongSelect
                    label="추가곡 2"
                    value={schedule.weeks[week]?.[2] || ""}
                    songs={songsForSchedule}
                    allowEmpty
                    onChange={(value) =>
                      updateWeekSong(
                        week,
                        2,
                        value,
                      )
                    }
                  />

                  <SongSelect
                    label="추가곡 3"
                    value={schedule.weeks[week]?.[3] || ""}
                    songs={songsForSchedule}
                    allowEmpty
                    onChange={(value) =>
                      updateWeekSong(
                        week,
                        3,
                        value,
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </details>

        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={saveSchedule}
            disabled={saving || dataLoading}
          >
            곡 구성 저장
          </button>
        </div>
      </EditBox>

      <div style={{ height: 22 }} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <h3 style={{ margin: 0 }}>등록된 Home Package 회원</h3>
        <input
          className="normal"
          style={{ maxWidth: 320 }}
          value={memberSearch}
          onChange={(event) => setMemberSearch(event.target.value)}
          placeholder="학생 이름 또는 회원 이메일 검색"
        />
      </div>

      {dataLoading ? (
        <p className="hint">Home Package 회원 정보를 불러오는 중...</p>
      ) : filteredProducts.length === 0 ? (
        <div
          style={{
            border: "1px dashed #dfd2c5",
            borderRadius: 14,
            padding: 22,
            textAlign: "center",
          }}
        >
          등록된 Home Package 회원이 없습니다.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              style={{
                border: "1px solid #eadfd6",
                borderRadius: 16,
                padding: 16,
                background: "#fffdfb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <b style={{ fontSize: 16 }}>
                    {getUserName(product.user_id) || "학생 이름 미등록"}
                  </b>
                  <div className="hint" style={{ marginTop: 6 }}>
                    이메일: {getUserEmail(product.user_id)}
                    <br />
                    {planLabel(product.plan_code)} · {product.program}
                    <br />
                    {String(product.starts_at || "").slice(0, 10)} 시작
                    {product.ends_at ? ` · ${String(product.ends_at).slice(0, 10)} 종료` : " · 종료일 없음"}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <b>{statusLabel(product.status)}</b>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 14,
                }}
              >
                <button type="button" onClick={() => openEditProduct(product)} disabled={saving}>
                  수정
                </button>

                {product.status === "active" ? (
                  <>
                    <button type="button" onClick={() => quickStatus(product, "paused")} disabled={saving}>
                      일시중지
                    </button>
                    <button type="button" onClick={() => quickStatus(product, "cancelled")} disabled={saving}>
                      이용 종료
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => quickStatus(product, "active")} disabled={saving}>
                    다시 활성화
                  </button>
                )}
              </div>

              {editingProduct?.id === product.id && (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: "1px solid #eee2d8",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
                    gap: 12,
                  }}
                >
                  <label>
                    이용 상품
                    <select
                      className="normal"
                      value={editForm.planCode}
                      onChange={(event) => {
                        const planCode = event.target.value;
                        setEditForm((current) => ({
                          ...current,
                          planCode,
                          endsAt: calculateEndDate(current.startsAt, planCode),
                        }));
                      }}
                    >
                      {PLAN_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    프로그램
                    <select
                      className="normal"
                      value={editForm.program}
                      onChange={(event) => setEditForm({ ...editForm, program: event.target.value })}
                    >
                      {PROGRAM_OPTIONS.map((program) => (
                        <option key={program} value={program}>{program}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    상태
                    <select
                      className="normal"
                      value={editForm.status}
                      onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}
                    >
                      <option value="active">이용 중</option>
                      <option value="paused">일시중지</option>
                      <option value="cancelled">이용 종료</option>
                      <option value="expired">기간 만료</option>
                    </select>
                  </label>

                  <label>
                    시작일
                    <input
                      className="normal"
                      type="date"
                      value={editForm.startsAt}
                      onChange={(event) => {
                        const startsAt = event.target.value;
                        setEditForm((current) => ({
                          ...current,
                          startsAt,
                          endsAt: calculateEndDate(startsAt, current.planCode),
                        }));
                      }}
                    />
                  </label>

                  <label>
                    종료일 (자동 계산 · 수정 가능)
                    <input
                      className="normal"
                      type="date"
                      value={editForm.endsAt}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          endsAt: event.target.value,
                        }))
                      }
                    />
                    <span className="hint" style={{ display: "block", marginTop: 5 }}>
                      상품이나 시작일을 바꾸면 다시 자동 계산되고, 이후 직접 수정할 수 있어요.
                    </span>
                  </label>

                  <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
                    <button type="button" onClick={saveProductEdit} disabled={saving}>
                      저장
                    </button>
                    <button type="button" onClick={() => setEditingProduct(null)} disabled={saving}>
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SongSelect({ label, value, songs, onChange, allowEmpty = false }) {
  return (
    <label
      style={{
        display: "block",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          display: "block",
          marginBottom: 6,
          lineHeight: 1.35,
        }}
      >
        {label}
      </span>
      <select
        className="normal"
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        style={{
          display: "block",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <option value="">{allowEmpty ? "아직 지정하지 않음" : "곡 선택"}</option>
        {(songs || []).map((song) => (
          <option key={song.id} value={song.id}>
            {song.title || song.slug}
            {song.is_published === false ? " · 비공개" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
