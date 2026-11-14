// 프로필 사진 주소 만들기.
// 서버는 profile_image_url을 "/api/users/<id>/profile-image?v=<ms>" 같은 상대 경로로 준다.
// EXPO_PUBLIC_API_URL은 끝에 /api가 붙어 있어서 그대로 이어붙이면 /api/api가 되므로,
// 끝의 /api를 뺀 호스트에 붙인다. GET은 공개라 헤더 없이 가져온다.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';
const HOST = BASE_URL.replace(/\/+$/, '').replace(/\/api$/, '');

export const resolveProfileImageUrl = (path) => {
  if (typeof path !== 'string' || !path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!HOST) return null;
  return `${HOST}${path.startsWith('/') ? '' : '/'}${path}`;
};
