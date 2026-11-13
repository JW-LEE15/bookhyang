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
import {
  getComments,
  getReplies,
  createComment,
  deleteComment,
  setCommentHidden,
} from '../api';
import useKeyboardPadding from '../hooks/useKeyboardPadding';
import CommentItem from '../components/CommentItem';
import { NO_ISBN_MESSAGE } from '../components/BookCommentPreview';
import { COMMENT_ERROR_MESSAGES, getCommentErrorCode, getCommentErrorMessage } from '../utils/commentErrors';

const PAGE_SIZE = 20;
const REPLY_PAGE_SIZE = 20;
// AI 요약에서 원문 이동할 때 댓글을 찾느라 불러오는 최대 페이지 수 (처음 페이지 포함)
const FOCUS_MAX_PAGES = 5;
const FOCUS_NOT_FOUND_TEXT = '원문 댓글을 찾지 못했어요. 삭제됐거나 오래된 댓글일 수 있어요';
const CONTENT_MAX_LENGTH = 500;
// 스택 헤더 기본 높이(iOS). KeyboardAvoidingView가 헤더만큼 아래에 있어서 그만큼 보정한다.
const IOS_HEADER_HEIGHT = 44;

// 원댓글별 답글 목록 상태의 처음 값
const EMPTY_REPLIES = { open: false, items: [], nextCursor: null, loaded: false, loading: false, error: false };

// 글자 수 (이모지도 1글자. 서버, DB와 같은 기준)
const charLength = (str) => [...str].length;

// iOS는 KeyboardAvoidingView, Android는 일반 View (Android는 useKeyboardPadding으로 여백을 직접 준다)
const KeyboardWrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;

