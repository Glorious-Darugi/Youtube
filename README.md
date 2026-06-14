# 유튜브 채널 자동 관리 시트 (YouTube → Google Sheets)

유튜브 쇼츠/롱폼 채널을 **하나의 구글 시트에서 자동으로 관리**하는 Google Apps Script 프로젝트입니다.

- 채널명 · 영상 제목 · 업로드 날짜/시간 · 조회수 → **YouTube에서 자동 수집**
- 수익 → **본인 소유(수익창출) 채널**에 한해 자동 수집 후 **원화(₩)로 환산**
- **매일 자동 갱신** (시간 트리거)
- 총 대시보드 / 채널별 대시보드 + 유형별 수익 도넛 차트 자동 생성

---

## 📁 파일 구조

| 파일 | 역할 |
|------|------|
| `appsscript.json` | 매니페스트. 타임존(Asia/Seoul), YouTube Data v3 + Analytics v2, OAuth 스코프 선언 |
| `Config.gs` | ⭐ **여기만 고치면 됨** — 채널 목록, 영상 개수, 갱신 시각, 비상 환율 |
| `Code.gs` | `setup()`(전체 설치), `onOpen()`(메뉴) |
| `YouTubeData.gs` | 채널 식별 + 영상/조회수 수집 |
| `Revenue.gs` | 수익(USD) 수집 (본인 채널만) |
| `DataSheet.gs` | "영상 관리" 시트 생성·서식 + `refreshData()` |
| `Dashboards.gs` | "총 대시보드", "채널별 대시보드", 도넛 차트 |
| `Triggers.gs` | 매일 자동 갱신 트리거 |

---

## 🚀 설치 방법

먼저 **연결할 구글 스프레드시트**가 필요합니다. 빈 스프레드시트를 하나 만들어 두세요.

설치 방법은 두 가지입니다. **둘 중 편한 것 하나만** 하면 됩니다.

### 방법 A — Apps Script 편집기에 직접 붙여넣기 (가장 쉬움, 추천)

1. 위에서 만든 **구글 스프레드시트**를 연다.
2. 상단 메뉴 **확장 프로그램 → Apps Script** 클릭 → 편집기가 열림.
3. 이 저장소의 `*.gs` 파일들을 편집기에 그대로 옮긴다.
   - 왼쪽 **＋ → 스크립트** 로 파일을 추가하고, 각 `.gs` 내용을 복사/붙여넣기.
   - (이름은 같게 맞추면 보기 편함: `Config`, `Code`, `YouTubeData` …)
4. **매니페스트 보이게 하기**: 편집기 좌측 **⚙️ 프로젝트 설정 → "appsscript.json' 매니페스트 파일 표시" 체크**.
   그런 다음 `appsscript.json` 내용을 이 저장소의 것으로 교체.
5. `Config.gs` 의 `CONFIG.CHANNELS` 를 본인 채널로 수정 → 저장(💾).
6. 함수 선택 드롭다운에서 **`setup`** 선택 → **실행(▶)**.
   - 처음엔 **권한 승인** 창이 뜸 → 계정 선택 → "이 앱은 Google에서 확인하지 않았습니다" 경고가 나오면
     **[고급] → ([프로젝트명](으)로) 이동** → 권한 허용.
7. 스프레드시트로 돌아오면 시트 3개와 데이터, 대시보드가 생성되어 있습니다.

### 방법 B — clasp 로 푸시 (개발자용)

