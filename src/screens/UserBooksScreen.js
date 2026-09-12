import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { getUserBooks, deleteUserBook } from '../api';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

export default function UserBooksScreen() {
  const [userBooks, setUserBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 내 서재 목록 불러오기
  const fetchUserBooks = async () => {
    try {
      const result = await getUserBooks(TEST_USER_ID);
      if (result && result.success) {
        setUserBooks(result.data);
      }
    } catch (error) {
      console.error('서재 목록 불러오기 실패:', error);
      Alert.alert('오류', '서재 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserBooks();
  }, []);

  // 당겨서 새로고침
  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserBooks();
  };

  // 도서 삭제 처리
  const handleDeleteBook = (bookId, title) => {
    Alert.alert(
      '도서 삭제',
      `'${title}'을(를) 서재에서 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteUserBook(bookId);
              if (result && result.success) {
                Alert.alert('삭제 완료', '서재에서 삭제되었습니다.');
                fetchUserBooks();
              }
            } catch (error) {
              Alert.alert('오류', '삭제 중 문제가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const renderBookItem = ({ item }) => {
    const rawUrl = item.cover_image;
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
          <View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {item.status === 'READING' ? '📖 읽는 중' : '✅ 완독'}
              </Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
            <Text style={styles.publisher}>{item.publisher}</Text>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteBook(item.id, item.title)}
          >
            <Text style={styles.deleteButtonText}>삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {userBooks.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>아직 서재에 담긴 책이 없습니다.</Text>
          <Text style={styles.subEmptyText}>도서 검색 탭에서 책을 찾아 서재에 담아보세요!</Text>
        </View>
      ) : (
        <FlatList
          data={userBooks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBookItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  subEmptyText: {
    fontSize: 13,
    color: '#999',
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
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e1f5fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 11,
    color: '#0288d1',
    fontWeight: '600',
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
  deleteButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#ff3b30',
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});