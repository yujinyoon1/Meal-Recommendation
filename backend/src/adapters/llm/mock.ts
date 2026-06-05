/**
 * 결정적 Mock LLM 어댑터 — 테스트/로컬 개발용.
 * - 입력 메시지(인벤토리 포함)를 SHA-256 → 시드로 사용해 동일 입력에 동일 출력 보장.
 * - 여러 레시피 라이브러리 중 "프롬프트에 등장하는 재료와 가장 많이 겹치는" 메뉴를 고른다.
 *   → 재료가 바뀌면 추천 메뉴도 바뀐다 (실제 AI 없이도 다양성 확보).
 */
import { createHash } from 'node:crypto';
import { LlmAdapter, LlmCompleteOptions, LlmMessage, LlmResult } from './types.js';

interface MockRecipe {
  keys: string[]; // 매칭용 핵심 재료 키워드
  // 정식 한국 요리명(위키백과 표제어 존재) — 동점 시 우선 + 완성요리 사진이 잘 잡힘.
  canonical?: boolean;
  // 저칼로리·고단백 다이어트 적합 메뉴 — 목표가 체중 감량(lose_weight)이면 우선 추천.
  diet?: boolean;
  recipe: {
    name: string;
    description: string;
    ingredients: Array<{ name: string; quantity: number; unit: string }>;
    steps: string[];
    est_cooking_min: number;
    difficulty: 'easy' | 'medium' | 'hard';
  };
}

