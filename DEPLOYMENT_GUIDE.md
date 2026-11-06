# 동북 스쿨월드 배포 준비 안내 (2026-11-06)

아직 GitHub/Netlify/Render에 업로드하거나 배포하지 않았습니다. 기존 ChatGPT Site도 이번에는 갱신하지 않았습니다.

## 실제 구현 상태

Vite 6.1.0, Three.js 0.180.0, JavaScript ESM, Node.js 22, ws 8.18.3. Three.js 학교와 11종 동물/원본 애니메이션 유지. 학생 번호 1~32 + 인증 교사 1명으로 단일 학교를 구성합니다. 중복 번호는 거절하고 연결 종료 30초 동안 토큰으로 위치를 복구합니다. 서버 재시작/절전/재배포 시 메모리 상태는 사라집니다. 여러 학급 방 분리나 외부인 입장 코드는 아직 없습니다. Origin 허용은 브라우저 출처 제한이며 학생 신원 인증을 대신하지 않습니다.

서버 판정 경찰과 도둑 기능을 구현했습니다. 교사 준비·시작·정지·재개·종료, 역할 배정, 체포 거리/벽/높이/쿨다운 판정, 감옥 제한, 2초 구출, 보호 시간, 승패와 결과를 제공합니다. GAME_IMPLEMENTATION.md에 명령·검증·한계를 기록했습니다.

기존 서버 입력 검증, 30Hz 이동/충돌 계산, 15Hz 전체 스냅샷 유지. 본인은 즉시 예측 이동 후 입력 순번으로 보정하고 다른 캐릭터는 위치 보간합니다. 인터넷 지연이 없어지는 것은 아니며, 한국 기기↔싱가포르 서버 왕복 시간, Wi-Fi, 학교 방화벽, 무료 CPU 경쟁에 영향을 받습니다. Upstash는 설치/설정하지 않습니다.

## 파일과 업로드 대상

| 서비스 | 업로드/연결 대상 | 역할 |
|---|---|---|
| GitHub | 이 프로젝트 폴더의 전체 내용 | 비공개 소스 저장소 |
| Netlify | 같은 GitHub 저장소 연결 | npm run build의 dist 배포 |
| Render | 같은 GitHub 저장소 연결 | Node WebSocket 서버 실행 |

ZIP을 풀었을 때 package.json, netlify.toml, render.yaml, index.html, src/, server/, public/, tests/, scripts/, docs/가 저장소 최상단에 있어야 합니다. node_modules/, .git/, .env, 비밀코드는 올리지 않습니다. HTML 한 파일 또는 dist만 GitHub에 올리면 서버 실행에 필요한 공유 모듈이 빠집니다. 원본 에셋 ZIP도 불필요합니다. 동물 에셋의 소스 재배포 제한 때문에 GitHub 저장소는 Private로 만드세요.

## 1. GitHub 준비

1. GitHub 로그인 → New repository → 이름 dongbuk-schoolworld → Private → 생성.
2. Add file → Upload files에서 압축을 푼 프로젝트 안의 파일/폴더 전체를 업로드 → Commit changes.
3. package.json이 저장소 첫 화면에 보이는지 확인합니다. .env 파일과 교사 비밀코드는 넣지 않습니다.

## 2. Netlify 사이트 주소 먼저 확보

1. Netlify에서 새 프로젝트 → 기존 저장소 가져오기 → GitHub 연결 → 위 비공개 저장소 선택.
2. Base directory는 비워 둡니다. Build command는 `npm ci && npm run build`, Publish directory는 `dist`. netlify.toml이 같은 값을 제공합니다.
3. Free 요금제를 확인합니다. 최초 사이트를 생성하면 YOUR-SITE.netlify.app 주소를 기록합니다. 이 단계에서 프런트는 열려도 실시간 서버는 아직 연결되지 않습니다.

## 3. Render 실시간 서버

초보자는 New → Web Service → 같은 GitHub 저장소 연결 방식이 간단합니다. render.yaml은 Blueprint로 가져올 때 사용할 동일 설정입니다. 수동 생성과 Blueprint 생성 중 하나만 사용하세요.

