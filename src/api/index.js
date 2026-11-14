import axios from 'axios';

// 서버 주소는 .env의 EXPO_PUBLIC_API_URL에서 읽는다 (끝에 /api 포함, .env.example 참고)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!BASE_URL) {
  console.error('EXPO_PUBLIC_API_URL이 설정되지 않았습니다. .env 파일을 확인하세요. (.env.example 참고)');
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // ngrok 경고/안내 페이지 자동 패스
  },
});

// ---- 로그인 토큰 ----
// 토큰 원본은 SecureStore에 있고(tokenStorage.js), 요청에 붙일 값만 메모리에 둔다. AuthContext가 설정한다.
// 토큰 값과 Authorization 헤더는 로그나 화면에 출력하지 않는다.
let authToken = null;
// 토큰이 바뀔 때마다 1씩 늘린다. 예전 토큰으로 보낸 요청의 401이 새 로그인을 로그아웃시키지 않게 한다.
let authGeneration = 0;
// 토큰이 만료되거나 거부됐을 때 호출할 함수 (AuthContext가 등록)
let unauthorizedHandler = null;

// 로그인/회원가입 요청의 401은 "비밀번호 틀림" 등이므로 자동 로그아웃하지 않는다
const AUTH_PATHS = ['/auth/login', '/auth/signup'];

export const setAuthToken = (token) => {
  authToken = token || null;
  authGeneration += 1;
};

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

// config의 요청 헤더에서 Authorization을 지운다
const removeAuthHeader = (config) => {
  const headers = config?.headers;
  if (!headers) return;
  if (typeof headers.delete === 'function') headers.delete('Authorization');
  else delete headers.Authorization;
};

// 에러 객체에서 토큰이 닿을 수 있는 곳을 지운다 (화면에서 console.error(error)로 찍어도 토큰이 안 나오게)
// - error.config / error.response.config: 요청 헤더 (axios에서는 보통 같은 객체지만 달라도 둘 다 지운다)
// - error.request / error.response.request: XHR 객체 (React Native는 요청 헤더를 _headers에 보관한다)
const removeAuthFromError = (error) => {
  if (!error) return error;
  removeAuthHeader(error.config);
  if (error.response) {
    if (error.response.config !== error.config) removeAuthHeader(error.response.config);
    if (error.response.request) error.response.request = undefined;
  }
  if (error.request) error.request = undefined;
  return error;
};

