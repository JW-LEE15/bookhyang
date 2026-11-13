import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';
import { formatTimeAgo } from '../utils/timeAgo';

const DELETED_TEXT = '삭제된 댓글입니다';
const SPOILER_TEXT = '스포일러가 포함된 댓글입니다 · 눌러서 보기';

// 댓글 한 개. 액션은 넘긴 것만 보인다 (미리보기처럼 아무것도 안 넘기면 읽기 전용).
// - isMine: 호출하는 쪽이 서버 is_mine(없으면 user_id 비교)으로 정해서 넘긴다
// - onDelete / onToggleHidden: 내 댓글에서만 넘긴다
// - onReply: 원댓글에서만 넘긴다 (삭제·숨김 상태에서는 이 컴포넌트가 버튼을 숨긴다)
// - onToggleReplies: 원댓글의 「답글 n개 보기 / 답글 접기」 (reply_count가 0이면 숨김)
// - onRevealSpoiler: 스포일러를 눌러서 펼친다 (안 넘기면 가림만 보이고 펼칠 수 없다)
export default function CommentItem({
  comment,
  isMine = false,
  onDelete,
  deleting = false,
  onToggleHidden,
  hiding = false,
  onReply,
  repliesOpen = false,
  onToggleReplies,
  spoilerRevealed = false,
  onRevealSpoiler,
  numberOfLines,
  isReply = false,
}) {
  const isDeleted = Boolean(comment.is_deleted);
  const isMasked = !isDeleted && Boolean(comment.content_masked);
  const isHiddenMine = !isDeleted && !isMasked && isMine && Boolean(comment.is_hidden);
  const showSpoilerCover =
    !isDeleted && !isMasked && Boolean(comment.is_spoiler) && !spoilerRevealed;

  const replyCount = Number(comment.reply_count) || 0;
  const showReplyToggle = !isReply && Boolean(onToggleReplies) && replyCount > 0;
  const canReply = !isReply && Boolean(onReply) && !isDeleted && !isMasked && !comment.is_hidden;

  const renderBody = () => {
    if (isDeleted) {
      return <Text style={styles.mutedContent}>{DELETED_TEXT}</Text>;
    }
    if (isMasked) {
      // 서버가 넣어 준 문구를 그대로 회색으로
      return (
        <Text style={styles.mutedContent} numberOfLines={numberOfLines}>
          {comment.content}
        </Text>
      );
    }
    if (showSpoilerCover) {
      const cover = <Text style={styles.spoilerText}>{SPOILER_TEXT}</Text>;
      return onRevealSpoiler ? (
        <TouchableOpacity
          style={styles.spoilerBox}
          onPress={onRevealSpoiler}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          {cover}
        </TouchableOpacity>
      ) : (
        <View style={styles.spoilerBox}>{cover}</View>
      );
    }
    return (
      <Text style={styles.content} numberOfLines={numberOfLines}>
        {comment.content}
      </Text>
    );
  };

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      {isDeleted ? null : (
        <View style={styles.header}>
          <Text style={styles.nickname} numberOfLines={1}>{comment.nickname || '알 수 없음'}</Text>
          {isHiddenMine ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>숨김 상태</Text>
            </View>
          ) : null}
          <Text style={styles.time}>{formatTimeAgo(comment.created_at)}</Text>
          {onToggleHidden ? (
            <TouchableOpacity onPress={onToggleHidden} disabled={hiding || deleting} hitSlop={8}>
              <Text style={[styles.actionText, (hiding || deleting) && styles.actionTextDisabled]}>
                {comment.is_hidden ? '숨김 해제' : '숨기기'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {onDelete ? (
            <TouchableOpacity onPress={onDelete} disabled={deleting || hiding} hitSlop={8}>
              <Text style={[styles.deleteText, (deleting || hiding) && styles.actionTextDisabled]}>
                {deleting ? '삭제 중...' : '삭제'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {renderBody()}

      {canReply || showReplyToggle ? (
        <View style={styles.footer}>
          {canReply ? (
            <TouchableOpacity onPress={onReply} hitSlop={8}>
              <Text style={styles.footerText}>답글 달기</Text>
            </TouchableOpacity>
          ) : null}
          {showReplyToggle ? (
            <TouchableOpacity onPress={onToggleReplies} hitSlop={8}>
              <Text style={styles.footerText}>
                {repliesOpen ? '답글 접기' : `답글 ${replyCount}개 보기`}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  replyContainer: {
    paddingLeft: 12,
    marginLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  nickname: { flexShrink: 1, fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  time: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  badgeText: { fontSize: 11, color: COLORS.secondary, fontWeight: '600' },
  actionText: { fontSize: 12, color: COLORS.secondary, fontWeight: '600' },
  deleteText: { fontSize: 12, color: '#FF3B30', fontWeight: '600' },
  actionTextDisabled: { color: '#B3ADA3' },
  content: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 21 },
  mutedContent: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  spoilerBox: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  spoilerText: { fontSize: 13, color: COLORS.secondary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  footerText: { fontSize: 12, color: COLORS.secondary, fontWeight: '600' },
});
