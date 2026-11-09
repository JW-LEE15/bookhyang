import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { AuthContext } from '../context/AuthContext';
import { getComments, createComment, deleteComment } from '../api';
import useKeyboardPadding from '../hooks/useKeyboardPadding';
import CommentItem from '../components/CommentItem';
import { NO_ISBN_MESSAGE } from '../components/BookCommentPreview';

const PAGE_SIZE = 20;
const CONTENT_MAX_LENGTH = 500;
// 스택 헤더 기본 높이(iOS). KeyboardAvoidingView가 헤더만큼 아래에 있어서 그만큼 보정한다.
const IOS_HEADER_HEIGHT = 44;

// 글자 수 (이모지도 1글자. 서버, DB와 같은 기준)
const charLength = (str) => [...str].length;

// iOS는 KeyboardAvoidingView, Android는 일반 View (Android는 useKeyboardPadding으로 여백을 직접 준다)
const KeyboardWrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;

// 서버가 준 오류 메시지가 있으면 그것을, 없으면 기본 메시지를
const getErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

// 책별 댓글 화면. 책은 ISBN13(route.params.isbn13)로만 식별한다. 책 id는 쓰지 않는다.
export default function BookCommentsScreen({ route }) {
  const { isbn13, title } = route.params || {};
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);

  // Android: 키보드 높이와 컨테이너 높이 변화를 재서 하단 여백을 직접 준다 (iOS는 padding 0, KeyboardAvoidingView 사용)
  const keyboardPadding = useKeyboardPadding();
  const isIOS = Platform.OS === 'ios';
  // 목록이 맨 아래 근처인지 (키보드가 올라와 목록이 줄어들 때 마지막 댓글이 가려지지 않게 하려는 용도)
  const nearBottomRef = useRef(true);

  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false); // onEndReached가 연달아 불리는 것을 막는다

  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadFirstPage = useCallback(async () => {
    try {
      const res = await getComments(isbn13, { limit: PAGE_SIZE });
      setComments(Array.isArray(res?.data) ? res.data : []);
      setTotal(Number(res?.total) || 0);
      setNextCursor(res?.nextCursor ?? null);
      setStatus('ready');
    } catch (e) {
      setStatus('error');
    }
  }, [isbn13]);

  useEffect(() => {
    if (!isbn13) return;
    loadFirstPage();
  }, [isbn13, loadFirstPage]);

  const handleScroll = (event) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    nearBottomRef.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
  };

  // Android: 키보드 여백이 생겨 목록이 줄어들 때, 맨 아래를 보고 있었다면 맨 아래를 유지한다
  const keyboardBottomPadding = keyboardPadding.padding;
  useEffect(() => {
    if (isIOS || keyboardBottomPadding <= 0 || !nearBottomRef.current) return;
    const frame = requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [isIOS, keyboardBottomPadding]);

  // 목록 끝에 닿으면 더 오래된 댓글을 이어서 불러온다
  const loadMore = async () => {
    if (!nextCursor || loadingMoreRef.current || status !== 'ready') return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await getComments(isbn13, { limit: PAGE_SIZE, before: nextCursor });
      const incoming = Array.isArray(res?.data) ? res.data : [];
      setComments((prev) => {
        const known = new Set(prev.map((c) => c.id));
        return [...prev, ...incoming.filter((c) => !known.has(c.id))];
      });
      setTotal(Number(res?.total) || 0);
      setNextCursor(res?.nextCursor ?? null);
    } catch (e) {
      Alert.alert('오류', '댓글을 더 불러오지 못했습니다. 아래로 다시 스크롤해 주세요.');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const trimmed = text.trim();
  const length = charLength(text);
  const tooLong = length > CONTENT_MAX_LENGTH;
  const canSubmit = trimmed.length > 0 && !tooLong && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await createComment(isbn13, trimmed);
      const created = res?.data;
      if (created) {
        setComments((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
        setTotal((prev) => prev + 1);
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      } else {
        await loadFirstPage();
      }
      setText('');
    } catch (error) {
      Alert.alert('오류', getErrorMessage(error, '댓글을 등록하지 못했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  const removeFromList = (commentId) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setTotal((prev) => Math.max(prev - 1, 0));
  };

  const handleDelete = (comment) => {
    Alert.alert('댓글 삭제', '이 댓글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(comment.id);
          try {
            await deleteComment(comment.id);
            removeFromList(comment.id);
          } catch (error) {
            if (error?.response?.status === 404) {
              // 이미 지워졌거나 찾을 수 없는 댓글: 목록에서만 정리한다
              removeFromList(comment.id);
              Alert.alert('알림', '이미 삭제되었거나 찾을 수 없는 댓글입니다.');
            } else {
              Alert.alert('오류', getErrorMessage(error, '댓글을 삭제하지 못했습니다.'));
            }
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  // ISBN13을 얻지 못한 책: 제목으로 대체하지 않고 입력을 막는다
  if (!isbn13) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.infoText}>{NO_ISBN_MESSAGE}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }) => {
    // 내 댓글에만 삭제 버튼 (응답의 user_id와 로그인한 내 user.id 비교)
    const isMine = Boolean(user?.id) && String(item.user_id) === String(user.id);
    return (
      <CommentItem
        comment={item}
        onDelete={isMine ? () => handleDelete(item) : undefined}
        deleting={deletingId === item.id}
      />
    );
  };

  const renderEmpty = () => {
    if (status === 'loading') {
      return <ActivityIndicator size="small" color={COLORS.primary} style={styles.loading} />;
    }
    if (status === 'error') {
      return (
        <TouchableOpacity
          onPress={() => {
            setStatus('loading');
            loadFirstPage();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.infoText}>댓글을 불러오지 못했습니다. 눌러서 다시 시도</Text>
        </TouchableOpacity>
      );
    }
    return <Text style={styles.infoText}>첫 번째 댓글을 남겨보세요.</Text>;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 키보드 처리 (공유 KeyboardAwareContainer는 수정하지 않음)
          - iOS: KeyboardAvoidingView padding + 헤더 오프셋
          - Android: KeyboardAvoidingView 대신 View. 키보드 높이와 컨테이너 높이 변화를 재서 paddingBottom을 직접 준다 */}
      <KeyboardWrapper
        style={[styles.flex, !isIOS && { paddingBottom: keyboardPadding.padding }]}
        {...(isIOS
          ? { behavior: 'padding', keyboardVerticalOffset: insets.top + IOS_HEADER_HEIGHT }
          : { onLayout: keyboardPadding.onLayout })}
      >
        <FlatList
          ref={listRef}
          data={status === 'ready' ? comments : []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.bookTitle} numberOfLines={2}>{title || '댓글'}</Text>
              {status === 'ready' ? <Text style={styles.totalText}>댓글 {total}개</Text> : null}
            </View>
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={styles.loading} />
            ) : null
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />

        <View style={styles.inputBar}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="댓글을 입력하세요"
              placeholderTextColor="#9A9187"
              multiline
              editable={!submitting}
              textAlignVertical="top"
            />
            <Text style={[styles.counter, tooLong && styles.counterOver]}>
              {length}/{CONTENT_MAX_LENGTH}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendText}>등록</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  listContent: { paddingHorizontal: 20, paddingBottom: 12, flexGrow: 1 },
  listHeader: { paddingTop: 16, paddingBottom: 8 },
  bookTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary },
  totalText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  separator: { height: 1, backgroundColor: COLORS.border },
  infoText: { fontSize: 14, color: COLORS.textSecondary, paddingVertical: 24, textAlign: 'center' },
  loading: { marginVertical: 24 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputWrapper: { flex: 1 },
  input: {
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
  },
  counter: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', marginTop: 2 },
  counterOver: { color: '#FF3B30', fontWeight: 'bold' },
  sendButton: {
    height: 44,
    minWidth: 64,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 17,
  },
  sendButtonDisabled: { backgroundColor: '#C9BFB3' },
  sendText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
});
