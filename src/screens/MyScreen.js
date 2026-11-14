import React, { useState, useCallback, useContext, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert, // 👈 [추가] 로그아웃 확인 팝업용 Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { getUserBooksSummary } from '../api';
import { AuthContext } from '../context/AuthContext'; // 👈 AuthContext 불러오기
import BookCover, { toHttps } from '../components/BookCover';
import UserAvatar from '../components/UserAvatar';
import { getRecentBooks } from '../storage/recentBooksStorage';
import { recentToDetailBook } from '../utils/bookShape';
import { normalizeReadEndDate } from '../utils/readEndDate';

const RECENT_COUNT = 5;
const CARD_WIDTH = 80;
const CARD_COVER_HEIGHT = 115;

function StatBox({ value, label }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function MyScreen({ navigation }) {
  // 💡 AuthContext에서 logout 함수 추가 추출
  const { user, logout } = useContext(AuthContext);
  const currentUserId = user?.id; // DB 고유 유저 ID (UUID)

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [counts, setCounts] = useState(null); // summary.counts
  const [recentCompleted, setRecentCompleted] = useState([]); // summary.recent_completed
  const [recentViewed, setRecentViewed] = useState([]); // 기기에 저장된 최근 본 책
  const requestIdRef = useRef(0); // 늦게 온 이전 응답을 버리기 위한 요청 번호

  // 서버 요약(통계, 최근 완독)과 기기의 최근 본 책을 불러온다
  const fetchMyData = async () => {
    const requestId = ++requestIdRef.current;
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    // 최근 본 책은 서버와 상관없이 항상 읽는다 (읽기에 실패하면 빈 목록)
    getRecentBooks(currentUserId).then((list) => {
      if (requestId === requestIdRef.current) setRecentViewed(list.slice(0, RECENT_COUNT));
    });

    try {
      const res = await getUserBooksSummary(RECENT_COUNT);
      if (requestId !== requestIdRef.current) return;
      setCounts(res?.data?.counts || null);
      setRecentCompleted(Array.isArray(res?.data?.recent_completed) ? res.data.recent_completed : []);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(true);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  // 💡 로그아웃 핸들러 함수
  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => logout(), // Context의 logout 실행 ➔ user가 null이 되며 로그인 화면으로 자동 전환
      },
    ]);
  };

  // 화면 포커스 시 실시간 통계 최신화
  useFocusEffect(
    useCallback(() => {
      fetchMyData();
      return () => {
        requestIdRef.current += 1; // 화면을 떠나면 진행 중인 응답은 무시한다
      };
    }, [currentUserId])
  );

  // 최근 완독한 책은 서재 행(user_books)이라 서재에서 열 때와 같은 모양으로 넘긴다 (id = user_books.id)
  const openCompleted = (item) => {
    navigation.navigate('BookDetail', {
      book: {
        id: item.id,
        title: item.title,
        author: item.author,
        isbn: item.isbn,
        cover_image: item.cover_image,
        status: 'COMPLETED',
        read_end_date: item.read_end_date,
      },
    });
  };

  // 최근 본 책은 id 없이 열린다 (기록에는 isbn, title, author, thumbnail만 있다)
  const openViewed = (entry) => {
    navigation.navigate('BookDetail', { book: recentToDetailBook(entry) });
  };

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
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="프로필 편집"
          >
            <UserAvatar uri={user?.profile_image_url} size={54}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {user?.nickname ? user.nickname.substring(0, 1) : '책'}
                </Text>
              </View>
            </UserAvatar>
          </TouchableOpacity>
          <Text style={styles.profileName}>{user?.nickname || '북향 수집가'}</Text>
          <Text style={styles.profileSub}>민음사 서재를 차곡차곡 채우는 중입니다</Text>

          {/* 💡 [추가] 로그아웃 버튼 */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        {/* 독서 통계 요약 카드 (GET /user-books/summary) */}
        <Text style={styles.sectionTitle}>독서 기록 요약</Text>
        {loading && !counts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : error && !counts ? (
          <TouchableOpacity style={styles.errorBox} onPress={fetchMyData} activeOpacity={0.8}>
            <Text style={styles.emptyRecentText}>독서 기록을 불러오지 못했어요.</Text>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <StatBox value={counts?.total ?? 0} label="전체 수집" />
              <View style={styles.statDivider} />
              <StatBox value={counts?.reading ?? 0} label="읽는 중" />
              <View style={styles.statDivider} />
              <StatBox value={counts?.wish ?? 0} label="읽고 싶은" />
            </View>
            <View style={styles.statsRowGap} />
            <View style={styles.statsRow}>
              <StatBox value={counts?.completed ?? 0} label="완독" />
              <View style={styles.statDivider} />
              <StatBox value={counts?.completed_this_month ?? 0} label="이번 달 완독" />
              <View style={styles.statDivider} />
              <StatBox value={counts?.notes ?? 0} label="메모" />
            </View>
          </View>
        )}

        {/* 최근 완독한 책 */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>최근 완독한 책</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyLibrary')}>
            <Text style={styles.moreText}>내 서재 전체보기 &gt;</Text>
          </TouchableOpacity>
        </View>

        {recentCompleted.length === 0 ? (
          <View style={styles.emptyRecentBox}>
            <Text style={styles.emptyRecentText}>
              {loading ? '불러오는 중...' : '아직 완독한 책이 없어요.'}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
            {recentCompleted.map((item, index) => {
              const readEnd = normalizeReadEndDate(item.read_end_date);
              return (
                <TouchableOpacity
                  key={item.id?.toString() || index.toString()}
                  style={styles.recentBookCard}
                  activeOpacity={0.8}
                  onPress={() => openCompleted(item)}
                >
                  <BookCover
                    uri={toHttps(item.cover_image)}
                    title={item.title}
                    width={CARD_WIDTH}
                    height={CARD_COVER_HEIGHT}
                  />
                  <Text style={styles.recentBookTitle} numberOfLines={1}>{item.title || '제목 없음'}</Text>
                  <Text style={readEnd ? styles.recentDate : styles.recentDateEmpty} numberOfLines={1}>
                    {readEnd || '완독일 미입력'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* 최근 본 책 (기기에 저장된 기록) */}
        <View style={[styles.recentHeader, styles.sectionGap]}>
          <Text style={styles.sectionTitle}>최근 본 책</Text>
        </View>

        {recentViewed.length === 0 ? (
          <View style={styles.emptyRecentBox}>
            <Text style={styles.emptyRecentText}>최근 본 책이 없어요.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
            {recentViewed.map((entry, index) => (
              <TouchableOpacity
                key={`${entry.isbn || entry.title}-${index}`}
                style={styles.recentBookCard}
                activeOpacity={0.8}
                onPress={() => openViewed(entry)}
              >
                <BookCover
                  uri={toHttps(entry.thumbnail)}
                  title={entry.title}
                  width={CARD_WIDTH}
                  height={CARD_COVER_HEIGHT}
                />
                <Text style={styles.recentBookTitle} numberOfLines={1}>{entry.title}</Text>
                <Text style={styles.recentDateEmpty} numberOfLines={1}>{entry.author || ''}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* AI 독서 리포트 */}
        <TouchableOpacity
          style={[styles.aiReportButton, styles.sectionGap]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('AiReport')}
          accessibilityRole="button"
        >
          <Text style={styles.aiReportText}>AI 독서 리포트</Text>
          <Text style={styles.aiReportBadge}>&gt;</Text>
        </TouchableOpacity>
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
  },
  avatarButton: { marginBottom: 10 },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#2B2118' },
  profileSub: { fontSize: 12, color: '#8C827A', marginTop: 4, textAlign: 'center' },

  // 💡 [추가] 로그아웃 버튼 스타일
  logoutButton: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#D9D0C1',
    borderRadius: 20,
  },
  logoutText: {
    fontSize: 12,
    color: '#5C3D2E',
    fontWeight: 'bold',
  },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2B2118', marginBottom: 12 },
  sectionGap: { marginTop: 28 },
  loadingContainer: { paddingVertical: 20, alignItems: 'center' },
  errorBox: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 28,
  },
  retryText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary, marginTop: 8 },
  statsCard: {
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
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statsRowGap: { height: 16 },
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
  recentBookCard: { width: CARD_WIDTH, marginRight: 12 },
  recentBookTitle: { fontSize: 12, color: '#2B2118', marginTop: 6, fontWeight: '500', textAlign: 'center' },
  recentDate: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  recentDateEmpty: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  aiReportButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  aiReportText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
  aiReportBadge: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
});
