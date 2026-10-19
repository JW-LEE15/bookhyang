import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { getUserBooks } from '../api';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

export default function ArchiveScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // ALL, READING, COMPLETED, WISH

  // 서재 도서 목록 조회
  const fetchMyBooks = async () => {
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

      setBooks(bookList);
      applyFilter(bookList, selectedFilter);
    } catch (error) {
      console.error('서재 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 필터링 적용 함수
  const applyFilter = (bookList, filter) => {
    if (filter === 'ALL') {
      setFilteredBooks(bookList);
    } else {
      const filtered = bookList.filter((b) => {
        const status = (b.status || '').toUpperCase();
        if (filter === 'READING') return status === 'READING' || status === '읽는 중';
        if (filter === 'COMPLETED') return status === 'COMPLETED' || status === '완독' || status === 'FINISHED';
        if (filter === 'WISH') return status === 'WISH' || status === '읽고 싶은' || status === 'WANT_TO_READ';
        return true;
      });
      setFilteredBooks(filtered);
    }
  };

  const handleFilterChange = (filterKey) => {
    setSelectedFilter(filterKey);
    applyFilter(books, filterKey);
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyBooks();
    }, [])
  );

  // 도서 카드 아이템 렌더링
  const renderBookItem = ({ item }) => {
    const rawCover = item.cover_url || item.thumbnail || item.cover_image;
    const cover = rawCover ? rawCover.replace('http://', 'https://') : null;
    const title = item.title || '제목 없음';
    const author = Array.isArray(item.authors)
      ? item.authors.join(', ')
      : item.author || '저자 미상';

    return (
      <TouchableOpacity
        style={styles.bookCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('BookDetail', { book: item })}
      >
        {cover ? (
          <Image source={{ uri: cover }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <View style={[styles.coverImage, styles.coverPlaceholder]}>
            <Text style={styles.placeholderText} numberOfLines={2}>{title}</Text>
          </View>
        )}
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>{author}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {item.status === 'WISH' ? '📖 읽고 싶은' : item.status === 'COMPLETED' ? '✅ 완독' : '📚 읽는 중'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.subTitle}>MY ARCHIVE</Text>
        <Text style={styles.mainTitle}>모음집</Text>
      </View>

      {/* 필터 칩 영역 */}
      <View style={styles.filterContainer}>
        {[
          { label: '전체', key: 'ALL' },
          { label: '📚 읽는 중', key: 'READING' },
          { label: '✅ 완독', key: 'COMPLETED' },
          { label: '📖 읽고 싶은', key: 'WISH' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              selectedFilter === filter.key && styles.filterChipActive,
            ]}
            onPress={() => handleFilterChange(filter.key)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter.key && styles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 리스트 영역 */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary || '#5C3D2E'} />
        </View>
      ) : filteredBooks.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>해당하는 도서가 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderBookItem}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || '#F7F4EB' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  subTitle: { fontSize: 12, letterSpacing: 1.5, color: '#8C827A', fontWeight: '600' },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#2B2118', marginTop: 4 },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EBE5D8',
  },
  filterChipActive: { backgroundColor: '#5C3D2E' },
  filterText: { fontSize: 12, color: '#2B2118', fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#8C827A' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 16 },
  bookCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  coverImage: { width: '100%', height: 160, borderRadius: 8, marginBottom: 8 },
  coverPlaceholder: { backgroundColor: '#D9D0C1', justifyContent: 'center', alignItems: 'center', padding: 8 },
  placeholderText: { fontSize: 11, color: '#2B2118', textAlign: 'center', fontWeight: 'bold' },
  bookInfo: { gap: 2 },
  bookTitle: { fontSize: 13, fontWeight: 'bold', color: '#2B2118' },
  bookAuthor: { fontSize: 11, color: '#8C827A' },
  statusBadge: { marginTop: 4, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 10, color: '#5C3D2E', fontWeight: '600' },
});