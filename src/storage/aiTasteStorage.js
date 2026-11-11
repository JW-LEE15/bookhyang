import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GENRES,
  TOPICS,
  MOODS,
  MAX_TOPICS,
  MAX_MOODS,
  EMPTY_TASTE,
} from '../constants/aiTaste';

// AI 추천 취향은 기기(AsyncStorage)에 계정별로 저장한다. 키: aiTaste:{userId}
// 계정이 다르면 키가 달라서 다른 계정의 취향을 이어받지 않는다.
const buildKey = (userId) => `aiTaste:${userId}`;

// 허용값에 있는 항목만, 중복 없이, 제한 개수까지 남긴다
const sanitizeList = (value, allowed, max) => {
  if (!Array.isArray(value)) return [];
  const result = [];
  for (const item of value) {
    if (allowed.includes(item) && !result.includes(item)) result.push(item);
  }
  return max ? result.slice(0, max) : result;
};

export const sanitizeTaste = (taste) => ({
  genres: sanitizeList(taste?.genres, GENRES),
  topics: sanitizeList(taste?.topics, TOPICS, MAX_TOPICS),
  moods: sanitizeList(taste?.moods, MOODS, MAX_MOODS),
});

// 저장된 취향을 읽는다. 값이 없거나 읽기/파싱에 실패하면 빈 취향
export const loadAiTaste = async (userId) => {
  if (!userId) return { ...EMPTY_TASTE };
  try {
    const raw = await AsyncStorage.getItem(buildKey(userId));
    if (!raw) return { ...EMPTY_TASTE };
    return sanitizeTaste(JSON.parse(raw));
  } catch (e) {
    console.error('AI 취향 읽기 실패:', e?.message);
    return { ...EMPTY_TASTE };
  }
};

// 취향을 저장한다. 실패하면 예외를 던진다
export const saveAiTaste = async (userId, taste) => {
  if (!userId) throw new Error('로그인 정보가 없어 취향을 저장할 수 없습니다.');
  await AsyncStorage.setItem(buildKey(userId), JSON.stringify(sanitizeTaste(taste)));
};
