import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { getBookDescription } from '../api';

const COLLAPSED_LINES = 5;
export const NO_DESCRIPTION_MESSAGE = '소개글이 제공되지 않는 도서입니다.';

// 책 상세의 도서 소개 섹션.
// - ownDescription이 있으면(검색, 내 서재 등) 그대로 보여준다. 서버를 부르지 않는다.
// - 없고 catalogId가 있으면(모음집) GET /books/:id/description으로 가져온다.
//   서버가 카카오에서 약 250자만 주므로 받은 그대로 보여주고 출처 안내를 붙인다.
// - 그 외에는 fallbackText(기존 안내 문구)를 보여준다.
export default function BookDescriptionSection({ ownDescription, catalogId, fallbackText }) {
  const needsFetch = !ownDescription && catalogId != null;
  const [status, setStatus] = useState(needsFetch ? 'loading' : 'ready'); // 'loading' | 'ready' | 'error' | 'limited'
  const [fetched, setFetched] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    if (!needsFetch) return undefined;
    let cancelled = false; // 책이 바뀌거나 화면을 떠난 뒤 늦게 온 응답은 버린다
    setStatus('loading');
    getBookDescription(catalogId)
      .then((res) => {
        if (cancelled) return;
        const text = res?.data?.description;
        setFetched(typeof text === 'string' && text.trim() ? text : null);
        setStatus('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        if (e?.response?.status === 404) {
          setFetched(null);
          setStatus('ready');
        } else {
          setStatus(e?.response?.status === 429 ? 'limited' : 'error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [needsFetch, catalogId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const fromServer = needsFetch && status === 'ready' && fetched;
  const bodyText = ownDescription || (needsFetch ? fetched : null) || (needsFetch ? null : fallbackText);

  const renderBody = () => {
    if (needsFetch && status === 'loading') {
      return (
        <View>
          <View style={[styles.skeleton, { width: '100%' }]} />
          <View style={[styles.skeleton, { width: '92%' }]} />
          <View style={[styles.skeleton, { width: '60%' }]} />
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
        </View>
      );
    }
    if (needsFetch && (status === 'error' || status === 'limited')) {
      return (
        <TouchableOpacity onPress={retry} activeOpacity={0.7}>
          <Text style={styles.infoText}>
            {status === 'limited'
              ? '요청이 많아 소개글을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
              : '소개글을 불러오지 못했어요.'}
          </Text>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      );
    }
    if (!bodyText) {
      return <Text style={styles.infoText}>{NO_DESCRIPTION_MESSAGE}</Text>;
    }
    return (
      <View>
        {/* 접힌 상태에서 줄 수를 재기 위해 전체 글을 보이지 않게 한 번 더 그린다 */}
        <Text
          style={[styles.descriptionText, styles.measure]}
          onTextLayout={(e) => setOverflow(e.nativeEvent.lines.length > COLLAPSED_LINES)}
        >
          {bodyText}
        </Text>
        <Text style={styles.descriptionText} numberOfLines={expanded ? undefined : COLLAPSED_LINES}>
          {bodyText}
        </Text>
        {overflow ? (
          <TouchableOpacity onPress={() => setExpanded((v) => !v)} hitSlop={8} style={styles.toggle}>
            <Text style={styles.toggleText}>{expanded ? '접기' : '더보기'}</Text>
          </TouchableOpacity>
        ) : null}
        {fromServer ? <Text style={styles.notice}>민음사 도서 소개 일부</Text> : null}
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>도서 소개</Text>
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: COLORS.cardBackground, padding: 16, borderRadius: 16, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#2B2118', marginBottom: 12 },
  descriptionText: { fontSize: 14, color: '#4A4A4A', lineHeight: 22 },
  measure: { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 },
  toggle: { alignSelf: 'flex-start', marginTop: 8 },
  toggleText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  notice: { fontSize: 11, color: COLORS.textSecondary, marginTop: 10 },
  infoText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  retryText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary, marginTop: 8 },
  skeleton: { height: 14, borderRadius: 4, backgroundColor: COLORS.border, marginBottom: 10 },
  loader: { marginTop: 4 },
});
