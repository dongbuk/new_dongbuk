# Netlify 배포

GitHub 연동으로 배포합니다. HTML만 끌어다 놓는 배포로는 서버 함수가 배포되지 않습니다.

1. 파일받기 HTML에서 받은 파일들을 이름과 폴더 구조 그대로 GitHub 저장소에 올립니다.
2. Netlify에서 새 프로젝트를 추가하고 GitHub 저장소를 가져옵니다.
3. Base directory와 Build command는 비워두고 Publish directory는 `.`으로 지정합니다. Functions directory는 설정 파일의 `netlify/functions`가 적용됩니다.
4. 프로젝트의 Environment variables에 다음 이름으로 값을 저장합니다. 함수 실행 환경에 적용되어야 합니다. 무료 플랜 등에서 Scope 선택이 없다면 기본 적용으로 저장합니다.
   - UPSTASH_REDIS_REST_URL
   - UPSTASH_REDIS_REST_TOKEN
   - TEACHER_GAME_CODE
5. 새 배포를 실행하고 완료된 사이트 주소로 입장합니다.

Redis URL과 토큰은 같은 데이터베이스의 REST API 영역에서 가져와야 합니다. Redis가 HTTP 403을 반환하면 Netlify에서도 인증/권한 문제를 별도로 해결해야 합니다. Netlify Functions의 presence 로그를 확인하세요.

로컬 검증: Netlify 요청 어댑터의 상태 코드, JSON 응답과 요청 출처 검사 테스트를 통과했습니다. 실제 Netlify 배포 및 Upstash 연결은 아직 검증하지 않았습니다.
