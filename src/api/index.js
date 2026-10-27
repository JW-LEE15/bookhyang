import axios from 'axios';

// 확인된 ngrok / 서버 주소 적용 (끝에 /api 추가)
const BASE_URL = 'http://121.168.120.12:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // ngrok 경고/안내 페이지 자동 패스
  },
});

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

// 2. 내 서재 도서 목록 조회 API
export const getUserBooks = async (userId) => {
  try {
    const response = await api.get(`/user-books/${userId}`);
    return response.data;
  } catch (error) {
    console.error('서재 조회 API 에러:', error.message);
    throw error;
  }
};

// 3. 내 서재에 도서 추가 API (줄거리 및 도서 정보 필드 호환 정규화 보완)
export const addUserBook = async (userId, bookInfo, status = 'READING') => {
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
      userId,
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
    console.error('도서 상태 변경 실패:', error);
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

export default api;