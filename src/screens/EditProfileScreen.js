import React, { useContext, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { AuthContext } from '../context/AuthContext';
import { updateNickname } from '../api';
import useKeyboardPadding from '../hooks/useKeyboardPadding';

const NICKNAME_MIN = 2;
const NICKNAME_MAX = 20;
// 스택 헤더 기본 높이(iOS). KeyboardAvoidingView가 헤더만큼 아래에 있어서 그만큼 보정한다.
const IOS_HEADER_HEIGHT = 44;
// 제어문자 (서버도 거부한다)
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;

const MSG_INVALID = '2~20자로 입력해 주세요';
const MSG_RATE_LIMIT = '잠시 후 다시 시도해 주세요';
const MSG_FAILED = '닉네임을 변경하지 못했어요. 다시 시도해 주세요';

// 글자 수 (이모지도 1글자)
const charLength = (str) => [...str].length;

// iOS는 KeyboardAvoidingView, Android는 일반 View (Android는 useKeyboardPadding으로 여백을 직접 준다)
const KeyboardWrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;

// 닉네임 변경 화면 (설정 > 계정 > 닉네임)
export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const keyboardPadding = useKeyboardPadding();
  const isIOS = Platform.OS === 'ios';

  const [value, setValue] = useState(user?.nickname || '');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const savingRef = useRef(false); // 저장 버튼을 빠르게 두 번 눌러도 요청이 한 번만 가게

  const trimmed = value.trim();
  const length = charLength(trimmed);
  const lengthValid = length >= NICKNAME_MIN && length <= NICKNAME_MAX && !CONTROL_CHARS.test(trimmed);
  const unchanged = trimmed === (user?.nickname || '');
  const canSave = lengthValid && !unchanged && !saving;

  const handleChange = (text) => {
    setValue(text);
    if (errorMessage) setErrorMessage('');
  };

  const handleSave = async () => {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setErrorMessage('');
    try {
      const res = await updateNickname(trimmed);
      const newNickname = res?.user?.nickname;
      if (res?.success && typeof newNickname === 'string') {
        await updateUser({ nickname: newNickname });
        navigation.goBack();
        return;
      }
      setErrorMessage(MSG_FAILED);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 400) setErrorMessage(MSG_INVALID);
      else if (status === 429) setErrorMessage(MSG_RATE_LIMIT);
      else setErrorMessage(MSG_FAILED);
      console.error('닉네임 변경 실패:', status || e?.message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const showLengthWarning = trimmed.length > 0 && !lengthValid;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardWrapper
        style={[styles.flex, !isIOS && { paddingBottom: keyboardPadding.padding }]}
        {...(isIOS
          ? { behavior: 'padding', keyboardVerticalOffset: insets.top + IOS_HEADER_HEIGHT }
          : { onLayout: keyboardPadding.onLayout })}
      >
        <View style={styles.content}>
          <Text style={styles.label}>닉네임</Text>
          <TextInput
            style={[styles.input, (showLengthWarning || errorMessage) && styles.inputError]}
            value={value}
            onChangeText={handleChange}
            placeholder="닉네임을 입력해 주세요"
            placeholderTextColor="#B3ADA3"
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="done"
            editable={!saving}
            onSubmitEditing={handleSave}
          />
          <View style={styles.infoRow}>
            <Text style={[styles.helper, (showLengthWarning || errorMessage) && styles.helperError]}>
              {errorMessage || (showLengthWarning ? MSG_INVALID : `${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요`)}
            </Text>
            <Text style={[styles.counter, showLengthWarning && styles.helperError]}>
              {length}/{NICKNAME_MAX}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveText}>저장</Text>
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
  content: { padding: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: COLORS.secondary, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputError: { borderColor: '#FF3B30' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
  },
  helper: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  helperError: { color: '#FF3B30' },
  counter: { fontSize: 12, color: COLORS.textSecondary },
  saveButton: {
    marginTop: 24,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
