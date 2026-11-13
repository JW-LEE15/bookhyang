import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthContext } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import BookDetailScreen from '../screens/BookDetailScreen';
import MyLibraryScreen from '../screens/MyLibraryScreen';
import AiTasteScreen from '../screens/AiTasteScreen';
import AiRecommendResultScreen from '../screens/AiRecommendResultScreen';
import BookCommentsScreen from '../screens/BookCommentsScreen';
import AiCommentSummaryScreen from '../screens/AiCommentSummaryScreen';
import AiReportScreen from '../screens/AiReportScreen';
import LegalDocumentScreen from '../screens/LegalDocumentScreen';
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
          <Stack.Screen
            name="MyLibrary"
            component={MyLibraryScreen}
            options={{ headerShown: true, title: '내 서재' }}
          />
          <Stack.Screen
            name="AiTaste"
            component={AiTasteScreen}
            options={{ headerShown: true, title: 'AI 독서 추천' }}
          />
          <Stack.Screen
            name="AiRecommendResult"
            component={AiRecommendResultScreen}
            options={{ headerShown: true, title: '추천 결과' }}
          />
          <Stack.Screen
            name="BookComments"
            component={BookCommentsScreen}
            options={{ headerShown: true, title: '댓글' }}
          />
          <Stack.Screen
            name="AiCommentSummary"
            component={AiCommentSummaryScreen}
            options={{ headerShown: true, title: 'AI 댓글 요약' }}
          />
          <Stack.Screen
            name="AiReport"
            component={AiReportScreen}
            options={{ headerShown: true, title: 'AI 독서 리포트' }}
          />
          <Stack.Screen
            name="Terms"
            component={LegalDocumentScreen}
            initialParams={{ type: 'terms' }}
            options={{ headerShown: true, title: '이용약관' }}
          />
          <Stack.Screen
            name="Privacy"
            component={LegalDocumentScreen}
            initialParams={{ type: 'privacy' }}
            options={{ headerShown: true, title: '개인정보 처리방침' }}
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