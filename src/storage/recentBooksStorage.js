import AsyncStorage from '@react-native-async-storage/async-storage';

// 최근 열어본 책은 기기(AsyncStorage)에 계정별로 저장한다. 키: recentBooks:{userId}
// 계정이 다르면 키가 달라서, 다른 계정으로 로그인해도 이전 계정의 기록을 이어받지 않는다.
// 항목: { isbn, title, author, thumbnail }, 최신이 맨 앞, 최대 10권.
// 기록을 화면에서 보여주는 일은 MY 보완 작업에서 한다.

const MAX_RECENT = 10;

const buildKey = (userId) => `recentBooks:${userId}`;

// 같은 책 판별: isbn이 있으면 isbn, 없으면 제목
const sameBook = (a, b) => (a.isbn && b.isbn ? a.isbn === b.isbn : !a.isbn && !b.isbn && a.title === b.title);

// 읽기와 쓰기가 겹쳐 서로 덮어쓰지 않게 하나씩 차례로 처리한다.
let queue = Promise.resolve();

// 최근 본 책 목록을 읽는다. 값이 없거나 읽기에 실패하면 빈 배열
export const getRecentBooks = async (userId) => {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(buildKey(userId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error('최근 본 책 읽기 실패:', e?.message);
    return [];
  }
};

// 책 한 권을 기록한다. 이미 있으면 맨 앞으로 올리고, 10권을 넘으면 오래된 것부터 지운다.
// 실패해도 예외를 던지지 않는다 (화면 동작에 영향을 주지 않는다).
export const recordRecentBook = (userId, book) => {
  if (!userId || !book?.title) return Promise.resolve();
  const entry = {
    isbn: book.isbn || '',
    title: book.title,
    author: book.author || '',
    thumbnail: book.thumbnail || '',
  };
  queue = queue.then(async () => {
    try {
      const list = await getRecentBooks(userId);
      const next = [entry, ...list.filter((item) => !sameBook(item, entry))].slice(0, MAX_RECENT);
      await AsyncStorage.setItem(buildKey(userId), JSON.stringify(next));
    } catch (e) {
      console.error('최근 본 책 저장 실패:', e?.message);
    }
  });
  return queue;
};
