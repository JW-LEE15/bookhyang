// AI 독서 리포트 오류를 화면에 보여줄 고정 안내문으로 바꾼다. 서버 message는 쓰지 않고 code만 본다.
export const NOT_ENOUGH_RECORDS = 'NOT_ENOUGH_RECORDS';

export const AI_REPORT_ERROR_MESSAGES = {
  NOT_ENOUGH_RECORDS:
    '해당 기간에 완독한 책이 2권 이상 필요해요. 완독일이 비어 있는 책은 서재에서 완독일을 입력해 주세요',
  RATE_LIMITED: '너무 자주 요청했어요. 잠시 후 다시 시도해 주세요.',
  AI_BUSY: '지금 AI 사용량이 많아요. 잠시 후 다시 시도해 주세요.',
  AI_UNAVAILABLE: 'AI 리포트를 지금은 쓸 수 없어요. 잠시 후 다시 시도해 주세요.',
  AI_TIMEOUT: '응답 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.',
  AI_BAD_OUTPUT: '리포트를 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
};

// BAD_REQUEST, INTERNAL_ERROR, 401(code 없음), 네트워크 오류 등
export const GENERIC_AI_REPORT_ERROR = '리포트를 만들지 못했어요. 다시 시도해 주세요.';

// 에러를 code로 정리한다. axios timeout(ECONNABORTED)은 AI_TIMEOUT과 같게 본다. 모르면 null.
export const getAiReportErrorCode = (error) => {
  const code = error?.response?.data?.code;
  if (code) return code;
  if (error?.code === 'ECONNABORTED') return 'AI_TIMEOUT';
  return null;
};

export const getAiReportErrorMessage = (code) =>
  AI_REPORT_ERROR_MESSAGES[code] || GENERIC_AI_REPORT_ERROR;
