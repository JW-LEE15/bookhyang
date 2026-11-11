import React, { useState, useEffect, useContext, useRef } from 'react';
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
import { AuthContext } from '../context/AuthContext'; // 👈 AuthContext 불러오기
import BookCommentPreview from '../components/BookCommentPreview';
import BookDescriptionSection from '../components/BookDescriptionSection';
import RelatedBooksSection from '../components/RelatedBooksSection';
import { getIsbn13 } from '../utils/isbn';
import { toDetailBook } from '../utils/bookShape';
import { recordRecentBook } from '../storage/recentBooksStorage';

// TODO: 「민음사에서 보기」 링크 주소가 정해지면 여기에 넣고 Linking.openURL로 연결한다.
const MINUMSA_URL = null;

export default function BookDetailScreen({ route, navigation }) {
  const { user } = useContext(AuthContext); // 👈 로그인 유저 정보 추출
  const currentUserId = user?.id; // 👈 DB 유저 UUID 사용

  // 1. 전달받은 래퍼 파라미터 수신
  const rawParamsBook = route.params?.book || {};

  // 2. 중첩 구조 탐색 (DB 아이템의 경우 item.book 또는 item.books 내부에 실제 데이터가 위치함)
  const targetBook =
    rawParamsBook.book ||
    rawParamsBook.books ||
    rawParamsBook.book_info ||
    rawParamsBook.data ||
    rawParamsBook;

  // 3. 제목 정규화
  const title =
    targetBook?.title ||
    rawParamsBook?.title ||
    rawParamsBook?.book_title ||
    '';

  const [loading, setLoading] = useState(false);
  const [dbBookId, setDbBookId] = useState(rawParamsBook.id || targetBook?.id || null);
  const [currentStatus, setCurrentStatus] = useState(rawParamsBook.status || targetBook?.status || null);
  const [isSaved, setIsSaved] = useState(Boolean(rawParamsBook.id || targetBook?.id || rawParamsBook.status));

  // 화면 진입 시 내 서재 중복/상태 확인
  useEffect(() => {
    const checkMyLibrary = async () => {
      if (!title || !currentUserId) return;

      try {
        // 💡 내 서재 조회 (요청자는 서버가 토큰으로 확인)
        const myBooks = await getUserBooks();
        let bookList = [];
        if (Array.isArray(myBooks)) bookList = myBooks;
        else if (myBooks?.books) bookList = myBooks.books;
        else if (myBooks?.data) bookList = myBooks.data;

        const targetIsbn = targetBook?.isbn || targetBook?.isbn13 || rawParamsBook?.isbn;
        const matched = bookList.find((item) => {
          const itemBook = item.book || item.books || item;
          if (targetIsbn && (itemBook.isbn === targetIsbn || itemBook.isbn13 === targetIsbn)) return true;
          return (itemBook.title || item.title) === title;
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
  }, [targetBook, rawParamsBook, title, currentUserId]);

  // 최근 열어본 책 기록 (기기에 계정별로 저장. 서버로 보내지 않는다)
  useEffect(() => {
    if (!title || !currentUserId) return;
    const rawThumb =
      targetBook?.thumbnail || targetBook?.cover_url || targetBook?.cover_image || rawParamsBook?.thumbnail;
    recordRecentBook(currentUserId, {
      isbn: targetBook?.isbn || targetBook?.isbn13 || rawParamsBook?.isbn || '',
      title,
      author: Array.isArray(targetBook?.authors) ? targetBook.authors.join(', ') : targetBook?.author || '',
      thumbnail: rawThumb ? String(rawThumb).replace('http://', 'https://') : '',
    });
    // 책을 연 순간에만 기록한다 (같은 화면에서 다시 그려질 때마다 기록하지 않는다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, currentUserId]);

  // 섹션 이동 버튼: 각 섹션의 위치를 기억해 두었다가 scrollTo로 이동한다
  const scrollRef = useRef(null);
  const sectionY = useRef({});
  const [relatedCount, setRelatedCount] = useState(0);
  const scrollToSection = (name) => {
    const y = sectionY.current[name];
    if (typeof y === 'number') scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };
  const trackSection = (name) => (e) => {
    sectionY.current[name] = e.nativeEvent.layout.y;
  };

  if (!title) {
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

  // 4. 이미지 커버 URL 파싱 (DB 컬럼명: cover_url, cover_image / API 컬럼명: thumbnail, cover)
  const rawUrl =
    targetBook?.cover_url ||
    targetBook?.thumbnail ||
    targetBook?.cover_image ||
    targetBook?.coverImage ||
    targetBook?.cover ||
    rawParamsBook?.cover_url ||
    rawParamsBook?.thumbnail ||
    rawParamsBook?.cover;

  const imageUrl = rawUrl ? rawUrl.replace('http://', 'https://') : null;

  // 5. 저자 정보 파싱 (DB: author 문자열 / API: authors 배열)
  const authorText = Array.isArray(targetBook?.authors)
    ? targetBook.authors.join(', ')
    : targetBook?.author ||
      targetBook?.authors ||
      rawParamsBook?.author ||
      (Array.isArray(rawParamsBook?.authors) ? rawParamsBook.authors.join(', ') : '저자 미상');

  const publisherText = targetBook?.publisher || rawParamsBook?.publisher || '';

  // 댓글은 ISBN13으로만 책을 구분한다 (10자리는 체크섬이 맞을 때만 변환, 못 얻으면 null → 댓글 사용 불가)
  const isbn13 = getIsbn13(
    targetBook?.isbn,
    targetBook?.isbn13,
    rawParamsBook?.isbn,
    rawParamsBook?.isbn13
  );

  // 6. 줄거리/소개 파싱 (DB: description / API: contents)
  const ownDescription =
    targetBook?.description ||
    targetBook?.contents ||
    targetBook?.summary ||
    targetBook?.book_description ||
    rawParamsBook?.description ||
    rawParamsBook?.contents ||
    rawParamsBook?.summary ||
    '';
  const fallbackDescription = '상세 줄거리 정보가 제공되지 않는 도서입니다.';

  // 모음집에서 온 책이면 catalogId가 있다 (toDetailBook이 books 행의 id를 이 이름으로 넘긴다)
  const catalogId = rawParamsBook?.catalogId ?? targetBook?.catalogId ?? null;
  const categoryText = catalogId != null && targetBook?.category ? targetBook.category : '정보 없음';
  const yearMatch =
    catalogId != null && typeof targetBook?.publishedDate === 'string'
      ? targetBook.publishedDate.match(/^(\d{4})/)
      : null;
  const yearText = yearMatch ? `${yearMatch[1]}년` : '정보 없음';

  // 독서 상태 변경 및 서재 저장 처리
  const handleStatusChange = async (newStatus) => {
    if (!currentUserId) {
      Alert.alert('알림', '로그인이 필요한 기능입니다.');
      return;
    }

    try {
      setLoading(true);
      if (isSaved && dbBookId) {
        await updateUserBookStatus(dbBookId, newStatus);
      } else {
        // 💡 내 서재에 추가 (요청자는 서버가 토큰으로 확인)
        const response = await addUserBook(targetBook, newStatus);
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
    Alert.alert('서재 삭제', `'${title}'을(를) 서재에서 삭제하시겠습니까?`, [
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
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
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

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.author}>{authorText}</Text>
          <Text style={styles.publisher}>
            {publisherText ? `${publisherText} 출판` : ''}
          </Text>
          <Text style={styles.metaText}>
            분야 {categoryText} · 출간 {yearText}
          </Text>

          {/* TODO: 주소가 정해지면 MINUMSA_URL을 채우고 Linking.openURL로 연결 */}
          <TouchableOpacity
            style={styles.externalButton}
            activeOpacity={0.8}
            onPress={() => {
              if (!MINUMSA_URL) Alert.alert('알림', '민음사 링크는 준비 중입니다.');
            }}
          >
            <Text style={styles.externalButtonText}>민음사에서 보기</Text>
          </TouchableOpacity>
        </View>

        {/* 섹션 이동 버튼 */}
        <View style={styles.sectionNav}>
          <TouchableOpacity style={styles.sectionNavButton} onPress={() => scrollToSection('description')}>
            <Text style={styles.sectionNavText}>소개</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sectionNavButton} onPress={() => scrollToSection('comments')}>
            <Text style={styles.sectionNavText}>댓글</Text>
          </TouchableOpacity>
          {relatedCount > 0 ? (
            <TouchableOpacity style={styles.sectionNavButton} onPress={() => scrollToSection('related')}>
              <Text style={styles.sectionNavText}>관련 책</Text>
            </TouchableOpacity>
          ) : null}
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
        <View onLayout={trackSection('description')}>
          <BookDescriptionSection
            ownDescription={ownDescription}
            catalogId={catalogId}
            fallbackText={fallbackDescription}
          />
        </View>

        {/* 독자 댓글 미리보기 */}
        <View onLayout={trackSection('comments')}>
          <BookCommentPreview
            isbn13={isbn13}
            onPressViewAll={() => navigation.navigate('BookComments', { isbn13, title })}
          />
        </View>

        {/* 관련 책 (모음집에서 온 책만, 없으면 숨김). push로 새 상세 화면을 쌓는다 */}
        <View onLayout={trackSection('related')}>
          <RelatedBooksSection
            catalogId={catalogId}
            onCountChange={setRelatedCount}
            onPressBook={(row) => navigation.push('BookDetail', { book: toDetailBook(row) })}
          />
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
  metaText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6 },
  externalButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  externalButtonText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  sectionNav: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  sectionNavButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionNavText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
});