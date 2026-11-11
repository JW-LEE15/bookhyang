import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { deleteUserBookNote, getUserBookNote, saveUserBookNote } from '../api';

const NOTE_MAX_LENGTH = 2000;

// 글자 수 (이모지도 1글자)
const charLength = (str) => [...str].length;

const saveErrorMessage = (error) =>
  error?.response?.status === 400
    ? '메모는 공백을 뺀 1~2000자로 써 주세요.'
    : '저장하지 못했어요. 잠시 후 다시 시도해 주세요.';

// 책 상세의 메모 영역 (서재에 저장된 책일 때만 부모가 그린다). 책 하나에 메모 하나, 항상 비공개.
// userBookId는 user_books.id. 메모 내용은 로그에 남기지 않는다.
export default function BookNoteSection({ userBookId, onFocusInput }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [note, setNote] = useState(null); // { content, ... } | null
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false; // 책이 바뀌거나 화면을 떠난 뒤 늦게 온 응답은 버린다
    setStatus('loading');
    setNote(null);
    setEditing(false);
    getUserBookNote(userBookId)
      .then((res) => {
        if (cancelled) return;
        setNote(res?.data || null);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [userBookId, attempt]);

  const startEdit = () => {
    setDraft(note?.content || '');
    setFormError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    if (saving) return;
    const content = draft.trim();
    if (!content) {
      setFormError('메모를 입력해 주세요.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await saveUserBookNote(userBookId, content);
      if (!mountedRef.current) return;
      setNote(res?.data || { content });
      setEditing(false);
    } catch (e) {
      if (mountedRef.current) setFormError(saveErrorMessage(e));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const doDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteUserBookNote(userBookId);
      if (mountedRef.current) setNote(null);
    } catch (e) {
      if (e?.response?.data?.code === 'NOTE_NOT_FOUND') {
        // 이미 없는 메모면 지운 것과 같다
        if (mountedRef.current) setNote(null);
      } else {
        Alert.alert('오류', '메모를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      if (mountedRef.current) setDeleting(false);
    }
  }, [userBookId]);

  const handleDelete = () => {
    Alert.alert('메모 삭제', '이 메모를 삭제할까요? 삭제한 메모는 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: doDelete },
    ]);
  };

  const count = charLength(draft);

  const renderBody = () => {
    if (status === 'loading') {
      return <ActivityIndicator size="small" color={COLORS.primary} style={styles.loading} />;
    }
    if (status === 'error') {
      return (
        <TouchableOpacity onPress={() => setAttempt((n) => n + 1)} activeOpacity={0.7}>
          <Text style={styles.infoText}>메모를 불러오지 못했어요. 눌러서 다시 시도</Text>
        </TouchableOpacity>
      );
    }
    if (editing) {
      return (
        <View>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={(v) => {
              setDraft(v);
              if (formError) setFormError(null);
            }}
            onFocus={onFocusInput}
            placeholder="이 책에 대한 생각을 남겨보세요. (최대 2000자)"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            maxLength={NOTE_MAX_LENGTH}
            textAlignVertical="top"
            editable={!saving}
          />
          <Text style={styles.counter}>
            {count} / {NOTE_MAX_LENGTH}
          </Text>
          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditing(false)}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, !draft.trim() && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving || !draft.trim()}
              activeOpacity={0.8}
            >
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
    if (!note) {
      return (
        <View>
          <Text style={styles.infoText}>아직 메모가 없어요.</Text>
          <TouchableOpacity style={styles.writeButton} onPress={startEdit} activeOpacity={0.8}>
            <Text style={styles.writeText}>메모 쓰기</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.noteText}>{note.content}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleDelete} disabled={deleting} hitSlop={8} style={styles.linkButton}>
            <Text style={styles.deleteText}>{deleting ? '삭제 중...' : '삭제'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={startEdit} disabled={deleting} hitSlop={8} style={styles.linkButton}>
            <Text style={styles.editText}>수정</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>내 메모</Text>
      <Text style={styles.privacy}>메모는 기본적으로 비공개예요. 나만 볼 수 있어요.</Text>
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#2B2118', marginBottom: 4 },
  privacy: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 12 },
  loading: { marginVertical: 12 },
  infoText: { fontSize: 14, color: COLORS.textSecondary, paddingVertical: 4 },
  noteText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 22 },
  input: {
    minHeight: 120,
    maxHeight: 260,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  counter: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', marginTop: 4 },
  errorText: { fontSize: 12, color: COLORS.accent, marginTop: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 12 },
  linkButton: { paddingHorizontal: 8, paddingVertical: 4 },
  editText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  deleteText: { fontSize: 13, fontWeight: 'bold', color: COLORS.textSecondary },
  writeButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  writeText: { fontSize: 13, fontWeight: 'bold', color: COLORS.background },
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
  saveButtonDisabled: { opacity: 0.4 },
  saveText: { fontSize: 13, fontWeight: 'bold', color: COLORS.background },
});
