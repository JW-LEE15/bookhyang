import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { resolveProfileImageUrl } from '../utils/profileImage';

// 원형 프로필 사진. 사진이 없거나 불러오지 못하면 children(기존 모양)을 대신 보여준다.
// - uri: 서버가 준 profile_image_url (상대 경로)
// - children: 사진이 없을 때 보일 내용. 없으면 아무것도 그리지 않는다.
// - fallbackStyle: children을 감싸는 원에 줄 스타일 (예: 배경색, 가운데 정렬)
export default function UserAvatar({ uri, size, style, fallbackStyle, children }) {
  const url = resolveProfileImageUrl(uri);
  const [failed, setFailed] = useState(false);

  // 주소(?v=)가 바뀌면 다시 시도한다
  useEffect(() => {
    setFailed(false);
  }, [url]);

  const circle = { width: size, height: size, borderRadius: size / 2 };

  if (url && !failed) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.image, circle, style]}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  if (children == null) return null;
  return <View style={[circle, styles.fallback, fallbackStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  image: { backgroundColor: COLORS.border },
  fallback: { justifyContent: 'center', alignItems: 'center' },
});
