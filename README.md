1주차 작성 스타일에 맞춰 **2주차 진행 결과 및 검증 내용**을 직관적이고 깔끔하게 정리했습니다.

`README.md` 파일에 아래 내용을 그대로 복사해 덮어씌우거나 Git 문서 자료로 활용해 주세요.

---

# 📚 Bookhyang (북향) - 2주차 개발 보고서

## 🎯 1. 이번 주차 개발 목표

* **안정적인 백엔드-DB 통신 연동**: Supabase(PostgreSQL) 기반 데이터베이스 연동 및 서재 관리 CRUD API 완비
* **사용자 친화적인 2-탭 UI/UX 구축**: `도서 검색`과 `내 서재` 화면을 오갈 수 있는 메인 하단 탭 네비게이션 적용
* **데이터 정제 및 예외 처리**: 카카오 API의 13자리 ISBN 정제, 표지 이미지 HTTPS 라우팅, 중복 도서 저장 차단
* **화면 상태 보존 (State Retention)**: 탭 전환 시 기존 검색어 및 검색 결과 데이터 유지

---

## 🧪 2. 기능 점검을 위한 가이드라인 (QA Checkpoints)

| 번호 | 점검 항목 | 테스트 방법 및 기대 결과 | Pass 여부 |
| --- | --- | --- | --- |
| **1** | **도서 검색 및 유지** | `도서 검색` 탭에서 키워드(예: 데미안) 검색 후 결과 리스트가 정상 출력되는지 확인 | ✅ Pass |
| **2** | **내 서재 도서 추가** | 검색 결과의 `+ 서재에 담기` 터치 시 DB에 저장되고 완료 팝업이 뜨는지 확인 | ✅ Pass |
| **3** | **중복 저장 차단** | 이미 서재에 존재하는 책을 다시 `+ 서재에 담기` 할 경우 "이미 내 서재에 등록된 도서입니다" 알림 팝업 출력 확인 | ✅ Pass |
| **4** | **내 서재 목록 조회** | `내 서재` 탭으로 이동 시 DB에 저장된 도서 목록이 최신순으로 렌더링되는지 확인 | ✅ Pass |
| **5** | **서재 도서 삭제** | `내 서재` 탭의 도서 카드 내 `삭제` 버튼 클릭 시 DB에서 제거되고 목록에서 사라지는지 확인 | ✅ Pass |
| **6** | **탭 상태 보존** | `도서 검색` ➔ `내 서재` ➔ `도서 검색` 탭으로 돌아왔을 때 이전 검색어가 하얗게 초기화되지 않고 유지되는지 확인 | ✅ Pass |

---

## 🛠 3. 사용한 기술 및 툴 (Tech Stack & Tools)

* **Frontend**: React Native (Expo SDK), JavaScript (ES6+)
* **Backend**: Node.js, Express.js
* **Database**: Supabase (PostgreSQL)
* **HTTP Client**: Axios
* **External API**: 카카오 도서 검색 API (Kakao Developers)
* **Dev Tools**: Visual Studio Code, Git / GitHub, Postman

---

## 🚀 4. 실행 방법 (Getting Started)

### **[1] 백엔드 서버 실행 (`bookhyang-backend`)**

```bash
# 1. 백엔드 폴더 이동
cd bookhyang-backend

# 2. 의존성 패키지 설치 (최초 실행 시)
npm install

# 3. Express 서버 실행
node app.js

```

> 백엔드 서버가 `[http://0.0.0.0:3000](http://0.0.0.0:3000)` 포트에서 정상 동작하는지 확인합니다.

### **[2] 프론트엔드 앱 실행 (`bookhyang`)**

```bash
# 1. 프론트엔드 폴더 이동
cd bookhyang

# 2. 필수 라이브러리 설치 (최초 실행 시)
npm install

# 3. Expo 개발 서버 실행
npx expo start

```

> 터미널에 출력된 QR 코드를 스마트폰의 **Expo Go** 앱으로 스캔하여 테스트를 진행합니다.

---

이 내용을 바탕으로 `README.md`를 업데이트한 뒤 `git push`를 진행하시면 2주차 작업 저장이 완료됩니다!