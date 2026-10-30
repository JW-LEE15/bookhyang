import React, { useState, useContext } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import KeyboardAwareContainer from '../components/KeyboardAwareContainer';

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const { signup } = useContext(AuthContext);

  const handleSignup = async () => {
    if (!name || !email || !password || !passwordConfirm) {
      Alert.alert('알림', '모든 항목을 입력해 주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('알림', '비밀번호가 일치하지 않아요.');
      return;
    }
    const result = await signup(email, password, name);
    if (result.success) {
      Alert.alert('성공', '회원가입이 완료되었습니다! 로그인해 주세요.', [
        { text: '확인', onPress: () => navigation.navigate('Login') }
      ]);
    } else {
      Alert.alert('회원가입 실패', result.message);
    }
  };

  return (
    <KeyboardAwareContainer>
      <Text style={styles.title}>회원가입</Text>

      <TextInput
        style={styles.input}
        placeholder="이름"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호 확인"
        value={passwordConfirm}
        onChangeText={setPasswordConfirm}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleSignup}>
        <Text style={styles.buttonText}>가입하기</Text>
      </TouchableOpacity>
    </KeyboardAwareContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#333' },
  input: { borderBottomWidth: 1, borderBottomColor: '#ccc', paddingVertical: 10, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});