import React, { useState } from 'react';

// ==========================================
// 1. 1~7단계 춘천 특화 맞춤 데이터 (단계별 구성)
// ==========================================
const OPPORTUNITIES_DATA = [
  // --- [1단계 : 직무 탐색] ---
  {
    id: 101,
    step: 1,
    isTop: true,
    category: '🧭 진로·특강',
    title: '춘천 IT·SW 현직자 직무 콘서트 & 진로 설명회',
    orgName: '춘천시 청년청',
    deadline: '2026-08-20',
    matchRate: 98,
    statusText: '✔ AI 맞춤 98%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💡 프론트엔드 vs 백엔드 직무 비교 및 현직 시니어 특강'
  },
  {
    id: 102,
    step: 1,
    isTop: false,
    category: '🧭 기초 상담',
    title: '강원권 대학생 1:1 진로 탐색 컨설팅 패키지',
    orgName: '강원대학교 일자리센터',
    deadline: '상시모집',
    matchRate: 90,
    statusText: '✔ 적합도 90%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💡 춘천 관내 취업 로드맵 수립 및 적성 검사 지원'
  },
  {
    id: 103,
    step: 1,
    isTop: false,
    category: '🧭 기업 견학',
    title: '춘천 바이오·IT 산업단지 기업 탐방 오픈 데이',
    orgName: '강원도경제진흥원',
    deadline: '2026-08-30',
    matchRate: 85,
    statusText: '✔ 적합도 85%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '🏢 춘천 주요 기업 사옥 투어 및 채용 설명회'
  },

  // --- [2단계 : 기초 역량] ---
  {
    id: 201,
    step: 2,
    isTop: true,
    category: '📚 교육·강좌',
    title: '춘천 청년 K-Digital 백엔드(Java/Python) 부트캠프',
    orgName: '강원대학교 산학협력단',
    deadline: '2026-08-10',
    matchRate: 96,
    statusText: '✔ AI 맞춤 96% (최적)',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💡 교육비 100% 무료 | 매월 훈련수당 31만 원 지급'
  },
  {
    id: 202,
    step: 2,
    isTop: true,
    category: '📚 교육·강좌',
    title: '웹 개발 및 실전 데이터베이스(DB) 실무 강좌',
    orgName: '춘천 정보문화진흥원',
    deadline: '2026-08-25',
    matchRate: 92,
    statusText: '✔ AI 맞춤 92%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💡 SQL 및 Spring Boot 기초 프로젝트 실습 서버 무상'
  },
  {
    id: 203,
    step: 2,
    isTop: false,
    category: '📚 스터디',
    title: '춘천 코딩 코테 대비 알고리즘 집중반 모집',
    orgName: '커먼즈필드 춘천 코딩클럽',
    deadline: '상시모집',
    matchRate: 88,
    statusText: '✔ 적합도 88%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💡 온·오프라인 코딩 테스트 멘토링 & 스터디룸 무료'
  },

  // --- [3단계 : 프로젝트] ---
  {
    id: 301,
    step: 3,
    isTop: true,
    category: '💻 해커톤',
    title: '제4회 춘천시 공공데이터 문제해결 해커톤',
    orgName: '춘천시청 스마트도시과',
    deadline: '2026-08-15',
    matchRate: 96,
    statusText: '✔ AI 맞춤 96% (최적)',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💰 대상 상금 300만 원 | 춘천시장 표창 및 실전 포트폴리오'
  },
  {
    id: 302,
    step: 3,
    isTop: true,
    category: '🤝 지역 프로젝트',
    title: '춘천 로컬 문제해결 청년 아이디어 프로젝트',
    orgName: '춘천문화재단',
    deadline: '2026-08-30',
    matchRate: 91,
    statusText: '✔ AI 맞춤 91%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💡 기획 프로젝트 활동비 150만 원 지원 & 멘토링'
  },
  {
    id: 303,
    step: 3,
    isTop: false,
    category: '💻 오픈소스',
    title: '강원 ICT 오픈소스 기여 및 팀 프로젝트 경진대회',
    orgName: '강원ICT융합연구원',
    deadline: '2026-09-05',
    matchRate: 85,
    statusText: '✔ 적합도 85%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💡 깃허브(GitHub) 포트폴리오 검증 및 개발 서버 보조'
  },

  // --- [4단계 : 실무 경험] ---
  {
    id: 401,
    step: 4,
    isTop: true,
    category: '🚀 마이크로 외주',
    title: '춘천시 청년 정책 앱 UI/UX 개선 마이크로 프로젝트',
    orgName: '춘천시 청년청',
    deadline: '2026-08-25',
    matchRate: 95,
    statusText: '✔ AI 맞춤 95% (최적)',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💰 프로젝트 기성금 120만 원 지급 | 시정 참여 공식 경력'
  },
  {
    id: 402,
    step: 4,
    isTop: true,
    category: '💼 단기 인턴',
    title: '춘천 IT기업 백엔드 개발자 실무 인턴 모집',
    orgName: '(주)강원테크솔루션',
    deadline: '2026-08-20',
    matchRate: 90,
    statusText: '✔ AI 맞춤 90%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💼 실무 클라우드 백엔드 개발 경험 | 정규직 전환율 80%'
  },
  {
    id: 403,
    step: 4,
    isTop: false,
    category: '💼 기업 캡스톤',
    title: '춘천 스마트팜 IT 융합 기업 연계 캡스톤 디자인',
    orgName: '(주)강원애그리텍',
    deadline: '2026-08-10',
    matchRate: 84,
    statusText: '✔ 적합도 84%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💡 기업 실무 과제 해결 | 완료 후 우수자 인턴 가점'
  },

  // --- [5단계 : 기업 연결] ---
  {
    id: 501,
    step: 5,
    isTop: true,
    category: '🤝 1:1 멘토링',
    title: '더존비즈온 현직 시니어 개발자 1:1 멘토링 패키지',
    orgName: '더존비즈온 춘천 캠퍼스',
    deadline: '2026-09-01',
    matchRate: 97,
    statusText: '✔ AI 맞춤 97% (최적)',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '🏢 백엔드 시니어 코드 리뷰 & 실무 면접 및 포트폴리오 피드백'
  },
  {
    id: 502,
    step: 5,
    isTop: true,
    category: '🤝 기업 과제',
    title: '춘천 앵커기업 기업 과제 수행 및 채용 설명회',
    orgName: '강원도경제진흥원',
    deadline: '2026-09-10',
    matchRate: 91,
    statusText: '✔ AI 맞춤 91%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💡 실제 현업 이슈 과제 풀이 | 우수 해결팀 채용 가산점'
  },
  {
    id: 503,
    step: 5,
    isTop: false,
    category: '🤝 포트폴리오',
    title: 'IT 인사담당자 초청 이력서·포트폴리오 클리닉',
    orgName: '춘천 일자리센터',
    deadline: '상시모집',
    matchRate: 86,
    statusText: '✔ 적합도 86%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💡 서류 탈락율을 줄이는 직군 맞춤 1:1 이력서 첨삭'
  },

  // --- [6단계 : 취업] ---
  {
    id: 601,
    step: 6,
    isTop: true,
    category: '🎯 지역인재 채용',
    title: '강원정보문화진흥원 지역인재 SW 신입사원 공채',
    orgName: '강원정보문화진흥원',
    deadline: '2026-09-15',
    matchRate: 96,
    statusText: '✔ AI 맞춤 96% (최적)',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '🌟 춘천 지역인재 가산점 부여 | 주거 안정 지원금 연계'
  },
  {
    id: 602,
    step: 6,
    isTop: true,
    category: '🎯 채용 전환',
    title: '유바이오로직스 데이터 분석 IT 신입사원 모집',
    orgName: '유바이오로직스 춘천',
    deadline: '2026-09-20',
    matchRate: 93,
    statusText: '✔ AI 맞춤 93% (추천)',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💼 채용 전환형 인턴 3개월 근무 후 100% 정규직 발령'
  },
  {
    id: 603,
    step: 6,
    isTop: false,
    category: '🎯 신입 채용',
    title: '바디텍메드(주) 정보전략팀 SW 개발 신입 채용',
    orgName: '바디텍메드 춘천본사',
    deadline: '2026-09-30',
    matchRate: 87,
    statusText: '✔ 적합도 87%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '🏢 춘천 거주 청년 우선 선발 | 중소기업 취업장려금 연계'
  },

  // --- [7단계 : 정착 (인프라 & 정책)] ---
  {
    id: 701,
    step: 7,
    isTop: true,
    category: '🏡 주거·월세',
    title: '춘천 청년 월세 특별지원사업 (월 20만 원 x 12개월)',
    orgName: '춘천시 청년지원과',
    deadline: '2026-09-30',
    matchRate: 98,
    statusText: '✔ AI 맞춤 98% (최적)',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '🏠 연간 총 240만 원 무상 주거비 지원으로 생활 부담 해소'
  },
  {
    id: 702,
    step: 7,
    isTop: true,
    category: '🎒 정주 복지',
    title: '강원·춘천 대학생 및 청년 전입장려금 지원',
    orgName: '춘천시 자치행정과',
    deadline: '상시모집',
    matchRate: 95,
    statusText: '✔ AI 맞춤 95% (최적)',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '🎒 관내 대학교 전입 학생 학기별 정착 축하금 30만 원 지급'
  },
  {
    id: 703,
    step: 7,
    isTop: true,
    category: '💼 취업 장려',
    title: '춘천 관내 중소기업 청년 취업장려금 및 구직수당',
    orgName: '춘천시 기업지원과',
    deadline: '2026-11-30',
    matchRate: 94,
    statusText: '✔ AI 맞춤 94% (추천)',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '💰 춘천 소재 기업 근로 청년 연 최대 100만 원 지원 장려금'
  },
  {
    id: 704,
    step: 7,
    isTop: false,
    category: '🚌 교통 지원',
    title: '춘천 청년 대중교통비 지원 & 교통카드 패스',
    orgName: '춘천시 청년청',
    deadline: '상시모집',
    matchRate: 90,
    statusText: '✔ 적합도 90%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '🚌 춘천 시내버스 및 광역 교통비 연간 최대 15만 원 환급'
  },
  {
    id: 705,
    step: 7,
    isTop: false,
    category: '🏙️ 청년 공간',
    title: '커먼즈필드 춘천 청년 코워킹스페이스 무료 멤버십',
    orgName: '춘천사회혁신센터',
    deadline: '상시모집',
    matchRate: 88,
    statusText: '✔ 적합도 88%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '🏙️ 춘천 효자동 소재 청년 전용 공유 오피스 24시간 라운지'
  },
  {
    id: 706,
    step: 7,
    isTop: false,
    category: '🏡 전세 대출',
    title: '춘천 청년 전세보증금 대출 이자 지원 사업',
    orgName: '강원도 주택도시기금',
    deadline: '상시모집',
    matchRate: 85,
    statusText: '✔ 적합도 85%',
    statusBg: '#dcfce7',
    statusColor: '#16a34a',
    desc: '🏠 전세 및 보증금 대출 연 3.0% 이자 시청 직권 무상 대납'
  }
];

