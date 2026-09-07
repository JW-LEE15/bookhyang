import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';

export default function ArchiveScreen({navigation}) {
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [activeBook, setActiveBook] = useState(null);

  const categories = ['전체', '소설', '시', '에세이'];

  const sampleBooks = [
    { id: 1, title: '채식주의자', author: '한강', category: '소설', year: 2007, description: '노벨문학상 수상작. 육식을 거부하는 한 여자의 이야기.' },
    { id: 2, title: '소년이 온다', author: '한강', category: '소설', year: 2014, description: '1980년 5월 광주를 배경으로 살아남은 이들의 슬픔과 고통을 다룬 소설.' },
    { id: 3, title: '흰', author: '한강', category: '시', year: 2016, description: '세상의 모든 흰 것에 대한 작가의 깊은 사색과 기억.' },
    { id: 4, title: '작별하지 않는다', author: '한강', category: '소설', year: 2021, description: '제주 4·3의 비극을 지극한 사랑과 애도의 시선으로 응시하는 장편.' },
    { id: 5, title: '아몬드', author: '손원평', category: '소설', year: 2017, description: '감정을 느끼지 못하는 소년 윤재의 특별한 성장과 우정 이야기.' },
    { id: 6, title: '82년생 김지영', author: '조남주', category: '소설', year: 2016, description: '한국 사회를 살아가는 평범한 30대 여성의 삶을 기록한 소설.' },
    { id: 7, title: '언어의 온도', author: '이기주', category: '에세이', year: 2016, description: '말과 글이 지닌 고유한 온도를 일상에서 포착한 따뜻한 산문집.' },
    { id: 8, title: '광장', author: '최인훈', category: '소설', year: 1960, description: '분단 한국의 비극과 인간의 이념적 갈등을 치열하게 그려낸 고전.' },
  ];

  const displayedBooks = selectedCategory === '전체' 
    ? sampleBooks 
    : sampleBooks.filter(book => book.category === selectedCategory);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.subTitle}>MINUMSA</Text>
        <Text style={styles.mainTitle}>모음집</Text>
        <Text style={styles.bookCount}>민음사 도서 {displayedBooks.length}권</Text>

        <View style={styles.categoryContainer}>
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.categoryButton, isSelected && styles.categoryButtonActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.bookGrid} showsVerticalScrollIndicator={false}>
        {displayedBooks.map((book) => (
          <TouchableOpacity 
            key={book.id} 
            style={styles.bookCard}
            onPress={() => setActiveBook(book)}
          >
            <View style={styles.bookCover}>
              <Text style={styles.bookCoverText}>{book.title}</Text>
            </View>
            <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
            <Text style={styles.bookAuthor}>{book.author}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={activeBook !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActiveBook(null)}
      >
        <TouchableWithoutFeedback onPress={() => setActiveBook(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheet}>
                <View style={styles.sheetHandle} />
                {activeBook && (
                  <>
                    <View style={styles.sheetContent}>
                      <View style={styles.sheetBookCover}>
                        <Text style={styles.sheetBookCoverText}>{activeBook.title}</Text>
                      </View>
                      <View style={styles.sheetInfo}>
                        <Text style={styles.sheetCategoryYear}>{activeBook.category} · {activeBook.year}</Text>
                        <Text style={styles.sheetTitle}>{activeBook.title}</Text>
                        <Text style={styles.sheetAuthor}>{activeBook.author}</Text>
                        <Text style={styles.sheetDescription} numberOfLines={3}>{activeBook.description}</Text>
                      </View>
                    </View>

                    <View style={styles.sheetActionRow}>
                      <TouchableOpacity 
                        style={styles.sheetPrimaryButton}
                        onPress={() => {
                          const selected = activeBook;
                          setActiveBook(null);
                          navigation.navigate('BookDetail', {book: selected});
                        }}
                      >
                        <Text style={styles.sheetPrimaryButtonText}>책 보러가기</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.sheetBookmarkButton}
                        onPress={() => alert(`'${activeBook.title}' 서재에 저장되었습니다.`)}
                      >
                        <Text style={styles.sheetBookmarkIcon}>🔖</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EB' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  subTitle: { fontSize: 12, letterSpacing: 1.5, color: '#8C827A', fontWeight: '600' },
  mainTitle: { fontSize: 26, fontWeight: 'bold', color: '#2B2118', marginTop: 2 },
  bookCount: { fontSize: 13, color: '#8C827A', marginTop: 2, marginBottom: 14 },
  categoryContainer: { flexDirection: 'row', gap: 8 },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#EBE5D8' },
  categoryButtonActive: { backgroundColor: '#2B2118' },
  categoryText: { fontSize: 14, color: '#6E6259' },
  categoryTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  bookGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, justifyContent: 'space-between', paddingBottom: 30 },
  bookCard: { width: '31%', marginBottom: 20 },
  bookCover: { width: '100%', aspectRatio: 1 / 1.4, backgroundColor: '#D9D0C1', borderRadius: 8, justifyContent: 'center', alignItems: 'center', padding: 6 },
  bookCoverText: { fontSize: 12, color: '#5C5046', textAlign: 'center', fontWeight: '500' },
  bookTitle: { fontSize: 13, fontWeight: 'bold', color: '#2B2118', marginTop: 6 },
  bookAuthor: { fontSize: 11, color: '#8C827A', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#FDFBF7', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#D1C7BD', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetContent: { flexDirection: 'row', marginBottom: 20 },
  sheetBookCover: { width: 80, height: 115, backgroundColor: '#D9D0C1', borderRadius: 8, justifyContent: 'center', alignItems: 'center', padding: 6 },
  sheetBookCoverText: { fontSize: 12, color: '#5C5046', textAlign: 'center' },
  sheetInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  sheetCategoryYear: { fontSize: 12, color: '#8C827A' },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#2B2118', marginTop: 2 },
  sheetAuthor: { fontSize: 13, color: '#6E6259', marginTop: 2 },
  sheetDescription: { fontSize: 12, color: '#8C827A', marginTop: 8, lineHeight: 16 },
  sheetActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetPrimaryButton: { flex: 1, backgroundColor: '#2B2118', height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  sheetPrimaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  sheetBookmarkButton: { width: 48, height: 48, backgroundColor: '#EBE5D8', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  sheetBookmarkIcon: { fontSize: 18 },
});