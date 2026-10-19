import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { searchBooks, addUserBook, getUserBooks, updateUserBookStatus } from '../api';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // 바텀시트 상태 관리
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [adding, setAdding] = useState(false);

  // 도서 검색 함수
  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      setLoading(true);
      const data = await searchBooks(query);
      
      let bookList = [];
      if (data && Array.isArray(data)) {
        bookList = data;
      } else if (data && data.documents) {
        bookList = data.documents;
      } else if (data && data.item) {
        bookList = data.item;
      }
      
      setResults(bookList);
    } catch (error) {
      console.error('검색 중 오류 발생:', error);
      Alert.alert('오류', '도서 검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // + 담기 버튼 클릭 시 바텀시트 오픈
  const openAddBottomSheet = (book) => {
    setSelectedBook(book);
    setModalVisible(true);
  };

  // 선택한 상태로 서재 추가 또는 업데이트
  const handleAddBookWithStatus = async (status) => {
    if (!selectedBook) return;
    try {
      setAdding(true);

      // 1. 내 서재에 이미 등록되어 있는지 확인
      const myBooks = await getUserBooks(TEST_USER_ID);
      let bookList = [];
      if (Array.isArray(myBooks)) bookList = myBooks;
      else if (myBooks?.books) bookList = myBooks.books;
      else if (myBooks?.data) bookList = myBooks.data;

      const targetIsbn = selectedBook.isbn || selectedBook.isbn13;
      const matched = bookList.find((item) => {
        if (targetIsbn && (item.isbn === targetIsbn || item.isbn13 === targetIsbn)) return true;
        return item.title === selectedBook.title;
      });

      const statusKor = status === 'WISH' ? '읽고 싶은' : status === 'COMPLETED' ? '완독' : '읽는 중';

      if (matched && matched.id) {
        // 2-A. 이미 존재하는 책인 경우 상태 수정
        await updateUserBookStatus(matched.id, status);
        Alert.alert('서재 상태 변경', `이미 서재에 있는 책입니다. [${statusKor}] 상태로 변경되었습니다.`);
      } else {
        // 2-B. 신규 도서인 경우 새로 추가
        await addUserBook(TEST_USER_ID, selectedBook, status);
        Alert.alert('서재 추가 완료', `[${statusKor}] 상태로 서재에 담겼습니다.`);
      }

      setModalVisible(false);
      setSelectedBook(null);
    } catch (error) {
      console.error('서재 담기/변경 실패:', error);
      Alert.alert('오류', '독서 상태 처리 중 문제가 발생했습니다.');
    } finally {
      setAdding(false);
    }
  };

  // 검색 결과 도서 항목 렌더링
  const renderBookItem = ({ item }) => {
    const rawCover = item.cover_url || item.thumbnail || item.coverImage;
    const cover = rawCover ? rawCover.replace('http://', 'https://') : null;
    const title = item.title || '제목 없음';
    const author = Array.isArray(item.authors)
      ? item.authors.join(', ')
      : item.author || '저자 미상';
    const publisher = item.publisher || '';

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
          <Text style={styles.bookTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>{author}</Text>
          {publisher ? <Text style={styles.bookPublisher} numberOfLines={1}>{publisher}</Text> : null}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openAddBottomSheet(item)}
        >
          <Text style={styles.addButtonText}>+ 담기</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.subTitle}>SEARCH</Text>
        <Text style={styles.mainTitle}>도서 검색</Text>
      </View>

      {/* 검색 바 */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="제목 또는 저자를 입력하세요"
          placeholderTextColor="#8C827A"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 검색 결과 리스트 */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary || '#5C3D2E'} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => item.isbn || index.toString()}
          renderItem={renderBookItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* 독서 상태 선택 바텀시트 Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle} numberOfLines={1}>
                {selectedBook?.title || '책 선택'}
              </Text>
              <Text style={styles.bottomSheetSubTitle}>독서 상태를 선택해 주세요</Text>
            </View>

            {adding ? (
              <ActivityIndicator size="small" color="#5C3D2E" style={{ paddingVertical: 20 }} />
            ) : (
              <View style={styles.statusOptions}>
                <TouchableOpacity
                  style={styles.statusOptionButton}
                  onPress={() => handleAddBookWithStatus('WISH')}
                >
                  <Text style={styles.statusOptionText}>📖 읽고 싶은 책</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.statusOptionButton}
                  onPress={() => handleAddBookWithStatus('READING')}
                >
                  <Text style={styles.statusOptionText}>📚 지금 읽는 중</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.statusOptionButton}
                  onPress={() => handleAddBookWithStatus('COMPLETED')}
                >
                  <Text style={styles.statusOptionText}>✅ 완독한 책</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || '#F7F4EB' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  subTitle: { fontSize: 12, letterSpacing: 1.5, color: '#8C827A', fontWeight: '600' },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#2B2118', marginTop: 4 },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#2B2118',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchButton: {
    width: 46,
    height: 46,
    backgroundColor: '#5C3D2E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#8C827A' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  coverImage: { width: 60, height: 85, borderRadius: 6, marginRight: 12 },
  coverPlaceholder: { backgroundColor: '#D9D0C1', justifyContent: 'center', alignItems: 'center', padding: 4 },
  placeholderText: { fontSize: 9, color: '#2B2118', textAlign: 'center', fontWeight: 'bold' },
  bookInfo: { flex: 1, justifyContent: 'center' },
  bookTitle: { fontSize: 14, fontWeight: 'bold', color: '#2B2118', marginBottom: 4 },
  bookAuthor: { fontSize: 12, color: '#5C3D2E', marginBottom: 2 },
  bookPublisher: { fontSize: 11, color: '#8C827A' },
  addButton: {
    backgroundColor: '#EBE5D8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  addButtonText: { fontSize: 12, fontWeight: 'bold', color: '#5C3D2E' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  bottomSheetHeader: { marginBottom: 16, alignItems: 'center' },
  bottomSheetTitle: { fontSize: 16, fontWeight: 'bold', color: '#2B2118', marginBottom: 4 },
  bottomSheetSubTitle: { fontSize: 12, color: '#8C827A' },
  statusOptions: { gap: 10, marginBottom: 16 },
  statusOptionButton: {
    backgroundColor: '#F7F4EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAE5D9',
  },
  statusOptionText: { fontSize: 14, fontWeight: 'bold', color: '#5C3D2E' },
  cancelButton: { paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { fontSize: 13, color: '#8C827A', fontWeight: '600' },
});