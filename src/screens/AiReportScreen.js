import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { createReadingReport, getReadingReports, deleteReadingReport } from '../api';
import { AuthContext } from '../context/AuthContext';
import { getBooleanSetting, SETTING_KEYS } from '../storage/settingsStorage';
import { getAiReportErrorCode, getAiReportErrorMessage } from '../utils/aiReadingReportErrors';

const DISCLAIMER =
  'AI가 만든 분석이라 부정확할 수 있어요. 완독 도서 목록과 동의한 경우 메모가 Google AI로 전송돼요';
const CONSENT_HINT = '동의하면 메모도 분석에 반영돼요';
const UNCATEGORIZED = '미분류';

const PERIODS = [
  { value: 'this_month', label: '이번 달' },
  { value: 'last_month', label: '지난달' },
];

const SECTIONS = [
  { key: 'interest_topics', title: '관심 주제', hideWhenEmpty: false },
  { key: 'repeated_thoughts', title: '반복된 생각', hideWhenEmpty: true },
  { key: 'reflection_questions', title: '돌아볼 질문', hideWhenEmpty: false },
  { key: 'next_reading', title: '다음 독서 제안', hideWhenEmpty: false },
];

// 생성 시각: YYYY.MM.DD HH:mm (기기 시간대)
const formatGeneratedAt = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// "2026-11" -> "2026년 11월" (형식이 다르면 그대로)
const formatPeriodLabel = (label) => {
  const match = /^(\d{4})-(\d{2})$/.exec(label || '');
  return match ? `${match[1]}년 ${Number(match[2])}월` : label || '';
};

const asArray = (value) => (Array.isArray(value) ? value : []);

// 근거는 개수만 보여 준다
function evidenceText(evidence) {
  const books = asArray(evidence?.book_ids).length;
  const notes = asArray(evidence?.note_ids).length;
  const parts = [];
  if (books > 0) parts.push(`근거 책 ${books}권`);
  if (notes > 0) parts.push(`메모 ${notes}개`);
  return parts.join(' · ');
}