// 책별 댓글 화면. 책은 ISBN13(route.params.isbn13)로만 식별한다. 책 id는 쓰지 않는다.
export default function BookCommentsScreen({ route, navigation }) {
  const { isbn13, title, focusCommentId, focusOpenReplies } = route.params || {};
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const inputRef = useRef(null);

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
  const [isSpoilerChecked, setIsSpoilerChecked] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null); // 답글을 달 원댓글 (null이면 일반 댓글)
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [hidingId, setHidingId] = useState(null);

  const [repliesByParent, setRepliesByParent] = useState({}); // { [원댓글 id]: 답글 목록 상태 }
  const repliesLoadingRef = useRef({});
  const [revealedSpoilers, setRevealedSpoilers] = useState({}); // { [댓글 id]: true } 화면을 나가면 다시 가려진다

  // AI 요약에서 넘어온 원문 댓글 찾기
  const focusDoneRef = useRef(!focusCommentId);
  const focusPagesRef = useRef(1);
  const [highlightedId, setHighlightedId] = useState(null);
  const [focusNotice, setFocusNotice] = useState(null);

  // 서버 is_mine을 우선, 없을 때만 응답의 user_id와 로그인한 내 user.id를 비교
  const isMineComment = (item) => {
    if (typeof item.is_mine === 'boolean') return item.is_mine;
    return Boolean(user?.id) && item.user_id != null && String(item.user_id) === String(user.id);
  };

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

  // ---- 답글 목록 ----

  const patchReplies = (parentId, patch) => {
    setRepliesByParent((prev) => ({
      ...prev,
      [parentId]: { ...(prev[parentId] || EMPTY_REPLIES), ...patch },
    }));
  };

  // 답글을 불러온다. replace면 처음부터 다시, after가 있으면 그 뒤부터 이어 붙인다.
  const fetchReplies = async (parentId, { after, replace = false } = {}) => {
    if (repliesLoadingRef.current[parentId]) return;
    repliesLoadingRef.current[parentId] = true;
    patchReplies(parentId, { loading: true, error: false });
    try {
      const res = await getReplies(parentId, { limit: REPLY_PAGE_SIZE, after });
      const incoming = Array.isArray(res?.data) ? res.data : [];
      setRepliesByParent((prev) => {
        const cur = prev[parentId] || EMPTY_REPLIES;
        const base = replace ? [] : cur.items;
        const known = new Set(base.map((c) => c.id));
        return {
          ...prev,
          [parentId]: {
            ...cur,
            items: [...base, ...incoming.filter((c) => !known.has(c.id))],
            nextCursor: res?.nextCursor ?? null,
            loaded: true,
            loading: false,
            error: false,
          },
        };
      });
      // 서버가 알려 준 답글 수로 원댓글의 reply_count를 맞춘다
      if (res?.total != null && Number.isFinite(Number(res.total))) {
        const count = Number(res.total);
        setComments((prev) => prev.map((c) => (c.id === parentId ? { ...c, reply_count: count } : c)));
      }
    } catch (error) {
      patchReplies(parentId, { loading: false, error: true });
      if (error?.response?.status === 404) {
        // 원댓글이 없어졌다: 목록을 새로 맞춘다
        Alert.alert('알림', COMMENT_ERROR_MESSAGES.PARENT_NOT_FOUND);
        loadFirstPage();
      }
    } finally {
      repliesLoadingRef.current[parentId] = false;
    }
  };

  const toggleReplies = (parent) => {
    const cur = repliesByParent[parent.id] || EMPTY_REPLIES;
    if (cur.open) {
      patchReplies(parent.id, { open: false });
      return;
    }
    patchReplies(parent.id, { open: true });
    if (!cur.loaded) fetchReplies(parent.id);
  };

  // ---- 원문 댓글 찾기 (AI 댓글 요약에서 이동한 경우) ----
  // 목록에 없으면 최대 FOCUS_MAX_PAGES페이지까지 이어 받으며 찾는다. 찾으면 스크롤하고, 답글 근거였다면 답글을 펼친다.
  useEffect(() => {
    if (focusDoneRef.current || status !== 'ready' || loadingMore) return;
    const index = comments.findIndex((c) => String(c.id) === String(focusCommentId));
    if (index >= 0) {
      focusDoneRef.current = true;
      setHighlightedId(comments[index].id);
      if (focusOpenReplies) {
        const cur = repliesByParent[comments[index].id] || EMPTY_REPLIES;
        if (!cur.open) {
          patchReplies(comments[index].id, { open: true });
          if (!cur.loaded) fetchReplies(comments[index].id);
        }
      }
      requestAnimationFrame(() =>
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 })
      );
      return;
    }
    if (nextCursor && focusPagesRef.current < FOCUS_MAX_PAGES) {
      focusPagesRef.current += 1;
      loadMore();
      return;
    }
    focusDoneRef.current = true;
    setFocusNotice(FOCUS_NOT_FOUND_TEXT);
  }, [status, comments, nextCursor, loadingMore]);

  // 렌더 전에 높이를 모르는 항목으로 스크롤하다 실패하면, 평균 높이로 근처까지 가 본다
  const handleScrollToIndexFailed = (info) => {
    listRef.current?.scrollToOffset({
      offset: info.averageItemLength * info.index,
      animated: true,
    });
  };

  // ---- 작성 ----

  const trimmed = text.trim();
  const length = charLength(text);
  const tooLong = length > CONTENT_MAX_LENGTH;
  const canSubmit = trimmed.length > 0 && !tooLong && !submitting;

  const startReply = (parent) => {
    setReplyTarget(parent);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const parent = replyTarget;
    try {
      const res = await createComment(isbn13, trimmed, {
        parent_id: parent?.id,
        is_spoiler: isSpoilerChecked,
      });
      const created = res?.data;
      if (parent) {
        // 답글: 그 원댓글의 답글 목록을 펼치고 reply_count를 갱신한다
        const cur = repliesByParent[parent.id] || EMPTY_REPLIES;
        setComments((prev) =>
          prev.map((c) =>
            c.id === parent.id ? { ...c, reply_count: (Number(c.reply_count) || 0) + 1 } : c
          )
        );
        setTotal((prev) => prev + 1);
        patchReplies(parent.id, { open: true });
        if (!cur.loaded) {
          // 아직 안 불러왔으면 서버 목록을 받아 온다 (방금 쓴 답글 포함)
          await fetchReplies(parent.id, { replace: true });
        } else if (created && !cur.nextCursor) {
          // 끝까지 불러온 상태면 맨 뒤에 붙인다 (오래된 순이라 새 답글이 마지막)
          patchReplies(parent.id, {
            items: [...cur.items.filter((c) => c.id !== created.id), created],
          });
        } else if (!created) {
          await fetchReplies(parent.id, { replace: true });
        }
        // 일부만 불러온 상태면 「더 보기」로 이어 받을 때 포함된다
      } else if (created) {
        setComments((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
        setTotal((prev) => prev + 1);
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      } else {
        await loadFirstPage();
      }
      setText('');
      setIsSpoilerChecked(false);
      setReplyTarget(null);
    } catch (error) {
      const code = getCommentErrorCode(error);
      if (code === 'PARENT_NOT_FOUND' || code === 'PARENT_HIDDEN') {
        // 더 이상 답글을 달 수 없는 원댓글: 답글 모드를 풀고 목록을 새로 맞춘다 (쓰던 내용은 남겨 둔다)
        setReplyTarget(null);
        loadFirstPage();
      }
      Alert.alert('오류', getCommentErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- 숨김 ----

  // PATCH 응답의 댓글로 목록 안의 같은 댓글을 바꾼다 (원댓글, 답글 모두)
  const replaceComment = (updated) => {
    setComments((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    if (updated.parent_id) {
      setRepliesByParent((prev) => {
        const cur = prev[updated.parent_id];
        if (!cur) return prev;
        return {
          ...prev,
          [updated.parent_id]: {
            ...cur,
            items: cur.items.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
          },
        };
      });
    }
  };

  const handleToggleHidden = async (comment) => {
    if (hidingId) return;
    setHidingId(comment.id);
    try {
      const res = await setCommentHidden(comment.id, !comment.is_hidden);
      if (res?.data) replaceComment(res.data);
      else await loadFirstPage();
    } catch (error) {
      if (error?.response?.status === 404) {
        // 이미 지워졌거나 내 댓글이 아닌 경우: 목록을 새로 맞춘다
        Alert.alert('알림', '이미 삭제되었거나 찾을 수 없는 댓글입니다.');
        loadFirstPage();
      } else {
        Alert.alert('오류', getCommentErrorMessage(error));
      }
    } finally {
      setHidingId(null);
    }
  };

  // ---- 삭제 ----

  // 삭제 뒤에는 서버 값으로 목록과 total을 다시 받는다 (삭제 표시로 남는지 완전히 지워지는지는 서버가 정한다)
  const refreshAfterDelete = (comment) => {
    loadFirstPage();
    if (comment.parent_id) {
      const cur = repliesByParent[comment.parent_id];
      if (cur?.loaded) fetchReplies(comment.parent_id, { replace: true });
    }
    if (replyTarget && String(replyTarget.id) === String(comment.id)) setReplyTarget(null);
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
            refreshAfterDelete(comment);
          } catch (error) {
            if (error?.response?.status === 404) {
              // 이미 지워졌거나 찾을 수 없는 댓글: 목록을 새로 맞춘다
              refreshAfterDelete(comment);
              Alert.alert('알림', '이미 삭제되었거나 찾을 수 없는 댓글입니다.');
            } else {
              Alert.alert('오류', getCommentErrorMessage(error));
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

  const renderComment = (item, { isReply = false } = {}) => {
    const mine = isMineComment(item);
    const state = repliesByParent[item.id] || EMPTY_REPLIES;
    return (
      <CommentItem
        comment={item}
        isReply={isReply}
        isMine={mine}
        onDelete={mine && !item.is_deleted ? () => handleDelete(item) : undefined}
        deleting={deletingId === item.id}
        onToggleHidden={mine && !item.is_deleted ? () => handleToggleHidden(item) : undefined}
        hiding={hidingId === item.id}
        onReply={isReply ? undefined : () => startReply(item)}
        repliesOpen={state.open}
        onToggleReplies={isReply ? undefined : () => toggleReplies(item)}
        spoilerRevealed={Boolean(revealedSpoilers[item.id])}
        onRevealSpoiler={() => setRevealedSpoilers((prev) => ({ ...prev, [item.id]: true }))}
      />
    );
  };

  const renderReplies = (parent) => {
    const state = repliesByParent[parent.id];
    if (!state?.open) return null;
    return (
      <View style={styles.replies}>
        {state.items.map((reply) => (
          <View key={reply.id}>{renderComment(reply, { isReply: true })}</View>
        ))}
        {state.loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.replyLoading} />
        ) : null}
        {state.error && !state.loading ? (
          <TouchableOpacity
            onPress={() => fetchReplies(parent.id, state.loaded ? { after: state.nextCursor } : {})}
            activeOpacity={0.7}
          >
            <Text style={styles.replyMoreText}>답글을 불러오지 못했습니다. 눌러서 다시 시도</Text>
          </TouchableOpacity>
        ) : null}
        {state.nextCursor && !state.loading && !state.error ? (
          <TouchableOpacity
            onPress={() => fetchReplies(parent.id, { after: state.nextCursor })}
            activeOpacity={0.7}
          >
            <Text style={styles.replyMoreText}>더 보기</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <View style={highlightedId === item.id ? styles.highlighted : null}>
      {renderComment(item)}
      {renderReplies(item)}
    </View>
  );

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
          - Android: KeyboardAvoidingView 대신 View. 키보드 높이와 컨테이너 높이 변화를 재서 paddingBottom을 직접 준다
          답글 모드 줄은 inputBar 안에 있어서 입력창이 위로 커질 뿐 키보드에 가려지지 않는다. */}
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
              {status === 'ready' && total > 0 ? (
                <TouchableOpacity
                  style={styles.aiButton}
                  onPress={() => navigation.navigate('AiCommentSummary', { isbn13, title })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.aiButtonText}>AI 댓글 요약</Text>
                </TouchableOpacity>
              ) : null}
              {focusNotice ? <Text style={styles.focusNotice}>{focusNotice}</Text> : null}
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
          onScrollToIndexFailed={handleScrollToIndexFailed}
          scrollEventThrottle={16}
        />

        <View style={styles.inputBar}>
          {replyTarget ? (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText} numberOfLines={1}>
                @{replyTarget.nickname || '알 수 없음'}에게 답글
              </Text>
              <TouchableOpacity onPress={() => setReplyTarget(null)} hitSlop={8} disabled={submitting}>
                <Text style={styles.replyCancelText}>취소</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder={replyTarget ? '답글을 입력하세요' : '댓글을 입력하세요'}
                placeholderTextColor="#9A9187"
                multiline
                editable={!submitting}
                textAlignVertical="top"
              />
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={styles.spoilerCheck}
                  onPress={() => setIsSpoilerChecked((prev) => !prev)}
                  disabled={submitting}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSpoilerChecked }}
                >
                  <View style={[styles.checkBox, isSpoilerChecked && styles.checkBoxOn]}>
                    {isSpoilerChecked ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                  <Text style={styles.spoilerCheckText}>스포일러 포함</Text>
                </TouchableOpacity>
                <Text style={[styles.counter, tooLong && styles.counterOver]}>
                  {length}/{CONTENT_MAX_LENGTH}
                </Text>
              </View>
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
                <Text style={styles.sendText}>{replyTarget ? '답글' : '등록'}</Text>
              )}
            </TouchableOpacity>
          </View>
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
  aiButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  aiButtonText: { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' },
  focusNotice: { fontSize: 12, color: COLORS.secondary, marginTop: 8 },
  highlighted: { backgroundColor: '#F7F4EB', borderRadius: 8 },
  separator: { height: 1, backgroundColor: COLORS.border },
  infoText: { fontSize: 14, color: COLORS.textSecondary, paddingVertical: 24, textAlign: 'center' },
  loading: { marginVertical: 24 },
  replies: { marginLeft: 4, paddingBottom: 8 },
  replyLoading: { marginVertical: 12 },
  replyMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
    paddingVertical: 8,
    paddingLeft: 20,
  },
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  replyBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.primary },
  replyCancelText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  spoilerCheck: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  checkBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkMark: { fontSize: 11, lineHeight: 13, color: '#FFFFFF', fontWeight: 'bold' },
  spoilerCheckText: { fontSize: 12, color: COLORS.textSecondary },
  counter: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'right' },
  counterOver: { color: '#FF3B30', fontWeight: 'bold' },
  sendButton: {
    height: 44,
    minWidth: 64,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  sendButtonDisabled: { backgroundColor: '#C9BFB3' },
  sendText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
});
