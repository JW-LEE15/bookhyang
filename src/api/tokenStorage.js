import * as SecureStore from 'expo-secure-store';

// 로그인 토큰은 SecureStore(기기 암호화 저장소)에만 저장한다. 토큰 값은 로그에 남기지 않는다.
const TOKEN_KEY = 'auth_token';

export const getStoredToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export const saveStoredToken = (token) => SecureStore.setItemAsync(TOKEN_KEY, token);

export const deleteStoredToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);
