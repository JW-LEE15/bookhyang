import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { getUserBooks } from '../api';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

export default function MyScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    reading: 0,
    completed: 0,
    wish: 0,
  });
  const [recentBooks, setRecentBooks] = useState([]);

  // 서재 데이터 기반 통계 계산 및 최신 도서 추출
  const fetchMyData = async () => {
    try {
      setLoading(true);
      const data = await getUserBooks(TEST_USER_ID);

      let bookList = [];
      if (data && Array.isArray(data)) {
        bookList = data;
      } else if (data && data.books && Array.isArray(data.books)) {
        bookList = data.books;
      } else if (data && data.data && Array.isArray(data.data)) {
        bookList = data.data;
      }

      // 독서 상태별 카운팅
      let readingCount = 0;
      let completedCount = 0;
      let wishCount = 0;

      bookList.forEach((book) => {
        const status = (book.status || '').toUpperCase();
        if (status === 'READING' || status === '읽는 중') {
          readingCount += 1;
        } else if (status === 'COMPLETED' || status === 'FINISHED' || status === '완독') {
          completedCount += 1;
        } else if (status === 'WISH' || status === 'WANT_TO_READ' || status === '읽고 싶은') {
          wishCount += 1;
        } else {
          readingCount += 1; // 기본값
        }
      });

      setStats({
        total: bookList.length,
        reading: readingCount,
        completed: completedCount,
        wish: wishCount,
      });

      // 최근 추가한 도서 상위 5개
      setRecentBooks(bookList.slice(0, 5));
    } catch (error) {
      console.error('마이페이지 데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 화면 포커스 시 실시간 통계 최신화
  useFocusEffect(
    useCallback(() => {
      fetchMyData();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.subTitle}>MY PAGE</Text>
          <Text style={styles.mainTitle}>마이페이지</Text>
        </View>

        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>책</Text>
          </View>
          <Text style={styles.profileName}>북향 수집가</Text>
          <Text style={styles.profileSub}>민음사 서재를 차곡차곡 채우는 중입니다</Text>
        </View>

        {/* 독서 통계 요약 카드 */}
        <Text style={styles.sectionTitle}>독서 기록 요약</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary || '#5C3D2E'} />
          </View>
        ) : (
          <View style={styles.statsCardContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>전체 수집</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.reading}</Text>
              <Text style={styles.statLabel}>읽는 중</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.completed}</Text>
              <Text style={styles.statLabel}>완독</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.wish}</Text>
              <Text style={styles.statLabel}>읽고 싶은</Text>
            </View>
          </View>
        )}

        {/* 최근 수집한 도서 리스트 */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>최근 담은 책</Text>
          <TouchableOpacity onPress={() => navigation.navigate('모음집')}>
            <Text style={styles.moreText}>모음집 보기 &gt;</Text>
          </TouchableOpacity>
        </View>

        {recentBooks.length === 0 ? (
          <View style={styles.emptyRecentBox}>
            <Text style={styles.emptyRecentText}>아직 서재에 담은 책이 없습니다.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
            {recentBooks.map((item, index) => {
              const rawCover = item.cover_url || item.thumbnail || item.cover_image;
              const cover = rawCover ? rawCover.replace('http://', 'https://') : null;
              const title = item.title || '제목 없음';

              return (
                <TouchableOpacity
                  key={item.id?.toString() || index.toString()}
                  style={styles.recentBookCard}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('BookDetail', { book: item })}
                >
                  {cover ? (
                    <Image source={{ uri: cover }} style={styles.recentCover} resizeMode="cover" />
                  ) : (
                    <View style={[styles.recentCover, styles.recentCoverPlaceholder]}>
                      <Text style={styles.recentCoverText} numberOfLines={2}>{title}</Text>
                    </View>
                  )}
                  <Text style={styles.recentBookTitle} numberOfLines={1}>{title}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || '#F7F4EB' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 12 },
  subTitle: { fontSize: 12, letterSpacing: 1.5, color: '#8C827A', fontWeight: '600' },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#2B2118', marginTop: 4 },
  profileCard: {
    backgroundColor: '#EBE5D8',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#5C3D2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#2B2118' },
  profileSub: { fontSize: 12, color: '#8C827A', marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2B2118', marginBottom: 12 },
  loadingContainer: { paddingVertical: 20, alignItems: 'center' },
  statsCardContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 8,
    marginBottom: 28,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#5C3D2E' },
  statLabel: { fontSize: 11, color: '#8C827A', marginTop: 4 },
  statDivider: { width: 1, height: 24, backgroundColor: '#EBE5D8' },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moreText: { fontSize: 12, color: '#8C827A', fontWeight: '600' },
  emptyRecentBox: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  emptyRecentText: { fontSize: 13, color: '#8C827A' },
  recentScroll: { flexDirection: 'row', marginTop: 4 },
  recentBookCard: { width: 80, marginRight: 12 },
  recentCover: { width: 80, height: 115, borderRadius: 6 },
  recentCoverPlaceholder: { backgroundColor: '#D9D0C1', justifyContent: 'center', alignItems: 'center', padding: 6 },
  recentCoverText: { fontSize: 10, color: '#2B2118', textAlign: 'center', fontWeight: 'bold' },
  recentBookTitle: { fontSize: 12, color: '#2B2118', marginTop: 6, fontWeight: '500', textAlign: 'center' },
});