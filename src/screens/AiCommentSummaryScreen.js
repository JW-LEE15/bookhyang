import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { getAiCommentSummary } from '../api';
import { formatTimeAgo } from '../utils/timeAgo';
import {
  NOT_ENOUGH_COMMENTS,
  getAiSummaryErrorCode,
  getAiSummaryErrorMessage,
} from '../utils/aiCommentSummaryErrors';

const DISCLAIMER = 'AI가 만든 요약이라 부정확할 수 있어요. 요약에는 공개 댓글만 쓰이고 Google AI로 전송돼요';
const SPOILER_COVER_TEXT = '스포일러가 포함된 댓글이에요';

// 생성 시각: YYYY.MM.DD HH:mm (기기 시간대)
const formatGeneratedAt = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function SpoilerBadge() {
  return (
    <View style={styles.spoilerBadge}>
      <Text style={styles.spoilerBadgeText}>스포일러 포함</Text>
    </View>
  );
}

// 근거 댓글 목록: evidence_ids에 해당하는 댓글을 색인에서 찾아 보여준다 (색인에 없는 id는 건너뛴다)
function EvidenceList({ evidenceIds, commentIndex, onOpenOriginal }) {
  const items = (Array.isArray(evidenceIds) ? evidenceIds : [])
    .map((id) => commentIndex[String(id)])
    .filter(Boolean);

  if (items.length === 0) {
    return <Text style={styles.evidenceEmpty}>표시할 근거 댓글이 없어요</Text>;
  }

  return (
    <View style={styles.evidenceList}>
      {items.map((c) => (
        <View key={String(c.id)} style={styles.evidenceItem}>
          <View style={styles.evidenceMeta}>
            <Text style={styles.evidenceKind}>{c.parent_id ? '답글' : '댓글'}</Text>
            <Text style={styles.evidenceTime}>{formatTimeAgo(c.created_at)}</Text>
          </View>
          {c.is_spoiler ? (
            <Text style={styles.evidenceCover}>{SPOILER_COVER_TEXT}</Text>
          ) : (
            <Text style={styles.evidenceText}>{c.preview}</Text>
          )}
          <TouchableOpacity onPress={() => onOpenOriginal(c)} hitSlop={8} activeOpacity={0.7}>
            <Text style={styles.originalLink}>원문 댓글 보기</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

// 요약 항목 한 개(문장 + 스포일러 배지 + 근거 토글)
function SummaryEntry({ text, evidenceIds, containsSpoiler, commentIndex, onOpenOriginal }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.entry}>
      {containsSpoiler ? <SpoilerBadge /> : null}
      <Text style={styles.entryText}>{text}</Text>
      <TouchableOpacity
        style={styles.evidenceToggle}
        onPress={() => setOpen((prev) => !prev)}
        hitSlop={8}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.evidenceToggleText}>{open ? '근거 댓글 접기' : '근거 댓글 보기'}</Text>
      </TouchableOpacity>
      {open ? (
        <EvidenceList
          evidenceIds={evidenceIds}
          commentIndex={commentIndex}
          onOpenOriginal={onOpenOriginal}
        />
      ) : null}
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// AI 댓글 요약 화면. 책은 ISBN13(route.params.isbn13)로만 식별한다.
export default function AiCommentSummaryScreen({ route, navigation }) {
  const { isbn13, title } = route.params || {};

  const [includeSpoilers, setIncludeSpoilers] = useState(false);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [data, setData] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const requestIdRef = useRef(0); // 마지막 요청의 응답만 화면에 반영한다

  const load = useCallback(
    async ({ spoilers, refresh = false }) => {
      if (!isbn13) return;
      const requestId = ++requestIdRef.current;
      setStatus('loading');
      try {
        const res = await getAiCommentSummary(isbn13, { includeSpoilers: spoilers, refresh });
        if (requestId !== requestIdRef.current) return;
        if (!res?.data?.summary) throw new Error('INVALID_RESPONSE');
        setData(res.data);
        setErrorCode(null);
        setStatus('ready');
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        setErrorCode(getAiSummaryErrorCode(error));
        setStatus('error');
      }
    },
    [isbn13]
  );

  useEffect(() => {
    load({ spoilers: false });
    return () => {
      requestIdRef.current += 1; // 화면을 떠난 뒤 늦게 온 응답 무시
    };
  }, [load]);

  const handleToggleSpoilers = (value) => {
    setIncludeSpoilers(value);
    load({ spoilers: value });
  };

  const handleRefresh = () => {
    Alert.alert('다시 요약', '요약 횟수에 한도가 있어요. 새로 요약할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '다시 요약', onPress: () => load({ spoilers: includeSpoilers, refresh: true }) },
    ]);
  };

  // 원문 이동: 답글이면 원댓글(parent_id) 위치로, 아니면 그 댓글로. 책별 댓글 화면이 찾아서 스크롤한다(최선 노력).
  const handleOpenOriginal = (comment) => {
    navigation.push('BookComments', {
      isbn13,
      title,
      focusCommentId: String(comment.parent_id || comment.id),
      focusOpenReplies: Boolean(comment.parent_id),
    });
  };

  if (!isbn13) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.infoText}>ISBN 정보가 없어 댓글 요약을 사용할 수 없어요</Text>
        </View>
      </SafeAreaView>
    );
  }

  const commentIndex = {};
  if (data && Array.isArray(data.comments)) {
    data.comments.forEach((c) => {
      commentIndex[String(c.id)] = c;
    });
  }

  const summary = data?.summary;
  const mainOpinions = Array.isArray(summary?.main_opinions) ? summary.main_opinions : [];
  const differing = Array.isArray(summary?.differing_opinions) ? summary.differing_opinions : [];
  const questions = Array.isArray(summary?.reader_questions) ? summary.reader_questions : [];

  const renderBody = () => {
    if (status === 'loading') {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>댓글을 요약하는 중이에요. 최대 30초 정도 걸려요.</Text>
        </View>
      );
    }

    if (status === 'error') {
      if (errorCode === NOT_ENOUGH_COMMENTS) {
        return (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>댓글이 5개 이상 모이면 요약할 수 있어요</Text>
            {!includeSpoilers ? (
              <Text style={styles.noticeSub}>스포일러 포함 댓글을 켜 보세요</Text>
            ) : null}
          </View>
        );
      }
      return (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>{getAiSummaryErrorMessage(errorCode)}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => load({ spoilers: includeSpoilers })}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const counts = data?.counts || {};
    return (
      <>
        <View style={styles.statsBox}>
          <Text style={styles.statsMain}>댓글 {counts.total ?? 0}개를 바탕으로 요약했어요</Text>
          <Text style={styles.statsSub}>
            원댓글 {counts.roots ?? 0}개 · 답글 {counts.replies ?? 0}개
          </Text>
          <View style={styles.statsRow}>
            {data?.generatedAt ? (
              <Text style={styles.statsSub}>{formatGeneratedAt(data.generatedAt)} 생성</Text>
            ) : null}
            {data?.cached ? (
              <View style={styles.cachedBadge}>
                <Text style={styles.cachedBadgeText}>저장된 요약</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} activeOpacity={0.8}>
            <Text style={styles.refreshText}>다시 요약</Text>
          </TouchableOpacity>
        </View>

        <Section title="주요 의견">
          {mainOpinions.length === 0 ? (
            <Text style={styles.emptyText}>공통으로 언급된 의견이 아직 없어요</Text>
          ) : (
            mainOpinions.map((o, i) => (
              <SummaryEntry
                key={`main-${i}`}
                text={o.text}
                evidenceIds={o.evidence_ids}
                containsSpoiler={o.contains_spoiler}
                commentIndex={commentIndex}
                onOpenOriginal={handleOpenOriginal}
              />
            ))
          )}
        </Section>

        {/* 서로 다른 의견, 독자 질문은 비어 있을 수 있다: 있을 때만 섹션을 보여 준다 */}
        {differing.length > 0 ? (
          <Section title="서로 다른 의견">
            {differing.map((d, i) => (
              <View key={`diff-${i}`} style={styles.topicBox}>
                <Text style={styles.topicTitle}>{d.topic}</Text>
                {(Array.isArray(d.sides) ? d.sides : []).map((s, j) => (
                  <View key={`side-${j}`} style={styles.sideBox}>
                    <Text style={styles.sideLabel}>입장 {j + 1}</Text>
                    <SummaryEntry
                      text={s.text}
                      evidenceIds={s.evidence_ids}
                      containsSpoiler={s.contains_spoiler}
                      commentIndex={commentIndex}
                      onOpenOriginal={handleOpenOriginal}
                    />
                  </View>
                ))}
              </View>
            ))}
          </Section>
        ) : null}

        {questions.length > 0 ? (
          <Section title="독자 질문">
            {questions.map((q, i) => (
              <SummaryEntry
                key={`q-${i}`}
                text={q.text}
                evidenceIds={q.evidence_ids}
                containsSpoiler={q.contains_spoiler}
                commentIndex={commentIndex}
                onOpenOriginal={handleOpenOriginal}
              />
            ))}
          </Section>
        ) : null}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {title ? (
          <Text style={styles.bookTitle} numberOfLines={2}>{title}</Text>
        ) : null}

        <View style={styles.switchRow}>
          <View style={styles.switchTexts}>
            <Text style={styles.switchLabel}>스포일러 포함</Text>
            <Text style={styles.switchHint}>스포일러 댓글도 요약에 넣어요</Text>
          </View>
          <Switch
            value={includeSpoilers}
            onValueChange={handleToggleSpoilers}
            trackColor={{ false: COLORS.border, true: COLORS.secondary }}
            thumbColor={includeSpoilers ? COLORS.primary : '#FFFFFF'}
          />
        </View>

        {renderBody()}

        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: { padding: 20, paddingBottom: 40 },
  bookTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  infoText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  switchTexts: { flex: 1, paddingRight: 12 },
  switchLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary },
  switchHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  loadingBox: { alignItems: 'center', paddingVertical: 48, gap: 16 },
  loadingText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  noticeBox: {
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 24,
    gap: 8,
  },
  noticeTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', lineHeight: 21 },
  noticeSub: { fontSize: 13, color: COLORS.secondary, textAlign: 'center' },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryText: { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' },

  statsBox: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 4,
  },
  statsMain: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  statsSub: { fontSize: 12, color: COLORS.textSecondary },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cachedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  cachedBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.secondary },
  refreshButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F7F4EB',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  refreshText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },

  section: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 8 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, paddingVertical: 8 },

  entry: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  entryText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 22 },
  spoilerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginBottom: 6,
  },
  spoilerBadgeText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  evidenceToggle: { alignSelf: 'flex-start', marginTop: 8 },
  evidenceToggleText: { fontSize: 12, fontWeight: '600', color: COLORS.secondary },

  evidenceList: { marginTop: 8, gap: 8 },
  evidenceItem: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    gap: 6,
  },
  evidenceMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  evidenceKind: { fontSize: 11, fontWeight: '600', color: COLORS.secondary },
  evidenceTime: { fontSize: 11, color: COLORS.textSecondary },
  evidenceText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 19 },
  evidenceCover: { fontSize: 13, color: COLORS.secondary },
  evidenceEmpty: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  originalLink: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },

  topicBox: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  topicTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  sideBox: { marginTop: 4, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: COLORS.border },
  sideLabel: { fontSize: 11, fontWeight: '600', color: COLORS.secondary, marginTop: 6 },

  disclaimer: {
    marginTop: 24,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
