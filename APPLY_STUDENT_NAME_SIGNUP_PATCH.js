const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = path.join(root, 'app', 'signup', 'page.js');

function fail(message) {
  console.error(`\n[Student Name Signup Patch] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(target)) {
  fail('app/signup/page.js 파일을 찾지 못했습니다. dear-sunshine-at-home 프로젝트 최상위 폴더에서 실행해주세요.');
}

let src = fs.readFileSync(target, 'utf8');

if (src.includes('/* DS_STUDENT_NAME_SIGNUP_PATCH */')) {
  console.log('이미 학생 이름 회원가입 패치가 적용되어 있습니다.');
  process.exit(0);
}

const original = src;
const backupDir = path.join(root, `_patch_backup_student_name_signup_${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`);
fs.mkdirSync(path.join(backupDir, 'app', 'signup'), { recursive: true });
fs.copyFileSync(target, path.join(backupDir, 'app', 'signup', 'page.js'));

// 1) studentName state
const emailStateRe = /(const\s*\[\s*email\s*,\s*setEmail\s*\]\s*=\s*useState\(\s*''\s*\);)/m;
if (!emailStateRe.test(src)) {
  fail('email state 위치를 찾지 못했습니다. 현재 회원가입 코드가 예상 구조와 다릅니다.');
}
src = src.replace(emailStateRe, `$1\n\n    /* DS_STUDENT_NAME_SIGNUP_PATCH */\n    const [studentName, setStudentName] = useState('');`);

// 2) validation before password validation
const passwordValidationRe = /(\s*if\s*\(\s*password\.length\s*<\s*8\s*\)\s*\{)/m;
if (!passwordValidationRe.test(src)) {
  fail('비밀번호 검증 위치를 찾지 못했습니다.');
}
src = src.replace(passwordValidationRe, `\n        if (!studentName.trim()) {\n            setError('학생 이름을 입력해주세요.');\n            return;\n        }\n$1`);

// 3) save student name into Supabase Auth user_metadata
const dataObjectRe = /(data:\s*\{\s*)(terms_version:)/m;
if (!dataObjectRe.test(src)) {
  fail('Supabase signUp options.data 위치를 찾지 못했습니다.');
}
src = src.replace(dataObjectRe, `$1student_name:\n                                    studentName.trim(),\n\n                                $2`);

// 4) add student name field before email
const emailLabelRe = /(\s*<label>\s*이메일\s*<input[\s\S]*?placeholder="example@email\.com"[\s\S]*?<\/label>)/m;
const emailMatch = src.match(emailLabelRe);
if (!emailMatch) {
  fail('회원가입 폼의 이메일 입력칸을 찾지 못했습니다.');
}
const studentField = `\n                <label>\n                    학생 이름\n                    <input\n                        className="normal"\n                        type="text"\n                        value={studentName}\n                        onChange={e =>\n                            setStudentName(e.target.value)\n                        }\n                        required\n                        maxLength={30}\n                        autoComplete="name"\n                        placeholder="아이 이름을 입력해주세요."\n                        style={{\n                            width: '100%',\n                            marginTop: 7\n                        }}\n                    />\n                </label>\n`;
src = src.replace(emailLabelRe, `${studentField}$1`);

// 5) privacy disclosure text
src = src.replace('항목: 이메일, 회원 식별자', '항목: 이메일, 학생 이름, 회원 식별자');

if (src === original) {
  fail('변경된 내용이 없습니다.');
}

fs.writeFileSync(target, src, 'utf8');
console.log('✓ app/signup/page.js 학생 이름 입력/저장 적용');
console.log(`✓ 백업: ${path.relative(root, backupDir)}`);
console.log('\n완료: 새 회원가입부터 Supabase Auth user_metadata.student_name에 학생 이름이 저장됩니다.');
