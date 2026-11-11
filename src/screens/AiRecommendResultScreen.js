import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { getAiRecommendations } from '../api';

// 서버 오류 code별 안내 문구
const ERROR_MESSAGES = {
  AI_BUSY: '지금 AI 사용량이 많아요. 잠시 후 다시 시도해 주세요.',
  AI_TIMEOUT: 'AI 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.',
  AI_UNAVAILABLE: 'AI 추천을 지금은 쓸 수 없어요. 잠시 후 다시 시도해 주세요.',
  NOT_ENOUGH_CANDIDATES: '추천할 책이 부족해요. 취향을 조금 바꿔서 다시 시도해 보세요.',
  RATE_LIMITED: '너무 자주 요청했어요. 잠시 후 다시 시도해 주세요.',
};
// 목록에 없는 code(BAD_REQUEST, AI_BAD_OUTPUT, INTERNAL_ERROR 등)는 일반 실패 문구로 처리한다
const GENERIC_ERROR ='추천을 불러오지 못했어요. 다시 시도해 주세요.';

// 에러에서 안내 문구를 고른다. axios의 timeout(ECONNABORTED)은 AI_TIMEOUT과 같게 본다.
const getErrorMessage = (error) => {
  const code = error?.response?.data?.code;
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (error?.code === 'ECONNABORTED') return ERROR_MESSAGES.AI_TIMEOUT;
  return GENERIC_ERROR;
};

function PickCard({ pick }) {
  const cover = pick.cover_image ? pick.cover_image.replace('http://', 'https://') : null;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.coverPlaceholderText} numberOfLines={3}>
              {pick.title}
            </Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>{pick.title}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>{pick.author}</Text>
        </View>
      </View>
      <View style={styles.reasonBox}>
        <Text style={styles.reasonLabel}>추천 이유</Text>
        <Text style={styles.reasonText}>{pick.reason}</Text>
      </View>
    </View>
  );
}

export default function AiRecommendResultScreen({ route }) {
  const taste = route.params?.taste;

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [picks, setPicks] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  // 요청 번호: 화면을 떠났거나 새 요청이 시작됐으면 이전 응답은 버린다
  const requestIdRef = useRef(0);

  // refresh: 「다시 추천」을 누를 때만 true. 처음 진입과 「다시 시도」는 false
  const fetchRecommendations = useCallback(async (refresh = false) => {
    const requestId = ++requestIdRef.current;
    setStatus('loading');
    try {
      const result = await getAiRecommendations(taste || {}, { refresh });
      if (requestId !== requestIdRef.current) return;
      const list = Array.isArray(result?.data?.picks) ? result.data.picks.slice(0, 3) : [];
      if (!result?.success || list.length === 0) {
        setErrorMessage(GENERIC_ERROR);
        setStatus('error');
        return;
      }
      setPicks(list);
      setStatus('success');
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setErrorMessage(getErrorMessage(error));
      setStatus('error');
    }
  }, [taste]);

  useEffect(() => {
    fetchRecommendations(false);
    return () => {
      requestIdRef.current += 1; // 화면을 떠나면 진행 중인 요청 결과를 버린다
    };
  }, [fetchRecommendations]);

  const loading = status === 'loading';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>취향에 맞는 책을 고르는 중이에요…</Text>
        </View>
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>추천을 받지 못했어요</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchRecommendations(false)} activeOpacity={0.85}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>이런 책은 어때요?</Text>
          {picks.map((pick, index) => (
            <PickCard key={pick.isbn || index} pick={pick} />
          ))}
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchRecommendations(true)} activeOpacity={0.85}>
            <Text style={styles.retryText}>다시 추천</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loadingText: { marginTop: 16, fontSize: 14, color: COLORS.textSecondary },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
  errorText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  content: { padding: 20, paddingBottom: 32 },
  heading: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 16 },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: { flexDirection: 'row', gap: 14 },
  cover: { width: 80, height: 116, borderRadius: 8 },
  coverPlaceholder: {
    backgroundColor: '#D9D0C1',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  coverPlaceholderText: { fontSize: 11, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center' },
  cardInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  bookTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  bookAuthor: { fontSize: 13, color: COLORS.textSecondary },
  reasonBox: {
    marginTop: 12,
    backgroundColor: '#F4EFE6',
    borderRadius: 10,
    padding: 12,
  },
  reasonLabel: { fontSize: 11, fontWeight: 'bold', color: COLORS.secondary, marginBottom: 4 },
  reasonText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 19 },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
});
