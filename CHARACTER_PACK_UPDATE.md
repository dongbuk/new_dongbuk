# 캐릭터 팩 추가 — 2026.11.06-character-packs-1

## 적용
기존 11종을 보존하고 10종을 추가하여 총 21종을 입장/게임 시작 전 꾸미기에서 선택할 수 있습니다.
- source.zip: 말, 사슴, 아기 고양이, 강아지, 펭귄, 닭, 호랑이. 실제 원본의 idle/walk/run 클립을 보존했습니다. 말의 먹기, 호랑이의 두 번째 idle은 idle_alt로 연결했습니다. 점프 전용 클립이 없으므로 공중에서는 idle 자세를 사용합니다.
- cute-enemy-slime.zip: BigSlime/SmallSlime 두 실제 메쉬를 분리했습니다. 제공된 원본 텍스처를 연결했습니다. 원본에 뼈대/애니메이션이 없어 스케일 기반 탄성 동작을 직접 추가했습니다.
- free_pack_stick_man_rigged.zip: 실제 스틱맨 모델과 원본 스킨/뼈대를 유지했습니다. 원본에는 애니메이션과 이미지 텍스처가 없어서 회색 재질과 직접 작성한 간단한 관절 동작을 사용합니다. 제작자의 애니메이션이라고 표시하지 않습니다.
- 모든 캐릭터가 동일한 이동/충돌 규칙을 사용합니다. 서버와 프런트가 같은 목록을 읽습니다.
- 텍스처는 최대 512×512. 추가 GLB 합계 약 5.2 MiB. 모델/텍스처/클립은 캐시로 공유하고 뼈대는 플레이어별 분리합니다.
- 전원 구출, 무작위 안전 위치 재등장, 구조자와 구출된 전원 3초 보호, 달리기 게이지, 입장 UI 패치 모두 포함됩니다.

## 할로윈 5종은 미적용
willowboxart_halloween_characters_fab_tpose_fbx.zip의 자체 README와 실제 FBX 모두 뼈대·스킨·애니메이션이 없는 T-Pose라고 확인했습니다. 자연스러운 보행을 위해 별도 리깅/스킨 가중치 작업 또는 rigged/animated 버전이 필요합니다. T-Pose 모델을 완성된 보행 캐릭터로 표시하지 않았습니다.
README는 ‘Fab listing에서 선택한 라이선스’를 적용한다고만 합니다. 동일 제작자의 다른 Halloween Asset Pack/CGTrader 판매 조건을 이 파일에 임의로 적용하지 않았습니다. 이 ZIP의 정확한 Fab 상품 링크/라이선스 정보가 필요합니다.

## 라이선스 확인 (2026-11-06)
- ithappy: https://www.fab.com/listings/0c8f3917-2461-4775-a853-b995bb93bac5 . 일치하는 Animals FREE 팩과 7종 확인. AI usage No 표시. Fab의 공식 설명은 NoAI를 생성형 AI 데이터 수집 제한으로 설명합니다: https://dev.epicgames.com/documentation/fab/licenses-and-pricing-in-fab . 이 작업은 로컬 Blender의 결정적 포맷 변환/게임 연결이며 생성형 이미지·3D 모델 서비스에 에셋을 입력하거나 학습하지 않습니다. 다운로드 계정의 취득 기록은 확인하지 않았으므로 보관해 주세요.
- Slime: Fab에서 AI usage Yes, 동일 모델의 제작자 Sketchfab 페이지에서 CC Attribution 확인. 작성자 Lucrecia Ferrari / Saturniccc, CC BY 4.0 링크와 변경 내역을 공개 credits.html에 포함했습니다.
- Stickman: 동일 모델 제작자의 Sketchfab 페이지에서 CC Attribution 확인. Fab 페이지 직접 조회는 차단되어 Fab 고유 AI 태그는 미확인. CC BY 공개본을 근거로 출처/수정 표시를 포함했습니다. 원본 모델을 생성형 서비스에 전달하지 않았습니다.
- 공개 게임의 ? 도움말에서 ‘캐릭터 제작자 및 라이선스’ 링크 접근 가능.
- 기존 Quirky 팩 등 원본 재배포 제한이 있으므로 소스 저장소는 Private 유지. 완성 게임만 배포.

## 배포
이 폴더의 전체 내용을 기존 GitHub 저장소 같은 위치에 덮어씁니다. ZIP 자체/바깥 폴더를 업로드하지 않습니다.
Render와 Netlify 모두 같은 커밋으로 재배포해야 새 캐릭터 ID를 허용합니다.
health 및 화면 우측 아래 양쪽 버전: 2026.11.06-character-packs-1.
실제 GitHub 저장소 URL을 아직 받지 못했으므로 배포 원본/브랜치 불일치는 진단 전이며 이 파일만으로 배포 완료를 의미하지 않습니다.

## 검증 범위
GLB 로딩·원본 스킨 분리·재질·실제 애니메이션 변화·33개 혼합 리그 CPU 검증, 서버 선택 목록/전환 및 기존 게임 회귀 테스트. 실제 배포 환경의 브라우저 33대 및 모바일 GPU 성능은 미검증입니다.

검증 결과: npm test 51/51 통과, Vite production build 성공. 모델/텍스처 오프라인 렌더 확인. 브라우저 실제 화면과 33대 GPU 성능은 미검증. 빌드의 500KB 청크 크기 경고는 남아 있습니다.
