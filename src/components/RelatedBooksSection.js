import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { getRelatedBooks } from '../api';
import BookCover, { toHttps } from './BookCover';

const CARD_WIDTH = 100;
const CARD_COVER_HEIGHT = 145;

// 모음집에서 온 책(catalogId가 있을 때)의 관련 책 가로 스크롤.
// 결과가 없거나 불러오지 못하면 섹션 전체를 숨긴다.
// onCountChange: 보여줄 책 수를 부모에 알린다 (섹션 이동 버튼을 숨기고 보이는 데 쓴다)
export default function RelatedBooksSection({ catalogId, onPressBook, onCountChange }) {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    setBooks([]);
    if (catalogId == null) return undefined;
    let cancelled = false; // 책이 바뀐 뒤 늦게 온 응답은 버린다
    getRelatedBooks(catalogId)
      .then((res) => {
        if (cancelled) return;
        setBooks(Array.isArray(res?.data) ? res.data.filter((b) => b?.id != null) : []);
      })
      .catch(() => {
        if (!cancelled) setBooks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogId]);

  useEffect(() => {
    if (onCountChange) onCountChange(books.length);
  }, [books.length, onCountChange]);

  if (books.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>관련 책</Text>
      <FlatList
        horizontal
        data={books}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ width: CARD_WIDTH }}
            activeOpacity={0.8}
            onPress={() => onPressBook(item)}
          >
            <BookCover
              uri={toHttps(item.cover_image)}
              title={item.title}
              width={CARD_WIDTH}
              height={CARD_COVER_HEIGHT}
            />
            <Text style={styles.bookTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>
              {item.author || ''}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#2B2118', marginBottom: 12 },
  bookTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 8 },
  bookAuthor: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
