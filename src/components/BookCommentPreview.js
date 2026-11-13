import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { getComments } from '../api';
import CommentItem from './CommentItem';

export const NO_ISBN_MESSAGE = 'ISBN 정보가 없어 댓글을 사용할 수 없습니다';

const PREVIEW_COUNT = 2;

// 책 상세의 댓글 미리보기: 최신 댓글 1~2개, 전체 댓글 수, "댓글 전체보기" 버튼.
// 책 식별은 ISBN13만 쓴다 (isbn13이 없으면 댓글을 쓸 수 없다고 안내).
export default function BookCommentPreview({ isbn13, onPressViewAll }) {
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  // isCancelled: 화면을 떠났거나 책이 바뀐 뒤 늦게 온 응답을 무시하기 위한 확인 함수
  const load = useCallback(
    async (isCancelled = () => false) => {
      try {
        const res = await getComments(isbn13, { limit: PREVIEW_COUNT });
        if (isCancelled()) return;
        setComments(Array.isArray(res?.data) ? res.data : []);
        setTotal(Number(res?.total) || 0);
        setStatus('ready');
      } catch (e) {
        if (isCancelled()) return;
        // 이미 불러온 내용이 있으면 그대로 두고, 처음이면 오류 표시
        setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
      }
    },
    [isbn13]
  );

  // 댓글 화면에서 글을 쓰거나 지우고 돌아오면 다시 불러온다
  useFocusEffect(
    useCallback(() => {
      if (!isbn13) return undefined;
      let cancelled = false;
      load(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [isbn13, load])
  );

  const handleRetry = () => {
    setStatus('loading');
    load();
  };

  if (!isbn13) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>독자 댓글</Text>
        <Text style={styles.infoText}>{NO_ISBN_MESSAGE}</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        독자 댓글{status === 'ready' ? ` (${total})` : ''}
      </Text>

      {status === 'loading' ? (
        <ActivityIndicator size="small" color={COLORS.primary} style={styles.loading} />
      ) : null}

      {status === 'error' ? (
        <TouchableOpacity onPress={handleRetry} activeOpacity={0.7}>
          <Text style={styles.infoText}>댓글을 불러오지 못했습니다. 눌러서 다시 시도</Text>
        </TouchableOpacity>
      ) : null}

      {status === 'ready' && comments.length === 0 ? (
        <Text style={styles.infoText}>첫 번째 댓글을 남겨보세요.</Text>
      ) : null}

      {status === 'ready'
        ? comments.map((comment, index) => (
            <View key={comment.id} style={index > 0 ? styles.divider : null}>
              {/* 읽기 전용: 액션 없음. 스포일러는 가림만 보이고 펼치기는 전체보기에서 한다.
                  is_mine은 서버 값만 쓴다 (내 숨김 댓글에 「숨김 상태」 배지를 붙이기 위함) */}
              <CommentItem comment={comment} isMine={comment.is_mine === true} numberOfLines={3} />
            </View>
          ))
        : null}

      <TouchableOpacity style={styles.viewAllButton} onPress={onPressViewAll} activeOpacity={0.8}>
        <Text style={styles.viewAllText}>댓글 전체보기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#2B2118', marginBottom: 8 },
  infoText: { fontSize: 14, color: COLORS.textSecondary, paddingVertical: 12 },
  loading: { marginVertical: 16 },
  divider: { borderTopWidth: 1, borderTopColor: COLORS.border },
  viewAllButton: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F7F4EB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewAllText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
});
