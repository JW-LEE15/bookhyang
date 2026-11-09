import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';
import { formatTimeAgo } from '../utils/timeAgo';

// 댓글 한 개. onDelete를 넘기면 삭제 버튼이 보인다 (호출하는 쪽에서 내 댓글일 때만 넘긴다)
export default function CommentItem({ comment, onDelete, deleting = false, numberOfLines }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.nickname} numberOfLines={1}>{comment.nickname || '알 수 없음'}</Text>
        <Text style={styles.time}>{formatTimeAgo(comment.created_at)}</Text>
        {onDelete ? (
          <TouchableOpacity onPress={onDelete} disabled={deleting} hitSlop={8}>
            <Text style={[styles.deleteText, deleting && styles.deleteTextDisabled]}>
              {deleting ? '삭제 중...' : '삭제'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.content} numberOfLines={numberOfLines}>{comment.content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  nickname: { flexShrink: 1, fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  time: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  deleteText: { fontSize: 12, color: '#FF3B30', fontWeight: '600' },
  deleteTextDisabled: { color: '#B3ADA3' },
  content: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 21 },
});