// 서버 주소가 없으면 잘못된 곳으로 요청하지 않고 바로 실패시킨다. 토큰이 있으면 헤더에 붙인다.
api.interceptors.request.use((config) => {
  if (!BASE_URL) {
    return Promise.reject(new Error('EXPO_PUBLIC_API_URL이 설정되지 않아 요청할 수 없습니다.'));
  }
  config.authGeneration = authGeneration;
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// 401이면 (로그인/회원가입 요청 제외) 로그아웃 처리를 부른다
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error?.config;
    const isAuthRequest = AUTH_PATHS.some((path) => config?.url?.startsWith(path));
    const sentWithCurrentToken = config?.authGeneration === authGeneration && authToken !== null;

    if (error?.response?.status === 401 && !isAuthRequest && sentWithCurrentToken && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(removeAuthFromError(error));
  }
);

// 1. 카카오 도서 검색 API (백엔드 응답 포맷 유연 처리 보완)
export const searchBooks = async (query) => {
  try {
    const response = await api.get('/books/search', {
      params: { query },
    });

    if (response.data && response.data.documents) {
      return response.data;
    } else if (Array.isArray(response.data)) {
      return { documents: response.data };
    }

    return response.data;
  } catch (error) {
    console.error('도서 검색 API 에러:', error.message);
    throw error;
  }
};

// 2. 내 서재 도서 목록 조회 API (요청자는 서버가 토큰으로 확인)
export const getUserBooks = async () => {
  try {
    const response = await api.get('/user-books');
    return response.data;
  } catch (error) {
    console.error('서재 조회 API 에러:', error.message);
    throw error;
  }
};

// 3. 내 서재에 도서 추가 API (줄거리 및 도서 정보 필드 호환 정규화 보완, 요청자는 서버가 토큰으로 확인)
export const addUserBook = async (bookInfo, status = 'READING') => {
  try {
    // 백엔드/DB 테이블 구조에 맞게 도서 정보 정규화 (contents -> description 포함)
    const normalizedBook = {
      ...bookInfo,
      title: bookInfo.title || '',
      author: Array.isArray(bookInfo.authors)
        ? bookInfo.authors.join(', ')
        : bookInfo.author || bookInfo.authors || '',
      publisher: bookInfo.publisher || '',
      // 💡 핵심: 카카오 contents / DB description 호환 처리 (줄거리 누락 방지)
      description: bookInfo.contents || bookInfo.description || bookInfo.summary || '',
      contents: bookInfo.contents || bookInfo.description || bookInfo.summary || '',
      // 💡 커버 이미지 URL 호환 처리
      cover_url: bookInfo.thumbnail || bookInfo.cover_url || bookInfo.cover || bookInfo.cover_image || '',
      thumbnail: bookInfo.thumbnail || bookInfo.cover_url || bookInfo.cover || '',
      isbn: bookInfo.isbn || bookInfo.isbn13 || '',
    };

    const response = await api.post('/user-books', {
      bookInfo: normalizedBook,
      status,
    });
    return response.data;
  } catch (error) {
    console.error('서재 추가 API 에러:', error.message);
    throw error;
  }
};

// 4. 내 서재 도서 삭제 API
export const deleteUserBook = async (bookId) => {
  try {
    const response = await api.delete(`/user-books/${bookId}`);
    return response.data;
  } catch (error) {
    console.error('서재 삭제 API 에러:', error.message);
    throw error;
  }
};

// 5. 내 서재 도서 독서 상태 변경 API
export const updateUserBookStatus = async (bookId, status) => {
  try {
    const response = await api.patch(`/user-books/${bookId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('도서 상태 변경 실패:', error.message);
    throw error;
  }
};

// 책별 댓글 목록 조회 API (공개, 최신순). isbn은 ISBN13. before는 이 댓글 id보다 오래된 댓글만 (문자열)
export const getComments = async (isbn, { limit, before } = {}) => {
  try {
    const params = { isbn };
    if (limit) params.limit = limit;
    if (before) params.before = before;
    const response = await api.get('/comments', { params });
    return response.data;
  } catch (error) {
    console.error('댓글 조회 API 에러:', error.message);
    throw error;
  }
};

// 원댓글에 달린 답글 목록 조회 API (오래된 순). after는 이 답글 id 다음부터 (문자열)
export const getReplies = async (commentId, { limit, after } = {}) => {
  try {
    const params = {};
    if (limit) params.limit = limit;
    if (after) params.after = after;
    const response = await api.get(`/comments/${encodeURIComponent(commentId)}/replies`, { params });
    return response.data;
  } catch (error) {
    console.error('답글 조회 API 에러:', error.message);
    throw error;
  }
};

// 댓글 작성 API (로그인 필요, 작성자는 서버가 토큰으로 확인)
// parent_id가 있으면 그 원댓글의 답글, is_spoiler가 true면 스포일러 댓글
export const createComment = async (isbn, content, { parent_id, is_spoiler } = {}) => {
  try {
    const body = { isbn, content };
    if (parent_id) body.parent_id = parent_id;
    if (is_spoiler) body.is_spoiler = true;
    const response = await api.post('/comments', body);
    return response.data;
  } catch (error) {
    console.error('댓글 작성 API 에러:', error.message);
    throw error;
  }
};

// 내 댓글 숨김/숨김 해제 API (같은 값을 다시 보내도 결과는 같다. 남의 댓글이면 404)
export const setCommentHidden = async (commentId, isHidden) => {
  try {
    const response = await api.patch(`/comments/${encodeURIComponent(commentId)}/hidden`, {
      is_hidden: Boolean(isHidden),
    });
    return response.data;
  } catch (error) {
    console.error('댓글 숨김 API 에러:', error.message);
    throw error;
  }
};

// 댓글 삭제 API (본인 댓글만. 남의 댓글, 없는 댓글은 서버가 같은 404로 응답)
export const deleteComment = async (commentId) => {
  try {
    const response = await api.delete(`/comments/${encodeURIComponent(commentId)}`);
    return response.data;
  } catch (error) {
    console.error('댓글 삭제 API 에러:', error.message);
    throw error;
  }
};

// 댓글 공감 API (로그인 필요). 응답: { success, data: { comment_id, like_count, liked_by_me: true } }
// 실패하면 예외를 던진다. 400 LIKE_OWN_COMMENT, 404, 429 RATE_LIMITED는 error.response로 구분한다.
export const likeComment = async (commentId) => {
  try {
    const response = await api.put(`/comments/${encodeURIComponent(commentId)}/like`);
    return response.data;
  } catch (error) {
    console.error('댓글 공감 API 에러:', error.response?.data?.code || error.response?.status || error.message);
    throw error;
  }
};

// 댓글 공감 취소 API (로그인 필요, 멱등). 응답: { success, data: { comment_id, like_count, liked_by_me: false } }
export const unlikeComment = async (commentId) => {
  try {
    const response = await api.delete(`/comments/${encodeURIComponent(commentId)}/like`);
    return response.data;
  } catch (error) {
    console.error('댓글 공감 취소 API 에러:', error.response?.data?.code || error.response?.status || error.message);
    throw error;
  }
};

// 댓글 신고 API (로그인 필요). reason: 'spam' | 'abuse' | 'spoiler' | 'other', detail: 선택(200자 이하)
// 성공: 201 { success, message }. 실패하면 예외를 던진다. 400 REPORT_OWN_COMMENT, 404, 409 ALREADY_REPORTED, 429는 error.response로 구분한다.
// 신고 내용(detail)은 로그에 남기지 않는다.
export const reportComment = async (commentId, reason, detail) => {
  try {
    const body = { reason };
    if (detail) body.detail = detail;
    const response = await api.post(`/comments/${encodeURIComponent(commentId)}/report`, body);
    return response.data;
  } catch (error) {
    console.error('댓글 신고 API 에러:', error.response?.data?.code || error.response?.status || error.message);
    throw error;
  }
};

// 모음집 도서 목록 API (공개). category 생략이면 전체(소설/시/에세이), sort는 'title'(기본) | 'latest'
// 응답: { success, data: [books 행], pagination: { page, limit, total, hasNext } }
export const getBooks = async ({ category, sort = 'title', page = 1, limit = 30 } = {}) => {
  try {
    const params = { sort, page, limit };
    if (category) params.category = category;
    const response = await api.get('/books', { params });
    return response.data;
  } catch (error) {
    console.error('모음집 조회 API 에러:', error.response?.status || error.message);
    throw error;
  }
};

// 책 소개글 API (공개). id는 books 테이블 id(catalogId). 응답: { success, data: { description: string | null } }
// 소개글은 서버가 카카오에서 실시간으로 가져오고(약 250자), 실패하면 null. IP 제한으로 429(RATE_LIMITED)가 올 수 있다.
export const getBookDescription = async (id) => {
  try {
    const response = await api.get(`/books/${encodeURIComponent(id)}/description`);
    return response.data;
  } catch (error) {
    console.error('책 소개글 API 에러:', error.response?.status || error.message);
    throw error;
  }
};

// 관련 책 API (공개). 같은 분야 또는 같은 작가의 책 최대 10권. 응답: { success, data: [books 행] }
export const getRelatedBooks = async (id) => {
  try {
    const response = await api.get(`/books/${encodeURIComponent(id)}/related`);
    return response.data;
  } catch (error) {
    console.error('관련 책 API 에러:', error.response?.status || error.message);
    throw error;
  }
};

// ---- 독서 기록 API (모두 로그인 필요, id는 user_books.id) ----

// MY 화면용 요약. 응답 data: { month, counts: { total, completed, reading, wish, completed_this_month, notes }, recent_completed: [...] }
export const getUserBooksSummary = async (recent = 5) => {
  try {
    const response = await api.get('/user-books/summary', { params: { recent } });
    return response.data;
  } catch (error) {
    console.error('독서 기록 요약 API 에러:', error.response?.status || error.message);
    throw error;
  }
};

// 완독일 수정 (완독 상태인 내 도서만). readEndDate: 'YYYY-MM-DD'. 응답 data: { id, status, read_end_date }
// 실패하면 예외를 던진다. 400 VALIDATION_ERROR, 404, 409 NOT_COMPLETED는 error.response.status로 구분한다.
export const updateReadEndDate = async (id, readEndDate) => {
  try {
    const response = await api.patch(`/user-books/${encodeURIComponent(id)}/read-end-date`, {
      read_end_date: readEndDate,
    });
    return response.data;
  } catch (error) {
    console.error('완독일 수정 API 에러:', error.response?.status || error.message);
    throw error;
  }
};

// 메모 조회. 응답 data: { id, user_book_id, content, created_at, updated_at } 또는 null(메모 없음)
export const getUserBookNote = async (id) => {
  try {
    const response = await api.get(`/user-books/${encodeURIComponent(id)}/note`);
    return response.data;
  } catch (error) {
    console.error('메모 조회 API 에러:', error.response?.status || error.message);
    throw error;
  }
};

// 메모 작성/수정 (둘 다 PUT). content는 공백을 뺀 1~2000자. 메모 내용은 로그에 남기지 않는다.
export const saveUserBookNote = async (id, content) => {
  try {
    const response = await api.put(`/user-books/${encodeURIComponent(id)}/note`, { content });
    return response.data;
  } catch (error) {
    console.error('메모 저장 API 에러:', error.response?.status || error.message);
    throw error;
  }
};

// 메모 삭제. 메모가 없으면 404 code:'NOTE_NOT_FOUND'
export const deleteUserBookNote = async (id) => {
  try {
    const response = await api.delete(`/user-books/${encodeURIComponent(id)}/note`);
    return response.data;
  } catch (error) {
    console.error('메모 삭제 API 에러:', error.response?.status || error.message);
    throw error;
  }
};

// AI 독서 추천 API (로그인 필요). AI 응답이 느려서 이 요청만 timeout을 30초로 덮어쓴다.
// taste: { genres, topics, moods, useHistory }
// refresh: 「다시 추천」일 때만 true (처음 요청은 false)
// 실패하면 예외를 던진다. 서버 오류 code는 error.response.data.code에 있다.
export const getAiRecommendations = async (taste, { refresh = false } = {}) => {
  try {
    const response = await api.post(
      '/ai/recommend',
      {
        genres: taste.genres,
        topics: taste.topics,
        moods: taste.moods,
        useHistory: taste.useHistory === true,
        refresh: refresh === true,
      },
      { timeout: 30000 }
    );
    return response.data;
  } catch (error) {
    console.error('AI 추천 API 에러:', error.response?.data?.code || error.message);
    throw error;
  }
};

// AI 댓글 요약 API (로그인 필요). AI 응답이 느려서 이 요청만 timeout을 30초로 덮어쓴다.
// isbn: ISBN13. includeSpoilers: 스포일러 댓글도 요약에 포함. refresh: 「다시 요약」일 때만 true
// 성공 응답: { success, data: { isbn, includeSpoilers, cached, generatedAt, counts, summary, comments } }
// 실패하면 예외를 던진다. 서버 오류 code는 error.response.data.code에 있다. (401은 code가 없다)
export const getAiCommentSummary = async (isbn, { includeSpoilers = false, refresh = false } = {}) => {
  try {
    const response = await api.post(
      '/ai/comment-summary',
      {
        isbn,
        includeSpoilers: includeSpoilers === true,
        refresh: refresh === true,
      },
      { timeout: 30000 }
    );
    return response.data;
  } catch (error) {
    console.error('AI 댓글 요약 API 에러:', error.response?.data?.code || error.message);
    throw error;
  }
};

// AI 독서 리포트 생성 API (로그인 필요). 생성하면 서버가 자동 저장한다. 이 요청만 timeout을 30초로 덮어쓴다.
// period: 'this_month' | 'last_month'. includeNotes: 메모도 분석에 넣을지 (true일 때만 보낸다)
// 성공 응답: { success, data: Report }. 실패하면 예외를 던진다. 서버 오류 code는 error.response.data.code에 있다. (401은 code가 없다)
export const createReadingReport = async (period, includeNotes = false) => {
  try {
    const response = await api.post(
      '/ai/reading-report',
      { period, includeNotes: includeNotes === true },
      { timeout: 30000 }
    );
    return response.data;
  } catch (error) {
    console.error('AI 독서 리포트 생성 API 에러:', error.response?.data?.code || error.message);
    throw error;
  }
};

// 저장된 독서 리포트 목록 API (로그인 필요). 최신순 20개, 본문 포함. 응답: { success, data: Report[] }
export const getReadingReports = async () => {
  try {
    const response = await api.get('/reading-reports');
    return response.data;
  } catch (error) {
    console.error('독서 리포트 목록 API 에러:', error.response?.status || error.message);
    throw error;
  }
};

// 저장된 독서 리포트 삭제 API (본인 것만. 없거나 남의 것이면 404)
export const deleteReadingReport = async (id) => {
  try {
    const response = await api.delete(`/reading-reports/${encodeURIComponent(id)}`);
    return response.data;
  } catch (error) {
    console.error('독서 리포트 삭제 API 에러:', error.response?.status || error.message);
    throw error;
  }
};

// 💡 [신규 추가] 6. 회원가입 API (POST /api/auth/signup)
export const signupUser = async (email, password, nickname) => {
  try {
    const response = await api.post('/auth/signup', {
      email,
      password,
      nickname,
    });
    return response.data;
  } catch (error) {
    console.error('회원가입 API 에러:', error.response?.data || error.message);
    return error.response?.data || { success: false, message: '회원가입 처리 중 오류가 발생했습니다.' };
  }
};

// 💡 [신규 추가] 7. 이메일 로그인 API (POST /api/auth/login)
export const loginUser = async (email, password) => {
  try {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    console.error('로그인 API 에러:', error.response?.data || error.message);
    return error.response?.data || { success: false, message: '로그인 처리 중 오류가 발생했습니다.' };
  }
};

// 8. 닉네임 변경 API (PATCH /api/auth/nickname, 로그인 필요)
// 성공 시 응답 { success, message, user }를 돌려준다. 실패는 호출하는 쪽이 error.response?.status로 구분한다.
export const updateNickname = async (nickname) => {
  const response = await api.patch('/auth/nickname', { nickname });
  return response.data;
};

// 9. 프로필 사진 등록/변경 API (PUT /api/auth/profile-image, 로그인 필요)
// base64는 data: 접두사 없는 순수 base64 문자열. 성공 시 { success, user }를 돌려준다.
export const updateProfileImage = async (base64) => {
  const response = await api.put('/auth/profile-image', { image: base64 });
  return response.data;
};

// 10. 프로필 사진 삭제 API (DELETE /api/auth/profile-image, 로그인 필요)
export const deleteProfileImage = async () => {
  const response = await api.delete('/auth/profile-image');
  return response.data;
};

export default api;