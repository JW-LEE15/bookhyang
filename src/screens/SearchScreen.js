import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput } from 'react-native';

export default function SearchScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.subTitle}>SEARCH</Text>
        <Text style={styles.mainTitle}>도서 및 작가 검색</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="책 제목, 작가, 초성을 입력하세요 (예: ㅎㄱ)"
          placeholderTextColor="#8C827A"
        />

        <Text style={styles.sectionTitle}>인기 검색 태그</Text>
        <View style={styles.tagContainer}>
          {['#한강', '#노벨문학상', '#세계문학전집', '#카프카', '#시집'].map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
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
  searchInput: {
    height: 48,
    backgroundColor: '#EBE5D8',
    borderRadius: 24,
    paddingHorizontal: 20,
    fontSize: 14,
    color: '#2B2118',
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#2B2118', marginTop: 24, marginBottom: 12 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#E2DACB', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  tagText: { color: '#5C5046', fontSize: 13 },
});