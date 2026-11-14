import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { COLORS } from '../constants/theme';
import useKeyboardPadding from '../hooks/useKeyboardPadding';

export const REPORT_REASONS = [
  { value: 'spam', label: '스팸' },
  { value: 'abuse', label: '욕설' },
  { value: 'spoiler', label: '스포일러' },
  { value: 'other', label: '기타' },
];
export const REPORT_DETAIL_MAX_LENGTH = 200;

// 글자 수 (이모지도 1글자. 서버와 같은 기준)
const charLength = (str) => [...str].length;

const KeyboardWrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;

// 댓글 신고 모달. 사유 1개 선택(필수) + 설명(선택, 200자).
// onSubmit(reason, detail)은 Promise를 돌려준다. 성공하면 true, 실패하면 화면에 보여줄 고정 안내문(문자열)을 돌려준다.
// 성공이나 이미 신고한 경우의 안내와 닫기는 호출하는 쪽이 한다.
export default function ReportCommentModal({ visible, onClose, onSubmit }) {
  const keyboardPadding = useKeyboardPadding();
  const isIOS = Platform.OS === 'ios';
  const [reason, setReason] = useState(null);
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState(null);
  const submittingRef = useRef(false);

  // 열 때마다 처음 상태로
  useEffect(() => {
    if (visible) {
      setReason(null);
      setDetail('');
      setSubmitting(false);
      setErrorText(null);
      submittingRef.current = false;
    }
  }, [visible]);

  const length = charLength(detail);
  const tooLong = length > REPORT_DETAIL_MAX_LENGTH;
  const canSubmit = Boolean(reason) && !tooLong && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setErrorText(null);
    try {
      const result = await onSubmit(reason, detail.trim());
      if (typeof result === 'string') setErrorText(result);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submittingRef.current) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardWrapper
        style={[styles.overlay, !isIOS && { paddingBottom: keyboardPadding.padding }]}
        {...(isIOS ? { behavior: 'padding' } : { onLayout: keyboardPadding.onLayout })}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={styles.title}>댓글 신고</Text>
            <Text style={styles.sub}>신고 사유를 선택해 주세요</Text>

            <View style={styles.reasonList}>
              {REPORT_REASONS.map((item) => {
                const selected = reason === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={styles.reasonRow}
                    onPress={() => setReason(item.value)}
                    disabled={submitting}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                  >
                    <View style={[styles.radio, selected && styles.radioOn]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <Text style={styles.reasonText}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.input}
              value={detail}
              onChangeText={setDetail}
              placeholder="설명을 입력해 주세요 (선택)"
              placeholderTextColor="#9A9187"
              multiline
              editable={!submitting}
              textAlignVertical="top"
            />
            <Text style={[styles.counter, tooLong && styles.counterOver]}>
              {length}/{REPORT_DETAIL_MAX_LENGTH}
            </Text>

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, !canSubmit && styles.submitDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>신고하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardWrapper>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  backdrop: { flex: 1 },
  sheet: {
    maxHeight: '85%',
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: { fontSize: 17, fontWeight: 'bold', color: COLORS.textPrimary },
  sub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, marginBottom: 8 },
  reasonList: { marginBottom: 12 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  reasonText: { fontSize: 14, color: COLORS.textPrimary },
  input: {
    minHeight: 80,
    maxHeight: 140,
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
  counter: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', marginTop: 4 },
  counterOver: { color: '#FF3B30', fontWeight: 'bold' },
  errorText: { fontSize: 13, color: '#FF3B30', marginTop: 8 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  button: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  cancelText: { fontSize: 14, fontWeight: 'bold', color: COLORS.textSecondary },
  submitButton: { backgroundColor: COLORS.primary },
  submitDisabled: { backgroundColor: '#C9BFB3' },
  submitText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
});
