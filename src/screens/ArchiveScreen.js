import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

// 모음집 탭: 전체 도서 모음집 API가 준비되기 전까지 안내 화면만 보여준다.
export default function ArchiveScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>모음집 준비 중</Text>
        <Text style={styles.desc}>
          전체 도서 모음집을 준비 중입니다. 내 서재는 MY에서 볼 수 있어요.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background || '#F7F4EB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2B2118', marginBottom: 8 },
  desc: { fontSize: 14, color: '#8C827A', textAlign: 'center', lineHeight: 20 },
});
