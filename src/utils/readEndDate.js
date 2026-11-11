// 완독일(read_end_date) 도우미. 서버는 'YYYY-MM-DD' 문자열(또는 null)을 준다.

// 서버 값을 화면용 'YYYY-MM-DD'로 정리한다. 형식이 이상하거나 없으면 null
// (혹시 시간이 붙은 ISO 문자열이 와도 앞 10자리만 쓴다)
export const normalizeReadEndDate = (value) => {
  if (typeof value !== 'string') return null;
  const head = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(head) ? head : null;
};

// 한국 시간 기준 오늘 'YYYY-MM-DD' (기기 시간대와 상관없이 서버와 같은 기준)
export const todayKst = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

// 형식이 맞고 실제로 있는 날짜인지 (예: 2026-02-30은 거짓)
export const isRealDate = (text) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
};

export const FORMAT_ERROR_MESSAGE =
  '날짜 형식이 올바르지 않거나 오늘 이후 날짜예요. 2026-11-05처럼 오늘 이전 날짜를 입력해 주세요.';

// 입력값을 저장 전에 검사한다. 문제가 없으면 null, 있으면 고정 안내문
export const validateReadEndDateInput = (text) => {
  if (!isRealDate(text) || text > todayKst()) return FORMAT_ERROR_MESSAGE;
  return null;
};

// 완독일 저장 실패를 고정 안내문으로 바꾼다 (서버 message는 화면에 보여주지 않는다)
export const readEndDateErrorMessage = (error) => {
  const status = error?.response?.status;
  if (status === 400) return FORMAT_ERROR_MESSAGE;
  if (status === 409) return '완독 상태인 책만 완독일을 입력할 수 있어요.';
  if (status === 404) return '서재에서 찾을 수 없는 책이에요.';
  return '저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
};