> [clasp](https://github.com/google/clasp)는 로컬 코드를 Apps Script로 올려주는 CLI 도구입니다.

```bash
# 0) 설치 (최초 1회)
npm install -g @google/clasp

# 1) 로그인
clasp login

# 2) Apps Script API 켜기 (최초 1회)
#    https://script.google.com/home/usersettings → "Google Apps Script API" ON

# 3-a) 기존 스프레드시트에 연결된 새 프로젝트 만들기
#      (SPREADSHEET_ID 는 시트 URL 의 /d/ 와 /edit 사이 문자열)
clasp create --type sheets --title "유튜브 관리" --parentId "<SPREADSHEET_ID>" --rootDir .
#      → .clasp.json 이 자동 생성됨 (이 저장소의 placeholder .clasp.json 은 덮어써집니다)

# 3-b) 또는 이미 만든 Apps Script 프로젝트가 있으면:
#      .clasp.json 의 "scriptId" 를 그 프로젝트 ID 로 교체

# 4) 코드 업로드
clasp push

# 5) 편집기 열어서 setup 실행
clasp open
```

푸시 후에는 **방법 A의 5~7번**과 동일하게 `Config` 수정 → `setup` 실행 → 권한 승인.

---

## ⚙️ 설정 (`Config.gs`)

```js
const CONFIG = {
  CHANNELS: [
    { name: '내 쇼츠 채널', type: '쇼츠', handle: '@example_shorts', pullRevenue: true  },
    { name: '벤치마크',     type: '롱폼', channelId: 'UC...',        pullRevenue: false },
  ],
  MAX_VIDEOS: 50,        // 채널마다 가져올 최근 영상 수
  REFRESH_HOUR: 6,       // 매일 자동 갱신 시각 (0~23)
  FALLBACK_USDKRW: 1380, // 실시간 환율 조회 실패 시 비상 환율
};
```

- `handle` 또는 `channelId` **둘 중 하나**만 있으면 됩니다. (`channelId`가 더 정확)
- `pullRevenue: true` 는 **본인 소유 + 수익창출(YPP) 채널**에만 의미가 있습니다.

---

## 🖱️ 일상 사용

스프레드시트 상단에 **🔄 유튜브** 메뉴가 생깁니다.

- **지금 갱신** — 즉시 최신 데이터로 새로고침
- **대시보드 다시 만들기** — 대시보드 레이아웃/차트 재생성 (채널 추가했을 때 등)
- **전체 설치 (처음 1회)** — 최초 세팅 + 매일 자동 갱신 트리거 설치

이후에는 **매일 설정 시각에 자동으로 갱신**됩니다.

---

## 💡 시트 구성

1. **영상 관리** (원본 데이터)
   `채널명 | 유형 | 제목 | 날짜 | 시간 | 조회수 | 프리랜서 비용(수동) | 수익(원화) | 순이익` (+ 숨김: videoId, 수익_USD)
   - **프리랜서 비용**은 직접 입력하는 칸입니다. 갱신해도 **지워지지 않습니다**(videoId로 매칭 보존).
2. **총 대시보드** — 총 수익/비용/순이익 KPI, 유형별·채널별 합계, 유형별 수익 도넛 차트, 환율 셀
3. **채널별 대시보드** — 채널 선택 드롭다운 → 그 채널 KPI + 영상 목록 자동 필터

---

## ⚠️ 꼭 알아둘 점

- **프리랜서 비용은 수동 입력**입니다. (자동 수집 불가) 입력값은 갱신 시 보존됩니다.
- **수익은 본인 소유 + 수익창출(YPP) 채널만** 자동 수집됩니다.
  권한이 없거나 수익창출이 아니면 **조용히 건너뜁니다**(에러로 멈추지 않음). 실행 로그에서 확인 가능.
- **USD → KRW 환산**: 수익은 API에서 USD로 옵니다.
  총 대시보드 **E3 셀**에 `=GOOGLEFINANCE("CURRENCY:USDKRW")` 실시간 환율이 들어가고,
  이 셀이 `USDKRW` 라는 이름으로 등록됩니다. "수익(원화)" = `수익_USD × USDKRW`.
  환율 조회 실패 시 `CONFIG.FALLBACK_USDKRW` 값이 쓰입니다.
- **별도 API 키 불필요** — advanced service가 OAuth로 처리합니다. 비밀키를 코드에 넣지 마세요.
- 첫 실행 시 **미인증 앱 경고**가 나오면 `[고급] → [이동]` 으로 진행하세요. (본인이 만든 스크립트라 안전)

---

## 🔧 자주 수정하는 곳

| 하고 싶은 것 | 어디를 고치나 |
|---|---|
| 채널 추가/삭제 | `Config.gs` → `CONFIG.CHANNELS` (수정 후 메뉴 "대시보드 다시 만들기" 권장) |
| 가져올 영상 수 변경 | `Config.gs` → `MAX_VIDEOS` |
| 자동 갱신 시각 변경 | `Config.gs` → `REFRESH_HOUR` (변경 후 `setup` 재실행해 트리거 갱신) |
| 색상/브랜드 변경 | `Config.gs` → `COLORS` |
| 금액/날짜 표시 형식 | `Config.gs` → `FMT` |

---

## 🚧 버전 2 아이디어

- 일자별 조회수 히스토리 누적(별도 시트에 매일 스냅샷) → 성장 추이 그래프
- 영상별 좋아요/댓글/참여율 컬럼 추가 (Data API에 이미 있음)
- 노출/클릭률/시청 지속시간 등 Analytics 고급 지표
- 이메일/슬랙으로 일일 요약 자동 발송
