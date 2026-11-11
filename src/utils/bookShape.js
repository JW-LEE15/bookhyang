// 모음집(books 테이블) 행을 BookDetailScreen이 받는 모양으로 바꾼다.
// 주의: id는 절대 넣지 않는다. BookDetailScreen은 route param의 id를 내 서재(user_books)의 id로 보고
// 삭제/상태 변경에 쓰기 때문에, books 행의 id가 들어가면 엉뚱한 행이 바뀔 수 있다.
// books 행의 id는 catalogId로만 넘긴다.
export function toDetailBook(row) {
  return {
    title: row.title,
    authors: row.author ? [row.author] : [],
    thumbnail: row.cover_image,
    isbn: row.isbn,
    publisher: '민음사',
    category: row.category,
    publishedDate: row.published_date,
    catalogId: row.id,
  };
}

// 최근 본 책 기록(recentBooksStorage의 { isbn, title, author, thumbnail })을 BookDetailScreen이 받는 모양으로 바꾼다.
// 여기에도 id는 넣지 않는다 (기록에는 id가 없고, 있어도 서재 id로 오해되면 안 된다).
// 기록에는 catalogId가 없어서 분야, 출간년도, 관련 책은 나오지 않는다.
export function recentToDetailBook(entry) {
  return {
    title: entry.title,
    authors: entry.author ? [entry.author] : [],
    thumbnail: entry.thumbnail || null,
    isbn: entry.isbn || '',
  };
}