const LIBRARY: MockRecipe[] = [
  {
    keys: ['두부', '계란', '양파'],
    recipe: {
      name: '두부 계란 양파볶음',
      description: '단백질이 풍부한 1인분 간편 볶음 요리',
      ingredients: [
        { name: '두부', quantity: 100, unit: 'g' },
        { name: '계란', quantity: 2, unit: '개' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '간장', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '양파는 껍질을 벗기고 0.5cm 두께로 채 썰어 주세요. 매운맛이 싫다면 찬물에 5분 담갔다 빼면 부드러워집니다.',
        '팬을 중불로 달군 뒤 식용유 1큰술을 두르고 양파를 2~3분간 투명해질 때까지 볶아 단맛을 끌어올립니다.',
        '두부는 키친타월로 물기를 눌러 제거하고 사방 2cm로 깍둑썰어 넣은 뒤, 겉면이 노릇해지도록 약 3분 볶습니다.',
        '계란 2개를 풀어 팬 한쪽에 붓고 30초 둔 뒤 천천히 저어 스크램블처럼 부드럽게 익힙니다.',
        '간장 1큰술을 팬 가장자리에 둘러 향을 내고 가볍게 섞어 30초 더 볶은 뒤 그릇에 담아 완성합니다.',
      ],
      est_cooking_min: 12,
      difficulty: 'easy',
    },
  },
  {
    keys: ['닭가슴살', '브로콜리'],
    diet: true,
    recipe: {
      name: '닭가슴살 브로콜리 마늘볶음',
      description: '고단백 저지방 다이어트 한 끼',
      ingredients: [
        { name: '닭가슴살', quantity: 150, unit: 'g' },
        { name: '브로콜리', quantity: 100, unit: 'g' },
        { name: '마늘', quantity: 2, unit: '쪽' },
        { name: '올리브유', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '닭가슴살은 한입 크기로 썰어 소금·후추로 밑간하고 10분간 재워 둡니다.',
        '브로콜리는 작은 송이로 나눠 끓는 물에 1분간 데친 뒤 찬물에 헹궈 아삭함을 살립니다.',
        '팬에 올리브유를 두르고 편 썬 마늘을 약불에서 향이 올라올 때까지 볶습니다.',
        '닭가슴살을 넣어 중불에서 겉면이 하얗게 익을 때까지 4~5분 볶습니다.',
        '데친 브로콜리를 넣고 소금으로 간한 뒤 2분간 더 볶아 마무리합니다.',
      ],
      est_cooking_min: 18,
      difficulty: 'easy',
    },
  },
  {
    keys: ['토마토', '계란'],
    recipe: {
      name: '토마토 계란 볶음',
      description: '중화풍 새콤달콤 토마토 계란 요리',
      ingredients: [
        { name: '토마토', quantity: 2, unit: '개' },
        { name: '계란', quantity: 3, unit: '개' },
        { name: '대파', quantity: 0.5, unit: '대' },
        { name: '설탕', quantity: 1, unit: 'tsp' },
      ],
      steps: [
        '토마토는 꼭지를 떼고 6~8등분으로 썰어 둡니다.',
        '계란을 풀어 소금 약간을 넣고, 달군 팬에 반숙으로 부드럽게 익혀 따로 덜어 둡니다.',
        '같은 팬에 대파를 볶아 향을 낸 뒤 토마토를 넣고 중불에서 과즙이 나올 때까지 3분 볶습니다.',
        '설탕 1작은술로 신맛을 잡고, 익혀 둔 계란을 다시 넣어 가볍게 섞습니다.',
        '국물이 자작해지면 불을 끄고 그릇에 담아 밥과 함께 냅니다.',
      ],
      est_cooking_min: 15,
      difficulty: 'easy',
    },
  },
  {
    keys: ['애호박', '계란', '양파'],
    recipe: {
      name: '애호박 새우젓 볶음',
      description: '담백한 한식 밑반찬 한 접시',
      ingredients: [
        { name: '애호박', quantity: 1, unit: '개' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '계란', quantity: 1, unit: '개' },
        { name: '새우젓', quantity: 1, unit: 'tsp' },
      ],
      steps: [
        '애호박은 반달 모양으로 0.5cm 두께로 썰고, 양파는 채 썹니다.',
        '팬에 기름을 두르고 양파를 먼저 볶아 단맛을 낸 뒤 애호박을 넣습니다.',
        '새우젓 1작은술로 간을 하고 애호박이 투명해질 때까지 중불에서 4분 볶습니다.',
        '계란을 풀어 둘러 부어 살짝 익히고 가볍게 섞습니다.',
        '통깨를 뿌려 그릇에 담아내면 완성입니다.',
      ],
      est_cooking_min: 13,
      difficulty: 'easy',
    },
  },
  {
    keys: ['현미', '계란', '양파', '대파'],
    recipe: {
      name: '현미 계란 볶음밥',
      description: '냉장고 자투리 채소를 모은 든든한 볶음밥',
      ingredients: [
        { name: '현미밥', quantity: 1, unit: '공기' },
        { name: '계란', quantity: 2, unit: '개' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '대파', quantity: 0.5, unit: '대' },
        { name: '간장', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '양파와 대파를 잘게 다지고, 현미밥은 미리 한 김 식혀 둡니다.',
        '팬에 기름을 두르고 대파를 볶아 파기름을 낸 뒤 양파를 넣어 볶습니다.',
        '계란을 풀어 넣고 스크램블한 다음 현미밥을 넣어 고슬고슬하게 볶습니다.',
        '간장을 팬 가장자리에 둘러 불맛을 내고 전체를 고루 섞습니다.',
        '소금·후추로 간을 맞추고 그릇에 담아 통깨를 뿌립니다.',
      ],
      est_cooking_min: 16,
      difficulty: 'easy',
    },
  },
  {
    keys: ['두부', '대파', '양파'],
    canonical: true,
    recipe: {
      name: '두부 된장국',
      description: '두부와 양파로 끓이는 구수하고 든든한 한식 국물',
      ingredients: [
        { name: '두부', quantity: 150, unit: 'g' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '대파', quantity: 1, unit: '대' },
        { name: '된장', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '냄비에 물 2컵을 붓고 된장 1큰술을 체에 걸러 곱게 풀어 줍니다.',
        '채 썬 양파를 넣고 중불에서 끓이기 시작합니다.',
        '국물이 끓어오르면 깍둑썬 두부를 넣고 3분간 더 끓입니다.',
        '어슷 썬 대파를 넣고 1분간 더 끓여 향을 살립니다.',
        '간이 싱거우면 된장이나 소금으로 맞춘 뒤 따뜻할 때 밥과 냅니다.',
      ],
      est_cooking_min: 14,
      difficulty: 'easy',
    },
  },
  {
    keys: ['두부', '김치', '대파'],
    canonical: true,
    recipe: {
      name: '두부김치',
      description: '데친 두부에 볶은 김치를 곁들인 대표 안주 겸 반찬',
      ingredients: [
        { name: '두부', quantity: 300, unit: 'g' },
        { name: '김치', quantity: 150, unit: 'g' },
        { name: '돼지고기', quantity: 100, unit: 'g' },
        { name: '대파', quantity: 0.5, unit: '대' },
        { name: '참기름', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '두부는 1.5cm 두께로 썰어 끓는 소금물에 3분간 데친 뒤 물기를 빼 둡니다.',
        '돼지고기는 한입 크기로 썰어 팬에 노릇하게 볶습니다.',
        '신김치를 송송 썰어 넣고 설탕 약간과 함께 중불에서 5분간 볶습니다.',
        '어슷 썬 대파와 참기름을 넣어 향을 내고 30초 더 볶습니다.',
        '접시 한쪽에 데친 두부를, 가운데에 볶은 김치를 담아 곁들여 냅니다.',
      ],
      est_cooking_min: 18,
      difficulty: 'easy',
    },
  },
  {
    keys: ['두부', '대파', '돼지고기'],
    canonical: true,
    recipe: {
      name: '마파두부',
      description: '두부와 다진 고기를 매콤하게 졸여낸 중화풍 덮밥 반찬',
      ingredients: [
        { name: '두부', quantity: 250, unit: 'g' },
        { name: '돼지고기', quantity: 80, unit: 'g' },
        { name: '대파', quantity: 0.5, unit: '대' },
        { name: '마늘', quantity: 1, unit: '쪽' },
        { name: '두반장', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '두부는 사방 1.5cm로 깍둑썰어 끓는 소금물에 1분 데친 뒤 건져 둡니다.',
        '팬에 기름을 두르고 다진 마늘과 다진 대파를 볶아 향을 냅니다.',
        '다진 돼지고기를 넣어 색이 변할 때까지 볶은 뒤 두반장 1큰술을 넣습니다.',
        '물 1/2컵을 붓고 데친 두부를 넣어 중불에서 3분간 자작하게 졸입니다.',
        '전분물을 둘러 농도를 잡고 한 번 더 끓여 밥 위에 올려 냅니다.',
      ],
      est_cooking_min: 20,
      difficulty: 'medium',
    },
  },

  // ── 일식 ──────────────────────────────────────────────
  {
    keys: ['닭고기', '계란', '양파'],
    canonical: true,
    recipe: {
      name: '오야코동',
      description: '닭고기와 양파를 달걀로 부드럽게 덮은 일본식 덮밥',
      ingredients: [
        { name: '닭고기', quantity: 120, unit: 'g' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '계란', quantity: 2, unit: '개' },
        { name: '간장', quantity: 1, unit: 'tbsp' },
        { name: '밥', quantity: 1, unit: '공기' },
      ],
      steps: [
        '닭고기는 한입 크기로, 양파는 채 썰어 둡니다.',
        '작은 팬에 물 1/2컵, 간장 1큰술, 설탕 1작은술을 넣고 끓입니다.',
        '양파와 닭고기를 넣어 중불에서 5분간 익힙니다.',
        '풀어 둔 계란을 둘러 붓고 뚜껑을 덮어 반숙으로 익힙니다.',
        '따뜻한 밥 위에 그대로 올려 냅니다.',
      ],
      est_cooking_min: 15,
      difficulty: 'easy',
    },
  },
  {
    keys: ['소고기', '양파'],
    canonical: true,
    recipe: {
      name: '규동',
      description: '소고기와 양파를 간장 양념에 졸여 올린 일본식 소고기덮밥',
      ingredients: [
        { name: '소고기', quantity: 120, unit: 'g' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '간장', quantity: 1.5, unit: 'tbsp' },
        { name: '밥', quantity: 1, unit: '공기' },
      ],
      steps: [
        '양파는 얇게 채 썰고 소고기는 먹기 좋게 썹니다.',
        '팬에 물 1/2컵, 간장 1.5큰술, 설탕 1작은술, 맛술을 넣고 끓입니다.',
        '양파를 넣어 투명해질 때까지 졸입니다.',
        '소고기를 넣고 중불에서 3~4분간 익히며 거품을 걷어냅니다.',
        '밥 위에 국물째 올리고 쪽파를 뿌려 냅니다.',
      ],
      est_cooking_min: 15,
      difficulty: 'easy',
    },
  },
  {
    keys: ['계란', '양파', '밥'],
    canonical: true,
    recipe: {
      name: '오므라이스',
      description: '볶음밥을 부드러운 달걀로 감싼 한 그릇 양식',
      ingredients: [
        { name: '밥', quantity: 1, unit: '공기' },
        { name: '계란', quantity: 2, unit: '개' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '케첩', quantity: 2, unit: 'tbsp' },
      ],
      steps: [
        '양파를 잘게 다져 팬에 볶다가 밥을 넣고 케첩으로 볶아 따로 덜어 둡니다.',
        '계란 2개를 풀어 소금 약간을 넣고 체에 한 번 거릅니다.',
        '팬에 기름을 얇게 두르고 약불에서 계란을 부어 반숙 지단을 만듭니다.',
        '지단 위에 볶음밥을 올리고 양옆을 접어 감쌉니다.',
        '접시에 뒤집어 담고 케첩을 뿌려 마무리합니다.',
      ],
      est_cooking_min: 16,
      difficulty: 'easy',
    },
  },
  {
    keys: ['닭고기', '마늘'],
    canonical: true,
    recipe: {
      name: '가라아게',
      description: '간장 마늘로 밑간한 일본식 닭튀김',
      ingredients: [
        { name: '닭고기', quantity: 200, unit: 'g' },
        { name: '마늘', quantity: 2, unit: '쪽' },
        { name: '간장', quantity: 1, unit: 'tbsp' },
        { name: '감자전분', quantity: 4, unit: 'tbsp' },
      ],
      steps: [
        '닭고기는 한입 크기로 썰어 간장·다진 마늘·생강·맛술로 20분 재웁니다.',
        '재운 닭고기에 감자전분을 고루 묻혀 5분간 둡니다.',
        '기름을 170도로 달군 뒤 닭을 넣어 3분간 1차로 튀깁니다.',
        '건져서 2분 식힌 뒤 다시 1분간 바삭하게 2차로 튀깁니다.',
        '기름을 털어 그릇에 담고 레몬을 곁들입니다.',
      ],
      est_cooking_min: 22,
      difficulty: 'medium',
    },
  },
  {
    keys: ['우동', '대파', '어묵'],
    canonical: true,
    recipe: {
      name: '우동',
      description: '가쓰오 육수에 말아낸 따뜻한 일본식 가락국수',
      ingredients: [
        { name: '우동면', quantity: 1, unit: '봉' },
        { name: '어묵', quantity: 2, unit: '장' },
        { name: '대파', quantity: 0.5, unit: '대' },
        { name: '간장', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '냄비에 물 2컵, 가쓰오 분말 또는 멸치다시를 넣어 육수를 냅니다.',
        '간장 1큰술과 맛술로 간을 맞춥니다.',
        '한입 크기로 썬 어묵을 넣고 2분간 끓입니다.',
        '우동면을 넣어 2분간 더 끓입니다.',
        '그릇에 담고 어슷 썬 대파를 올려 냅니다.',
      ],
      est_cooking_min: 12,
      difficulty: 'easy',
    },
  },

  // ── 중식 ──────────────────────────────────────────────
  {
    keys: ['돼지고기', '양파', '감자'],
    canonical: true,
    recipe: {
      name: '짜장면',
      description: '춘장에 돼지고기와 채소를 볶아 면에 비벼 먹는 중화요리',
      ingredients: [
        { name: '돼지고기', quantity: 100, unit: 'g' },
        { name: '양파', quantity: 1, unit: '개' },
        { name: '감자', quantity: 0.5, unit: '개' },
        { name: '춘장', quantity: 2, unit: 'tbsp' },
        { name: '면', quantity: 1, unit: '인분' },
      ],
      steps: [
        '양파·감자·돼지고기를 사방 1cm로 깍둑썹니다.',
        '팬에 기름을 넉넉히 두르고 춘장 2큰술을 약불에서 1분간 볶아 쓴맛을 날립니다.',
        '돼지고기를 볶다가 채소를 넣어 함께 볶습니다.',
        '물 1컵과 설탕을 넣어 끓인 뒤 전분물로 농도를 잡습니다.',
        '삶은 면 위에 짜장 소스를 올려 비벼 먹습니다.',
      ],
      est_cooking_min: 20,
      difficulty: 'medium',
    },
  },
  {
    keys: ['닭고기', '고추', '마늘'],
    canonical: true,
    recipe: {
      name: '깐풍기',
      description: '바삭하게 튀긴 닭에 매콤달콤 간장소스를 입힌 중화요리',
      ingredients: [
        { name: '닭고기', quantity: 200, unit: 'g' },
        { name: '고추', quantity: 2, unit: '개' },
        { name: '마늘', quantity: 2, unit: '쪽' },
        { name: '간장', quantity: 1.5, unit: 'tbsp' },
        { name: '감자전분', quantity: 4, unit: 'tbsp' },
      ],
      steps: [
        '닭고기는 한입 크기로 썰어 소금·후추로 밑간하고 전분을 묻혀 바삭하게 튀깁니다.',
        '다진 마늘과 송송 썬 고추를 기름에 볶아 향을 냅니다.',
        '간장 1.5큰술, 식초, 설탕, 물을 넣어 소스를 끓입니다.',
        '튀긴 닭을 넣어 소스가 고루 입혀지도록 센 불에서 볶습니다.',
        '국물이 졸아 윤기가 나면 그릇에 담아냅니다.',
      ],
      est_cooking_min: 25,
      difficulty: 'medium',
    },
  },

  // ── 양식 ──────────────────────────────────────────────
  {
    keys: ['베이컨', '계란', '파스타'],
    canonical: true,
    recipe: {
      name: '카르보나라',
      description: '달걀과 치즈, 베이컨으로 만드는 크리미한 이탈리아 파스타',
      ingredients: [
        { name: '스파게티', quantity: 100, unit: 'g' },
        { name: '베이컨', quantity: 3, unit: '줄' },
        { name: '계란', quantity: 2, unit: '개' },
        { name: '파마산치즈', quantity: 3, unit: 'tbsp' },
      ],
      steps: [
        '끓는 소금물에 스파게티를 포장 시간보다 1분 짧게 삶고 면수를 남겨 둡니다.',
        '노른자 2개에 파마산치즈와 후추를 섞어 소스를 준비합니다.',
        '팬에 베이컨을 바삭하게 구워 기름을 살짝 남깁니다.',
        '불을 끄고 삶은 면과 면수 약간을 넣어 섞은 뒤 달걀 소스를 부어 빠르게 버무립니다.',
        '잔열로 부드럽게 엉기면 후추를 뿌려 바로 냅니다.',
      ],
      est_cooking_min: 18,
      difficulty: 'medium',
    },
  },
  {
    keys: ['계란', '치즈', '우유'],
    canonical: true,
    recipe: {
      name: '오믈렛',
      description: '치즈를 넣어 부드럽게 부친 프랑스식 달걀요리',
      ingredients: [
        { name: '계란', quantity: 3, unit: '개' },
        { name: '우유', quantity: 2, unit: 'tbsp' },
        { name: '치즈', quantity: 1, unit: '장' },
        { name: '버터', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '계란 3개에 우유와 소금을 넣고 곱게 풀어 줍니다.',
        '약불에 버터를 녹이고 계란물을 부어 가장자리부터 저어 줍니다.',
        '반쯤 익으면 치즈를 가운데 올립니다.',
        '한쪽을 접어 반달 모양으로 마무리합니다.',
        '접시에 담고 파슬리를 뿌려 냅니다.',
      ],
      est_cooking_min: 10,
      difficulty: 'easy',
    },
  },
  {
    keys: ['양파', '버섯', '치즈'],
    canonical: true,
    recipe: {
      name: '리소토',
      description: '쌀을 육수에 천천히 끓여 치즈로 마무리한 이탈리아 쌀요리',
      ingredients: [
        { name: '쌀', quantity: 1, unit: '컵' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '버섯', quantity: 100, unit: 'g' },
        { name: '파마산치즈', quantity: 3, unit: 'tbsp' },
      ],
      steps: [
        '양파와 버섯을 잘게 썰어 버터에 볶습니다.',
        '씻지 않은 쌀을 넣어 투명해질 때까지 1분간 볶습니다.',
        '따뜻한 육수를 한 국자씩 부어가며 저어 천천히 익힙니다.',
        '쌀이 알덴테로 익으면 불을 끄고 치즈와 버터를 넣어 섞습니다.',
        '소금·후추로 간하고 접시에 담아 냅니다.',
      ],
      est_cooking_min: 25,
      difficulty: 'medium',
    },
  },

  // ── 한식 추가 ─────────────────────────────────────────
  {
    keys: ['김치', '밥', '계란'],
    canonical: true,
    recipe: {
      name: '김치볶음밥',
      description: '신김치와 밥을 볶아 달걀을 올린 한 그릇 한식',
      ingredients: [
        { name: '김치', quantity: 150, unit: 'g' },
        { name: '밥', quantity: 1, unit: '공기' },
        { name: '계란', quantity: 1, unit: '개' },
        { name: '대파', quantity: 0.5, unit: '대' },
      ],
      steps: [
        '김치는 잘게 썰고 대파는 송송 썹니다.',
        '팬에 기름을 두르고 대파를 볶아 파기름을 낸 뒤 김치를 넣어 볶습니다.',
        '김치가 익으면 밥을 넣고 고슬고슬하게 볶습니다.',
        '간장이나 김칫국물로 간을 맞춥니다.',
        '그릇에 담고 따로 부친 달걀프라이를 올려 냅니다.',
      ],
      est_cooking_min: 12,
      difficulty: 'easy',
    },
  },
  {
    keys: ['돼지고기', '양파', '고추'],
    canonical: true,
    recipe: {
      name: '제육볶음',
      description: '돼지고기를 고추장 양념에 매콤하게 볶은 대표 한식',
      ingredients: [
        { name: '돼지고기', quantity: 200, unit: 'g' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '고추', quantity: 1, unit: '개' },
        { name: '고추장', quantity: 1.5, unit: 'tbsp' },
      ],
      steps: [
        '돼지고기는 고추장·고춧가루·간장·다진 마늘·설탕으로 양념해 15분 재웁니다.',
        '양파는 채 썰고 고추는 어슷 썹니다.',
        '센 불에 팬을 달궈 양념한 고기를 넣고 볶습니다.',
        '고기가 거의 익으면 양파와 고추를 넣어 함께 볶습니다.',
        '참기름과 깨를 뿌려 마무리합니다.',
      ],
      est_cooking_min: 18,
      difficulty: 'easy',
    },
  },
  {
    keys: ['계란', '대파'],
    canonical: true,
    diet: true,
    recipe: {
      name: '계란찜',
      description: '뚝배기에 부드럽게 쪄낸 폭신한 달걀요리',
      ingredients: [
        { name: '계란', quantity: 3, unit: '개' },
        { name: '대파', quantity: 0.3, unit: '대' },
        { name: '새우젓', quantity: 1, unit: 'tsp' },
      ],
      steps: [
        '계란 3개를 풀고 물 또는 육수 1/2컵을 섞어 체에 거릅니다.',
        '새우젓으로 간을 하고 다진 대파를 넣습니다.',
        '뚝배기에 부어 약불에 올리고 저으며 몽글하게 익힙니다.',
        '어느 정도 엉기면 뚜껑을 덮어 약불로 5분간 부풀립니다.',
        '깨와 대파를 올려 따뜻할 때 냅니다.',
      ],
      est_cooking_min: 12,
      difficulty: 'easy',
    },
  },

  // ── 찌개·전골 ─────────────────────────────────────────
  {
    keys: ['김치', '돼지고기', '두부'],
    canonical: true,
    recipe: {
      name: '김치찌개',
      description: '잘 익은 김치와 돼지고기를 끓여낸 얼큰한 대표 한식 찌개',
      ingredients: [
        { name: '신김치', quantity: 200, unit: 'g' },
        { name: '돼지고기', quantity: 120, unit: 'g' },
        { name: '두부', quantity: 100, unit: 'g' },
        { name: '대파', quantity: 0.5, unit: '대' },
        { name: '고춧가루', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '신김치는 한입 크기로 썰고, 돼지고기는 먹기 좋게 썰어 둡니다.',
        '냄비에 기름을 두르고 돼지고기를 볶다가 김치를 넣어 함께 3분간 볶습니다.',
        '물 2컵과 고춧가루 1큰술, 김칫국물을 넣고 중불에서 10분간 끓입니다.',
        '깍둑썬 두부를 넣고 5분 더 끓여 간이 배도록 합니다.',
        '어슷 썬 대파를 올리고 1분 더 끓인 뒤 밥과 함께 냅니다.',
      ],
      est_cooking_min: 20,
      difficulty: 'easy',
    },
  },
  {
    keys: ['된장', '애호박', '두부'],
    canonical: true,
    recipe: {
      name: '된장찌개',
      description: '구수한 된장에 채소와 두부를 넣고 보글보글 끓인 한식 찌개',
      ingredients: [
        { name: '된장', quantity: 2, unit: 'tbsp' },
        { name: '애호박', quantity: 0.5, unit: '개' },
        { name: '두부', quantity: 120, unit: 'g' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '대파', quantity: 0.5, unit: '대' },
      ],
      steps: [
        '냄비에 물 2컵을 붓고 된장 2큰술을 체에 곱게 풀어 끓입니다.',
        '깍둑썬 양파와 반달 썬 애호박을 넣고 중불에서 5분간 끓입니다.',
        '깍둑썬 두부를 넣고 다진 마늘을 더해 3분 더 끓입니다.',
        '간을 보고 싱거우면 된장이나 소금으로 맞춥니다.',
        '어슷 썬 대파와 청양고추를 올려 한소끔 끓인 뒤 냅니다.',
      ],
      est_cooking_min: 16,
      difficulty: 'easy',
    },
  },
  {
    keys: ['순두부', '계란', '고추'],
    canonical: true,
    recipe: {
      name: '순두부찌개',
      description: '부드러운 순두부에 계란을 풀어 얼큰하게 끓인 찌개',
      ingredients: [
        { name: '순두부', quantity: 300, unit: 'g' },
        { name: '계란', quantity: 1, unit: '개' },
        { name: '고추', quantity: 1, unit: '개' },
        { name: '대파', quantity: 0.5, unit: '대' },
        { name: '고춧가루', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '뚝배기에 기름을 두르고 다진 대파와 고춧가루 1큰술을 약불에 볶아 고추기름을 냅니다.',
        '물 1컵을 붓고 다진 마늘과 국간장으로 간을 맞춰 끓입니다.',
        '순두부를 큼직하게 떠 넣고 끓어오르면 3분간 더 끓입니다.',
        '어슷 썬 고추와 대파를 넣고 한소끔 끓입니다.',
        '불을 끄기 직전 계란을 깨 넣어 반숙으로 익혀 냅니다.',
      ],
      est_cooking_min: 15,
      difficulty: 'easy',
    },
  },

  // ── 국·탕 ─────────────────────────────────────────────
  {
    keys: ['미역', '소고기'],
    canonical: true,
    recipe: {
      name: '소고기 미역국',
      description: '불린 미역과 소고기를 참기름에 볶아 끓인 든든한 국',
      ingredients: [
        { name: '미역', quantity: 20, unit: 'g' },
        { name: '소고기', quantity: 80, unit: 'g' },
        { name: '국간장', quantity: 1, unit: 'tbsp' },
        { name: '참기름', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '마른 미역은 찬물에 10분간 불린 뒤 주물러 씻고 한입 크기로 썹니다.',
        '냄비에 참기름을 두르고 소고기를 볶다가 미역을 넣어 함께 2분 볶습니다.',
        '물 3컵을 붓고 센 불에서 끓이다가 중불로 줄여 15분간 끓입니다.',
        '국간장과 다진 마늘로 간을 맞춥니다.',
        '국물이 뽀얗게 우러나면 소금으로 마무리해 냅니다.',
      ],
      est_cooking_min: 22,
      difficulty: 'easy',
    },
  },
  {
    keys: ['콩나물', '대파'],
    canonical: true,
    recipe: {
      name: '콩나물국',
      description: '시원하고 칼칼하게 끓여 속을 달래주는 맑은 콩나물국',
      ingredients: [
        { name: '콩나물', quantity: 150, unit: 'g' },
        { name: '대파', quantity: 0.5, unit: '대' },
        { name: '마늘', quantity: 1, unit: '쪽' },
        { name: '국간장', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '콩나물은 흐르는 물에 깨끗이 씻어 둡니다.',
        '냄비에 물 3컵과 콩나물을 넣고 뚜껑을 덮어 센 불에서 끓입니다.',
        '끓기 시작하면 뚜껑을 열지 않고 5분간 더 끓여 비린내를 잡습니다.',
        '다진 마늘과 국간장, 소금으로 간을 맞춥니다.',
        '어슷 썬 대파를 넣고 한소끔 끓인 뒤 고춧가루를 살짝 뿌려 냅니다.',
      ],
      est_cooking_min: 13,
      difficulty: 'easy',
    },
  },

  // ── 한식 일품 ─────────────────────────────────────────
  {
    keys: ['소고기', '양파', '당근'],
    canonical: true,
    recipe: {
      name: '소불고기',
      description: '간장 양념에 재운 소고기를 채소와 함께 볶은 대표 한식',
      ingredients: [
        { name: '소고기', quantity: 200, unit: 'g' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '당근', quantity: 0.3, unit: '개' },
        { name: '대파', quantity: 0.5, unit: '대' },
        { name: '간장', quantity: 2, unit: 'tbsp' },
      ],
      steps: [
        '소고기는 간장 2큰술, 설탕, 다진 마늘, 참기름, 후추로 양념해 20분 재웁니다.',
        '양파와 당근은 채 썰고 대파는 어슷 썹니다.',
        '팬을 센 불로 달궈 양념한 고기를 펼쳐 넣고 볶습니다.',
        '고기가 절반쯤 익으면 양파와 당근을 넣어 함께 볶습니다.',
        '대파를 넣고 국물이 살짝 졸 때까지 볶은 뒤 깨를 뿌려 냅니다.',
      ],
      est_cooking_min: 18,
      difficulty: 'easy',
    },
  },
  {
    keys: ['당면', '시금치', '당근'],
    canonical: true,
    recipe: {
      name: '잡채',
      description: '당면과 갖은 채소를 간장 양념에 무쳐낸 잔칫상 단골 요리',
      ingredients: [
        { name: '당면', quantity: 100, unit: 'g' },
        { name: '시금치', quantity: 50, unit: 'g' },
        { name: '당근', quantity: 0.3, unit: '개' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '간장', quantity: 2, unit: 'tbsp' },
      ],
      steps: [
        '당면은 끓는 물에 6~7분 삶아 찬물에 헹구고 물기를 뺀 뒤 간장·참기름으로 밑간합니다.',
        '시금치는 데쳐 물기를 짜고, 당근과 양파는 채 썰어 각각 볶아 둡니다.',
        '팬에 밑간한 당면을 넣고 간장·설탕을 더해 윤기 나게 볶습니다.',
        '볶아 둔 채소와 시금치를 모두 넣어 고루 섞습니다.',
        '참기름과 통깨를 넣어 버무린 뒤 그릇에 담아냅니다.',
      ],
      est_cooking_min: 25,
      difficulty: 'medium',
    },
  },
  {
    keys: ['밥', '시금치', '당근', '계란'],
    canonical: true,
    recipe: {
      name: '비빔밥',
      description: '갖은 나물과 달걀을 밥 위에 올려 고추장에 비벼 먹는 한식',
      ingredients: [
        { name: '밥', quantity: 1, unit: '공기' },
        { name: '시금치', quantity: 50, unit: 'g' },
        { name: '당근', quantity: 0.3, unit: '개' },
        { name: '계란', quantity: 1, unit: '개' },
        { name: '고추장', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '시금치는 데쳐 무치고, 당근은 채 썰어 소금 간해 볶습니다.',
        '애호박이나 콩나물 등 자투리 채소도 같은 방식으로 준비합니다.',
        '계란은 노른자가 살아 있게 반숙 프라이를 부칩니다.',
        '그릇에 밥을 담고 나물을 색 맞춰 돌려 담습니다.',
        '가운데 계란과 고추장, 참기름을 올려 비벼 먹습니다.',
      ],
      est_cooking_min: 20,
      difficulty: 'easy',
    },
  },

  // ── 면·분식 ───────────────────────────────────────────
  {
    keys: ['떡', '어묵', '고추장'],
    canonical: true,
    recipe: {
      name: '떡볶이',
      description: '쫄깃한 떡과 어묵을 매콤달콤 고추장 양념에 졸인 분식',
      ingredients: [
        { name: '떡볶이떡', quantity: 200, unit: 'g' },
        { name: '어묵', quantity: 2, unit: '장' },
        { name: '대파', quantity: 0.5, unit: '대' },
        { name: '고추장', quantity: 1.5, unit: 'tbsp' },
        { name: '고춧가루', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '떡은 찬물에 5분 불리고, 어묵은 삼각형으로 썹니다.',
        '냄비에 물 1.5컵, 고추장 1.5큰술, 고춧가루, 설탕, 간장을 넣어 양념장을 풉니다.',
        '양념물이 끓으면 떡과 어묵을 넣고 중불에서 졸입니다.',
        '국물이 자작해질 때까지 저으며 5~7분 끓입니다.',
        '어슷 썬 대파를 넣고 윤기가 나면 깨를 뿌려 냅니다.',
      ],
      est_cooking_min: 15,
      difficulty: 'easy',
    },
  },
  {
    keys: ['소면', '오이', '고추장'],
    canonical: true,
    recipe: {
      name: '비빔국수',
      description: '삶은 소면을 새콤달콤 고추장 양념에 비벼낸 여름 별미',
      ingredients: [
        { name: '소면', quantity: 100, unit: 'g' },
        { name: '오이', quantity: 0.5, unit: '개' },
        { name: '고추장', quantity: 1, unit: 'tbsp' },
        { name: '식초', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '고추장, 식초, 설탕, 간장, 참기름, 다진 마늘을 섞어 비빔 양념을 만듭니다.',
        '소면을 끓는 물에 3분 삶고 찬물에 비벼 씻어 물기를 뺍니다.',
        '오이는 채 썰어 둡니다.',
        '볼에 소면과 양념을 넣고 고루 비빕니다.',
        '그릇에 담고 오이채와 삶은 달걀, 깨를 올려 냅니다.',
      ],
      est_cooking_min: 12,
      difficulty: 'easy',
    },
  },
  {
    keys: ['소면', '애호박', '계란'],
    canonical: true,
    recipe: {
      name: '잔치국수',
      description: '멸치 육수에 소면을 말고 고명을 올린 따뜻한 한 그릇',
      ingredients: [
        { name: '소면', quantity: 100, unit: 'g' },
        { name: '애호박', quantity: 0.3, unit: '개' },
        { name: '계란', quantity: 1, unit: '개' },
        { name: '대파', quantity: 0.3, unit: '대' },
        { name: '국간장', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '냄비에 물 3컵과 멸치·다시마를 넣어 10분 끓여 육수를 내고 국간장으로 간합니다.',
        '애호박은 채 썰어 볶고, 계란은 지단을 부쳐 채 썹니다.',
        '소면을 끓는 물에 3분 삶아 찬물에 헹굽니다.',
        '그릇에 소면을 담고 뜨거운 육수를 붓습니다.',
        '애호박·지단·대파 고명을 올리고 김가루를 뿌려 냅니다.',
      ],
      est_cooking_min: 20,
      difficulty: 'easy',
    },
  },

  // ── 양식·동남아 ───────────────────────────────────────
  {
    keys: ['토마토', '마늘', '파스타'],
    canonical: true,
    recipe: {
      name: '토마토 파스타',
      description: '잘 익은 토마토 소스에 버무린 산뜻한 이탈리아 파스타',
      ingredients: [
        { name: '스파게티', quantity: 100, unit: 'g' },
        { name: '토마토', quantity: 2, unit: '개' },
        { name: '마늘', quantity: 2, unit: '쪽' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '올리브유', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '끓는 소금물에 스파게티를 포장 시간대로 삶고 면수를 남겨 둡니다.',
        '토마토는 끓는 물에 데쳐 껍질을 벗기고 다집니다.',
        '팬에 올리브유를 두르고 편 마늘과 다진 양파를 볶아 향을 냅니다.',
        '다진 토마토를 넣어 중불에서 8분간 졸이고 소금·후추로 간합니다.',
        '삶은 면과 면수 약간을 넣어 버무린 뒤 바질을 올려 냅니다.',
      ],
      est_cooking_min: 20,
      difficulty: 'easy',
    },
  },
  {
    keys: ['새우', '마늘'],
    canonical: true,
    recipe: {
      name: '새우 감바스',
      description: '올리브유에 마늘과 새우를 자글자글 익힌 스페인식 안주',
      ingredients: [
        { name: '새우', quantity: 150, unit: 'g' },
        { name: '마늘', quantity: 5, unit: '쪽' },
        { name: '고추', quantity: 1, unit: '개' },
        { name: '올리브유', quantity: 4, unit: 'tbsp' },
      ],
      steps: [
        '새우는 껍질을 벗기고 소금·후추로 밑간합니다.',
        '마늘은 편 썰고 고추는 송송 썹니다.',
        '작은 팬에 올리브유를 넉넉히 붓고 약불에서 마늘을 볶아 향을 냅니다.',
        '마늘이 노릇해지면 새우와 고추를 넣어 자글자글 익힙니다.',
        '새우가 분홍빛으로 익으면 소금으로 간하고 바게트를 곁들여 냅니다.',
      ],
      est_cooking_min: 14,
      difficulty: 'easy',
    },
  },
  {
    keys: ['쌀국수', '새우', '숙주'],
    canonical: true,
    recipe: {
      name: '새우 팟타이',
      description: '쌀국수에 새우와 숙주를 볶아 새콤달콤하게 낸 태국식 볶음면',
      ingredients: [
        { name: '쌀국수', quantity: 100, unit: 'g' },
        { name: '새우', quantity: 100, unit: 'g' },
        { name: '숙주', quantity: 100, unit: 'g' },
        { name: '계란', quantity: 1, unit: '개' },
        { name: '굴소스', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '쌀국수는 미지근한 물에 20분 불려 부드럽게 만듭니다.',
        '피시소스·굴소스·설탕·라임즙·고춧가루를 섞어 팟타이 소스를 만듭니다.',
        '팬에 기름을 두르고 새우를 볶다가 한쪽에 계란을 풀어 스크램블합니다.',
        '불린 쌀국수와 소스를 넣어 센 불에서 빠르게 볶습니다.',
        '숙주를 넣어 살짝만 볶고 땅콩 분태와 라임을 곁들여 냅니다.',
      ],
      est_cooking_min: 22,
      difficulty: 'medium',
    },
  },

  // ── 샐러드·건강식 ─────────────────────────────────────
  {
    keys: ['닭가슴살', '양상추', '토마토'],
    diet: true,
    recipe: {
      name: '닭가슴살 샐러드',
      description: '구운 닭가슴살과 채소를 올린 고단백 저칼로리 한 끼 샐러드',
      ingredients: [
        { name: '닭가슴살', quantity: 120, unit: 'g' },
        { name: '양상추', quantity: 100, unit: 'g' },
        { name: '토마토', quantity: 1, unit: '개' },
        { name: '오이', quantity: 0.5, unit: '개' },
        { name: '올리브유', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '닭가슴살은 소금·후추로 밑간해 팬에 앞뒤로 노릇하게 구운 뒤 한입 크기로 썹니다.',
        '양상추는 찬물에 담갔다 건져 아삭하게 만들고 손으로 뜯습니다.',
        '토마토와 오이는 한입 크기로 썹니다.',
        '올리브유, 발사믹식초, 소금, 후추를 섞어 드레싱을 만듭니다.',
        '그릇에 채소를 담고 닭가슴살을 올린 뒤 드레싱을 뿌려 냅니다.',
      ],
      est_cooking_min: 15,
      difficulty: 'easy',
    },
  },

  // ── 다이어트·건강식 ───────────────────────────────────
  {
    keys: ['연어', '브로콜리'],
    canonical: true,
    diet: true,
    recipe: {
      name: '연어 스테이크',
      description: '겉은 바삭 속은 촉촉하게 구운 고단백 저탄수 한 끼',
      ingredients: [
        { name: '연어', quantity: 150, unit: 'g' },
        { name: '브로콜리', quantity: 80, unit: 'g' },
        { name: '아스파라거스', quantity: 4, unit: '개' },
        { name: '올리브유', quantity: 1, unit: 'tbsp' },
        { name: '레몬', quantity: 0.5, unit: '개' },
      ],
      steps: [
        '연어는 키친타월로 물기를 닦고 소금·후추로 밑간해 10분 둡니다.',
        '브로콜리와 아스파라거스는 끓는 물에 1분 데쳐 아삭함을 살립니다.',
        '팬에 올리브유를 두르고 연어 껍질 쪽부터 중불에서 3분, 뒤집어 2분 굽습니다.',
        '같은 팬에 데친 채소를 넣어 소금 간하며 1분 볶습니다.',
        '접시에 연어와 채소를 담고 레몬즙을 뿌려 냅니다.',
      ],
      est_cooking_min: 18,
      difficulty: 'easy',
    },
  },
  {
    keys: ['두부', '버섯', '양파'],
    diet: true,
    recipe: {
      name: '두부 스테이크',
      description: '두부를 노릇하게 구워 채소 소스를 올린 저칼로리 단백질 요리',
      ingredients: [
        { name: '두부', quantity: 250, unit: 'g' },
        { name: '버섯', quantity: 60, unit: 'g' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '간장', quantity: 1, unit: 'tbsp' },
        { name: '올리브유', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '두부는 1.5cm 두께로 썰어 키친타월로 물기를 충분히 뺀 뒤 소금을 살짝 뿌립니다.',
        '팬에 올리브유를 두르고 두부를 앞뒤로 노릇하게 구워 접시에 옮깁니다.',
        '같은 팬에 채 썬 양파와 버섯을 넣어 볶습니다.',
        '간장 1큰술과 물 2큰술, 후추를 넣어 자작하게 조립니다.',
        '구운 두부 위에 채소 소스를 끼얹고 쪽파를 올려 냅니다.',
      ],
      est_cooking_min: 16,
      difficulty: 'easy',
    },
  },
  {
    keys: ['고구마', '닭가슴살', '양상추'],
    diet: true,
    recipe: {
      name: '고구마 닭가슴살 샐러드',
      description: '포만감 좋은 고구마와 닭가슴살로 든든한 다이어트 샐러드',
      ingredients: [
        { name: '고구마', quantity: 1, unit: '개' },
        { name: '닭가슴살', quantity: 120, unit: 'g' },
        { name: '양상추', quantity: 80, unit: 'g' },
        { name: '방울토마토', quantity: 5, unit: '개' },
        { name: '올리브유', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '고구마는 깨끗이 씻어 전자레인지에 5~6분 익힌 뒤 한입 크기로 썹니다.',
        '닭가슴살은 소금·후추로 밑간해 팬에 구운 뒤 결대로 찢습니다.',
        '양상추는 뜯어 찬물에 담갔다 건지고 방울토마토는 반으로 자릅니다.',
        '올리브유, 레몬즙, 소금, 후추를 섞어 가벼운 드레싱을 만듭니다.',
        '그릇에 모든 재료를 담고 드레싱을 뿌려 가볍게 버무려 냅니다.',
      ],
      est_cooking_min: 18,
      difficulty: 'easy',
    },
  },
  {
    keys: ['오트밀', '바나나'],
    diet: true,
    recipe: {
      name: '바나나 오트밀죽',
      description: '오트밀을 우유에 끓여 바나나를 올린 부드러운 다이어트 아침식',
      ingredients: [
        { name: '오트밀', quantity: 50, unit: 'g' },
        { name: '우유', quantity: 200, unit: 'ml' },
        { name: '바나나', quantity: 0.5, unit: '개' },
        { name: '견과류', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '냄비에 오트밀과 우유를 넣고 약불에서 저으며 끓입니다.',
        '오트밀이 우유를 머금어 걸쭉해질 때까지 4~5분 끓입니다.',
        '단맛이 필요하면 꿀이나 시나몬을 약간 더합니다.',
        '그릇에 담고 얇게 썬 바나나를 올립니다.',
        '견과류를 굵게 다져 뿌려 마무리합니다.',
      ],
      est_cooking_min: 10,
      difficulty: 'easy',
    },
  },
  {
    keys: ['단호박', '양파'],
    canonical: true,
    diet: true,
    recipe: {
      name: '단호박 수프',
      description: '삶은 단호박을 곱게 갈아 끓인 포근하고 든든한 저지방 수프',
      ingredients: [
        { name: '단호박', quantity: 200, unit: 'g' },
        { name: '양파', quantity: 0.5, unit: '개' },
        { name: '우유', quantity: 150, unit: 'ml' },
        { name: '버터', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '단호박은 씨를 파내고 한입 크기로 썰어 전자레인지에 5분 익힙니다.',
        '냄비에 버터를 녹이고 채 썬 양파를 투명해질 때까지 볶습니다.',
        '익힌 단호박과 물 1/2컵을 넣어 한소끔 끓입니다.',
        '한 김 식혀 우유와 함께 믹서에 곱게 갈아 다시 냄비에 붓습니다.',
        '약불에서 데우며 소금·후추로 간하고 그릇에 담아 냅니다.',
      ],
      est_cooking_min: 22,
      difficulty: 'easy',
    },
  },
  {
    keys: ['두부', '토마토', '양상추'],
    diet: true,
    recipe: {
      name: '두부 토마토 샐러드',
      description: '데친 두부와 토마토를 곁들인 카프레제풍 저칼로리 샐러드',
      ingredients: [
        { name: '두부', quantity: 150, unit: 'g' },
        { name: '토마토', quantity: 1, unit: '개' },
        { name: '양상추', quantity: 60, unit: 'g' },
        { name: '올리브유', quantity: 1, unit: 'tbsp' },
        { name: '발사믹식초', quantity: 1, unit: 'tbsp' },
      ],
      steps: [
        '두부는 1cm 두께로 썰어 끓는 소금물에 1분 데친 뒤 물기를 뺍니다.',
        '토마토는 두부와 비슷한 두께로 둥글게 썹니다.',
        '양상추는 뜯어 찬물에 담갔다 건져 아삭하게 만듭니다.',
        '접시에 두부와 토마토를 번갈아 올리고 양상추를 곁들입니다.',
        '올리브유와 발사믹식초를 뿌리고 소금·후추로 마무리합니다.',
      ],
      est_cooking_min: 12,
      difficulty: 'easy',
    },
  },
];

const DIFFICULTY_RANK: Record<MockRecipe['recipe']['difficulty'], number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

// 프롬프트(프로필 블록)에 체중 감량 목표가 드러나면 다이어트 메뉴를 우선한다.
// builder.ts는 `- 목표: lose_weight` 형태로 goal을 그대로 적는다.
function wantsDiet(text: string): boolean {
  return /lose_weight|체중\s*감량|다이어트|감량/.test(text);
}

function pickRecipe(prompt: string, seedHex: string): MockRecipe['recipe'] {
  const text = prompt.toLowerCase();
  const dietGoal = wantsDiet(text);
  const scored = LIBRARY.map((m, i) => {
    const match = m.keys.reduce((acc, k) => acc + (text.includes(k.toLowerCase()) ? 1 : 0), 0);
    // 다이어트 목표면 diet 메뉴에 +1 보정 — 재료 매칭은 그대로 유지하되 저칼로리 메뉴를 끌어올린다.
    const score = match + (dietGoal && m.diet ? 1 : 0);
    return { m, i, score };
  });
  const max = Math.max(...scored.map((s) => s.score));
  if (max > 0) {
    const top = scored.filter((s) => s.score === max);
    // 동점이면: ① 다이어트 목표 시 diet 메뉴 우선 → ② 만들기 쉬운 것(easy 우선) →
    // ③ 정식 요리명(위키 사진이 잘 잡힘) → ④ 시드로 결정적 tie-break (동일 입력 동일 출력 보장).
    const seedTie = parseInt(seedHex.slice(0, 4), 16);
    top.sort((a, b) => {
      if (dietGoal) {
        const dd = (b.m.diet ? 1 : 0) - (a.m.diet ? 1 : 0);
        if (dd !== 0) return dd;
      }
      const d = DIFFICULTY_RANK[a.m.recipe.difficulty] - DIFFICULTY_RANK[b.m.recipe.difficulty];
      if (d !== 0) return d;
      const c = (b.m.canonical ? 1 : 0) - (a.m.canonical ? 1 : 0);
      if (c !== 0) return c;
      return ((a.i + seedTie) % top.length) - ((b.i + seedTie) % top.length);
    });
    return top[0].m.recipe;
  }
  // 매칭 0건이면 시드 기반으로 선택 — 다이어트 목표면 diet 풀 안에서만 고른다.
  const pool = dietGoal ? LIBRARY.filter((m) => m.diet) : LIBRARY;
  const base = pool.length ? pool : LIBRARY;
  return base[parseInt(seedHex.slice(0, 4), 16) % base.length].recipe;
}

export class MockLlmAdapter implements LlmAdapter {
  readonly provider = 'mock';

  async complete(messages: LlmMessage[], opts: LlmCompleteOptions = {}): Promise<LlmResult> {
    const start = Date.now();
    const joined = messages.map((m) => m.content).join('\n');
    const seed = createHash('sha256').update(joined).digest('hex');

    if (opts.healthCheck) {
      return { text: 'ok', model: 'mock-1', latencyMs: Date.now() - start };
    }

    // 시뮬레이션 지연 50~150ms — seed 1바이트 기반
    const delay = 50 + (parseInt(seed.slice(0, 2), 16) % 100);
    await new Promise((r) => setTimeout(r, delay));

    const recipe = pickRecipe(joined, seed);
    return {
      text: JSON.stringify({ recipes: [recipe] }),
      model: 'mock-1',
      latencyMs: Date.now() - start,
    };
  }
}
