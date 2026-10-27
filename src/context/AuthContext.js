import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, signupUser } from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. 앱 실행 시 저장된 로그인 유저 정보 불러오기
  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user_info');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('로그인 정보 로드 실패:', e);
      } finally {
        setLoading(false);
      }
    };
    loadStorageData();
  }, []);

  // 2. 회원가입 처리
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

  // 3. 이메일 로그인 처리 (DB 유저 정보 저장)
  const login = async (email, password) => {
    try {
      const res = await loginUser(email, password);
      if (res.success && res.user) {
        setUser(res.user);
        // 로그인 정보 디바이스에 저장 (앱 재실행 시 유지)
        await AsyncStorage.setItem('user_info', JSON.stringify(res.user));
        return { success: true };
      } else {
        return { success: false, message: res.message || '이메일 또는 비밀번호가 잘못되었습니다.' };
      }
    } catch (error) {
      return { success: false, message: '서버 통신 실패' };
    }
  };

  // 4. 로그아웃 처리
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user_info');
      setUser(null);
    } catch (e) {
      console.error('로그아웃 실패:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};