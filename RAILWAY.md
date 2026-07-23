# Railway 배포 가이드

이 앱은 SQLite + PDF 업로드라 **Volume(`/data`)** 이 필수입니다.

## 비용 (중요)

Railway는 **상시 무료가 아닙니다.**

| 플랜 | 내용 |
|------|------|
| Trial | 일회성 크레딧 약 **$5** (기간 제한) |
| Hobby | 월 **$5** + 포함 사용량 (그 이상이면 추가) |

작은 사이드 프로젝트는 Hobby 안에서 끝나는 경우가 많지만, **이 이미지에 LibreOffice가 들어가서** 빌드·RAM 사용이 커서 trial 크레딧이 빨리 소진될 수 있습니다.

---

## 1. 준비

1. 코드를 GitHub에 push
2. [railway.com](https://railway.com) 가입 → GitHub 연동

## 2. 프로젝트 생성

1. **New Project** → **Deploy from GitHub repo**
2. 이 저장소 선택
3. Railway가 `Dockerfile` / `railway.toml`을 보고 빌드 시작

첫 빌드는 LibreOffice 때문에 **10~20분** 걸릴 수 있습니다.

## 3. Volume 추가 (필수)

서비스 클릭 → **Settings** → **Volumes** → **Add Volume**

- Mount path: `/data`
- 크기: 1~5GB 정도 (PDF 양에 따라)

없으면 재배포할 때마다 DB·업로드가 날아갑니다.

## 4. 공개 URL

**Settings → Networking → Generate Domain**

예: `https://your-app.up.railway.app`

## 5. 환경 변수

**Variables** 탭에 추가:

| Key | Value |
|-----|--------|
| `AUTH_URL` | `https://your-app.up.railway.app` (Generate Domain과 동일) |
| `AUTH_SECRET` | `openssl rand -base64 32` 결과 |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |
| `GEMINI_API_KEY` | Gemini API 키 |
| `DATABASE_URL` | `file:/data/db/prod.db` |
| `UPLOADS_DIR` | `/data/uploads` |

`PORT`는 Railway가 자동 주입합니다. 직접 넣지 마세요.

저장하면 재배포됩니다.

## 6. Google OAuth

Google Cloud Console → OAuth 클라이언트:

- Authorized JavaScript origins: `https://your-app.up.railway.app`
- Authorized redirect URI: `https://your-app.up.railway.app/api/auth/callback/google`

## 7. 확인

1. Deploy Logs에서 `prisma migrate deploy` / `Ready` 확인
2. 브라우저로 도메인 접속 → Google 로그인 → PDF 업로드 테스트

---

## 자주 하는 실수

| 증상 | 원인 |
|------|------|
| 재배포 후 로그인/파일 증발 | Volume `/data` 미연결 |
| Google 로그인 실패 | `AUTH_URL` / redirect URI 불일치 |
| Healthcheck 실패 | `/login`이 떠야 함 (이미 `railway.toml`에 설정) |
| 빌드 OOM / 크레딧 급감 | LibreOffice 포함 이미지 — Hobby로 올리거나 리소스 확인 |

## 업데이트

GitHub `main`에 push하면 자동 재배포됩니다. Volume의 `/data`는 유지됩니다.

## Docker 없이 가볍게 올리고 싶다면

PPTX 변환(LibreOffice)을 포기하면 Dockerfile 대신 Nixpacks로 더 싸게 돌릴 수 있습니다. 필요하면 그 설정으로 바꿔 줄 수 있습니다.
