# SmartBoard

**SmartBoard**는 실시간 협업이 가능한 온라인 화이트보드입니다.
React와 Fabric.js를 기반으로 도형 그리기, 채팅, PDF 업로드, 화면 녹화, 보드 저장 등 다양한 가능을 제공합니다. 

> 📚 스터디, 회의 등 다양한 협업 상황에서 사용할 수 있는 직관적인 협업 툴입니다.

## 주요 기능

- ✅ 실시간 도형 추가 / 수정 / 삭제 (Socket.IO)
- ✅ 채팅 기능
- ✅ PDF 업로드 및 페이지 넘김 (pdf.js)
- ✅ 자유로운 펜/지우개 도구
- ✅ 손 도구를 이용한 화면 이동 (공동 Pan)
- ✅ 화이트보드 녹화 및 저장 (MediaRecorder)
- ✅ PDF/PNG로 보드 결과 저장 (jsPDF)

## 🛠 기술 스택

### Frontend
- React + TypeScript
- Fabric.js
- pdf.js / jsPDF
- Socket.IO Client
- MediaRecorder API
- uuid

### Backend
- Node.js
- Socket.IO Server

## 설치 및 실행

### 1. 클론하기
```bash
git clone https://github.com/sujin0530/smart-board.git
cd smart-board
```

### 2. 패키지 설치
```bash
npm install
```

### 3. 클라이언트 실행
```bash
npm run dev
```

### 4. 서버 실행(새 터미널에서)
```bash
cd server
node server.cjs
```


👩‍💻Developed by

이수진(@sujin0530)
- 기획, 개발, UI/UX 디자인, 전체 기능 설계 및 구현