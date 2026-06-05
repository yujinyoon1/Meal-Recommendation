#!/usr/bin/env bash
#
# check_project.sh — p14.sumzip.com 서비스 (frontend:9514 / backend:9534) 운영 스크립트
#
# 구조: host nginx → frontend(vite dev, :9514) → /api 프록시 → backend(:9534)
#       두 프로세스는 pm2로 관리 (이름: p14-frontend / p14-backend).
#
# 사용법:
#   ./check_project.sh start     # 서비스 시작 (이미 떠 있으면 건너뜀)
#   ./check_project.sh stop      # 서비스 종료
#   ./check_project.sh restart   # 서비스 재시작
#   ./check_project.sh status    # 현재 상태 + 헬스체크 (보너스)
#
set -euo pipefail

# ── 설정 ────────────────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PM2_HOME="${PM2_HOME:-/Users/pioneer14/.pm2}"

BACKEND_NAME="p14-backend"
FRONTEND_NAME="p14-frontend"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
BACKEND_PORT=9534
FRONTEND_PORT=9514

# pm2/npm/node 가 설치된 디렉터리 (PATH 에 없을 때 폴백)
FALLBACK_NODE_BIN="/Users/euclidsoft/.nvm/versions/node/v25.3.0/bin"

# ── pm2 경로 해석 ───────────────────────────────────────────────────────
if ! command -v pm2 >/dev/null 2>&1 && [ -x "$FALLBACK_NODE_BIN/pm2" ]; then
  PATH="$FALLBACK_NODE_BIN:$PATH"
fi
if ! command -v pm2 >/dev/null 2>&1; then
  echo "error: pm2 를 찾을 수 없습니다 (PATH + 폴백 $FALLBACK_NODE_BIN)" >&2
  exit 1
fi
# pm2 가 자식(npm)을 띄울 수 있도록 pm2 의 bin 디렉터리를 PATH 앞에 보장
PM2_DIR="$(cd "$(dirname "$(command -v pm2)")" && pwd)"
case ":$PATH:" in *":$PM2_DIR:"*) ;; *) PATH="$PM2_DIR:$PATH" ;; esac
export PATH

# ── 헬퍼 ────────────────────────────────────────────────────────────────
exists()    { pm2 describe "$1" >/dev/null 2>&1; }
# online 판별: pm2 pid 는 실행 중이면 실제 PID, 정지 시 0, 미등록 시 빈값 (ANSI 영향 없음)
is_online() {
  local p
  p="$(pm2 pid "$1" 2>/dev/null | tr -d '[:space:]')"
  [ -n "$p" ] && [ "$p" != "0" ]
}

launch_one() {  # name dir
  pm2 start npm --name "$1" --cwd "$2" -- run dev >/dev/null
}

start_one() {  # name dir
  local name="$1" dir="$2"
  if is_online "$name"; then
    echo "  [$name] 이미 실행 중 — 건너뜀"
  elif exists "$name"; then
    pm2 start "$name" >/dev/null && echo "  [$name] 시작됨 (재개)"
  else
    launch_one "$name" "$dir" && echo "  [$name] 신규 기동됨"
  fi
}

stop_one() {  # name
  if exists "$1"; then
    pm2 stop "$1" >/dev/null && echo "  [$1] 종료됨"
  else
    echo "  [$1] 등록되어 있지 않음 — 건너뜀"
  fi
}

restart_one() {  # name dir
  local name="$1" dir="$2"
  if exists "$name"; then
    pm2 restart "$name" --update-env >/dev/null && echo "  [$name] 재시작됨"
  else
    launch_one "$name" "$dir" && echo "  [$name] 신규 기동됨"
  fi
}

# 포트가 LISTEN 상태가 될 때까지 대기 (최대 ~20s)
wait_port() {  # port label
  local port="$1" label="$2" i=0
  while [ "$i" -lt 40 ]; do
    if lsof -iTCP:"$port" -sTCP:LISTEN -nP >/dev/null 2>&1; then
      echo "  ✓ $label  (:$port LISTEN)"
      return 0
    fi
    sleep 0.5; i=$((i + 1))
  done
  echo "  ✗ $label  (:$port 응답 없음 — 'pm2 logs $label' 확인)"
  return 1
}

health_check() {
  echo "── 헬스체크 ──"
  local ok=0
  wait_port "$BACKEND_PORT" "$BACKEND_NAME"   || ok=1
  wait_port "$FRONTEND_PORT" "$FRONTEND_NAME" || ok=1
  # 백엔드 readiness (db/llm)
  local ready
  ready="$(curl -s --max-time 8 "http://localhost:$BACKEND_PORT/health/ready" 2>/dev/null || true)"
  if printf '%s' "$ready" | grep -q '"status":"ready"'; then
    echo "  ✓ backend /health/ready : $ready"
  elif [ -n "$ready" ]; then
    echo "  ⚠ backend /health/ready : $ready"; ok=1
  else
    echo "  ✗ backend /health/ready : 무응답"; ok=1
  fi
  return "$ok"
}

usage() {
  cat <<EOF
사용법: $(basename "$0") {start|stop|restart|status}

  start    서비스 시작 (이미 실행 중이면 건너뜀)
  stop     서비스 종료
  restart  서비스 재시작
  status   현재 상태 + 헬스체크

대상: $FRONTEND_NAME(:$FRONTEND_PORT) / $BACKEND_NAME(:$BACKEND_PORT)  ·  공개: https://p14.sumzip.com
EOF
}

# ── 메인 ────────────────────────────────────────────────────────────────
ACTION="${1:-}"
case "$ACTION" in
  start)
    echo "▶ 서비스 시작…"
    start_one "$BACKEND_NAME"  "$BACKEND_DIR"
    start_one "$FRONTEND_NAME" "$FRONTEND_DIR"
    pm2 save >/dev/null 2>&1 || true
    echo
    health_check || true
    ;;
  stop)
    echo "■ 서비스 종료…"
    stop_one "$FRONTEND_NAME"
    stop_one "$BACKEND_NAME"
    pm2 save >/dev/null 2>&1 || true
    ;;
  restart)
    echo "↻ 서비스 재시작…"
    restart_one "$BACKEND_NAME"  "$BACKEND_DIR"
    restart_one "$FRONTEND_NAME" "$FRONTEND_DIR"
    pm2 save >/dev/null 2>&1 || true
    echo
    health_check || true
    ;;
  status)
    pm2 ls
    echo
    health_check || true
    ;;
  ""|-h|--help|help)
    usage
    [ -z "$ACTION" ] && exit 1 || exit 0
    ;;
  *)
    echo "error: 알 수 없는 옵션 '$ACTION'" >&2
    echo
    usage
    exit 1
    ;;
esac
