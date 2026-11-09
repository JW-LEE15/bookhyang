import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// Android 전용: 키보드가 올라올 때 하단에 줄 여백(padding)을 직접 계산한다.
// KeyboardAvoidingView(behavior 'height')는 edge-to-edge 환경에서 계산이 어긋나서 쓰지 않는다.
//
// 원리: 창이 키보드 때문에 이미 줄었는지 환경마다 다르므로(adjustResize 여부), 컨테이너 높이를 직접 잰다.
//   여백 = max(0, 키보드 높이 - (키보드 없을 때 컨테이너 높이 - 지금 컨테이너 높이))
//   → 컨테이너가 이미 줄었으면 그만큼을 빼고 나머지만 여백으로 준다 (이중 보정 방지).
//   → 키보드가 닫히면 키보드 높이가 0이라 여백도 0으로 돌아온다.
// 키보드 높이는 RN이 주는 값(하단 시스템바를 뺀 높이)을 그대로 쓴다.
//
// iOS에서는 아무것도 하지 않는다 (padding 0). iOS는 호출하는 쪽에서 KeyboardAvoidingView를 쓴다.
//
// 사용: 감쌀 View에 onLayout={onLayout}과 style의 paddingBottom={padding}을 준다.
export default function useKeyboardPadding() {
  const enabled = Platform.OS === 'android';

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0); // 지금 컨테이너 높이
  const [initialHeight, setInitialHeight] = useState(0); // 키보드가 없을 때의 컨테이너 높이
  const keyboardHeightRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;

    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      const { height } = event.endCoordinates;
      keyboardHeightRef.current = height;
      setKeyboardHeight(height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [enabled]);

  const onLayout = useCallback((event) => {
    const { height } = event.nativeEvent.layout;
    setContainerHeight(height);
    // 키보드가 없을 때 잰 높이를 기준값으로 삼는다
    if (keyboardHeightRef.current === 0) setInitialHeight(height);
  }, []);

  const shrink = Math.max(0, initialHeight - containerHeight);
  const padding = enabled ? Math.max(0, keyboardHeight - shrink) : 0;

  return { padding, onLayout };
}