| 설정 | 값 |
|---|---|
| Runtime | Node |
| Root Directory | 비워 둠 |
| Region | Singapore (선택 가능 시) |
| Build Command | npm ci --omit=dev |
| Start Command | npm run server |
| Instance Type | Free |
| Health Check Path | /health |
| Auto Deploy | Off 권장 (수업 중 자동 재시작 방지) |

Environment에 다음을 추가합니다.

- NODE_ENV = production
- NODE_VERSION = 22.16.0
- ALLOWED_ORIGINS = https://YOUR-SITE.netlify.app (끝에 / 없이 실제 Netlify 주소)
- TEACHER_CODE = 직접 정한 충분히 긴 무작위 비밀코드

PORT는 Render가 제공합니다. 0.0.0.0과 PORT를 코드에서 사용하므로 별도 포트 개방이 필요하지 않습니다. 교사 코드를 VITE_ 변수로 만들지 마세요. Blueprint 사용 시 ALLOWED_ORIGINS와 TEACHER_CODE는 sync:false 입력 항목입니다.

생성/Deploy 후 서비스 주소 https://YOUR-SERVICE.onrender.com을 기록합니다. 브라우저에서 그 주소 뒤에 /health를 붙여 열면 {"ok":true}가 나와야 합니다. 최초 절전 복귀에는 시간이 걸릴 수 있습니다.

## 4. Netlify와 Render 연결

1. Netlify 프로젝트 Environment variables에 VITE_GAME_SERVER_URL = wss://YOUR-SERVICE.onrender.com/school 추가.
2. Netlify에서 새 프로덕션 빌드를 실행합니다. VITE_ 값은 빌드 시 번들에 들어가므로 변수 변경만으로 이미 배포된 화면은 바뀌지 않습니다.
3. Netlify HTTPS 게임 주소로 입장 → 학생으로 함께 접속 → 서로 다른 번호 사용. 서버 주소가 Render의 wss://.../school인지 확인합니다.
4. 교사는 교사 접속을 선택하고 Render에 설정한 TEACHER_CODE를 입력합니다. 화면의 술래잡기 준비 → 게임 시작을 누릅니다. 학생 2명 이상이면 시작되며, 준비 버튼을 누르지 않은 접속 학생도 참가합니다.
5. Netlify 도메인을 바꾸면 Render의 ALLOWED_ORIGINS도 변경하고 서버를 다시 배포합니다. 개발 프리뷰의 임시 도메인은 자동 허용하지 않습니다.

## 5. 실제 기기 확인

먼저 PC 2대 또는 서로 다른 브라우저에서 번호 1/2로 입장합니다. 이름·동물·이동·점프가 상대 화면에 보이는지 확인합니다. 새로고침, 잠시 연결 해제, 같은 번호 중복 접속, 교사 코드 오입력을 확인합니다. 이후 학생 32명+교사 순서로 늘립니다. 학교에서 wss 연결을 차단하면 학교 네트워크 담당자에게 정확한 Render 서버 도메인을 전달합니다.

## 6. 부하 테스트

로컬: Node.js 설치 후 프로젝트 폴더에서 `npm ci`, `npm run test:load`.
교사 명령으로 경기를 시작하며 기본 30초 동안 학생 32개+교사 1개 소켓이 30Hz 이동 입력과 초당 RTT 핑을 보냅니다. 서버 스냅샷 간격, RTT p50/p95, 수신량, 연결 유지, 실행 프로세스 RSS/이벤트 루프를 측정합니다. 로컬 모드는 서버와 봇을 같은 프로세스에서 실행하므로 이 메모리는 서버 단독 수치가 아닙니다. GPU 렌더링은 포함하지 않습니다.

배포 후 자기 서버의 비어 있는 테스트 시간에 macOS 터미널에서:

```sh
export LOAD_TEST_URL='wss://YOUR-SERVICE.onrender.com/school'
export LOAD_TEST_ORIGIN='https://YOUR-SITE.netlify.app'
read -s LOAD_TEST_TEACHER_CODE
export LOAD_TEST_TEACHER_CODE
export LOAD_TEST_SECONDS=120
npm run test:load
unset LOAD_TEST_TEACHER_CODE
```

