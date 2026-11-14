import React, { createContext, useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, signupUser, setAuthToken, setUnauthorizedHandler } from '../api';
import { getStoredToken, saveStoredToken, deleteStoredToken } from '../api/tokenStorage';

export const AuthContext = createContext();

const USER_INFO_KEY = 'user_info';

// 저장된 로그인 정보(토큰 + user_info)를 모두 지운다. 하나가 실패해도 나머지는 지운다.
const clearStoredSession = async () => {
  setAuthToken(null);
  const results = await Promise.allSettled([
    deleteStoredToken(),
    AsyncStorage.removeItem(USER_INFO_KEY),
  ]);
  if (results.some((r) => r.status === 'rejected')) {
    console.error('저장된 로그인 정보 삭제 중 일부 실패');
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // 만료 알림을 이미 띄웠는지 (동시에 여러 요청이 401이어도 한 번만)
  const expiredHandledRef = useRef(false);
  // 최신 user (updateUser가 오래된 값에 덮어쓰지 않게 한다)
  const userRef = useRef(null);
  userRef.current = user;

  // 1. 앱 실행 시 저장된 로그인 정보 불러오기. 토큰이 없으면 user_info도 지우고 로그인 화면으로.
  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const [storedUser, storedToken] = await Promise.all([
          AsyncStorage.getItem(USER_INFO_KEY),
          getStoredToken(),
        ]);
        if (storedUser && storedToken) {
          setAuthToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else {
          await clearStoredSession();
        }
      } catch (e) {
        console.error('로그인 정보 로드 실패:', e?.message);
        setUser(null);
        await clearStoredSession();
      } finally {
        setLoading(false);
      }
    };
    loadStorageData();
  }, []);

  // 2. 서버가 토큰을 거부하면(401) 로그아웃하고 알림은 한 번만 띄운다
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      if (expiredHandledRef.current) return;
      expiredHandledRef.current = true;
      await clearStoredSession();
      setUser(null);
      Alert.alert('알림', '로그인이 만료되었습니다. 다시 로그인해 주세요.');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // 3. 회원가입 처리
  const signup = async (email, password, nickname) => {
    try {
      const res = await signupUser(email, password, nickname);
      if (res.success) {
        return { success: true, message: res.message };
      } else {
        return { success: false, message: res.message || '회원가입 실패' };
      }
    } catch (error) {
      return { success: false, message: '서버 통신 실패' };
    }
  };

  // 4. 이메일 로그인 처리 (토큰은 SecureStore, 유저 정보는 AsyncStorage에 저장)
  const login = async (email, password) => {
    try {
      const res = await loginUser(email, password);
      if (res.success && res.user && res.token) {
        await saveStoredToken(res.token);
        setAuthToken(res.token);
        await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(res.user));
        expiredHandledRef.current = false;
        setUser(res.user);
        return { success: true };
      } else if (res.success) {
        // 서버가 토큰을 주지 않은 경우 (서버 버전이 맞지 않음)
        return { success: false, message: '로그인 응답이 올바르지 않습니다. 서버를 확인해 주세요.' };
      } else {
        return { success: false, message: res.message || '이메일 또는 비밀번호가 잘못되었습니다.' };
      }
    } catch (error) {
      await clearStoredSession();
      return { success: false, message: '서버 통신 실패' };
    }
  };

  // 5. 로그아웃 처리
  const logout = async () => {
    await clearStoredSession();
    setUser(null);
  };

  // 6. 유저 정보 일부 갱신 (예: 닉네임 변경). 화면 상태와 저장된 user_info를 함께 바꾼다.
  const updateUser = async (partial) => {
    const current = userRef.current;
    if (!current || !partial) return;
    const merged = { ...current, ...partial };
    userRef.current = merged;
    setUser(merged);
    try {
      await AsyncStorage.setItem(USER_INFO_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error('유저 정보 저장 실패:', e?.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
