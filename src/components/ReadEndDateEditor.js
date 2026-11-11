import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import {
  readEndDateErrorMessage,
  todayKst,
  validateReadEndDateInput,
} from '../utils/readEndDate';

// 완독일 입력 폼: 'YYYY-MM-DD' 텍스트 입력 + 「오늘로 설정」 (날짜 선택기 라이브러리는 쓰지 않는다).
// onSave(date)는 비동기로 저장하고 실패하면 예외를 던진다. 성공하면 부모가 이 폼을 닫는다.
// 오류는 서버 message 대신 고정 안내문으로 보여준다.
export default function ReadEndDateEditor({ initialValue, onSave, onCancel, onFocusInput }) {
  const [text, setText] = useState(initialValue || '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleSave = async () => {
    if (saving) return;
    const value = text.trim();
    const invalid = validateReadEndDateInput(value);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(value);
    } catch (e) {
      if (mountedRef.current) setError(readEndDateErrorMessage(e));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(v) => {
            setText(v);
            if (error) setError(null);
          }}
          onFocus={onFocusInput}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          autoCorrect={false}
          editable={!saving}
        />
        <TouchableOpacity
          style={styles.todayButton}
          onPress={() => {
            setText(todayKst());
            setError(null);
          }}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.todayText}>오늘로 설정</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={saving} activeOpacity={0.8}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <Text style={styles.saveText}>저장</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  todayText: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
  errorText: { fontSize: 12, color: COLORS.accent, marginTop: 8, lineHeight: 18 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.border },
  cancelText: { fontSize: 13, fontWeight: 'bold', color: COLORS.textPrimary },
  saveButton: {
    minWidth: 64,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  saveText: { fontSize: 13, fontWeight: 'bold', color: COLORS.background },
});
