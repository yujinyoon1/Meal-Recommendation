# Seeds

## seed-masters

알레르기·질병 마스터 + 샘플 alias를 입력합니다.

```bash
npm run seed:masters
```

- `allergy_master`: 12종 (땅콩/견과/계란/우유/대두/밀/생선/갑각류/메밀/토마토/복숭아/아황산)
- `disease_master`: 7종 (고혈압/2형당뇨/이상지질혈증/CKD/통풍/IBS/셀리악)
- `ingredient_alias`: 샘플 5개 — `foods.code`와 매칭되는 경우만 입력. seed-foods 이후 다시 실행 권장.

## seed-foods

식약처 식품영양성분 DB CSV를 `foods` 테이블로 일괄 입력합니다.

### 입력 위치
프로젝트 루트의 `data/foods.csv` (Git에는 미포함 — `.gitignore`에 포함).

### CSV 헤더(필수)
```
code,name_ko,category,kcal_per_100g,carb_g,protein_g,fat_g,fiber_g,sodium_mg,source,version
```

### 다운로드 경로 (TODO)
- 식품의약품안전처: 식품영양성분 DB (https://various.foodsafetykorea.go.kr/nutrient/)
- 농촌진흥청 국가표준식품성분표

수동으로 다운로드한 CSV를 위 헤더 형식으로 변환하여 `data/foods.csv`에 둡니다.

### 실행
```bash
npm run seed:foods
```

파일이 없으면 에러 없이 종료(스킵). 배치 1,000행씩 `ON DUPLICATE KEY UPDATE`로 idempotent.

### 라이선스/주기
- 식약처 데이터는 출처 표시 의무가 있습니다. `source`, `version` 컬럼을 반드시 채울 것.
- 분기별(3개월) 재시드 권장 — `version` 컬럼으로 변경 추적.
