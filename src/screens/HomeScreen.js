import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // 별도 패키지에서 가져옴
import { COLORS } from '../constants/theme'; // 1번에서 생성한 theme.js 활용[cite: 1]
import { getBooks } from '../api';
import { toDetailBook } from '../utils/bookShape';
import BookCover, { toHttps } from '../components/BookCover';

const FEATURED_COUNT = 6;
const PAGE_LIMIT = 50;
const MAX_PAGE = 33;
const COVER_W = 120;
const COVER_H = 174;
const CARD_GAP = 14;

// 앱이 켜져 있는 동안 한 번만 뽑아 유지한다. (앱을 다시 켜면 모듈이 새로 로드되어 다시 뽑는다)
let featuredCache = null;
let featuredPromise = null;

const fetchRows = async (page) => {
  const res = await getBooks({ sort: 'title', limit: PAGE_LIMIT, page });
  return Array.isArray(res?.data) ? res.data : [];
};

const pickFeatured = async () => {
  const randomPage = Math.floor(Math.random() * MAX_PAGE) + 1;
  let rows = await fetchRows(randomPage);
  if (rows.length === 0 && randomPage !== 1) rows = await fetchRows(1);
  const pool = rows.filter((r) => r?.cover_image);
  // Fisher-Yates 셔플 후 앞에서 6권
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, FEATURED_COUNT);
};

const loadFeatured = () => {
  if (featuredCache) return Promise.resolve(featuredCache);
  if (!featuredPromise) {
    featuredPromise = pickFeatured()
      .then((list) => {
        featuredCache = list;
        return list;
      })
      .finally(() => {
        featuredPromise = null;
      });
  }
  return featuredPromise;
};

export default function HomeScreen({ navigation }) {
  const [featured, setFeatured] = useState(featuredCache || []);
  const [featuredLoading, setFeaturedLoading] = useState(!featuredCache);

  useEffect(() => {
    if (featuredCache) return undefined;
    let alive = true;
    loadFeatured()
      .then((list) => {
        if (alive) setFeatured(list);
      })
      .catch(() => {
        // 실패 시 영역을 조용히 숨긴다.
      })
      .finally(() => {
        if (alive) setFeaturedLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const renderFeatured = ({ item }) => (
    <TouchableOpacity
      style={styles.featuredItem}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('BookDetail', { book: toDetailBook(item) })}
    >
      <BookCover uri={toHttps(item.cover_image)} title={item.title} width={COVER_W} height={COVER_H} />
      <Text style={styles.featuredTitle} numberOfLines={2}>
        {item.title}
      </Text>
      {!!item.author && (
        <Text style={styles.featuredAuthor} numberOfLines={1}>
          {item.author}
        </Text>
      )}
    </TouchableOpacity>
  );

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
        <TouchableOpacity style={styles.aiBanner} onPress={() => navigation.navigate('AiTaste')}>
          <Text style={styles.aiBannerBadge}>AI 취향 분석</Text>
          <Text style={styles.aiBannerTitle}>나만의 독서 페르소나와 맞춤 책 찾기 →</Text>
        </TouchableOpacity>

        {/* 4. 이달의 추천 도서 */}
        {featuredLoading ? (
          <View style={styles.featuredLoading}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : featured.length > 0 ? (
          <View style={styles.featuredSection}>
            <Text style={[styles.mainTitle, { marginTop: 24 }]}>이달의 추천 도서</Text>
            <FlatList
              data={featured}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderFeatured}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={COVER_W + CARD_GAP}
              decelerationRate="fast"
              style={styles.featuredList}
            />
          </View>
        ) : null}

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
  featuredLoading: {
    height: COVER_H,
    marginTop: 24,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredSection: {
    marginBottom: 20,
  },
  featuredList: {
    marginTop: 12,
  },
  featuredItem: {
    width: COVER_W,
    marginRight: CARD_GAP,
  },
  featuredTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  featuredAuthor: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
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