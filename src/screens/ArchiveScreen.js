import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { getBooks } from '../api';
import { toDetailBook } from '../utils/bookShape';
import BookCover, { toHttps } from '../components/BookCover';

const CATEGORIES = [
  { label: '전체', value: undefined },
  { label: '소설', value: '소설' },
  { label: '시', value: '시' },
  { label: '에세이', value: '에세이' },
];
const SORTS = [
  { label: '제목순', value: 'title' },
  { label: '최신순', value: 'latest' },
];
const NUM_COLUMNS = 3;
const SIDE_PADDING = 16;
const GAP = 12;
const PAGE_LIMIT = 30;

function errorMessage(error) {
  if (error?.response?.status === 429) return '요청이 많아요. 잠시 후 다시 시도해 주세요.';
  return '책 목록을 불러오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.';
}

// 모음집 탭: 전체 도서 3열 그리드 (기획서 3.3)
export default function ArchiveScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - SIDE_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS);
  const coverHeight = Math.round(cardWidth * 1.45);

  const [category, setCategory] = useState(undefined);
  const [sort, setSort] = useState('title');
  const [books, setBooks] = useState([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true); // 첫 페이지 로딩
  const [loadingMore, setLoadingMore] = useState(false); // 다음 페이지 로딩
  const [error, setError] = useState(null); // 첫 페이지 오류
  const [moreError, setMoreError] = useState(null); // 다음 페이지 오류

  const requestIdRef = useRef(0); // 늦게 온 이전 응답을 버리기 위한 요청 번호
  const pageRef = useRef(0); // 마지막으로 받은 페이지
  const busyRef = useRef(false); // 다음 페이지 중복 요청 방지

  const load = useCallback(async (page, cat, sortValue) => {
    const requestId = ++requestIdRef.current;
    const isFirst = page === 1;
    busyRef.current = true;
    if (isFirst) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
      setMoreError(null);
    }
    try {
      const res = await getBooks({ category: cat, sort: sortValue, page, limit: PAGE_LIMIT });
      if (requestId !== requestIdRef.current) return; // 오래된 응답
      const rows = Array.isArray(res?.data) ? res.data : [];
      setBooks((prev) => {
        const base = isFirst ? [] : prev;
        const seen = new Set(base.map((b) => b.id));
        const added = [];
        for (const row of rows) {
          if (row?.id == null || seen.has(row.id)) continue;
          seen.add(row.id);
          added.push(row);
        }
        return base.concat(added);
      });
      pageRef.current = page;
      setHasNext(res?.pagination?.hasNext === true);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      if (isFirst) setError(errorMessage(e));
      else setMoreError(errorMessage(e));
    } finally {
      if (requestId === requestIdRef.current) {
        busyRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // 필터나 정렬이 바뀌면 목록을 비우고 1페이지부터 다시 불러온다.
  useEffect(() => {
    pageRef.current = 0;
    setBooks([]);
    setHasNext(false);
    setMoreError(null);
    load(1, category, sort);
    return () => {
      requestIdRef.current += 1; // 화면을 떠나거나 조건이 바뀌면 진행 중인 응답을 무효로 한다
      busyRef.current = false;
    };
  }, [category, sort, load]);

  const loadMore = () => {
    if (busyRef.current || !hasNext || error || moreError || pageRef.current < 1) return;
    load(pageRef.current + 1, category, sort);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={{ width: cardWidth }}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('BookDetail', { book: toDetailBook(item) })}
    >
      <BookCover
        uri={toHttps(item.cover_image)}
        title={item.title}
        width={cardWidth}
        height={coverHeight}
      />
      <Text style={styles.bookTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.bookAuthor} numberOfLines={1}>
        {item.author || ''}
      </Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => load(1, category, sort)}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <Text style={styles.stateText}>이 분야의 책이 아직 없어요.</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (loadingMore) {
      return <ActivityIndicator style={styles.footer} color={COLORS.primary} />;
    }
    if (moreError) {
      return (
        <TouchableOpacity style={styles.footer} onPress={loadMore} activeOpacity={0.8}>
          <Text style={styles.footerText}>{moreError} 눌러서 다시 시도</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 상단 고정 영역: FlatList 밖의 일반 View */}
      <View style={styles.header}>
        <Text style={styles.title}>모음집</Text>

        <View style={styles.sortRow}>
          {SORTS.map((s, i) => {
            const active = sort === s.value;
            return (
              <React.Fragment key={s.value}>
                {i > 0 && <Text style={styles.sortDivider}>|</Text>}
                <TouchableOpacity onPress={() => setSort(s.value)} hitSlop={8}>
                  <Text style={[styles.sortText, active && styles.sortTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => {
            const active = category === c.value;
            return (
              <TouchableOpacity
                key={c.label}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategory(c.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        key={`grid-${cardWidth}`}
        data={books}
        keyExtractor={(item) => String(item.id)}
        numColumns={NUM_COLUMNS}
        renderItem={renderItem}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  sortRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sortText: { fontSize: 14, color: COLORS.textSecondary },
  sortTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  sortDivider: { marginHorizontal: 10, color: COLORS.border },
  chipRow: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textPrimary },
  chipTextActive: { color: COLORS.background, fontWeight: 'bold' },
  listContent: { paddingHorizontal: SIDE_PADDING, paddingTop: 16, paddingBottom: 24, flexGrow: 1 },
  row: { columnGap: GAP, marginBottom: 20, justifyContent: 'flex-start' },
  bookTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 8 },
  bookAuthor: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  center: { flex: 1, minHeight: 240, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  stateText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryText: { color: COLORS.background, fontWeight: 'bold', fontSize: 14 },
  footer: { paddingVertical: 16, alignItems: 'center' },
  footerText: { fontSize: 13, color: COLORS.secondary, textAlign: 'center' },
});
