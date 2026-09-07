import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      alert('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    alert('로그인 성공! (추후 백엔드 JWT 인증 연동 예정)');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← 뒤로가기</Text>
        </TouchableOpacity>

        <Text style={styles.subTitle}>MINUMSA ARCHIVE</Text>
        <Text style={styles.mainTitle}>북향 로그인</Text>

        <View style={styles.form}>
          <Text style={styles.label}>이메일 계정</Text>
          <TextInput
            style={styles.input}
            placeholder="example@minumsa.com"
            placeholderTextColor="#8C827A"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            placeholder="비밀번호를 입력하세요"
            placeholderTextColor="#8C827A"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>로그인</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={() => alert('회원가입 기능은 4주차 백엔드 연동 시 연결됩니다.')}
          >
            <Text style={styles.registerButtonText}>아직 계정이 없으신가요? 회원가입</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EB' },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 20, left: 24 },
  backButtonText: { color: '#8C827A', fontSize: 14, fontWeight: '600' },
  subTitle: { fontSize: 12, letterSpacing: 1.5, color: '#8C827A', fontWeight: '600' },
  mainTitle: { fontSize: 28, fontWeight: 'bold', color: '#2B2118', marginTop: 4, marginBottom: 32 },
  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: 'bold', color: '#2B2118', marginBottom: 8 },
  input: {
    height: 50,
    backgroundColor: '#EBE5D8',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#2B2118',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#2B2118',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  registerButton: { marginTop: 20, alignItems: 'center' },
  registerButtonText: { color: '#8C827A', fontSize: 13, textDecorationLine: 'underline' },
});