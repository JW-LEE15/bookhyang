import React, { useState, useCallback, useContext, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { getUserBooks, updateReadEndDate } from '../api';
import { AuthContext } from '../context/AuthContext';
import ReadEndDateEditor from '../components/ReadEndDateEditor';
import { normalizeReadEndDate } from '../utils/readEndDate';

const isCompleted = (item) => {
  const status = (item.status || '').toUpperCase();
  return status === 'COMPLETED' || status === '완독' || status === 'FINISHED';
};

export default function MyLibraryScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const currentUserId = user?.id; // 로그인한 사용자의 DB ID
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // ALL, READING, COMPLETED, WISH
  const [dateTarget, setDateTarget] = useState(null); // 완독일을 입력 중인 서재 행

  // 서재 도서 목록 조회
  const fetchMyBooks = async () => {
    if (!currentUserId) {
      setBooks([]);
      return;
    }

    try {
      setLoading(true);
      const data = await getUserBooks();

      let bookList = [];
      if (data && Array.isArray(data)) {
        bookList = data;
      } else if (data && data.books && Array.isArray(data.books)) {
        bookList = data.books;
      } else if (data && data.data && Array.isArray(data.data)) {
        bookList = data.data;
      }

      setBooks(bookList);
    } catch (error) {
      console.error('서재 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 원본 목록(books) + 선택된 탭(selectedFilter)에서 매 렌더마다 계산한다
  const filteredBooks = useMemo(() => {
    if (selectedFilter === 'ALL') return books;
    return books.filter((b) => {
      const status = (b.status || '').toUpperCase();
      if (selectedFilter === 'READING') return status === 'READING' || status === '읽는 중';
      if (selectedFilter === 'COMPLETED') return status === 'COMPLETED' || status === '완독' || status === 'FINISHED';
      if (selectedFilter === 'WISH') return status === 'WISH' || status === '읽고 싶은' || status === 'WANT_TO_READ';
      return true;
    });
  }, [books, selectedFilter]);

  const handleFilterChange = (filterKey) => {
    setSelectedFilter(filterKey);
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyBooks();
    }, [currentUserId])
  );

  // 카드에서 완독일 저장: 성공하면 목록의 그 행만 바꾼다 (실패하면 예외를 던져 입력 폼이 안내문을 보여준다)
  const handleSaveReadEndDate = async (date) => {
    const target = dateTarget;
    const res = await updateReadEndDate(target.id, date);
    const saved = normalizeReadEndDate(res?.data?.read_end_date) || date;
    const next = books.map((b) => (b.id === target.id ? { ...b, read_end_date: saved } : b));
    setBooks(next);
    setDateTarget(null);
  };

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
          {isCompleted(item) ? (
            normalizeReadEndDate(item.read_end_date) ? (
              <Text style={styles.readEndText}>완독일 {normalizeReadEndDate(item.read_end_date)}</Text>
            ) : (
              <View style={styles.readEndRow}>
                <Text style={styles.readEndEmptyText}>완독일 미입력</Text>
                <TouchableOpacity onPress={() => setDateTarget(item)} hitSlop={8}>
                  <Text style={styles.readEndInputText}>입력</Text>
                </TouchableOpacity>
              </View>
            )
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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

      {/* 완독일 입력 (완독일이 비어 있는 옛 완독 책용) */}
      <Modal
        visible={dateTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDateTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>완독일 입력</Text>
            <Text style={styles.modalBook} numberOfLines={1}>
              {dateTarget?.title}
            </Text>
            {dateTarget ? (
              <ReadEndDateEditor
                key={dateTarget.id}
                initialValue={null}
                onSave={handleSaveReadEndDate}
                onCancel={() => setDateTarget(null)}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || '#F7F4EB' },
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
  readEndText: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  readEndRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  readEndEmptyText: { fontSize: 10, color: COLORS.textSecondary },
  readEndInputText: { fontSize: 10, fontWeight: 'bold', color: COLORS.primary },
  // 키보드가 올라와도 입력칸이 가려지지 않게 카드를 화면 위쪽에 둔다
  modalOverlay: { flex: 1, backgroundColor: 'rgba(25,25,25,0.4)', justifyContent: 'flex-start', paddingTop: 90, paddingHorizontal: 20 },
  modalCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  modalBook: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, marginBottom: 12 },
});