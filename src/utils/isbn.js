// ISBN 유틸: 책 상세에 들어온 도서 데이터에서 ISBN13을 얻는다.
// 카카오 검색 결과의 isbn은 "ISBN10 ISBN13" 문자열이고, 내 서재(user_books)의 isbn은 10자리일 수도 있다.

const ISBN13_PATTERN = /^97[89][0-9]{10}$/;
const ISBN10_PATTERN = /^[0-9]{9}[0-9Xx]$/;

// 체크섬이 맞는 ISBN-10이면 ISBN-13(978 접두)으로 변환하고, 아니면 null
export const isbn10To13 = (isbn10) => {
  if (typeof isbn10 !== 'string' || !ISBN10_PATTERN.test(isbn10)) return null;

  const digits = isbn10.toUpperCase().split('').map((ch) => (ch === 'X' ? 10 : Number(ch)));
  // X(10)는 마지막 자리에만 올 수 있다
  if (digits.slice(0, 9).includes(10)) return null;

  // ISBN-10 체크섬: (10×d1 + 9×d2 + ... + 1×d10)이 11의 배수
  const sum10 = digits.reduce((acc, digit, index) => acc + (10 - index) * digit, 0);
  if (sum10 % 11 !== 0) return null;

  // ISBN-13: 978 + 앞 9자리 + 체크 숫자 (가중치 1, 3 반복)
  const body = `978${isbn10.slice(0, 9)}`;
  const sum13 = body.split('').reduce((acc, ch, index) => acc + Number(ch) * (index % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum13 % 10)) % 10;
  return `${body}${check}`;
};

// 후보 값(문자열)들에서 ISBN13을 찾는다. 하이픈과 공백으로 나눈 토큰을 본다.
// 1순위: 13자리(97[89]로 시작), 2순위: 체크섬이 맞는 10자리를 13자리로 변환. 못 찾으면 null.
// 제목 등 다른 값으로 대체하지 않는다.
export const getIsbn13 = (...candidates) => {
  const tokens = [];
  candidates.forEach((candidate) => {
    if (typeof candidate !== 'string') return;
    candidate
      .split(/\s+/)
      .map((token) => token.replace(/-/g, ''))
      .filter(Boolean)
      .forEach((token) => tokens.push(token));
  });

  const isbn13 = tokens.find((token) => ISBN13_PATTERN.test(token));
  if (isbn13) return isbn13;

  for (const token of tokens) {
    const converted = isbn10To13(token);
    if (converted) return converted;
  }
  return null;
};
