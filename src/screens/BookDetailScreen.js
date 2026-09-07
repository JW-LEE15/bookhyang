import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  TextInput 
} from 'react-native';

export default function BookDetailScreen({ route, navigation }) {
  const book = route.params?.book || {
    title: '채식주의자',
    author: '한강',
    category: '소설',
    year: 2007,
    description: '노벨문학상 수상작. 육식을 거부하는 한 여자의 이야기.',
  };

  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([
    {
      id: 1,
      user: '독서가12',
      text: '문체가 정말 아름답고 강렬합니다. 한강 작가님의 대표작답네요.',
      time: '10분 전',
      replies: [
        { id: 101, user: '민음사팬', text: '맞아요, 특히 2부의 묘사가 압권이었습니다.', time: '5분 전' }
      ]
    },
    {
      id: 2,
      user: '북러버',
      text: '밤새워서 다 읽었습니다. 강력 추천합니다.',
      time: '1시간 전',
      replies: []
    }
  ]);

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    setComments([
      ...comments,
      { id: Date.now(), user: '나(익명)', text: commentText, time: '방금 전', replies: [] }
    ]);
    setCommentText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{book.title}</Text>
        <TouchableOpacity onPress={() => alert('서재에 저장되었습니다.')}>
          <Text style={styles.bookmarkText}>🔖</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 도서 정보 영역 */}
        <View style={styles.bookInfoSection}>
          <View style={styles.bookCover}>
            <Text style={styles.bookCoverText}>{book.title}</Text>
          </View>
          <Text style={styles.categoryYear}>{book.category} · {book.year}</Text>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookAuthor}>{book.author}</Text>
          <Text style={styles.description}>{book.description}</Text>
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 댓글 / 대댓글 영역 */}
        <View style={styles.commentSection}>
          <Text style={styles.commentHeader}>독자 한줄평 ({comments.length})</Text>

          {/* 댓글 작성 입력창 */}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="이 책에 대한 한줄평을 남겨보세요..."
              placeholderTextColor="#8C827A"
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity style={styles.commentSendButton} onPress={handleAddComment}>
              <Text style={styles.commentSendText}>등록</Text>
            </TouchableOpacity>
          </View>

          {/* 댓글 목록 */}
          {comments.map((item) => (
            <View key={item.id} style={styles.commentCard}>
              <View style={styles.commentCardHeader}>
                <Text style={styles.commentUser}>{item.user}</Text>
                <Text style={styles.commentTime}>{item.time}</Text>
              </View>
              <Text style={styles.commentBody}>{item.text}</Text>

              {/* 답글(대댓글) 목록 */}
              {item.replies.map((reply) => (
                <View key={reply.id} style={styles.replyCard}>
                  <Text style={styles.replyUser}>↳ {reply.user}</Text>
                  <Text style={styles.replyBody}>{reply.text}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F4EB' },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2DACB',
  },
  backText: { fontSize: 14, color: '#8C827A', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#2B2118', flex: 1, textAlign: 'center', marginHorizontal: 12 },
  bookmarkText: { fontSize: 18 },
  content: { padding: 20, paddingBottom: 40 },
  bookInfoSection: { alignItems: 'center' },
  bookCover: {
    width: 130,
    height: 185,
    backgroundColor: '#D9D0C1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
  },
  bookCoverText: { fontSize: 15, color: '#5C5046', textAlign: 'center', fontWeight: 'bold' },
  categoryYear: { fontSize: 12, color: '#8C827A' },
  bookTitle: { fontSize: 24, fontWeight: 'bold', color: '#2B2118', marginTop: 4 },
  bookAuthor: { fontSize: 15, color: '#6E6259', marginTop: 4 },
  description: { fontSize: 14, color: '#5C5046', lineHeight: 22, marginTop: 16, textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#E2DACB', marginVertical: 24 },
  commentSection: { width: '100%' },
  commentHeader: { fontSize: 18, fontWeight: 'bold', color: '#2B2118', marginBottom: 12 },
  commentInputRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  commentInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#EBE5D8',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 13,
    color: '#2B2118',
  },
  commentSendButton: {
    backgroundColor: '#2B2118',
    paddingHorizontal: 18,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSendText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  commentCard: { backgroundColor: '#EBE5D8', padding: 14, borderRadius: 12, marginBottom: 10 },
  commentCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentUser: { fontSize: 13, fontWeight: 'bold', color: '#2B2118' },
  commentTime: { fontSize: 11, color: '#8C827A' },
  commentBody: { fontSize: 13, color: '#4A3E35', lineHeight: 18 },
  replyCard: { backgroundColor: '#DFD8C9', padding: 10, borderRadius: 8, marginTop: 8, marginLeft: 12 },
  replyUser: { fontSize: 12, fontWeight: 'bold', color: '#2B2118' },
  replyBody: { fontSize: 12, color: '#5C5046', marginTop: 2 },
});