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
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { AuthContext } from '../context/AuthContext';
import { updateNickname, updateProfileImage, deleteProfileImage } from '../api';
import UserAvatar from '../components/UserAvatar';
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

// 프로필 사진: 256px JPEG, 서버 제한은 100KB
const PHOTO_SIZE = 256;
const PHOTO_MAX_BYTES = 100 * 1024;
const PHOTO_QUALITIES = [0.7, 0.4]; // 100KB를 넘으면 한 번 더 낮춰서 시도
const MSG_PHOTO_TOO_LARGE = '사진 용량이 너무 커요';
const MSG_PHOTO_FAILED = '사진을 변경하지 못했어요. 다시 시도해 주세요';
const MSG_PHOTO_DELETE_FAILED = '사진을 삭제하지 못했어요. 다시 시도해 주세요';

// base64 문자열이 나타내는 바이트 수
const base64Bytes = (b64) => {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
};

class PhotoTooLargeError extends Error {}

// 고른 사진을 256px JPEG로 줄여 base64로 돌려준다. 100KB를 넘으면 품질을 낮춰 한 번 더 시도한다.
const makeProfileBase64 = async (uri) => {
  const context = ImageManipulator.manipulate(uri);
  let image = null;
  try {
    image = await context.resize({ width: PHOTO_SIZE }).renderAsync();
    for (const compress of PHOTO_QUALITIES) {
      const result = await image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
      if (result?.base64 && base64Bytes(result.base64) <= PHOTO_MAX_BYTES) return result.base64;
    }
    throw new PhotoTooLargeError();
  } finally {
    context.release();
    if (image) image.release();
  }
};

// 글자 수 (이모지도 1글자)
const charLength = (str) => [...str].length;

// iOS는 KeyboardAvoidingView, Android는 일반 View (Android는 useKeyboardPadding으로 여백을 직접 준다)
const KeyboardWrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;

// 프로필 편집 화면 (설정 > 계정 > 닉네임, MY 아바타): 프로필 사진 + 닉네임
export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const keyboardPadding = useKeyboardPadding();
  const isIOS = Platform.OS === 'ios';

  const [value, setValue] = useState(user?.nickname || '');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const savingRef = useRef(false); // 저장 버튼을 빠르게 두 번 눌러도 요청이 한 번만 가게
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoBusyRef = useRef(false);
  // 이 화면에서 사진 변경/삭제에 성공했는지 (사진은 즉시 저장되므로, 닉네임이 그대로여도 저장 버튼으로 닫을 수 있게)
  const [photoChanged, setPhotoChanged] = useState(false);

  const hasPhoto = Boolean(user?.profile_image_url);

  const handleChangePhoto = async () => {
    if (photoBusyRef.current) return;
    photoBusyRef.current = true;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (picked.canceled || !picked.assets?.[0]?.uri) return;

      const base64 = await makeProfileBase64(picked.assets[0].uri);
      const res = await updateProfileImage(base64);
      if (res?.success && res.user) {
        await updateUser(res.user);
        setPhotoChanged(true);
      } else {
        setPhotoError(MSG_PHOTO_FAILED);
      }
    } catch (e) {
      const status = e?.response?.status;
      if (e instanceof PhotoTooLargeError || status === 413) setPhotoError(MSG_PHOTO_TOO_LARGE);
      else setPhotoError(MSG_PHOTO_FAILED);
      console.error('프로필 사진 변경 실패:', status || e?.message);
    } finally {
      photoBusyRef.current = false;
      setPhotoBusy(false);
    }
  };

  const deletePhoto = async () => {
    if (photoBusyRef.current) return;
    photoBusyRef.current = true;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const res = await deleteProfileImage();
      if (res?.success && res.user) {
        await updateUser(res.user);
        setPhotoChanged(true);
      } else {
        setPhotoError(MSG_PHOTO_DELETE_FAILED);
      }
    } catch (e) {
      setPhotoError(MSG_PHOTO_DELETE_FAILED);
      console.error('프로필 사진 삭제 실패:', e?.response?.status || e?.message);
    } finally {
      photoBusyRef.current = false;
      setPhotoBusy(false);
    }
  };

  const handleDeletePhoto = () => {
    Alert.alert('사진 삭제', '프로필 사진을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: deletePhoto },
    ]);
  };

  const trimmed = value.trim();
  const length = charLength(trimmed);
  const lengthValid = length >= NICKNAME_MIN && length <= NICKNAME_MAX && !CONTROL_CHARS.test(trimmed);
  const unchanged = trimmed === (user?.nickname || '');
  const canSave = lengthValid && (!unchanged || photoChanged) && !saving;

  const handleChange = (text) => {
    setValue(text);
    if (errorMessage) setErrorMessage('');
  };

  const handleSave = async () => {
    if (!canSave || savingRef.current) return;
    // 닉네임은 그대로이고 사진만 바꾼 경우: 사진은 이미 저장돼 있으니 닉네임 API 없이 닫는다
    if (unchanged) {
      navigation.goBack();
      return;
    }
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.photoSection}>
            <View style={styles.avatarWrap}>
              <UserAvatar uri={user?.profile_image_url} size={AVATAR_SIZE}>
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>
                    {user?.nickname ? [...user.nickname][0] : '책'}
                  </Text>
                </View>
              </UserAvatar>
              {photoBusy ? (
                <View style={styles.avatarBusy}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : null}
            </View>
            <View style={styles.photoButtons}>
              <TouchableOpacity
                style={[styles.photoButton, photoBusy && styles.photoButtonDisabled]}
                onPress={handleChangePhoto}
                disabled={photoBusy}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.photoButtonText}>사진 변경</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoButton, (photoBusy || !hasPhoto) && styles.photoButtonDisabled]}
                onPress={handleDeletePhoto}
                disabled={photoBusy || !hasPhoto}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={[styles.photoButtonText, styles.photoDeleteText]}>사진 삭제</Text>
              </TouchableOpacity>
            </View>
            {photoError ? <Text style={styles.photoError}>{photoError}</Text> : null}
          </View>

          <Text style={styles.label}>닉네임</Text>
          <TextInput
            style={[styles.input, (showLengthWarning || errorMessage) && styles.inputError]}
            value={value}
            onChangeText={handleChange}
            placeholder="닉네임을 입력해 주세요"
            placeholderTextColor="#B3ADA3"
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
        </ScrollView>
      </KeyboardWrapper>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 96;

const styles = StyleSheet.create({
  photoSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrap: { width: AVATAR_SIZE, height: AVATAR_SIZE },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 34, fontWeight: 'bold' },
  avatarBusy: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButtons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  photoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  photoButtonDisabled: { opacity: 0.4 },
  photoButtonText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  photoDeleteText: { color: '#FF3B30' },
  photoError: { marginTop: 10, fontSize: 12, color: '#FF3B30', textAlign: 'center' },
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
