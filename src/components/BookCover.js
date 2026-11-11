import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';

// 표지 주소가 http면 https로 바꾼다.
export const toHttps = (url) => (typeof url === 'string' ? url.replace(/^http:\/\//i, 'https://') : '');

// 표지가 없거나 불러오기에 실패하면 제목이 들어간 자리표시를 보여준다.
export default function BookCover({ uri, title, width, height }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (!uri || failed) {
    return (
      <View style={[styles.cover, styles.coverPlaceholder, { width, height }]}>
        <Text style={styles.placeholderText} numberOfLines={4}>
          {title}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={[styles.cover, { width, height }]}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  cover: { borderRadius: 4, backgroundColor: COLORS.border },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center', padding: 8 },
  placeholderText: { fontSize: 12, color: COLORS.secondary, textAlign: 'center' },
});
