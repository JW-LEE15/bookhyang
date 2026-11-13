// AI 댓글 요약 오류를 화면에 보여줄 고정 안내문으로 바꾼다. 서버 message는 쓰지 않고 code만 본다.
export const AI_SUMMARY_ERROR_MESSAGES = {
  AI_BUSY: '지금 AI 사용량이 많아요. 잠시 후 다시 시도해 주세요.',
  RATE_LIMITED: '너무 자주 요청했어요. 잠시 후 다시 시도해 주세요.',
  AI_TIMEOUT: 'AI 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.',
  AI_UNAVAILABLE: 'AI 요약을 지금은 쓸 수 없어요. 잠시 후 다시 시도해 주세요.',
  AI_BAD_OUTPUT: '요약을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
};

// BAD_REQUEST, INTERNAL_ERROR, 401(code 없음), 네트워크 오류 등
export const GENERIC_AI_SUMMARY_ERROR = '요약을 불러오지 못했어요. 다시 시도해 주세요.';

export const NOT_ENOUGH_COMMENTS = 'NOT_ENOUGH_COMMENTS';

// 에러를 code로 정리한다. axios timeout(ECONNABORTED)은 AI_TIMEOUT과 같게 본다. 모르면 null.
export const getAiSummaryErrorCode = (error) => {
  const code = error?.response?.data?.code;
  if (code) return code;
  if (error?.code === 'ECONNABORTED') return 'AI_TIMEOUT';
  return null;
};

export const getAiSummaryErrorMessage = (code) =>
  AI_SUMMARY_ERROR_MESSAGES[code] || GENERIC_AI_SUMMARY_ERROR;
