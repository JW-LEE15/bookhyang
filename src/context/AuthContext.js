import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // 백엔드 API Base URL (로컬 개발 환경 테스트용)
  // Android 에뮬레이터: http://10.0.2.2:5000
  // 실기기(Expo Go 등): PC의 내부 IP 주소 (예: http://192.168.x.x:5000)
  const API_URL = 'http://10.0.2.2:5000/api/auth';

  useEffect(() => {
    // 앱 시작 시 저장된 토큰 확인 (자동 로그인)
    const loadStoredAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('인증 데이터 로드 실패:', e);
      } finally {
        setLoading(false);
      }
    };
    loadStoredAuth();
  }, []);

  // 회원가입
  const signup = async (email, password, name) => {
    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '회원가입 실패');
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // 로그인
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '로그인 실패');

      // 토큰 및 사용자 정보 저장
      const accessToken = data.session?.access_token || data.token;
      const userData = data.user;

      await AsyncStorage.setItem('userToken', accessToken);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // 로그아웃
  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};