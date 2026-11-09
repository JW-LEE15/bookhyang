import AsyncStorage from '@react-native-async-storage/async-storage';

// 설정 값은 기기(AsyncStorage)에 계정별로 저장한다. 키: settings:{userId}:{이름}
// 계정이 다르면 키가 달라서, 로그아웃 후 다른 계정으로 로그인해도 이전 계정의 설정을 이어받지 않는다.
// 모든 설정의 기본값은 꺼짐(false)이다.

export const SETTING_KEYS = {
  AI_CONSENT: 'aiConsent', // AI 데이터 사용 동의
  COMMENT_NOTIFICATION: 'commentNotification', // 댓글 알림 (화면과 저장만, 실제 알림 없음)
  SERVICE_NOTIFICATION: 'serviceNotification', // 서비스 알림 (화면과 저장만, 실제 알림 없음)
};

const buildKey = (userId, name) => `settings:${userId}:${name}`;

// 저장된 값을 읽는다. 값이 없거나 읽기에 실패하면 false(꺼짐)
export const getBooleanSetting = async (userId, name) => {
  if (!userId) return false;
  try {
    const value = await AsyncStorage.getItem(buildKey(userId, name));
    return value === 'true';
  } catch (e) {
    console.error('설정 읽기 실패:', name, e?.message);
    return false;
  }
};

// 값을 저장한다. 실패하면 예외를 던진다 (호출한 쪽에서 화면 값을 되돌린다)
export const setBooleanSetting = async (userId, name, value) => {
  if (!userId) throw new Error('로그인 정보가 없어 설정을 저장할 수 없습니다.');
  await AsyncStorage.setItem(buildKey(userId, name), value ? 'true' : 'false');
};

// 여러 설정을 한 번에 읽는다. 결과: { [name]: boolean }
export const loadBooleanSettings = async (userId, names) => {
  const entries = await Promise.all(
    names.map(async (name) => [name, await getBooleanSetting(userId, name)])
  );
  return Object.fromEntries(entries);
};