read 명령 다음 줄에서 자기 교사 코드를 입력하고 Enter를 누릅니다. 실제 학생 접속 중에는 번호를 점유하므로 실행하지 않습니다. 원격 모드의 RSS/이벤트 루프는 봇 실행 컴퓨터 값이며 Render 서버 측 메모리/CPU는 Render Metrics로 별도 확인해야 합니다. 운영용 서버를 깨우기 위한 주기적 테스트로 사용하지 않습니다.

## 7. 무료 플랜과 한계

2026-11-06 공식 문서 확인 기준입니다. 실제 계정 Dashboard의 적용 요금제/사용량을 우선 확인하세요.

- Render Free: 15분 동안 HTTP 요청 및 기존 연결의 수신 WebSocket 메시지가 없으면 절전. 복귀는 약 1분. 월 750 무료 인스턴스 시간이 워크스페이스 내 공유됩니다. 활성 WebSocket 메시지는 현재 절전 판단에 포함됩니다. 연결 유지 시간 제한은 없지만 플랫폼 재시작은 가능합니다. 무료는 단일 인스턴스, 영구 디스크 없음. 서버 재시작 시 이 프로젝트 상태 초기화.
- Render WebSocket의 서버→인터넷 데이터는 대역폭 사용량입니다. 월 포함 대역폭·빌드 분량은 계정 Billing에서 확인합니다. 초과 시 결제수단/지출 설정에 따라 과금 또는 서비스 중지/빌드 중단이 발생할 수 있습니다. 33명 접속 허용과 무료 CPU에서 부드러운 플레이 보장은 다른 문제입니다.
- Netlify 신규 Credit Free: 월 300크레딧 hard limit. 프로덕션 배포당 15, 대역폭 GB당 20, 요청 1만건당 2크레딧이 같은 잔액을 사용합니다. 정적 사이트가 개별 절전 복귀하는 구조는 아니나 무료 크레딧 소진 시 사이트 사용이 제한될 수 있습니다. 2025-09-04 이전 계정은 Legacy일 수 있습니다.
- 예: 다른 사용이 전혀 없다면 프로덕션 1회(15) + 전송 1GB(20) = 35크레딧에 요청분이 추가됩니다. 300크레딧이 각각 별개의 배포/대역폭 한도로 제공되는 것이 아닙니다.
- 이 게임은 전체 33인 상태를 각 기기에 15Hz로 전송하므로 Render 송신량이 작지 않습니다. docs/load-test-game.json의 압축 전송량 추정치를 참고하되 실제 프록시/프로토콜 오버헤드와 좌표 길이에 따라 달라집니다. 수업 전 서버 /health를 직접 열어 깨우고 두 기기로 확인하세요. 무료로 시험 운영할 수 있지만 상시 수업 품질/무제한 무료는 보장하지 않습니다.

공식 근거:
https://render.com/docs/free
https://render.com/docs/websocket
https://render.com/changelog/free-web-services-now-remain-active-while-receiving-websocket-messages
https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/

## 8. 오류 해결

- 화면은 열리는데 다른 사람이 안 보임: 혼자 둘러보기 대신 학생으로 함께 접속인지, wss://주소/school, Render 상태를 확인.
- 바로 연결 종료: ALLOWED_ORIGINS의 https/도메인/끝 슬래시 확인. 번호가 이미 점유되어 있는지 확인.
- 교사 접속 불가: Render 서버 환경 변수 TEACHER_CODE 확인. Netlify 변수에 비밀번호를 넣지 않음.
- 처음만 연결 지연: Render 절전 복귀 가능. /health 확인 후 다시 시도.
- 동물이 바뀌어도 상대에게 반영 안 됨: 프런트와 서버의 소스 버전이 같은지 확인.
- 재시작 후 위치 초기화: 현재 인메모리 설계의 정상 한계. 지속 저장은 아직 구현하지 않음.

최신 로컬 게임 부하 결과는 docs/load-test-game.json 및 GAME_IMPLEMENTATION.md 참조. 33/33 연결, 60초, 오류 0, 압축 후 관측 전송량 약 30.49MB, 시간당 약 1.83GB 추정. RTT p95 8ms는 로컬 루프백 값이며 인터넷 성능이 아닙니다. 기존 docs/load-test-local.json은 게임 구현·전송 압축 이전의 과거 측정입니다. Render 원격 부하와 실제 33대 브라우저 테스트는 수행하지 않았습니다.
