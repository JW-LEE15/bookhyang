import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthContext } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import BookDetailScreen from '../screens/BookDetailScreen';
import BottomTabNavigator from './BottomTabNavigator';

const Stack = createStackNavigator();

export default function MainStackNavigator() {
  // 💡 [수정] token 대신 AuthContext의 user 객체 상태를 구독합니다.
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        // 💡 user 객체가 존재할 경우 (로그인 성공 시) 메인 화면 렌더링
        <>
          <Stack.Screen name="MainTab" component={BottomTabNavigator} />
          <Stack.Screen 
            name="BookDetail" 
            component={BookDetailScreen} 
            options={{ headerShown: true, title: '도서 상세 정보' }} 
          />
        </>
      ) : (
        // 💡 user 객체가 없을 경우 (비로그인) 로그인/회원가입 화면 렌더링
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}