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
  Alert,
  Keyboard
} from 'react-native';
import { searchBooks, addUserBook } from '../api';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);

  // 도서 검색 함수
  const handleSearch = async () => {
    if (!query.trim()) {
      Alert.alert('알림', '검색어를 입력해 주세요.');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const result = await searchBooks(query);
      if (result && result.success) {
        setBooks(result.data);
      } else {
        Alert.alert('검색 실패', '도서 정보를 가져올 수 없습니다.');
      }
    } catch (error) {
      console.error('검색 오류:', error);
      Alert.alert('오류', '도서 검색 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 내 서재에 추가 함수 (중복 등록 예외 처리 적용)
  const handleAddBook = async (book) => {
    try {
      const result = await addUserBook(TEST_USER_ID, book);

      if (result && result.success) {
        Alert.alert('성공', `'${book.title}'이(가) 서재에 추가되었습니다!`);
      }
    } catch (error) {
      // 409 Conflict (중복 등록) 응답 예외 처리
      if (error.response && error.response.status === 409) {
        const message = error.response.data?.message || '이미 내 서재에 등록된 도서입니다.';
        Alert.alert('알림', message);
      } else {
        console.error('서재 추가 오류:', error);
        Alert.alert('오류', '서재 등록 중 문제가 발생했습니다.');
      }
    }
  };

  const renderBookItem = ({ item }) => {
    const rawUrl = item.coverImage || item.thumbnail;
    const imageUrl = rawUrl ? rawUrl.replace('http://', 'https://') : null;

    return (
      <View style={styles.bookCard}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <View style={[styles.coverImage, styles.noImage]}>
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )}

        <View style={styles.bookInfo}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
          <Text style={styles.publisher}>{item.publisher}</Text>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddBook(item)}
          >
            <Text style={styles.addButtonText}>+ 서재에 담기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 검색 바 */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="책 제목 또는 저자 검색..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>검색</Text>
        </TouchableOpacity>
      </View>

      {/* 검색 결과 리스트 */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item, index) => item.isbn || index.toString()}
          renderItem={renderBookItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: '#8e8e93',
    fontSize: 15,
  },
  listContainer: {
    padding: 16,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  coverImage: {
    width: 70,
    height: 100,
    borderRadius: 4,
    backgroundColor: '#eee',
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 10,
    color: '#888',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  author: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  publisher: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  addButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#34c759',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});