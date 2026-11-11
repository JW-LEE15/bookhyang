import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { updateReadEndDate } from '../api';
import { normalizeReadEndDate } from '../utils/readEndDate';
import ReadEndDateEditor from './ReadEndDateEditor';

// 책 상세의 독서 기록 영역 (서재에 저장된 책일 때만 부모가 그린다).
// 완독 상태일 때만 완독일을 보여주고 입력/수정할 수 있다. 완독일이 없으면 「완독일 미입력」.
// 완독일이 바뀌면 onReadEndDateChange(새 날짜)로 부모에게 알린다.
export default function ReadingRecordSection({
  userBookId,
  status,
  readEndDate,
  onReadEndDateChange,
  onFocusInput,
}) {
  const [editing, setEditing] = useState(false);
  const isCompleted = status === 'COMPLETED';

  // 완독이 아니게 되면 열려 있던 입력 폼을 닫는다
  useEffect(() => {
    if (!isCompleted) setEditing(false);
  }, [isCompleted]);

  const handleSave = async (date) => {
    const res = await updateReadEndDate(userBookId, date);
    onReadEndDateChange(normalizeReadEndDate(res?.data?.read_end_date) || date);
    setEditing(false);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>독서 기록</Text>

      {!isCompleted ? (
        <Text style={styles.infoText}>완독으로 바꾸면 완독일이 기록돼요.</Text>
      ) : editing ? (
        <ReadEndDateEditor
          initialValue={readEndDate}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
          onFocusInput={onFocusInput}
        />
      ) : (
        <View style={styles.row}>
          <Text style={readEndDate ? styles.dateText : styles.emptyDateText}>
            {readEndDate ? `완독일 ${readEndDate}` : '완독일 미입력'}
          </Text>
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)} activeOpacity={0.8}>
            <Text style={styles.editText}>{readEndDate ? '수정' : '완독일 입력'}</Text>
          </TouchableOpacity>
        </View>
      )}
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
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#2B2118', marginBottom: 12 },
  infoText: { fontSize: 13, color: COLORS.textSecondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  emptyDateText: { fontSize: 14, color: COLORS.textSecondary },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editText: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
});