function StatBox({ value, label }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// 리포트 본문: 통계, 생성 시각, 섹션 카드
function ReportView({ report }) {
  const stats = report?.stats || {};
  const byCategory = asArray(stats.by_category);

  return (
    <View>
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <StatBox value={stats.completed_count ?? 0} label="완독" />
          <View style={styles.statDivider} />
          <StatBox value={stats.notes_count ?? 0} label="메모" />
        </View>
        {byCategory.length > 0 ? (
          <View style={styles.categoryRow}>
            {byCategory.map((c, i) => (
              <View key={`${c.category ?? 'none'}-${i}`} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>
                  {c.category || UNCATEGORIZED} {c.count}권
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {report?.generated_at ? (
          <Text style={styles.generatedAt}>{formatGeneratedAt(report.generated_at)} 생성</Text>
        ) : null}
      </View>

      {SECTIONS.map(({ key, title, hideWhenEmpty }) => {
        const items = asArray(report?.report?.[key]);
        if (items.length === 0 && hideWhenEmpty) return null;
        return (
          <View key={key} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {items.length === 0 ? (
              <Text style={styles.emptyText}>표시할 내용이 없어요</Text>
            ) : (
              items.map((item, i) => {
                const evidence = evidenceText(item?.evidence);
                return (
                  <View key={`${key}-${i}`} style={styles.entry}>
                    <Text style={styles.entryText}>{item?.text}</Text>
                    {evidence ? <Text style={styles.evidenceText}>{evidence}</Text> : null}
                  </View>
                );
              })
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function AiReportScreen() {
  const { user } = useContext(AuthContext);
  const userId = user?.id;

  const [period, setPeriod] = useState('this_month');
  const [consent, setConsent] = useState(false); // 안내 표시용. 요청 직전에 다시 읽는다
  const [generating, setGenerating] = useState(false);
  const [createError, setCreateError] = useState(null); // 안내문 문자열
  const [reports, setReports] = useState([]);
  const [listStatus, setListStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const createRequestRef = useRef(0);
  const listRequestRef = useRef(0);
  const generatingRef = useRef(false); // 연타로 중복 요청이 나가지 않게 한다

  const loadList = useCallback(async () => {
    const requestId = ++listRequestRef.current;
    setListStatus('loading');
    try {
      const res = await getReadingReports();
      if (requestId !== listRequestRef.current) return;
      if (!Array.isArray(res?.data)) throw new Error('INVALID_RESPONSE');
      setReports(res.data);
      setListStatus('ready');
    } catch (e) {
      if (requestId !== listRequestRef.current) return;
      setListStatus('error');
    }
  }, []);

  useEffect(() => {
    loadList();
    return () => {
      listRequestRef.current += 1;
      createRequestRef.current += 1; // 화면을 떠난 뒤 늦게 온 응답 무시
    };
  }, [loadList]);

  // 설정에서 동의를 바꾸고 돌아왔을 때 안내가 맞도록 포커스마다 읽는다
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getBooleanSetting(userId, SETTING_KEYS.AI_CONSENT).then((value) => {
        if (active) setConsent(value);
      });
      return () => {
        active = false;
      };
    }, [userId])
  );

  const handleCreate = async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    const requestId = ++createRequestRef.current;
    setGenerating(true);
    setCreateError(null);
    try {
      // 요청 직전에 동의 값을 다시 읽는다. true일 때만 메모를 보낸다
      const consentNow = await getBooleanSetting(userId, SETTING_KEYS.AI_CONSENT);
      if (requestId === createRequestRef.current) setConsent(consentNow);
      const res = await createReadingReport(period, consentNow === true);
      if (requestId !== createRequestRef.current) return;
      const report = res?.data;
      if (!report || !report.id) throw new Error('INVALID_RESPONSE');
      const id = String(report.id);
      setReports((prev) => [report, ...prev.filter((r) => String(r.id) !== id)]);
      setListStatus('ready');
      setExpandedId(id);
    } catch (error) {
      if (requestId !== createRequestRef.current) return;
      setCreateError(getAiReportErrorMessage(getAiReportErrorCode(error)));
    } finally {
      generatingRef.current = false;
      if (requestId === createRequestRef.current) setGenerating(false);
    }
  };

  const removeFromList = (id) => {
    setReports((prev) => prev.filter((r) => String(r.id) !== id));
    setExpandedId((prev) => (prev === id ? null : prev));
  };

  const handleDelete = (report) => {
    const id = String(report.id);
    Alert.alert('리포트 삭제', '이 리포트를 삭제할까요? 삭제하면 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try {
            await deleteReadingReport(id);
            removeFromList(id);
          } catch (error) {
            if (error?.response?.status === 404) {
              removeFromList(id); // 이미 없는 리포트
            } else {
              Alert.alert('삭제 실패', '리포트를 삭제하지 못했어요. 다시 시도해 주세요.');
            }
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderList = () => {
    if (listStatus === 'loading' && reports.length === 0) {
      return (
        <View style={styles.listNotice}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      );
    }
    if (listStatus === 'error' && reports.length === 0) {
      return (
        <TouchableOpacity style={styles.listNotice} onPress={loadList} activeOpacity={0.8}>
          <Text style={styles.emptyText}>저장된 리포트를 불러오지 못했어요.</Text>
          <Text style={styles.retryLink}>다시 시도</Text>
        </TouchableOpacity>
      );
    }
    if (reports.length === 0) {
      return (
        <View style={styles.listNotice}>
          <Text style={styles.emptyText}>아직 저장된 리포트가 없어요.</Text>
        </View>
      );
    }

    return reports.map((report) => {
      const id = String(report.id);
      const open = expandedId === id;
      return (
        <View key={id} style={styles.savedItem}>
          <TouchableOpacity
            style={styles.savedHeader}
            onPress={() => toggleExpanded(id)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
          >
            <View style={styles.savedHeaderTexts}>
              <Text style={styles.savedLabel}>{formatPeriodLabel(report.period?.label)} 리포트</Text>
              <Text style={styles.savedTime}>{formatGeneratedAt(report.generated_at)} 생성</Text>
            </View>
            <Text style={styles.savedArrow}>{open ? '접기' : '펼치기'}</Text>
          </TouchableOpacity>
          {open ? (
            <View style={styles.savedBody}>
              <ReportView report={report} />
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(report)}
                disabled={deletingId === id}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteText}>{deletingId === id ? '삭제 중...' : '삭제'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>기간을 고르고 독서 리포트를 만들어 보세요</Text>

        <View style={styles.chipRow}>
          {PERIODS.map((p) => {
            const selected = period === p.value;
            return (
              <TouchableOpacity
                key={p.value}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setPeriod(p.value)}
                disabled={generating}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.createButton, generating && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={generating}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.createText}>{generating ? '만드는 중...' : '리포트 만들기'}</Text>
        </TouchableOpacity>

        {!consent ? <Text style={styles.consentHint}>{CONSENT_HINT}</Text> : null}

        {generating ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>리포트를 만드는 중이에요. 최대 30초 정도 걸려요.</Text>
          </View>
        ) : null}

        {createError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{createError}</Text>
          </View>
        ) : null}

        <Text style={styles.listTitle}>저장된 리포트</Text>
        {renderList()}

        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 15, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 14 },

  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextSelected: { color: '#FFFFFF' },

  createButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  createButtonDisabled: { opacity: 0.5 },
  createText: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  consentHint: { marginTop: 8, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  loadingBox: { alignItems: 'center', paddingVertical: 28, gap: 12 },
  loadingText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  errorBox: {
    marginTop: 14,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 12,
    padding: 14,
  },
  errorText: { fontSize: 13, lineHeight: 20, color: COLORS.textPrimary, textAlign: 'center' },

  listTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginTop: 28, marginBottom: 10 },
  listNotice: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  retryLink: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  emptyText: { fontSize: 13, color: COLORS.textSecondary },

  savedItem: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  savedHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  savedHeaderTexts: { flex: 1, gap: 2 },
  savedLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary },
  savedTime: { fontSize: 12, color: COLORS.textSecondary },
  savedArrow: { fontSize: 12, fontWeight: '600', color: COLORS.secondary },
  savedBody: { paddingHorizontal: 14, paddingBottom: 14 },

  deleteButton: {
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  deleteText: { fontSize: 13, fontWeight: 'bold', color: COLORS.accent },

  statsCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statBox: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.border,
  },
  categoryChipText: { fontSize: 12, fontWeight: '600', color: COLORS.secondary },
  generatedAt: { fontSize: 12, color: COLORS.textSecondary },

  sectionCard: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary, marginBottom: 6 },
  entry: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  entryText: { fontSize: 14, lineHeight: 22, color: COLORS.textPrimary },
  evidenceText: { marginTop: 6, fontSize: 12, fontWeight: '600', color: COLORS.secondary },

  disclaimer: {
    marginTop: 28,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
