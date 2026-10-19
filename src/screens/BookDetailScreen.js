import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { addUserBook, updateUserBookStatus, deleteUserBook, getUserBooks } from '../api';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

export default function BookDetailScreen({ route, navigation }) {
  // 전달받은 책 정보 (검색 결과나 서재 아이템)
  const { book } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [dbBookId, setDbBookId] = useState(book?.id || null); // 서재 DB 내의 실체 ID
  const [currentStatus, setCurrentStatus] = useState(book?.status || null);
  const [isSaved, setIsSaved] = useState(Boolean(book?.id || book?.status));

  // 화면 진입 시 내 서재에 이미 있는 책인지 ISBN/제목 기반으로 검증
  useEffect(() => {
    const checkMyLibrary = async () => {
      if (!book) return;
      try {
        const myBooks = await getUserBooks(TEST_USER_ID);
        let bookList = [];
        if (Array.isArray(myBooks)) bookList = myBooks;
        else if (myBooks?.books) bookList = myBooks.books;
        else if (myBooks?.data) bookList = myBooks.data;

        // ISBN 또는 제목으로 내 서재 도서 검색
        const targetIsbn = book.isbn || book.isbn13;
        const matched = bookList.find((item) => {
          if (targetIsbn && (item.isbn === targetIsbn || item.isbn13 === targetIsbn)) return true;
          return item.title === book.title;
        });

        if (matched) {
          setDbBookId(matched.id);
          setCurrentStatus(matched.status);
          setIsSaved(true);
        }
      } catch (error) {
        console.error('서재 중복 확인 실패:', error);
      }
    };

    checkMyLibrary();
  }, [book]);

  if (!book) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>도서 정보를 불러올 수 없습니다.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 이미지 및 텍스트 데이터 파싱
  const rawUrl = book.cover_url || book.thumbnail || book.coverImage;
  const imageUrl = rawUrl ? rawUrl.replace('http://', 'https://') : null;
  const authorText = Array.isArray(book.authors)
    ? book.authors.join(', ')
    : book.author || '저자 미상';
  const descriptionText = book.contents || book.description || '상세 줄거리 정보가 제공되지 않는 도서입니다.';

  // 독서 상태 변경 및 서재 저장 처리
  const handleStatusChange = async (newStatus) => {
    try {
      setLoading(true);
      if (isSaved && dbBookId) {
        // 내 서재 DB에 있는 경우 -> ID 기반 업데이트
        await updateUserBookStatus(dbBookId, newStatus);
      } else {
        // 서재에 없는 새 책인 경우 -> 추가 후 생성된 ID 저장
        const response = await addUserBook(TEST_USER_ID, book, newStatus);
        const newId = response?.id || response?.data?.id;
        if (newId) setDbBookId(newId);
        setIsSaved(true);
      }
      setCurrentStatus(newStatus);
      const statusKor = newStatus === 'WISH' ? '읽고 싶은' : newStatus === 'COMPLETED' ? '완독' : '읽는 중';
      Alert.alert('성공', `독서 상태가 [${statusKor}] (으)로 변경되었습니다.`);
    } catch (error) {
      console.error('상태 변경 실패:', error);
      Alert.alert('오류', '독서 상태 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 서재에서 삭제 처리
  const handleDelete = () => {
    if (!dbBookId) return;
    Alert.alert('서재 삭제', `'${book.title}'을(를) 서재에서 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await deleteUserBook(dbBookId);
            Alert.alert('삭제 완료', '서재에서 삭제되었습니다.');
            navigation.goBack();
          } catch (error) {
            console.error('삭제 실패:', error);
            Alert.alert('오류', '도서 삭제 중 문제가 발생했습니다.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 상단 뒤로가기 헤더 */}
        <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()}>
          <Text style={styles.headerBackText}>&lt; 뒤로</Text>
        </TouchableOpacity>

        {/* 책 커버 & 기본 정보 */}
        <View style={styles.mainInfoSection}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={[styles.coverImage, styles.noImage]}>
              <Text style={styles.noImageText}>No Image</Text>
            </View>
          )}

          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{authorText}</Text>
          <Text style={styles.publisher}>
            {book.publisher ? `${book.publisher} 출판` : ''}
          </Text>
        </View>

        {/* 독서 상태 선택 바 */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>내 서재 독서 상태</Text>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary || '#5C3D2E'} style={{ marginVertical: 12 }} />
          ) : (
            <View style={styles.statusButtonGroup}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  currentStatus === 'WISH' && styles.statusButtonActive,
                ]}
                onPress={() => handleStatusChange('WISH')}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    currentStatus === 'WISH' && styles.statusButtonTextActive,
                  ]}
                >
                  📖 읽고 싶은
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  currentStatus === 'READING' && styles.statusButtonActive,
                ]}
                onPress={() => handleStatusChange('READING')}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    currentStatus === 'READING' && styles.statusButtonTextActive,
                  ]}
                >
                  📚 읽는 중
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusButton,
                  currentStatus === 'COMPLETED' && styles.statusButtonActive,
                ]}
                onPress={() => handleStatusChange('COMPLETED')}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    currentStatus === 'COMPLETED' && styles.statusButtonTextActive,
                  ]}
                >
                  ✅ 완독
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isSaved && dbBookId && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>서재에서 삭제하기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 줄거리 / 상세 소개 */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>도서 소개</Text>
          <Text style={styles.descriptionText}>{descriptionText}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || '#F7F4EB' },
  scrollContent: { padding: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#8C827A', marginBottom: 16 },
  backButton: { backgroundColor: '#5C3D2E', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backButtonText: { color: '#FFF', fontWeight: 'bold' },
  headerBack: { paddingVertical: 8, marginBottom: 12 },
  headerBackText: { fontSize: 15, color: '#5C3D2E', fontWeight: 'bold' },
  mainInfoSection: { alignItems: 'center', marginBottom: 28 },
  coverImage: { width: 140, height: 200, borderRadius: 8, marginBottom: 16, elevation: 4 },
  noImage: { backgroundColor: '#EBE5D8', justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: '#8C827A', fontSize: 12 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2B2118', textAlign: 'center', marginBottom: 6 },
  author: { fontSize: 14, color: '#5C3D2E', textAlign: 'center', marginBottom: 4 },
  publisher: { fontSize: 12, color: '#8C827A', textAlign: 'center' },
  statusSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#2B2118', marginBottom: 12 },
  statusButtonGroup: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F7F4EB',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAE5D9',
  },
  statusButtonActive: { backgroundColor: '#5C3D2E', borderColor: '#5C3D2E' },
  statusButtonText: { fontSize: 12, fontWeight: 'bold', color: '#5C3D2E' },
  statusButtonTextActive: { color: '#FFFFFF' },
  deleteButton: { marginTop: 14, alignItems: 'center', paddingVertical: 8 },
  deleteButtonText: { fontSize: 13, color: '#FF3B30', fontWeight: '600' },
  descriptionSection: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, elevation: 2 },
  descriptionText: { fontSize: 14, color: '#4A4A4A', lineHeight: 22 },
});