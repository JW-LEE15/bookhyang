import 'react-native-gesture-handler';
import React, { useContext } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext, AuthProvider } from './src/context/AuthContext';
import MainStackNavigator from './src/navigation/MainStackNavigator';

// 💡 로그인 여부에 따라 화면을 전환해 주는 래퍼 컴포넌트
function RootAppNavigator() {
  const { user, loading } = useContext(AuthContext);

  // AsyncStorage에서 로그인 정보 불러오는 동안 로딩 표시
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5C3D2E" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      {/* 
        💡 AuthContext의 user 값에 맞춰 MainStackNavigator 내부 또는 
        네비게이션 렌더링을 처리합니다.
      */}
      <MainStackNavigator user={user} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootAppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F4EB',
  },
});