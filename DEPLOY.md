# Oracle Always Free VM 배포 (전략 1)

Next.js + SQLite + 로컬 PDF 업로드를 **영구 디스크 볼륨**에 올려 상시 무료로 돌리는 구성입니다.

## 구성

| 구성요소 | 역할 |
|---------|------|
| Oracle Always Free ARM VM | 상시 무료 서버 |
| Docker Compose `app` | Next.js + Prisma SQLite + LibreOffice(PPTX) |
| Docker volume `app_data` | `/data/db` (SQLite), `/data/uploads` (PDF) |
| Caddy | HTTPS(Let’s Encrypt) + 리버스 프록시 |

## 0. Oracle에서 VM 만들기

1. [Oracle Cloud](https://cloud.oracle.com/) 가입 (Always Free)
2. **Compute → Instances → Create**
   - Image: **Ubuntu 22.04 or 24.04**
   - Shape: **VM.Standard.A1.Flex** (Ampere ARM) — 권장 (OCPU 2 / Memory 12GB 정도)
   - 또는 x86 Always Free micro (스펙이 빡빡함)
3. SSH 키 등록 후 인스턴스 생성
4. **VCN → Subnet → Security List → Ingress**에 추가:
   - TCP **80** (0.0.0.0/0)
   - TCP **443** (0.0.0.0/0)
5. 퍼블릭 IP 확인

## 1. 도메인 (무료)

Google OAuth와 Let’s Encrypt는 **도메인**이 필요합니다.

- [DuckDNS](https://www.duckdns.org/) 등으로 무료 서브도메인 생성
- A 레코드를 VM 퍼블릭 IP로 지정
- 예: `my-study.duckdns.org`

## 2. VM 초기 설정

```bash
ssh ubuntu@YOUR_PUBLIC_IP   # 이미지가 opc 사용자면 opc@...

git clone YOUR_REPO_URL ~/project
cd ~/project
bash deploy/setup-vm.sh
# docker 그룹 적용을 위해 한 번 로그아웃 후 재접속
```

## 3. 환경 변수

```bash
cd ~/project
cp .env.example .env
nano .env
```

필수:

- `DOMAIN` — DuckDNS 등 호스트명 (HTTPS에 사용)
- `AUTH_URL` — `https://같은도메인`
- `AUTH_SECRET` — `openssl rand -base64 32`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
- `GEMINI_API_KEY`

### Google OAuth 리다이렉트

Google Cloud Console → OAuth 클라이언트:

```
https://YOUR_DOMAIN/api/auth/callback/google
```

Authorized JavaScript origins:

```
https://YOUR_DOMAIN
```

## 4. 배포

```bash
cd ~/project
bash deploy/deploy.sh
```

확인:

```bash
docker compose ps
docker compose logs -f app
```

브라우저: `https://YOUR_DOMAIN`

## 5. 이후 업데이트 (노트북에서)

```bash
export DEPLOY_HOST=ubuntu@YOUR_PUBLIC_IP
export DEPLOY_DIR=~/project
bash deploy/remote-deploy.sh
```

또는 VM에서:

```bash
cd ~/project && git pull && bash deploy/deploy.sh
```

## 백업 (중요)

SQLite·업로드는 Docker volume에 있습니다. 주기적으로 복사하세요.

```bash
# DB + uploads 스냅샷
docker compose exec app tar -C /data -czf - . > backup-$(date +%F).tar.gz
```

복구:

```bash
docker compose down
# volume 내용 복원 후
docker compose up -d
```

## 문제 해결

| 증상 | 확인 |
|------|------|
| HTTPS 실패 | DNS A레코드, Security List 80/443, `DOMAIN` 값 |
| Google 로그인 실패 | `AUTH_URL`, redirect URI, `AUTH_GOOGLE_*` |
| PPTX 변환 실패 | `docker compose logs app` — LibreOffice 오류 |
| 빌드 느림 | ARM 첫 빌드는 수 분~십여 분 소요 (정상) |
| 디스크/권한 | `docker compose exec app ls -la /data` |

## 로컬에서 이미지 스모크 테스트

```bash
cp .env.example .env   # DOMAIN=localhost 가능 (HTTP)
# .env에서 AUTH_* / GEMINI 채우기
DOMAIN=localhost docker compose up --build
```

`localhost`면 Caddy가 내부 CA/로컬 모드로 뜨고, 실제 TLS는 공인 `DOMAIN`일 때 발급됩니다.
