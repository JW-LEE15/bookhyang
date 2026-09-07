import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from 'react-native';

export default function MyScreen({navigation}) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.subTitle}>MY PAGE</Text>
        <Text style={styles.mainTitle}>마이페이지</Text>

        <View style={styles.profileCard}>
          <Text style={styles.profileName}>로그인이 필요합니다</Text>
          <Text style={styles.profileSub}>북향의 다양한 아카이브 기능을 이용해 보세요.</Text>
          
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>로그인 / 회원가입</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EB' },
  content: { padding: 20 },
  subTitle: { fontSize: 12, letterSpacing: 1.5, color: '#8C827A', fontWeight: '600' },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#2B2118', marginTop: 4, marginBottom: 16 },
  profileCard: {
    backgroundColor: '#EBE5D8',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#2B2118' },
  profileSub: { fontSize: 12, color: '#8C827A', marginTop: 6, textAlign: 'center' },
  loginButton: {
    backgroundColor: '#2B2118',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  loginButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});