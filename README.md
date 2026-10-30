# 📚 북향 (bookhyang) - Personal Book Archiving App

> **민음사 감성의 개인 독서 아카이빙 & 수집 모바일 애플리케이션**  
> React Native (Expo) 기반의 프론트엔드와 Node.js 백엔드, Supabase DB를 연동하여 개인의 독서 기록을 체계적으로 아카이빙하고 통계를 제공합니다.

---

## 🛠️ Tech Stack

- **Frontend**: React Native, Expo, React Navigation (Stack & Bottom Tabs), React Native Safe Area Context
- **Backend / Database**: Node.js, Supabase (PostgreSQL), Kakao Book Search API
- **State & Storage**: AsyncStorage, React Hooks (`useFocusEffect` 등)

---

## 📅 프로젝트 진행 현황 (Progress Status)

### 🚀 [완료] 10~11주차: 코어 루프 (Core Loop) & 도서 상세 화면 구축

- [x] **도서 검색 (`SearchScreen`)**
  - 카카오 도서 검색 API 연동 및 결과 리스트 표출
  - 검색 결과 항목별 `+ 담기` 바텀시트 동작 (독서 상태 지정)
  - 내 서재 중복 도서 추가 시 기존 DB ID 추적을 통한 자동 독서 상태 수정 예외 처리
- [x] **모음집 / 서재 (`ArchiveScreen`)**
  - 내 서재 전체/상태별(`ALL`, `READING`, `COMPLETED`, `WISH`) 필터링
  - 서재 내 도서 카드 클릭 시 도서 상세 화면 전환
- [x] **마이페이지 (`MyScreen`)**
  - 내 서재 전체 수집량 및 독서 상태별 실시간 통계 카운팅
  - 최근 수집한 도서 수평 카루셀 및 상세 화면 터치 연동
- [x] **도서 상세 화면 (`BookDetailScreen`)**
  - 고화질 표지, 도서 기본 정보, 줄거리 및 출판 정보 레이아웃
  - 내 서재 독서 상태(`📖 읽고 싶은`, `📚 읽는 중`, `✅ 완독`) 실시간 변경 API 연동
  - 서재 내 도서 삭제 처리 및 뒤로가기 시 전역 통계/목록 자동 갱신
- [x] **내비게이션 구조 최적화 (`MainStackNavigator` & `BottomTabNavigator`)**
  - 하단 탭 내비게이션과 스택 내비게이션 간 부드러운 화면 전환 구조 확립

---

## 🔮 향후 개발 계획 (Upcoming Sprints)

### 🔹 12주차: 사용자 인증 (Auth) & 데이터 정밀화
- Supabase Auth 연동 (이메일/비밀번호 로그인 & 회원가입 UI 및 세션 처리)
- 동적 `user.id` 매핑 기반 사용자별 서재 isolation
- 국립중앙도서관 / 네이버 API 연동을 통한 도서 상세 줄거리 파이프라인 보완
- 설정(`SettingsScreen`) 탭 구현 및 프로필 관리/로그아웃 연동

### 🔹 13주차: AI 추천 & 서비스 확장
- 사용자 독서 패턴 기반 AI 맞춤 도서 추천 카루셀 연동
- 동네 독서 모임 커뮤니티 (`CommunityScreen`) 게시판 CRUD 연동
- 도서별 개인 별점, 완독일 기록 및 한 줄 메모 작성 기능

---

## ⚙️ 실행 방법 (Getting Started)

```bash
# 1. 의존성 패키지 설치
npm install

# 2. 서버 주소 설정: .env.example을 복사해 .env를 만들고 EXPO_PUBLIC_API_URL 값을 입력
#    (.env는 git에 올라가지 않으며, 값을 바꾼 뒤에는 앱을 전체 리로드)
cp .env.example .env

# 3. Expo 개발 서버 실행
npx expo start