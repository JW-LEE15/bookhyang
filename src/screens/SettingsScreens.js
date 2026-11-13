import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { COLORS } from '../constants/theme';
import { AuthContext } from '../context/AuthContext';
import {
  SETTING_KEYS,
  loadBooleanSettings,
  setBooleanSetting,
} from '../storage/settingsStorage';

const SETTING_NAMES = Object.values(SETTING_KEYS);
const DEFAULT_SETTINGS = {
  [SETTING_KEYS.AI_CONSENT]: false,
  [SETTING_KEYS.COMMENT_NOTIFICATION]: false,
  [SETTING_KEYS.SERVICE_NOTIFICATION]: false,
};

const SWITCH_TRACK_COLORS = { false: '#D6CFC2', true: COLORS.secondary };

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const userId = user?.id;

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  // 저장된 값을 읽기 전에는 토글을 막아서, 기본값(꺼짐)이 저장된 값을 덮어쓰지 않게 한다
  const [settingsReady, setSettingsReady] = useState(false);

  // 계정이 바뀌면 그 계정의 설정을 다시 읽는다
  useEffect(() => {
    let cancelled = false;
    setSettingsReady(false);
    setSettings(DEFAULT_SETTINGS);

    loadBooleanSettings(userId, SETTING_NAMES).then((loaded) => {
      if (cancelled) return;
      setSettings({ ...DEFAULT_SETTINGS, ...loaded });
      setSettingsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 토글 즉시 적용: 화면 값을 먼저 바꾸고 저장한다. 저장에 실패하면 되돌리고 알린다.
  const handleToggle = async (name, nextValue) => {
    setSettings((prev) => ({ ...prev, [name]: nextValue }));
    try {
      await setBooleanSetting(userId, name, nextValue);
    } catch (e) {
      console.error('설정 저장 실패:', name, e?.message);
      setSettings((prev) => ({ ...prev, [name]: !nextValue }));
      Alert.alert('오류', '설정을 저장하지 못했습니다. 다시 시도해 주세요.');
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const appVersion = Constants.expoConfig?.version ?? '-';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>설정</Text>

        {/* 계정 */}
        <Text style={styles.sectionLabel}>계정</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>닉네임</Text>
            <Text style={styles.rowValue} numberOfLines={1}>{user?.nickname || '-'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>이메일</Text>
            <Text style={styles.rowValue} numberOfLines={1}>{user?.email || '-'}</Text>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={handleLogout} activeOpacity={0.7}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        {/* AI */}
        <Text style={styles.sectionLabel}>AI</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>AI 데이터 사용 동의</Text>
            <Switch
              value={settings[SETTING_KEYS.AI_CONSENT]}
              onValueChange={(value) => handleToggle(SETTING_KEYS.AI_CONSENT, value)}
              disabled={!settingsReady}
              trackColor={SWITCH_TRACK_COLORS}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={styles.helperText}>
            메모 내용이 AI 서비스로 전송됩니다. 동의하지 않으면 AI 기능에 메모가 사용되지 않습니다.
          </Text>
        </View>

        {/* 알림 */}
        <Text style={styles.sectionLabel}>알림</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>댓글 알림</Text>
            <Switch
              value={settings[SETTING_KEYS.COMMENT_NOTIFICATION]}
              onValueChange={(value) => handleToggle(SETTING_KEYS.COMMENT_NOTIFICATION, value)}
              disabled={!settingsReady}
              trackColor={SWITCH_TRACK_COLORS}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>서비스 알림</Text>
            <Switch
              value={settings[SETTING_KEYS.SERVICE_NOTIFICATION]}
              onValueChange={(value) => handleToggle(SETTING_KEYS.SERVICE_NOTIFICATION, value)}
              disabled={!settingsReady}
              trackColor={SWITCH_TRACK_COLORS}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={styles.helperText}>알림 기능은 준비 중입니다. 선택한 값만 저장됩니다.</Text>
        </View>

        {/* 정보 */}
        <Text style={styles.sectionLabel}>정보</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Terms')}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>이용약관</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Privacy')}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>개인정보 처리방침</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>앱 버전</Text>
            <Text style={styles.rowValue}>{appVersion}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  screenTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    gap: 12,
  },
  divider: { height: 1, backgroundColor: COLORS.border },
  rowLabel: { fontSize: 15, color: COLORS.textPrimary },
  rowValue: { fontSize: 14, color: COLORS.textSecondary, flexShrink: 1, textAlign: 'right' },
  chevron: { fontSize: 22, color: '#B3ADA3' },
  logoutText: { fontSize: 15, color: '#FF3B30', fontWeight: '600' },
  helperText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, paddingBottom: 12 },
});
