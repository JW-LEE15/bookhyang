// 댓글 API 오류를 화면에 보여줄 고정 안내문으로 바꾼다. 서버 message는 쓰지 않고 code만 본다.
export const COMMENT_ERROR_MESSAGES = {
  PARENT_NOT_FOUND: '원댓글이 삭제됐어요',
  PARENT_HIDDEN: '숨겨진 댓글에는 답글을 달 수 없어요',
  REPLY_TO_REPLY: '입력한 내용을 확인해 주세요',
  ISBN_MISMATCH: '입력한 내용을 확인해 주세요',
  VALIDATION_ERROR: '입력한 내용을 확인해 주세요',
};

export const DEFAULT_COMMENT_ERROR = '잠시 후 다시 시도해 주세요';

export const getCommentErrorCode = (error) => error?.response?.data?.code;

export const getCommentErrorMessage = (error) =>
  COMMENT_ERROR_MESSAGES[getCommentErrorCode(error)] || DEFAULT_COMMENT_ERROR;
