import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import {
  GENRES,
  TOPICS,
  MOODS,
  MAX_TOPICS,
  MAX_MOODS,
  EMPTY_TASTE,
} from '../constants/aiTaste';
import { AuthContext } from '../context/AuthContext';
import { getBooleanSetting, SETTING_KEYS } from '../storage/settingsStorage';
import { loadAiTaste, saveAiTaste } from '../storage/aiTasteStorage';

// 칩 한 묶음 (제목 + 칩들)
function ChipGroup({ title, hint, options, selected, onToggle }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{title}</Text>
        {hint ? <Text style={styles.groupHint}>{hint}</Text> : null}
      </View>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onToggle(option)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function AiTasteScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const userId = user?.id;

  const [taste, setTaste] = useState(EMPTY_TASTE);
  const [aiConsent, setAiConsent] = useState(false);
  const [limitNotice, setLimitNotice] = useState('');

  // 저장된 취향과 AI 동의 상태를 불러온다
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadAiTaste(userId),
      getBooleanSetting(userId, SETTING_KEYS.AI_CONSENT),
    ]).then(([savedTaste, consent]) => {
      if (cancelled) return;
      setTaste(savedTaste);
      setAiConsent(consent);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 칩 선택/해제. max가 있으면 제한을 넘는 선택은 막고 안내만 보여준다
  const toggle = (key, option, max, label) => {
    const current = taste[key];
    if (current.includes(option)) {
      setLimitNotice('');
      setTaste({ ...taste, [key]: current.filter((item) => item !== option) });
    } else if (max && current.length >= max) {
      setLimitNotice(`${label}은(는) 최대 ${max}개까지 고를 수 있어요.`);
    } else {
      setLimitNotice('');
      setTaste({ ...taste, [key]: [...current, option] });
    }
  };

  const handleRecommend = async () => {
    try {
      await saveAiTaste(userId, taste);
    } catch (e) {
      // 저장에 실패해도 추천은 받을 수 있게 한다
      Alert.alert('알림', '취향을 저장하지 못했어요. 이번 추천에는 선택한 값이 사용됩니다.');
    }
    // 동의가 켜져 있을 때만 읽은 책 정보를 반영한다 (요청 직전에 다시 읽는다)
    const consent = await getBooleanSetting(userId, SETTING_KEYS.AI_CONSENT);
    navigation.navigate('AiRecommendResult', {
      taste: { ...taste, useHistory: consent === true },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          좋아하는 취향을 골라 주세요. 아무것도 고르지 않아도 추천받을 수 있어요.
        </Text>

        <ChipGroup
          title="분야"
          hint="여러 개 선택"
          options={GENRES}
          selected={taste.genres}
          onToggle={(option) => toggle('genres', option, null, '분야')}
        />
        <ChipGroup
          title="관심 주제"
          hint={`최대 ${MAX_TOPICS}개`}
          options={TOPICS}
          selected={taste.topics}
          onToggle={(option) => toggle('topics', option, MAX_TOPICS, '관심 주제')}
        />
        <ChipGroup
          title="분위기"
          hint={`최대 ${MAX_MOODS}개`}
          options={MOODS}
          selected={taste.moods}
          onToggle={(option) => toggle('moods', option, MAX_MOODS, '분위기')}
        />

        {limitNotice ? <Text style={styles.limitNotice}>{limitNotice}</Text> : null}

        <TouchableOpacity style={styles.submitButton} onPress={handleRecommend} activeOpacity={0.85}>
          <Text style={styles.submitText}>추천받기</Text>
        </TouchableOpacity>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>선택한 취향과 공개 도서 정보가 Google AI로 전송됩니다</Text>
          <Text style={styles.noticeSubText}>
            {aiConsent
              ? '읽은 책 정보도 추천에 반영됩니다'
              : '설정에서 AI 데이터 사용에 동의하면 읽은 책을 반영해 더 잘 추천해요'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 32 },
  intro: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 20 },
  group: { marginBottom: 24 },
  groupHeader: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10, gap: 8 },
  groupTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary },
  groupHint: { fontSize: 12, color: COLORS.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14, color: COLORS.textPrimary },
  chipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  limitNotice: { fontSize: 12, color: COLORS.accent, marginBottom: 12 },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  noticeBox: { marginTop: 20, gap: 4 },
  noticeText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  noticeSubText: { fontSize: 12, color: COLORS.secondary, textAlign: 'center' },
});
