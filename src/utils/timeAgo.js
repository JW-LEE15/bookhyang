// 작성 시간 표시: "방금 전", "n분 전", "n시간 전", "n일 전", 7일 이후는 날짜(YYYY.MM.DD)
export const formatTimeAgo = (isoString) => {
  const time = new Date(isoString).getTime();
  if (Number.isNaN(time)) return '';

  const diffSeconds = Math.floor((Date.now() - time) / 1000);
  if (diffSeconds < 60) return '방금 전';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}분 전`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}시간 전`;
  if (diffSeconds < 7 * 86400) return `${Math.floor(diffSeconds / 86400)}일 전`;

  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}.${month}.${day}`;
};
