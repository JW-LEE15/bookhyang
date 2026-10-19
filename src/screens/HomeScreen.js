import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // 별도 패키지에서 가져옴
import { COLORS } from '../constants/theme'; // 1번에서 생성한 theme.js 활용[cite: 1]

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subTitle}>MINUMSA ARCHIVE</Text>
        <Text style={styles.mainTitle}>오늘의 문장</Text>

        {/* 1. 오늘의 문장 카드 */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "모든 책은 사람의 영혼을 비추는 거울과 같다."
          </Text>
          <Text style={styles.quoteAuthor}>- 변신, 프란츠 카프카</Text>
        </View>

        {/* 2. 빠른 검색 진입 바 (신규 추가: 클릭 시 검색 탭으로 이동) */}
        <TouchableOpacity 
          style={styles.searchBar} 
          onPress={() => navigation.navigate('검색')}
        >
          <Text style={styles.searchPlaceholder}>🔍 읽고 싶은 도서나 작가를 검색해보세요</Text>
        </TouchableOpacity>

        {/* 3. AI 추천 진입 배너 (신규 추가: 13주차 AI 기능 연결용) */}
        <TouchableOpacity style={styles.aiBanner}>
          <Text style={styles.aiBannerBadge}>AI 취향 분석</Text>
          <Text style={styles.aiBannerTitle}>나만의 독서 페르소나와 맞춤 책 찾기 →</Text>
        </TouchableOpacity>

        {/* 4. 이달의 추천 도서 */}
        <Text style={[styles.mainTitle, { marginTop: 24 }]}>이달의 추천 도서</Text>
        <View style={styles.recommendCard}>
          <Text style={styles.recommendText}>추천 도서 슬라이드가 들어올 자리입니다.</Text>
        </View>

        {/* 5. 로그인 안내 영역 */}
        <View style={styles.loginBanner}>
          <Text style={styles.loginText}>로그인하고 내 서재와 메모를 안전하게 보관하세요.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#F7F4EB',
  },
  content: {
    padding: 20,
  },
  subTitle: {
    fontSize: 12,
    letterSpacing: 1.5,
    color: '#8C827A',
    fontWeight: '600',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2B2118',
    marginTop: 4,
  },
  quoteCard: {
    backgroundColor: '#EBE5D8',
    padding: 20,
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  quoteText: {
    fontSize: 16,
    color: '#2B2118',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    fontSize: 13,
    color: '#8C827A',
    marginTop: 12,
    textAlign: 'right',
  },
  searchBar: {
    backgroundColor: '#EBE5D8',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  searchPlaceholder: {
    color: '#8C827A',
    fontSize: 14,
  },
  aiBanner: {
    backgroundColor: '#5C3D2E',
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  aiBannerBadge: {
    color: '#E0A96D',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  aiBannerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  recommendCard: {
    height: 160,
    backgroundColor: '#D9D0C1',
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 20,
    justify: 'center',
    alignItems: 'center',
  },
  recommendText: {
    color: '#5C5046',
    fontSize: 14,
  },
  loginBanner: {
    backgroundColor: '#EBE5D8',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 13,
    color: '#5C3D2E',
    fontWeight: '500',
  },
});