// 1~7단계 정의
const STEP_LIST = [
  { step: 1, label: '1. 직무 탐색' },
  { step: 2, label: '2. 기초 역량' },
  { step: 3, label: '3. 프로젝트' },
  { step: 4, label: '4. 실무 경험' },
  { step: 5, label: '5. 기업 연결' },
  { step: 6, label: '6. 취업' },
  { step: 7, label: '7. 정착' }
];

export default function App() {
  // 🌟 화면 모드: 'landing'(첫 화면) -> 'onboarding'(맞춤 진단) -> 'dashboard'(1~7단계 탭 + 정착 완결)
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [onboardingStep, setOnboardingStep] = useState(1);

  // 사용자 입력 상태
  const [userProfile, setUserProfile] = useState({
    grade: '3학년',
    job: '백엔드/SW',
    projectCount: '0~1개 (없음/1개)',
    teamExperience: '없음',
    timeline: '6개월 이내 (바로 실전)',
    intention: '춘천 근무 적극 고려 (정주 혜택)'
  });

  // AI 진단으로 계산된 추천 단계 (기본값: 3단계 프로젝트)
  const [diagnosedStepNum, setDiagnosedStepNum] = useState(3);
  
  // 현재 선택된 탭 (1~7단계 중 선택)
  const [activeTab, setActiveTab] = useState(3);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);

  // 서울 vs 춘천 시뮬레이터 슬라이더 상태
  const [seoulSalary, setSeoulSalary] = useState(3200);
  const [seoulRent, setSeoulRent] = useState(80);
  const [chuncheonRent, setChuncheonRent] = useState(35);

  const seoulMonthlyNet = Math.round((seoulSalary / 12) - seoulRent - 18 - 8);
  const chuncheonSupport = 47; // 월세 20만 + 생활/취업장려금 27만
  const chuncheonMonthlyNet = Math.round((seoulSalary / 12) - chuncheonRent - 6 + chuncheonSupport);
  const monthlySavingDiff = chuncheonMonthlyNet - seoulMonthlyNet;
  const yearlySavingDiff = monthlySavingDiff * 12;

  // 진단 판정 완료 로직
  const handleFinishOnboarding = () => {
    let step = 3;
    if (userProfile.projectCount === '2개 이상' || userProfile.teamExperience !== '없음') {
      step = 4; // 경험이 있으면 실무/인턴 단계로
    } else {
      step = 3; // 기본은 프로젝트 단계
    }
    setDiagnosedStepNum(step);
    setActiveTab(step); // 진단된 단계 탭을 기본 열림으로 설정
    setCurrentScreen('dashboard');
  };

  const handleBookmark = (id) => {
    setBookmarkedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", Roboto, sans-serif', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      {/* =========================================================
          [CSS] 스타일 충돌 방지용 컴포넌트 내부 스타일 블록
      ========================================================= */}
      <style>{`
        * { box-sizing: border-box; }
        button { transition: all 0.2s ease; font-family: inherit; }
        button:active { transform: scale(0.98); }
        .hover-card:hover { transform: translateY(-4px); box-shadow: 0 16px 32px rgba(37, 99, 235, 0.12) !important; border-color: #93c5fd !important; }
        input[type="range"] { -webkit-appearance: none; width: 100%; height: 8px; border-radius: 4px; background: #e2e8f0; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 3px solid #2563eb; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
        @media (max-width: 768px) { .grid-cards, .sim-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* =========================================================
          [0] 첫 랜딩 화면 (피드백 반영: 로고 상단 좌측, 깔끔한 문구)
      ========================================================= */}
      {currentScreen === 'landing' && (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '28px 40px'
        }}>
          {/* 좌측 상단 로고 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/moabom.png" alt="모아봄 로고" style={{ width: 36, height: 36 }} onError={(e) => { e.target.style.display = 'none'; }} />
            <span style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.5px' }}>모아봄</span>
          </div>

          {/* 중앙 타이틀 & CTA 버튼 */}
          <div style={{ textAlign: 'center', margin: 'auto 0' }}>
            <h1 style={{ fontSize: '3.6rem', fontWeight: '900', lineHeight: '1.25', marginBottom: '40px', letterSpacing: '-1.5px' }}>
              모아봄에서 시작하는<br />나만의 커리어 로드
            </h1>

            <button
              onClick={() => { setOnboardingStep(1); setCurrentScreen('onboarding'); }}
              style={{
                background: '#ffffff',
                color: '#1e3a8a',
                border: 'none',
                padding: '20px 52px',
                borderRadius: '50px',
                fontWeight: '900',
                fontSize: '1.3rem',
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              🚀 모아봄 시작하기 ➔
            </button>
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.85rem', opacity: 0.6 }}>
            © Chuncheon Youth Career Platform. All rights reserved.
          </div>
        </div>
      )}

      {/* =========================================================
          [1] 맞춤 진단 온보딩 (3단계 심플 플로우)
      ========================================================= */}
      {currentScreen === 'onboarding' && (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: '#f1f5f9' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '640px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ background: '#2563eb', color: '#fff', padding: '32px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '6px' }}>🌞 춘천 청년 맞춤 진단</h2>
              <p style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '20px' }}>현재 단계와 춘천시 정착 기회를 30초 만에 분석합니다.</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3].map(num => (
                  <div key={num} style={{ flex: 1, height: '6px', borderRadius: '3px', background: num <= onboardingStep ? '#fff' : 'rgba(255,255,255,0.3)' }} />
                ))}
              </div>
            </div>

            <div style={{ padding: '36px 32px', minHeight: '300px' }}>
              {/* STEP 1: 학년 & 희망 직무 */}
              {onboardingStep === 1 && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>1. 학년 상태 및 희망 직무</h3>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>학년 / 상태</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {['1학년', '2학년', '3학년', '4학년', '졸업생', '취업 준비 중'].map(grade => (
                        <button
                          key={grade}
                          onClick={() => setUserProfile({ ...userProfile, grade })}
                          style={{ padding: '12px', borderRadius: '8px', border: userProfile.grade === grade ? '2px solid #2563eb' : '1px solid #cbd5e1', background: userProfile.grade === grade ? '#eff6ff' : '#fff', color: userProfile.grade === grade ? '#2563eb' : '#475569', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                          {grade}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>희망 직무</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {['백엔드/SW', '프론트엔드', '데이터/AI', 'UI/UX 디자인', '기획/PM'].map(job => (
                        <button
                          key={job}
                          onClick={() => setUserProfile({ ...userProfile, job })}
                          style={{ padding: '12px', borderRadius: '8px', border: userProfile.job === job ? '2px solid #2563eb' : '1px solid #cbd5e1', background: userProfile.job === job ? '#eff6ff' : '#fff', color: userProfile.job === job ? '#2563eb' : '#475569', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                          {job}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: 프로젝트 및 협업 경험 */}
              {onboardingStep === 2 && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>2. 진행한 프로젝트 및 협업 경험</h3>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>진행한 프로젝트 수 (0~1개는 프로젝트 단계 / 2개 이상은 실무 인턴 매칭)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      {['0~1개 (없음/1개)', '2개 이상'].map(count => (
                        <button
                          key={count}
                          onClick={() => setUserProfile({ ...userProfile, projectCount: count })}
                          style={{ padding: '16px', borderRadius: '10px', border: userProfile.projectCount === count ? '2px solid #2563eb' : '1px solid #cbd5e1', background: userProfile.projectCount === count ? '#eff6ff' : '#fff', color: userProfile.projectCount === count ? '#2563eb' : '#475569', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem' }}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>해커톤/공모전 팀 협업 경험</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {['없음', '1~2회', '3회 이상'].map(team => (
                        <button
                          key={team}
                          onClick={() => setUserProfile({ ...userProfile, teamExperience: team })}
                          style={{ padding: '12px', borderRadius: '8px', border: userProfile.teamExperience === team ? '2px solid #2563eb' : '1px solid #cbd5e1', background: userProfile.teamExperience === team ? '#eff6ff' : '#fff', color: userProfile.teamExperience === team ? '#2563eb' : '#475569', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                          {team}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: 취업 타임라인 & 춘천 근무 의향 */}
              {onboardingStep === 3 && (
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>3. 목표 취업 시기 및 춘천 근무 의향</h3>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>희망 취업 타임라인</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {['6개월 이내 (바로 실전)', '1년 이내 (역량 빌드업)', '1년 이후 (기초 학습)'].map(time => (
                        <button
                          key={time}
                          onClick={() => setUserProfile({ ...userProfile, timeline: time })}
                          style={{ padding: '14px 8px', borderRadius: '10px', border: userProfile.timeline === time ? '2px solid #2563eb' : '1px solid #cbd5e1', background: userProfile.timeline === time ? '#eff6ff' : '#fff', color: userProfile.timeline === time ? '#2563eb' : '#475569', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>춘천 지역 기업 근무 및 정착 의향</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '10px' }}>
                      {[
                        '춘천 근무 적극 고려 (주거·취업 장려금 혜택 원함)',
                        '좋은 기회(채용 연계/인턴)라면 고려 가능',
                        '서울 vs 춘천 혜택 비교 후 결정 예정'
                      ].map(type => (
                        <button
                          key={type}
                          onClick={() => setUserProfile({ ...userProfile, intention: type })}
                          style={{ padding: '16px', borderRadius: '10px', border: userProfile.intention === type ? '2px solid #2563eb' : '1px solid #cbd5e1', background: userProfile.intention === type ? '#eff6ff' : '#fff', color: userProfile.intention === type ? '#2563eb' : '#475569', fontWeight: '800', cursor: 'pointer', textAlign: 'left', paddingLeft: '20px', fontSize: '0.95rem' }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '20px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => onboardingStep > 1 ? setOnboardingStep(onboardingStep - 1) : setCurrentScreen('landing')}
                style={{ padding: '10px 20px', border: 'none', background: '#f1f5f9', color: '#64748b', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                ← 이전
              </button>
              <span style={{ fontWeight: '800', color: '#64748b' }}>{onboardingStep} / 3 단계</span>
              <button
                onClick={() => onboardingStep < 3 ? setOnboardingStep(onboardingStep + 1) : handleFinishOnboarding()}
                style={{ padding: '12px 28px', border: 'none', background: '#2563eb', color: '#fff', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
              >
                {onboardingStep < 3 ? '다음 ➔' : '진단 완료 및 기회 보기 ✔'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          [2] 메인 커리어 대시보드 (1~7단계 네비게이션 탭 + 완결 시뮬레이터)
      ========================================================= */}
      {currentScreen === 'dashboard' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* 상단 네비게이션 바 */}
          <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 0', position: 'sticky', top: 0, zIndex: 100 }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setCurrentScreen('landing')}>
                <img src="/moabom.png" alt="로고" style={{ width: 32, height: 32 }} onError={(e) => { e.target.style.display = 'none'; }} />
                <span style={{ fontSize: '1.25rem', fontWeight: '900' }}>모아봄</span>
              </div>

              {/* 현재 AI 진단 위치 안내 배지 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '800' }}>
                  🎯 AI 진단 : {userProfile.grade} {userProfile.job} ➔ [STEP {diagnosedStepNum}] 위치
                </span>
                <button
                  onClick={() => { setOnboardingStep(1); setCurrentScreen('onboarding'); }}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', cursor: 'pointer' }}
                >
                  🔄 다시 진단하기
                </button>
              </div>
            </div>
          </header>

          {/* 1단계 ~ 7단계 메인 탭 */}
          <nav style={{ background: '#fff', borderBottom: '2px solid #e2e8f0', overflowX: 'auto' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px', display: 'flex', gap: '8px' }}>
              {STEP_LIST.map((tab) => {
                const isActive = activeTab === tab.step;
                const isDiagnosed = diagnosedStepNum === tab.step;
                return (
                  <button
                    key={tab.step}
                    onClick={() => setActiveTab(tab.step)}
                    style={{
                      padding: '16px 14px',
                      background: 'none',
                      border: 'none',
                      borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                      color: isActive ? '#2563eb' : '#64748b',
                      fontWeight: isActive ? '900' : '700',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      position: 'relative'
                    }}
                  >
                    {tab.label}
                    {isDiagnosed && (
                      <span style={{ background: '#f97316', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', marginLeft: '6px', fontWeight: '900' }}>
                        추천
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* 메인 탭 콘텐츠 렌더링 영역 */}
          <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '36px 20px 80px', width: '100%' }}>
            {/* 타이틀 영역 */}
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#0f172a', marginBottom: '6px' }}>
                {STEP_LIST.find(s => s.step === activeTab)?.label} — 춘천 실전 매칭 기회
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
                💡 {activeTab === 7 ? '춘천시가 보장하는 주거·월세·교통 정책을 확인하고 하단에서 서울 vs 춘천 정착 시뮬레이터를 체험하세요.' : 'AI가 분석한 고적합 맞춤 공고입니다. 마음에 드는 공고의 ⭐(찜) 버튼을 눌러보세요.'}
              </p>
            </div>

            {/* 카드 Grid 렌더링 (현재 선택된 탭에 맞는 공고 뿌리기) */}
            <div className="grid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '48px' }}>
              {OPPORTUNITIES_DATA.filter(item => item.step === activeTab).map((item) => {
                const isBookmarked = bookmarkedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleBookmark(item.id)}
                    className="hover-card"
                    style={{
                      background: item.isTop ? '#fff' : '#fff',
                      border: isBookmarked ? '2px solid #2563eb' : (item.isTop ? '2px solid #93c5fd' : '1px solid #e2e8f0'),
                      borderRadius: '16px',
                      padding: '24px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isBookmarked ? '0 10px 20px rgba(37,99,235,0.12)' : (item.isTop ? '0 8px 16px rgba(147,197,253,0.15)' : '0 4px 10px rgba(0,0,0,0.03)')
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.8rem', background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontWeight: '800' }}>{item.category}</span>
                        <span style={{ fontSize: '1.25rem' }}>{isBookmarked ? '⭐' : '☆'}</span>
                      </div>

                      <div style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: '800', background: item.statusBg, color: item.statusColor, padding: '4px 10px', borderRadius: '6px', marginBottom: '12px' }}>
                        {item.statusText}
                      </div>

                      <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px', lineHeight: '1.4' }}>{item.title}</h4>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>🏢 {item.orgName}</p>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', color: '#1e3a8a', border: '1px solid #e2e8f0' }}>
                      {item.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* =========================================================
                🌟 [7단계 : 정착 탭 전용] 하단 스크롤 서울 vs 춘천 시뮬레이터 완결
            ========================================================= */}
            {activeTab === 7 && (
              <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '56px', marginTop: '32px' }}>
                <div style={{ marginBottom: '32px' }}>
                  <span style={{ background: '#0284c7', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontWeight: '800', fontSize: '0.85rem' }}>
                    STEP 7 정주 시뮬레이터
                  </span>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#0f172a', margin: '10px 0 6px' }}>
                    서울 vs 춘천 — 정책 지원 시 실제로 얼마나 다를까요?
                  </h2>
                  <p style={{ color: '#64748b' }}>
                    위에서 확인한 주거/월세/취업 지원금이 반영된 정착 시뮬레이터입니다. 슬라이더를 조정해 차이를 확인하세요.
                  </p>
                </div>

                {/* 슬라이더 & 순수입 비교 2열 위젯 */}
                <div className="sim-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
                  {/* [좌측] 조건 설정 */}
                  <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.03)' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '24px' }}>⚙️ 조건 설정 슬라이더</h3>

                    <div style={{ marginBottom: '28px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '700', color: '#475569' }}>서울 예상 연봉</span>
                        <span style={{ fontWeight: '900', color: '#2563eb', fontSize: '1.1rem' }}>{seoulSalary.toLocaleString()}만 원</span>
                      </div>
                      <input type="range" min="2400" max="5000" step="100" value={seoulSalary} onChange={(e) => setSeoulSalary(Number(e.target.value))} />
                    </div>

                    <div style={{ marginBottom: '28px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '700', color: '#475569' }}>서울 월세</span>
                        <span style={{ fontWeight: '900', color: '#ef4444', fontSize: '1.1rem' }}>{seoulRent}만 원/월</span>
                      </div>
                      <input type="range" min="50" max="150" step="5" value={seoulRent} onChange={(e) => setSeoulRent(Number(e.target.value))} />
                    </div>

                    <div style={{ marginBottom: '28px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '700', color: '#475569' }}>춘천 월세</span>
                        <span style={{ fontWeight: '900', color: '#16a34a', fontSize: '1.1rem' }}>{chuncheonRent}만 원/월</span>
                      </div>
                      <input type="range" min="20" max="70" step="5" value={chuncheonRent} onChange={(e) => setChuncheonRent(Number(e.target.value))} />
                    </div>

                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '12px' }}>
                      <div style={{ fontWeight: '800', color: '#166534', marginBottom: '4px', fontSize: '0.9rem' }}>춘천 정착 지원금 자동 반영</div>
                      <div style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: '700' }}>
                        💰 월세 지원 20만 + 기업/생활 장려금 27만 = 월 +{chuncheonSupport}만 원 혜택
                      </div>
                    </div>
                  </div>

                  {/* [우측] 순수입 비교 그래픽 */}
                  <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '24px' }}>📊 월 순수입 비교</h3>

                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '700', color: '#475569' }}>🏙️ 서울 취업 시</span>
                          <span style={{ fontWeight: '800', color: '#475569' }}>{seoulMonthlyNet}만 원/월</span>
                        </div>
                        <div style={{ width: '100%', background: '#f1f5f9', height: '14px', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ width: '70%', background: '#94a3b8', height: '100%' }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>월세 {seoulRent}만 + 교통 18만 + 식비 8만 차감</div>
                      </div>

                      <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '800', color: '#16a34a' }}>🌲 춘천 취업 시</span>
                          <span style={{ fontWeight: '900', color: '#16a34a', fontSize: '1.1rem' }}>{chuncheonMonthlyNet}만 원/월</span>
                        </div>
                        <div style={{ width: '100%', background: '#f1f5f9', height: '14px', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ width: '95%', background: '#16a34a', height: '100%' }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>월세 {chuncheonRent}만 + 교통 6만 차감 / 지원금 +{chuncheonSupport}만 포함</div>
                      </div>

                      <div style={{ background: '#f0fdf4', border: '2px solid #86efac', padding: '24px', borderRadius: '16px', textAlign: 'center', marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: '800', marginBottom: '6px' }}>춘천 정착 시</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#16a34a', marginBottom: '6px' }}>
                          매월 {monthlySavingDiff}만 원 추가 자산 형성
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#15803d' }}>
                          연간 {(yearlySavingDiff / 10000).toFixed(1)}0만 원 절감 가능
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>서울 통근시간</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#475569' }}>75분</div>
                      </div>
                      <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '700' }}>춘천 통근시간</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#16a34a' }}>15분</div>
                      </div>
                      <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '700' }}>하루 절약 시간</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#2563eb' }}>120분</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 최종 완결 배너 */}
                <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '32px', borderRadius: '24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', fontWeight: '700' }}>
                      Golden Path 시뮬레이션 완료
                    </span>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: '900', marginTop: '8px' }}>
                      춘천 대학생·청년을 위한 정주 패스, 모아봄에서 완성하세요
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      alert('춘천시 청년 월세 지원 및 정착 패키지 원스톱 신청을 진행합니다!');
                      setCurrentScreen('landing');
                    }}
                    style={{ padding: '16px 32px', borderRadius: '50px', border: 'none', background: '#fff', color: '#1e3a8a', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer' }}
                  >
                    처음으로 돌아가기 ➔
                  </button>
                </div>
              </div>
            )}

            {/* 다른 탭(1~6단계) 선택 시 하단에 가볍게 뜨는 다음 단계 이동 안내 CTA */}
            {activeTab < 7 && (
              <div style={{ textAlign: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '24px', borderRadius: '16px' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#1e3a8a', marginBottom: '6px' }}>
                  STEP {activeTab + 1}. {STEP_LIST.find(s => s.step === activeTab + 1)?.label.split('. ')[1]} 단계로 넘어가기
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '16px' }}>
                  해당 단계의 공고를 찜(⭐)하여 맞춤 커리어를 연결하세요.
                </p>
                <button
                  onClick={() => setActiveTab(activeTab + 1)}
                  style={{ padding: '12px 28px', border: 'none', background: '#2563eb', color: '#fff', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
                >
                  다음 단계 공고 보러가기 ➔
                </button>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}