import axios from 'axios';

// 확인된 ngrok 풀 주소 적용 (끝에 /api 추가)
const BASE_URL = 'http://10.232.181.37:5000/api';

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

// 3. 내 서재에 도서 추가 API (독서 상태 지정 지원)
export const addUserBook = async (userId, bookInfo, status = 'READING') => {
  try {
    const response = await api.post('/user-books', {
      userId,
      bookInfo,
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

export default api;