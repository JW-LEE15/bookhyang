import React from 'react';
import { KeyboardAvoidingView, ScrollView, Platform, StyleSheet } from 'react-native';

// 키보드가 올라와도 입력칸과 버튼에 닿을 수 있도록 감싸는 공통 컨테이너 (로그인/회원가입용)
export default function KeyboardAwareContainer({ children }) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
});
