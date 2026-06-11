# Intent - Plan

설계 산출물은 [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [quickstart.md](./quickstart.md)에 생성됨.

- **스택**: 001/002 계승(Vue3+TS / Node20+Express+mysql2 / MariaDB), 신규 외부 의존성 없음.
- **아키텍처 핵심**: 추천 오케스트레이터의 결정적 강화 단계(PreferenceLoader→ExpiryEvaluator→PromptBuilder→LLM→**AllergyValidator 최종 게이트**→Nutrition→DiversityGuard).
- **학습 루프**: 이벤트 기반 통계 가중치(LLM 비호출).
- **Constitution Check**: Pre/Post-Design 모두 통과(위반 없음).
