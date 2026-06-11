# Quickstart: AI 기반 스마트 식단 추천 플랫폼 (통합)

**Feature**: `003-meal-recommendation`
**Plan**: [plan.md](./plan.md)

001·002에서 구현·검증된 플랫폼의 기동·검증 절차. 신규 설치 의존성 없음.

## 1. 사전 조건

- Node.js 20 LTS, MariaDB 10.6+ (외부 호스트, 세션 TZ +09:00 KST)
- `backend/.env`, `frontend/.env.*` 구성 (`.env.example` 참조). LLM 키 없으면 Mock 어댑터 동작.
- 포트: frontend `9514`, backend `9534` (공개 도메인 `p14.sumzip.com`).

## 2. DB 마이그레이션 · 시드

```bash
cd backend
npm install
npm run migrate            # 001~029 적용
npm run migrate:status     # pending [] 확인
npm run seed:foods         # 공공 영양 DB 시드 (006)
npm run seed:thresholds    # 식품군별 임박 임계 시드 (021)
```

## 3. 빌드 · 기동

```bash
# 백엔드
cd backend && npm run build && npm test     # tsc + vitest (단위 38 pass)
# 프론트
cd ../frontend && npm run build             # vue-tsc + vite

# 서비스 (pm2)
cd .. && ./check_project.sh restart
./check_project.sh status                   # backend:9534 / frontend:9514 online
# /health/ready → {db:ok, llm:ok}
```

> p14 프로덕션 서빙: 시스템 nginx → localhost:9514(vite preview of `dist`) / 9534. **프론트 변경 시 `npm run build` 후 preview 재시작 필요.**

## 4. 골든패스 수동 검증 (https://p14.sumzip.com)

1. 회원가입 → 건강/알러지 프로필 입력 (FR-050/051)
2. 식재료 입력(유통기한·식품군 포함) → 추천 요청 → 칼로리·탄단지·**추천 근거(rationale)** 확인 (FR-053/054/003)
3. 알러지 등록 항목이 추천에서 **차단**되는지 회귀 확인 (FR-005/055)
4. 임박 재료 존재 시 대시보드 **임박 배지** + 우선 소비 추천 (FR-011/012)
5. 추천 수정·피드백 후 재추천 시 선호 반영 (FR-001/002)
6. 식단 저장 → 재사용 재추천, reuse_count 증가 (FR-020/021)
7. 건강 기록 N건 입력 → 리포트에서 체중 추이·영양 균형·**면책 문구** (FR-030~034)
8. 장보기 리스트 priority_score 정렬·사유 표기 (FR-035/036)

## 5. 성능

- 추천 응답 P95 ≤ 30s (가중치/임박 계산이 추가 LLM 호출 없이 DB 집계인지 확인, SC-009).
