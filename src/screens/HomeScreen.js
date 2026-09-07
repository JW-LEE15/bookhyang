import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subTitle}>MINUMSA ARCHIVE</Text>
        <Text style={styles.mainTitle}>오늘의 문장</Text>

        {/* 오늘의 문장 카드 */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "모든 책은 사람의 영혼을 비추는 거울과 같다."
          </Text>
          <Text style={styles.quoteAuthor}>- 변신, 프란츠 카프카</Text>
        </View>

        <Text style={[styles.mainTitle, { marginTop: 28 }]}>이달의 추천 도서</Text>
        <View style={styles.recommendCard}>
          <Text style={styles.recommendText}>추천 도서 슬라이드가 들어올 자리입니다.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4EB',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2B2118',
    marginTop: 4,
  },
  quoteCard: {
    backgroundColor: '#EBE5D8',
    padding: 20,
    borderRadius: 16,
    marginTop: 12,
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
  recommendCard: {
    height: 160,
    backgroundColor: '#D9D0C1',
    borderRadius: 16,
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendText: {
    color: '#5C5046',
    fontSize: 14,
  },
});