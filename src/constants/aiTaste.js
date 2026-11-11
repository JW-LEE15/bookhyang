// AI 추천 취향 선택지와 선택 개수 제한 (서버 계약의 허용값과 같아야 한다)
export const GENRES = ['소설', '시', '에세이'];
export const TOPICS = ['사랑', '가족', '성장', '사회', '철학', '역사', '일상', '삶과 죽음'];
export const MOODS = ['따뜻한', '잔잔한', '깊이 있는', '유쾌한', '어두운', '몰입감 있는'];

export const MAX_TOPICS = 3;
export const MAX_MOODS = 2;

export const EMPTY_TASTE = { genres: [], topics: [], moods: [] };
