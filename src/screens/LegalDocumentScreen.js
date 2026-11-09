import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { DRAFT_NOTICE, LEGAL_DOCUMENTS } from '../constants/legalText';

// 이용약관, 개인정보 처리방침 공용 정적 화면. route.params.type: 'terms' | 'privacy'
export default function LegalDocumentScreen({ route }) {
  const doc = LEGAL_DOCUMENTS[route.params?.type];

  if (!doc) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>문서를 불러올 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.draftBox}>
          <Text style={styles.draftBadge}>초안</Text>
          <Text style={styles.draftText}>{DRAFT_NOTICE}</Text>
        </View>

        <Text style={styles.docTitle}>{doc.title}</Text>

        {doc.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, color: COLORS.textSecondary },
  draftBox: {
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0D9B5',
  },
  draftBadge: { fontSize: 12, fontWeight: 'bold', color: COLORS.accent, marginBottom: 4 },
  draftText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 19 },
  docTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 16 },
  section: { marginBottom: 18 },
  heading: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary, marginBottom: 6 },
  body: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 22 },
});
