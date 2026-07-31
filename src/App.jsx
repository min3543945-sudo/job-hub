import React, { useState, useEffect, useDeferredValue, useCallback, useMemo } from 'react';
import './App.css';

// =========================================================
// 1. 공통 유틸리티 & 데이터 정제 함수
// =========================================================
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const highlightText = (text, query) => {
  if (!text || typeof text !== 'string') return text || '';
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <span key={index} className="highlight-text">{part}</span>
    ) : (
      <span key={index}>{part}</span>
    )
  );
};

const formatDateString = (dateStr) => {
  if (!dateStr) return '상시모집';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if ((hours === '00' && minutes === '00') || (hours === '23' && minutes === '59')) {
    return `${year}. ${month}. ${day}`;
  }
  return `${year}. ${month}. ${day} (${hours}:${minutes})`;
};

const calculateDDay = (endDate) => {
  if (!endDate) return '상시모집';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  if (isNaN(end.getTime())) return '상시모집';
  end.setHours(0, 0, 0, 0);
  const diffTime = end - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return '마감됨';
  if (diffDays === 0) return 'D-Day';
  return `D-${diffDays}`;
};

// 공고 제목 대괄호 제거 유틸리티
const cleanTitle = (title) => {
  if (!title || typeof title !== 'string') return '제목 없음';
  const cleaned = title.replace(/\[.*?\]|【.*?】/g, '').replace(/\s+/g, ' ').trim();
  return cleaned || title;
};

const categoryMap = {
  'CONTEST': '공모전', 'JOB': '채용·일자리', 'EDUCATION': '교육·강좌',
  'ACTIVITY': '대외활동', 'HACKATHON': '해커톤', 'STARTUP': '사업·창업',
  'SUPPORT_POLICY': '지원금·정책', 'EVENT': '행사·공연', 'VOLUNTEER': '자원봉사',
  'INTERN': '채용·일자리', 'POLICY': '지원금·정책', 'PROGRAM': '교육·강좌',
  'BUSINESS_OPPORTUNITY': '사업·창업', 'BUSINESS': '사업·창업'
};

const categoryEmojiMap = {
  '공모전': '🏆', '채용·일자리': '🏢', '교육·강좌': '📚', '대외활동': '🤝',
  '해커톤': '💻', '사업·창업': '💡', '지원금·정책': '💰', '행사·공연': '🎪',
  '자원봉사': '💛', '기타': '📌'
};

const normalizeItem = (item, index) => { 
  

  let orgName = '주관기관 미상';
  if (item.organization && typeof item.organization === 'object') {
    orgName = item.organization.name || item.organization.department || '주관기관 미상';
  } else if (typeof item.organization === 'string') {
    orgName = item.organization;
  }

  const deadline = item.dates?.recruit_end_at || item.dates?.applicationEndAt || item.dates?.activity_end_at || '';
  const activityStart = item.dates?.activity_start_at || item.dates?.activityStartAt || '';
  const activityEnd = item.dates?.activity_end_at || item.dates?.activityEndAt || '';
  const sourceName = typeof item.source === 'object' ? (item.source?.sourceName || '기타') : (item.source || '기타');

  let categoryRaw = item.category || '기타';
  let category = categoryMap[categoryRaw] || categoryRaw;
  let topics = Array.isArray(item.topics) ? item.topics : [];

  let locType = item.location?.operation_type || item.location?.type || '';
  let locName = item.location?.region || '';
  let locTag = locType === 'OFFLINE' ? '오프라인' : locType === 'ONLINE' ? '온라인' : locType === 'MIXED' ? '온·오프라인 혼합' : locType;
  if (locName && locName !== 'UNKNOWN') locTag += `(${locName})`;

  const rawId = item.id ?? item.externalId ?? `post-${index}-${(item.title || '').slice(0, 5)}`;
  const id = String(rawId).trim();

  const details = { ...(item.details || {}) };
  if (details.contact) {
    if (details.contact.name) details.contact_name = details.contact.name;
    if (details.contact.phone) details.contact_phone = details.contact.phone;
    if (details.contact.email) details.contact_email = details.contact.email;
  }

  const imageUrl = item.thumbnail_url || item.imageUrl || '/moabom.png';  

  let targetsStr = '제한없음';
  if (Array.isArray(item.targets) && item.targets.length > 0) {
    targetsStr = item.targets.join(', ');
  } else if (typeof item.targets === 'string' && item.targets.trim()) {
    targetsStr = item.targets;
  }

  return {
    id,
    title: cleanTitle(item.title || '제목 없음'),
    orgName,
    deadline,
    sourceName: String(sourceName),
    category,
    topics,
    locTag,
    imageUrl,
    url: item.source_url || item.url || '#',
    targets: targetsStr,
    activityStart,
    activityEnd,
    details,
    description: item.summary || item.description || '상세 내용이 없습니다.'
  };
};

// =========================================================
// 2. 카테고리 트리 & 커리어로드 매핑 데이터
// =========================================================
const CATEGORY_TREE = {
  '전체': [],
  '공모전': ['전체', '기획/아이디어', '광고/마케팅', '디자인/미술', 'IT/소프트웨어', '기타'],
  '채용·일자리': ['전체', '신입', '경력', '인턴', '알바', '프리랜서'],
  '교육·강좌': ['전체', '프로그래밍', '마케팅', '디자인', '어학', '자격증'],
  '대외활동': ['전체', '서포터즈', '기자단', '봉사단', '해외탐방'],
  '해커톤': ['전체', '웹/앱', 'AI/데이터', '블록체인', '게임'],
  '사업·창업': ['전체', '지원금', '멘토링', '공간지원', '네트워킹'],
  '지원금·정책': ['전체', '주거', '금융', '취업', '생활'],
  '행사·공연': ['전체', '축제', '전시', '강연', '공연'],
  '자원봉사': ['전체', '교육봉사', '재능기부', '환경보호', '행사보조'],
  '인턴': []
};
const NAV_TABS = Object.keys(CATEGORY_TREE);

const SUBCATEGORY_SYNONYMS = {
  '기획': ['기획', '아이디어', '제안', '비즈니스'],
  '광고': ['광고', '마케팅', '홍보', 'sns', '콘텐츠', '서포터즈', '브랜딩', '크리에이터'],
  '마케팅': ['광고', '마케팅', '홍보', 'sns', '콘텐츠', '서포터즈', '브랜딩', '크리에이터'],
  '디자인': ['디자인', '미술', 'ui', 'ux', '일러스트', '포토샵', '그래픽', '캐릭터', '웹디자인'],
  '미술': ['디자인', '미술', 'ui', 'ux', '일러스트', '포토샵', '그래픽', '캐릭터', '웹디자인'],
  'it': ['it', '소프트웨어', '프로그래밍', '개발', '코딩', '웹', '앱', 'ai', '데이터', '인공지능', '백엔드', '프론트엔드', '보안', '클라우드', '파이썬', '자바'],
  '소프트웨어': ['it', '소프트웨어', '프로그래밍', '개발', '코딩', '웹', '앱', 'ai', '데이터', '인공지능', '백엔드', '프론트엔드', '보안', '클라우드', '파이썬', '자바'],
  '프로그래밍': ['it', '소프트웨어', '프로그래밍', '개발', '코딩', '웹', '앱', 'ai', '데이터', '인공지능', '백엔드', '프론트엔드', '보안', '클라우드', '파이썬', '자바'],
  '웹': ['웹', '앱', '프론트엔드', '백엔드', '풀스택'],
  '앱': ['웹', '앱', '프론트엔드', '백엔드', '안드로이드', 'ios'],
  'ai': ['ai', '인공지능', '데이터', '머신러닝', '딥러닝', '빅데이터'],
  '데이터': ['ai', '인공지능', '데이터', '머신러닝', '딥러닝', '빅데이터'],
  '지원금': ['지원금', '자금', '보조금', '바우처', '장려금', '창업지원', '사업화', '지원사업'],
  '멘토링': ['멘토링', '컨설팅', '교육', '특강', '전문가', '피드백'],
  '공간지원': ['공간', '입주', '오피스', '사무실', '창업센터', '보육'],
  '네트워킹': ['네트워킹', '교류', '밋업', '커뮤니티', '포럼'],
  '신입': ['신입', '정규직', '신입사원'],
  '경력': ['경력', '경력직', '경력사원'],
  '인턴': ['인턴', '체험형', '채용연계형']
};

const MAJOR_JOB_MAPPING = {
  'IT·소프트웨어': ['백엔드 개발', '프론트엔드', 'AI·데이터 분석', '인프라·DevOps', 'SW 풀스택'],
  '디자인·미디어': ['UI/UX 디자인', '브랜드·그래픽 디자인', '영상·모션 그래픽', '콘텐츠·로컬 크리에이터'],
  '경영·마케팅': ['서비스 기획·PM', '퍼포먼스 마케팅', '콘텐츠·SNS 마케팅', '경영지원·HR', '로컬 비즈니스 기획'],
  '바이오·자연과학': ['바이오 R&D·연구', '품질관리(QA/QC)', '스마트팜 기술·제어', '환경·수질 분석']
};

const VOCATIONAL_JOB_MAPPING = {
  'IT·소프트웨어': ['웹·앱 QA 및 테스트', '웹 퍼블리셔', 'IT 시스템·서버 운영', 'SW 유지보수'],
  '디자인·미디어': ['SNS·콘텐츠 제작', '그래픽·편집 디자인', '영상 촬영·편집', '3D·모션 어시스턴트'],
  '경영·마케팅': ['온라인 MD·E커머스', '매장·공간 관리', 'SNS 마케팅 운영', '경영지원·사무보조'],
  '바이오·자연과학': ['바이오 제조·생산', '품질검사(QC) 보조', '스마트팜 시설 관리', '환경·안전 관리']
};

const CAREER_OPPORTUNITIES = [
  { id: 'cr-101', step: 1, isTop: true, category: '🧭 진로·특강', title: '춘천 IT·SW 현직자 직무 콘서트 & 진로 설명회', orgName: '춘천시 청년청', deadline: '2026-08-20', matchRate: 98, statusText: '✔ AI 맞춤 98%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💡 프론트엔드 vs 백엔드 직무 비교 및 현직 시니어 특강' },
  { id: 'cr-102', step: 1, isTop: false, category: '🧭 기초 상담', title: '강원권 청년 1:1 진로 탐색 컨설팅 패키지', orgName: '강원대학교 일자리센터', deadline: '상시모집', matchRate: 90, statusText: '✔ 적합도 90%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💡 춘천 관내 취업 로드맵 수립 및 적성 검사 지원' },
  { id: 'cr-103', step: 1, isTop: false, category: '🧭 기업 견학', title: '춘천 바이오·IT 산업단지 기업 탐방 오픈 데이', orgName: '강원도경제진흥원', deadline: '2026-08-30', matchRate: 85, statusText: '✔ 적합도 85%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '🏢 춘천 주요 기업 사옥 투어 및 채용 설명회' },
  { id: 'cr-201', step: 2, isTop: true, category: '📚 교육·강좌', title: '춘천 청년 K-Digital 백엔드(Java/Python) 부트캠프', orgName: '강원대학교 산학협력단', deadline: '2026-08-10', matchRate: 96, statusText: '✔ AI 맞춤 96% (최적)', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💡 교육비 100% 무료 | 매월 훈련수당 31만 원 지급' },
  { id: 'cr-202', step: 2, isTop: true, category: '📚 교육·강좌', title: '웹 개발 및 실전 데이터베이스(DB) 실무 강좌', orgName: '춘천 정보문화진흥원', deadline: '2026-08-25', matchRate: 92, statusText: '✔ AI 맞춤 92%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💡 SQL 및 Spring Boot 기초 프로젝트 실습 서버 무상' },
  { id: 'cr-203', step: 2, isTop: false, category: '📚 스터디', title: '춘천 코딩 코테 대비 알고리즘 집중반 모집', orgName: '커먼즈필드 춘천 코딩클럽', deadline: '상시모집', matchRate: 88, statusText: '✔ 적합도 88%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💡 온·오프라인 코딩 테스트 멘토링 & 스터디룸 무료' },
  { id: 'cr-301', step: 3, isTop: true, category: '💻 해커톤', title: '제4회 춘천시 공공데이터 문제해결 해커톤', orgName: '춘천시청 스마트도시과', deadline: '2026-08-15', matchRate: 96, statusText: '✔ AI 맞춤 96% (최적)', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💰 대상 상금 300만 원 | 춘천시장 표창 및 실전 포트폴리오' },
  { id: 'cr-302', step: 3, isTop: true, category: '🤝 지역 프로젝트', title: '춘천 로컬 문제해결 청년 아이디어 프로젝트', orgName: '춘천문화재단', deadline: '2026-08-30', matchRate: 91, statusText: '✔ AI 맞춤 91%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💡 기획 프로젝트 활동비 150만 원 지원 & 멘토링' },
  { id: 'cr-303', step: 3, isTop: false, category: '💻 오픈소스', title: '강원 ICT 오픈소스 기여 및 팀 프로젝트 경진대회', orgName: '강원ICT융합연구원', deadline: '2026-09-05', matchRate: 85, statusText: '✔ 적합도 85%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💡 깃허브(GitHub) 포트폴리오 검증 및 개발 서버 보조' },
  { id: 'cr-401', step: 4, isTop: true, category: '🚀 마이크로 외주', title: '춘천시 청년 정책 앱 UI/UX 개선 마이크로 프로젝트', orgName: '춘천시 청년청', deadline: '2026-08-25', matchRate: 95, statusText: '✔ AI 맞춤 95% (최적)', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💰 프로젝트 기성금 120만 원 지급 | 시정 참여 공식 경력' },
  { id: 'cr-402', step: 4, isTop: true, category: '💼 단기 인턴', title: '춘천 IT기업 백엔드 개발자 실무 인턴 모집', orgName: '(주)강원테크솔루션', deadline: '2026-08-20', matchRate: 90, statusText: '✔ AI 맞춤 90%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💼 실무 클라우드 백엔드 개발 경험 | 정규직 전환율 80%' },
  { id: 'cr-403', step: 4, isTop: false, category: '💼 기업 캡스톤', title: '춘천 스마트팜 IT 융합 기업 연계 캡스톤 디자인', orgName: '(주)강원애그리텍', deadline: '2026-08-10', matchRate: 84, statusText: '✔ 적합도 84%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💡 기업 실무 과제 해결 | 완료 후 우수자 인턴 가점' },
  { id: 'cr-501', step: 5, isTop: true, category: '🤝 1:1 멘토링', title: '더존비즈온 현직 시니어 개발자 1:1 멘토링 패키지', orgName: '더존비즈온 춘천 캠퍼스', deadline: '2026-09-01', matchRate: 97, statusText: '✔ AI 맞춤 97% (최적)', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '🏢 백엔드 시니어 코드 리뷰 & 실무 면접 및 포트폴리오 피드백' },
  { id: 'cr-502', step: 5, isTop: true, category: '🤝 기업 과제', title: '춘천 앵커기업 기업 과제 수행 및 채용 설명회', orgName: '강원도경제진흥원', deadline: '2026-09-10', matchRate: 91, statusText: '✔ AI 맞춤 91%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💡 실제 현업 이슈 과제 풀이 | 우수 해결팀 채용 가산점' },
  { id: 'cr-503', step: 5, isTop: false, category: '🤝 포트폴리오', title: 'IT 인사담당자 초청 이력서·포트폴리오 클리닉', orgName: '춘천 일자리센터', deadline: '상시모집', matchRate: 86, statusText: '✔ 적합도 86%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💡 서류 탈락율을 줄이는 직군 맞춤 1:1 이력서 첨삭' },
  { id: 'cr-601', step: 6, isTop: true, category: '🎯 지역인재 채용', title: '강원정보문화진흥원 지역인재 SW 신입사원 공채', orgName: '강원정보문화진흥원', deadline: '2026-09-15', matchRate: 96, statusText: '✔ AI 맞춤 96% (최적)', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '🌟 춘천 지역인재 가산점 부여 | 주거 안정 지원금 연계' },
  { id: 'cr-602', step: 6, isTop: true, category: '🎯 채용 전환', title: '유바이오로직스 데이터 분석 IT 신입사원 모집', orgName: '유바이오로직스 춘천', deadline: '2026-09-20', matchRate: 93, statusText: '✔ AI 맞춤 93% (추천)', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💼 채용 전환형 인턴 3개월 근무 후 100% 정규직 발령' },
  { id: 'cr-603', step: 6, isTop: false, category: '🎯 신입 채용', title: '바디텍메드(주) 정보전략팀 SW 개발 신입 채용', orgName: '바디텍메드 춘천본사', deadline: '2026-09-30', matchRate: 87, statusText: '✔ 적합도 87%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '🏢 춘천 거주 청년 우선 선발 | 중소기업 취업장려금 연계' },
  { id: 'cr-701', step: 7, isTop: true, category: '🏡 주거·월세', title: '춘천 청년 월세 특별지원사업', orgName: '춘천시 청년지원과', deadline: '2026-09-30', matchRate: 98, statusText: '✔ AI 맞춤 98% (최적)', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '🏠 연간 총 240만 원 무상 주거비 지원으로 생활 부담 해소' },
  { id: 'cr-702', step: 7, isTop: true, category: '🎒 정주 복지', title: '대학생 및 청년 전입장려금 지원', orgName: '춘천시 자치행정과', deadline: '상시모집', matchRate: 95, statusText: '✔ AI 맞춤 95% (최적)', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '🎒 관내 대학교 전입 학생 학기별 정착 축하금 30만 원 지급' },
  { id: 'cr-703', step: 7, isTop: true, category: '💼 취업 장려', title: '중소기업 청년 취업장려금', orgName: '춘천시 기업지원과', deadline: '2026-11-30', matchRate: 94, statusText: '✔ AI 맞춤 94% (추천)', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '💰 춘천 소재 기업 근로 청년 연 최대 100만 원 지원 장려금' },
  { id: 'cr-704', step: 7, isTop: false, category: '🚌 교통 지원', title: '춘천 청년 대중교통비 지원 & 교통카드 패스', orgName: '춘천시 청년청', deadline: '상시모집', matchRate: 90, statusText: '✔ 적합도 90%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '🚌 춘천 시내버스 및 광역 교통비 연간 최대 15만 원 환급' },
  { id: 'cr-705', step: 7, isTop: false, category: '🏙️ 청년 공간', title: '커먼즈필드 춘천 청년 코워킹스페이스 무료 멤버십', orgName: '춘천사회혁신센터', deadline: '상시모집', matchRate: 88, statusText: '✔ 적합도 88%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '🏙️ 춘천 효자동 소재 청년 전용 공유 오피스 24시간 라운지' },
  { id: 'cr-706', step: 7, isTop: false, category: '🏡 전세 대출', title: '춘천 청년 전세보증금 대출 이자 지원 사업', orgName: '강원도 주택도시기금', deadline: '상시모집', matchRate: 85, statusText: '✔ 적합도 85%', statusBg: '#dcfce7', statusColor: '#16a34a', desc: '🏠 전세 및 보증금 대출 연 3.0% 이자 시청 직권 무상 대납' }
];

const getNoticesForCareerStep = (notices, stepNum, userProfile = null) => {
  const majorKeyword = userProfile?.majorCategory ? userProfile.majorCategory.split('·')[0].toLowerCase() : '';
  const jobKeyword = userProfile?.job ? userProfile.job.toLowerCase() : '';

  const matchingNotices = notices.filter(item => {
    const title = (item.title || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    const fullText = `${title} ${desc} ${cat}`;

    if (stepNum === 1) return cat.includes('교육') || fullText.includes('설명회') || fullText.includes('특강') || fullText.includes('상담') || fullText.includes('진로') || fullText.includes('탐방') || fullText.includes('컨설팅');
    if (stepNum === 2) {
      const isEdu = cat.includes('교육') || cat.includes('강좌') || fullText.includes('부트캠프') || fullText.includes('아카데미') || fullText.includes('스터디') || fullText.includes('코딩');
      const matchesMajor = majorKeyword ? fullText.includes(majorKeyword) || fullText.includes('it') || fullText.includes('sw') : true;
      return isEdu && matchesMajor;
    }
    if (stepNum === 3) return cat.includes('해커톤') || cat.includes('공모전') || fullText.includes('해커톤') || fullText.includes('공모전') || fullText.includes('대회') || fullText.includes('프로젝트') || fullText.includes('경진');
    if (stepNum === 4) return cat.includes('인턴') || cat.includes('대외활동') || fullText.includes('인턴') || fullText.includes('실무') || fullText.includes('실습') || fullText.includes('외주') || fullText.includes('캡스톤');
    if (stepNum === 5) {
      const isJobOrMentor = cat.includes('채용') || cat.includes('인턴') || fullText.includes('멘토링') || fullText.includes('채용') || fullText.includes('신입') || fullText.includes('공채');
      const matchesJob = jobKeyword ? fullText.includes(jobKeyword) || fullText.includes(majorKeyword) : true;
      return isJobOrMentor && matchesJob;
    }
    if (stepNum === 6) return cat.includes('채용') || cat.includes('일자리') || fullText.includes('채용') || fullText.includes('신입') || fullText.includes('공채') || fullText.includes('정규직') || fullText.includes('사원');
    if (stepNum === 7) {
      const isPolicyCat = cat.includes('지원금') || cat.includes('정책') || cat.includes('복지') || cat.includes('주거');
      const hasPolicyKeyword = fullText.includes('월세') || fullText.includes('주거') || fullText.includes('교통') || fullText.includes('전입') || fullText.includes('장려금') || fullText.includes('대출') || fullText.includes('공간');
      const isNotNoise = !fullText.includes('교육') && !fullText.includes('부트캠프') && !fullText.includes('국비') && !fullText.includes('클라우드') && !fullText.includes('강좌') && !fullText.includes('해커톤') && !fullText.includes('공모전') && !fullText.includes('채용') && !fullText.includes('인턴');
      return (isPolicyCat || hasPolicyKeyword) && isNotNoise;
    }
    return false;
  }).map(item => ({
    ...item,
    step: stepNum,
    isTop: false,
    matchRate: Math.floor(Math.random() * 8) + 92,
    statusText: '✔ 실시간 공고 매칭',
    statusBg: '#eff6ff',
    statusColor: '#2563eb',
    desc: item.desc || (item.description ? item.description.slice(0, 50) + '...' : '춘천 관내 실시간 공고')
  }));

  let curatedList = CAREER_OPPORTUNITIES.filter(o => {
    if (stepNum === 2) return o.step === 2 || o.step === 3;
    if (stepNum === 5) return o.step === 4 || o.step === 5 || o.step === 6;
    if (stepNum === 7) return o.step === 7;
    return o.step === stepNum;
  });

  const combined = [...curatedList, ...matchingNotices];
  return Array.from(new Map(combined.map(item => [String(item.id), item])).values());
};
const renderChatMessage = (text, notices, handleCardClick, setShowChat) => {
  if (!text) return '';
  const parts = text.split(/(\[.*?\]\(open_post\))/g);
  return parts.map((part, i) => {
    const match = part.match(/\[(.*?)\]\(open_post\)/);
    if (match) {
      return (
        <span
          key={i}
          onClick={() => {
            const foundPost = notices.find(n => n.title.includes(match[1]) || match[1].includes(n.title));
            if (foundPost) {
              handleCardClick(foundPost);
              setShowChat(false);
            } else {
              alert(`"${match[1]}" 공고 상세 페이지로 이동합니다.`);
            }
          }}
          style={{ color: '#2563eb', fontWeight: '800', cursor: 'pointer', textDecoration: 'underline', display: 'inline-block', margin: '4px 0' }}
        >
          🔗 [{match[1]}] (클릭하여 공고 확인하기)
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};
export default function App() {
  const [mainMode, setMainMode] = useState('directory');
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedSubCategory, setSelectedSubCategory] = useState('전체');
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 20;
  const PAGES_PER_BLOCK = 5;

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authModal, setAuthModal] = useState(null);
  const [userName, setUserName] = useState('춘천 청년');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [showMyPage, setShowMyPage] = useState(false);
  const [currentCalDate, setCurrentCalDate] = useState(new Date());
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0); // 0번 인덱스 = AI 커리어로드 고정 첫 페이지
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [showNoti, setShowNoti] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { type: 'bot', text: '안녕하세요! 춘천 청년들을 위한 AI 모아봄 챗봇입니다. 🎓\n\n어떤 공고나 정착 정책을 찾고 계신가요?' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [categoryWeights, setCategoryWeights] = useState({});
  const [viewCounts, setViewCounts] = useState({});
  const [serverRecommendedPicks, setServerRecommendedPicks] = useState([]);

  const [bookmarks, setBookmarks] = useState(() => {
    try { const saved = localStorage.getItem('bookmarks'); return saved ? JSON.parse(saved) : []; } catch (error) { return []; }
  });
  const [memos, setMemos] = useState(() => {
    try { const saved = localStorage.getItem('memos'); return saved ? JSON.parse(saved) : {}; } catch (error) { return {}; }
  });
  const [currentMemo, setCurrentMemo] = useState('');
  const [editingMemoId, setEditingMemoId] = useState(null);
  const [editingMemoText, setEditingMemoText] = useState('');

  const [careerScreen, setCareerScreen] = useState('landing');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [userProfile, setUserProfile] = useState({
    eduType: '대학 재학',
    grade: '3학년',
    majorCategory: 'IT·소프트웨어',
    job: '백엔드 개발',
    projectCount: '0~1개 (없음/1개)',
    teamExperience: '없음',
    timeline: '6개월 이내 (바로 실전)',
    intention: '춘천 근무 적극 고려 (주거·취업 장려금 혜택 원함)'
  });
  const [diagnosedStepNum, setDiagnosedStepNum] = useState(3);
  const [diagnosedTitle, setDiagnosedTitle] = useState('프로젝트 경험 보완');
  const [isRoadmapSelected, setIsRoadmapSelected] = useState(false);
  const [selectedRoadmapIdx, setSelectedRoadmapIdx] = useState(null);
  const [isOpportunityActioned, setIsOpportunityActioned] = useState(false);
  const [isJobActioned, setIsJobActioned] = useState(false);
  const [seoulSalary, setSeoulSalary] = useState(3200);
  const [seoulRent, setSeoulRent] = useState(80);
  const [chuncheonRent, setChuncheonRent] = useState(35);

  const seoulMonthlyNet = Math.round((seoulSalary / 12) - seoulRent - 18 - 8);
  const chuncheonSupport = 47;
  const chuncheonMonthlyNet = Math.round((seoulSalary / 12) - chuncheonRent - 6 + chuncheonSupport);
  const monthlySavingDiff = chuncheonMonthlyNet - seoulMonthlyNet;
  const yearlySavingDiff = monthlySavingDiff * 12;

  const BASE_URL = 'https://moabom-backend.onrender.com';

  const handleImgError = (e) => {
    e.target.onerror = null;
    e.target.src = '/moabom.png';
  };

  useEffect(() => { localStorage.setItem('bookmarks', JSON.stringify(bookmarks)); }, [bookmarks]);
  useEffect(() => { localStorage.setItem('memos', JSON.stringify(memos)); }, [memos]);

  useEffect(() => {
    const fetchNotices = async () => {
      if (page > 1) setIsLoadingMore(true);
      else setLoading(true);

      const API_URL = `${BASE_URL}/api/opportunities?page=${page}&size=100`;
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`서버 응답 오류: ${res.status}`);
        const data = await res.json();
        const listData = Array.isArray(data) ? data : data.content || data.items || data.data || [];
        if (listData.length < 100) setHasMore(false);
        const normalizedData = listData.map((item, index) => normalizeItem(item, index + (page - 1) * 100));

        if (page === 1) setNotices(normalizedData);
        else {
          setNotices(prev => [...prev, ...normalizedData]);
          setCurrentPage((page - 1) * PAGES_PER_BLOCK + 1);
        }
      } catch (err) {
        console.error("공고 데이터 로딩 에러:", err);
        if (page === 1) setNotices([]);
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    };
    fetchNotices();
  }, [page]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedName = localStorage.getItem('userName');
    if (token) {
      setIsLoggedIn(true);
      if (savedName) setUserName(savedName);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowTopBtn(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // 실시간 공고 상위 3개 추출
  const topPicks = notices.length > 0 ? [...notices].sort((a, b) => (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0)).slice(0, 3) : [];

  // 자동 슬라이드 타이머 (4.5초마다 0번 ➔ 1번 ➔ 2번 ➔ 3번 순환)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIdx((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const nextBanner = (e) => { e.stopPropagation(); setCurrentBannerIdx((prev) => (prev + 1) % 4); };
  const prevBanner = (e) => { e.stopPropagation(); setCurrentBannerIdx((prev) => (prev === 0 ? 3 : prev - 1)); };

  const displayRecommendedPicks = useMemo(() => {
    if (serverRecommendedPicks && serverRecommendedPicks.length > 0) return serverRecommendedPicks;
    if (!notices || notices.length === 0) return [];
    return [...notices].sort((a, b) => (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0)).slice(0, 6);
  }, [serverRecommendedPicks, notices, viewCounts]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;
    const isLogin = authModal === 'login';
    const apiUrl = isLogin ? '/api/auth/login' : '/api/auth/signup';

    try {
      const response = await fetch(`${BASE_URL}${apiUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) localStorage.setItem('token', data.token);
        const newUserName = data.name || data.user?.name || email.split('@')[0];
        localStorage.setItem('userName', newUserName);
        setIsLoggedIn(true);
        setUserName(newUserName);
        setAuthModal(null);
        alert(`${isLogin ? '로그인' : '회원가입'}이 완료되었습니다! 👋`);
        return;
      }
    } catch (error) {
      console.warn('서버 로그인 연결 실패, 안전 로컬 모드로 진행합니다.', error);
    }

    const fallbackName = email ? email.split('@')[0] : '춘천 청년';
    localStorage.setItem('userName', fallbackName);
    setIsLoggedIn(true);
    setUserName(fallbackName);
    setAuthModal(null);
    alert(`${isLogin ? '로그인' : '회원가입'}이 완료되었습니다! (로컬 모드) 👋`);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName('춘천 청년');
    setShowMyPage(false);
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setServerRecommendedPicks([]);
    alert('로그아웃 되었습니다.');
  };

  const handleCategoryClick = (tab) => {
    setSelectedCategory(tab);
    setSelectedSubCategory('전체');
    setCurrentPage(1);
    setShowBookmarksOnly(false);
    setShowMyPage(false);
    setSelectedPost(null);
  };

  const handleCardClick = (post) => {
    setSelectedPost(post);
    setShowMyPage(false);
    setCurrentMemo(memos[String(post.id)] || '');
    scrollToTop();
  };

  const toggleBookmark = (e, item) => {
    if (e) e.stopPropagation();
    const itemIdStr = String(item.id);
    setBookmarks((prev) => prev.includes(itemIdStr) ? prev.filter((bId) => String(bId) !== itemIdStr) : [...prev, itemIdStr]);
  };

  const handleSaveMemo = () => {
    if (!selectedPost) return;
    const postIdStr = String(selectedPost.id);
    setMemos(prev => {
      const updated = { ...prev };
      if (!currentMemo.trim()) delete updated[postIdStr];
      else updated[postIdStr] = currentMemo;
      return updated;
    });
    alert('메모가 안전하게 저장되었습니다! 📝');
  };

  const handleDeleteMemo = (postId) => {
    if (window.confirm('이 메모를 삭제하시겠습니까?')) {
      setMemos((prev) => {
        const updated = { ...prev };
        delete updated[String(postId)];
        return updated;
      });
    }
  };

  const handleUpdateMemo = (postId) => {
    setMemos((prev) => {
      const updated = { ...prev };
      if (!editingMemoText.trim()) delete updated[String(postId)];
      else updated[String(postId)] = editingMemoText;
      return updated;
    });
    setEditingMemoId(null);
  };

  const getCurrentMapping = (eduType) => eduType === '고졸·특성화고 (학력무관)' ? VOCATIONAL_JOB_MAPPING : MAJOR_JOB_MAPPING;

  const handleEduTypeChange = (edu) => {
    const mapping = getCurrentMapping(edu);
    const defaultJob = mapping[userProfile.majorCategory][0];
    setUserProfile({ ...userProfile, eduType: edu, job: defaultJob });
  };

  const handleMajorCategoryChange = (category) => {
    const mapping = getCurrentMapping(userProfile.eduType);
    const defaultJob = mapping[category][0];
    setUserProfile({ ...userProfile, majorCategory: category, job: defaultJob });
  };

  const handleFinishOnboarding = () => {
    let step = 3;
    let title = '프로젝트 경험 보완';
    if (userProfile.projectCount === '2개 이상' || userProfile.teamExperience !== '없음') {
      step = 4;
      title = '실무 및 인턴십 준비';
    }
    setDiagnosedStepNum(step);
    setDiagnosedTitle(title);
    setCareerScreen('step1_roadmap');
  };

  const filteredData = notices.filter((item) => {
    if (showBookmarksOnly && !bookmarks.includes(String(item.id))) return false;
    const matchesCategory = selectedCategory === '전체' || item.category.includes(selectedCategory);
    let matchesSubCategory = true;
    if (selectedSubCategory !== '전체') {
      const subKeywords = selectedSubCategory.split('/').map(k => k.trim().toLowerCase());
      let expandedKeywords = [...subKeywords];
      subKeywords.forEach(keyword => {
        if (SUBCATEGORY_SYNONYMS[keyword]) expandedKeywords = [...expandedKeywords, ...SUBCATEGORY_SYNONYMS[keyword]];
      });
      expandedKeywords = [...new Set(expandedKeywords)];
      matchesSubCategory = expandedKeywords.some(keyword =>
        (item.title || '').toLowerCase().includes(keyword) ||
        (Array.isArray(item.topics) && item.topics.some(t => String(t).toLowerCase().includes(keyword))) ||
        (item.description || '').toLowerCase().includes(keyword)
      );
    }
    const searchLower = debouncedSearchTerm ? debouncedSearchTerm.toLowerCase() : '';
    const matchesSearch = item.title.toLowerCase().includes(searchLower) ||
                          item.category.toLowerCase().includes(searchLower) ||
                          item.orgName.toLowerCase().includes(searchLower);

    let isExpired = false;
    if (item.deadline) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const end = new Date(item.deadline);
      if (!isNaN(end.getTime()) && end < today) isExpired = true;
    }
    if (showActiveOnly && isExpired) return false;
    return matchesCategory && matchesSubCategory && matchesSearch;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortBy === 'popular') return (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0);
    if (sortBy === 'recommend') return (categoryWeights[b.category] || 0) - (categoryWeights[a.category] || 0);
    if (sortBy === 'deadline') {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    }
    return a.id > b.id ? -1 : 1;
  });

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const currentDisplayData = sortedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const allBookmarkedItems = [
    ...notices.filter(n => bookmarks.includes(String(n.id))),
    ...CAREER_OPPORTUNITIES.filter(n => bookmarks.includes(String(n.id)))
  ];
  const uniqueBookmarkedItems = Array.from(new Map(allBookmarkedItems.map(item => [String(item.id), item])).values());

  return (
    <div className="app-container">
      {/* 글로벌 헤더 */}
      <header className="top-header">
        <div className="header-inner">
          <div
            className="logo-area"
            onClick={() => {
              setMainMode('directory');
              setSelectedPost(null);
              setShowMyPage(false);
              setSearchTerm('');
              handleCategoryClick('전체');
            }}
          >
            <img src="/moabom.png" alt="모아봄 로고" className="logo-icon-img" onError={handleImgError} />
            <h1 className="logo-text">모아봄</h1>
          </div>

          <div className="search-area">
            <div className="search-bar">
              <input
                type="text"
                placeholder="공고 제목, 분야, 주관기관 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && <button className="btn-clear" onClick={() => setSearchTerm('')}>✕</button>}
              <button className="btn-search">🔍</button>
            </div>

            <div className="header-links">
              <button
                onClick={() => {
                  setMainMode('career_road');
                  setCareerScreen('landing');
                  setSelectedPost(null);
                  setShowMyPage(false);
                }}
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                  color: '#fff',
                  padding: '10px 18px',
                  borderRadius: '30px',
                  fontWeight: '800',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🚀 AI 커리어로드
              </button>

              <button className="noti-btn" onClick={() => setShowNoti(!showNoti)}>🔔<span className="noti-badge"></span></button>
              {showNoti && (
                <div className="noti-dropdown animate-fade-in">
                  <div className="noti-header">알림 <span className="noti-read-all">모두 읽음 처리</span></div>
                  <div className="noti-item"><h4>🔥 [해커톤] 신청 마감 D-1</h4><p>북마크하신 '강원 해커톤 대회' 마감이 내일입니다. 잊지 말고 지원하세요!</p></div>
                  <div className="noti-item"><h4>✨ 맞춤 공고 추천</h4><p>{userName}님을 위한 새로운 마케팅 인턴 공고가 3건 등록되었습니다.</p></div>
                </div>
              )}

              {isLoggedIn ? (
                <div className="user-info">
                  <button
                    className={`btn-mypage-top ${showMyPage ? 'active' : ''}`}
                    onClick={() => {
                      setShowMyPage(true);
                      setSelectedPost(null);
                    }}
                  >
                    👤 마이페이지
                  </button>
                  <span className="user-name">{userName}님</span>
                  <button className="btn-text" onClick={handleLogout}>로그아웃</button>
                </div>
              ) : (
                <>
                  <button className="btn-text" onClick={() => setAuthModal('login')}>로그인</button>
                  <button className="btn-text primary" onClick={() => setAuthModal('signup')}>회원가입</button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 상세 모달 페이지 */}
      {selectedPost ? (
        <main className="detail-main animate-fade-in">
          <button className="back-btn" onClick={() => setSelectedPost(null)}>← 이전 목록으로 돌아가기</button>
          <div className="detail-card">
            <div className="detail-tags">
              <span className="detail-tag-cat">{selectedPost.category}</span>
              <span className="detail-tag-src">출처: {selectedPost.sourceName || '춘천 청년 커리어 플랫폼'}</span>
            </div>
            <h1 className="detail-title">{selectedPost.title}</h1>
            <img src={selectedPost.imageUrl} alt="포스터" className="detail-img" onError={handleImgError} />
            <div className="detail-info-grid">
              <p className="detail-info-item"><strong>🏢 주관기관:</strong> {selectedPost.orgName}</p>
              <p className="detail-info-item"><strong>🎯 지원대상:</strong> {selectedPost.targets || '춘천 관내 청년 및 거주자'}</p>
              <p className="detail-info-item"><strong>⏳ 모집마감:</strong> <span className="detail-highlight">{formatDateString(selectedPost.deadline)} ({calculateDDay(selectedPost.deadline)})</span></p>
              {selectedPost.desc && (
                <p className="detail-info-full" style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: '8px', color: '#1e3a8a' }}>
                  <strong>🌟 주요 혜택:</strong> {selectedPost.desc}
                </p>
              )}
            </div>
            <h3 className="detail-subtitle">상세 안내</h3>
            <div className="detail-desc">{selectedPost.description || selectedPost.desc || '상세 내용이 등록된 춘천 관내 추천 공고입니다.'}</div>
            <button className="btn-ai-extract" onClick={() => {
              setShowChat(true);
              setChatInput(`[${selectedPost.title}] 공고에 지원하려고 해. 예상 면접 질문 3가지와 자소서 작성 팁을 알려줘!`);
            }}>
              ✨ 이 공고 맞춤 AI 면접/자소서 팁 추출하기
            </button>
            <div className="detail-link-wrap">
              <a href={selectedPost.url} target="_blank" rel="noreferrer" className="detail-link-btn">원문 페이지로 이동하여 확인하기 🔗</a>
            </div>

            {/* 비밀 메모장 */}
            <div className="memo-pad animate-fade-in">
              <h3 className="memo-title">📝 {userName}님의 비밀 메모장</h3>
              <textarea placeholder="이 공고에 대한 나만의 일정이나 메모를 자유롭게 남겨보세요!" value={currentMemo} onChange={(e) => setCurrentMemo(e.target.value)} />
              <div className="memo-btn-wrap"><button onClick={handleSaveMemo}>메모 저장하기</button></div>
            </div>
          </div>
        </main>
      ) : showMyPage ? (
        /* 마이페이지 */
        <main className="mypage-main animate-fade-in">
          <button className="back-btn" onClick={() => setShowMyPage(false)}>← 전체 화면으로 돌아가기</button>
          <div className="mypage-header-banner">
            <div className="mypage-profile-info">
              <div className="profile-avatar">👤</div>
              <div>
                <h2>{userName}님의 마이페이지</h2>
                <p>내가 찜한 공고와 작성한 메모를 한곳에서 스마트하게 관리하세요.</p>
              </div>
            </div>
            <div className="mypage-stats">
              <div className="stat-box">
                <span>작성한 메모</span>
                <strong>{Object.keys(memos).filter(k => memos[k]?.trim()).length}건</strong>
              </div>
              <div className="stat-box">
                <span>⭐ 북마크</span>
                <strong>{bookmarks.length}건</strong>
              </div>
            </div>
          </div>

          <section className="mypage-section">
            <h3 className="mypage-section-title">📝 메모장 몰아보기 (스크랩북 & 지원 관리 도구)</h3>
            <p className="mypage-section-desc">공고별로 작성한 메모를 바로 확인하고 즉시 수정하거나 삭제할 수 있습니다.</p>
            {Object.keys(memos).filter(k => memos[k]?.trim()).length === 0 ? (
              <div className="mypage-empty">
                <span>📝</span>
                <p>아직 작성된 메모가 없습니다. 관심 있는 공고에 나만의 메모를 남겨보세요!</p>
              </div>
            ) : (
              <div className="memo-card-grid">
                {Object.entries(memos).map(([postId, memoText]) => {
                  if (!memoText?.trim()) return null;
                  const post = [...notices, ...CAREER_OPPORTUNITIES].find(n => String(n.id) === String(postId));
                  const title = post ? post.title : `저장된 공고 #${postId}`;
                  const orgName = post ? post.orgName : '춘천시 관내 기관';
                  const category = post ? post.category : '기타';

                  return (
                    <div key={postId} className="memo-manage-card">
                      <div>
                        <div className="memo-card-header">
                          <span className="memo-badge">{category}</span>
                          <span className="memo-dday">{post ? calculateDDay(post.deadline) : '상시'}</span>
                        </div>
                        <h4 className="memo-post-title" onClick={() => post && handleCardClick(post)}>{title}</h4>
                        <p className="memo-post-org">🏢 {orgName}</p>

                        {editingMemoId === postId ? (
                          <textarea
                            className="auth-input"
                            style={{ minHeight: '80px' }}
                            value={editingMemoText}
                            onChange={(e) => setEditingMemoText(e.target.value)}
                          />
                        ) : (
                          <div className="memo-text-box">{memoText}</div>
                        )}
                      </div>

                      <div className="memo-card-footer">
                        {editingMemoId === postId ? (
                          <>
                            <button className="btn-memo-action" onClick={() => handleUpdateMemo(postId)}>저장</button>
                            <button className="btn-memo-action delete" onClick={() => setEditingMemoId(null)}>취소</button>
                          </>
                        ) : (
                          <>
                            <button className="btn-memo-action" onClick={() => { setEditingMemoId(postId); setEditingMemoText(memoText); }}>✏️ 수정</button>
                            <button className="btn-memo-action delete" onClick={() => handleDeleteMemo(postId)}>🗑️ 삭제</button>
                            {post && <button className="btn-memo-go" onClick={() => handleCardClick(post)}>공고 보기 &gt;</button>}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mypage-section" style={{ marginTop: '48px' }}>
            <h3 className="mypage-section-title">⭐ 내가 찜한 맞춤 공고</h3>
            <p className="mypage-section-desc">내가 눈여겨보고 찜한 공고들을 놓치지 말고 체크하세요.</p>
            {uniqueBookmarkedItems.length === 0 ? (
              <div className="mypage-empty">
                <span>⭐</span>
                <p>아직 찜한 공고가 없습니다. 마음에 드는 공고의 별 모양을 눌러보세요!</p>
              </div>
            ) : (
              <div className="force-grid">
                {uniqueBookmarkedItems.map((item) => {
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const isExpired = item.deadline ? new Date(item.deadline) < today : false;
                  return (
                    <div key={item.id} className={`force-card ${isExpired ? 'expired' : ''}`} onClick={() => handleCardClick(item)}>
                      <div className="force-img-wrap">
                        <img src={item.imageUrl || '/moabom.png'} alt={item.title} onError={handleImgError} />
                        {isExpired && <div className="expired-overlay">마감됨</div>}
                        <button className="bookmark-btn" onClick={(e) => toggleBookmark(e, item)}>⭐</button>
                      </div>
                      <div className="force-body">
                        <div className="card-header-row"><span className="card-badge">{item.category}</span><span className={`card-dday ${isExpired ? 'expired' : 'active'}`}>{calculateDDay(item.deadline)}</span></div>
                        <h3 className="card-title">{item.title}</h3>
                        <p className="card-org">{item.orgName}</p>
                        <div className="card-meta"><span>마감: {formatDateString(item.deadline)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      ) : mainMode === 'career_road' ? (
        /* AI 커리어로드 모드 */
        <div>
          {careerScreen === 'landing' && (
            <div style={{
              minHeight: 'calc(100vh - 80px)',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              padding: '40px 20px'
            }}>
              <h1 style={{ fontSize: '3.4rem', fontWeight: '900', lineHeight: '1.25', marginBottom: '32px', letterSpacing: '-1.5px' }}>
                모아봄에서 시작하는<br />나만의 커리어 로드
              </h1>
              <button
                onClick={() => {
                  setOnboardingStep(1);
                  setCareerScreen('onboarding');
                }}
                style={{
                  background: '#ffffff',
                  color: '#1e3a8a',
                  border: 'none',
                  padding: '18px 48px',
                  borderRadius: '50px',
                  fontWeight: '900',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                🚀 모아봄 시작하기 ➔
              </button>
            </div>
          )}

          {careerScreen === 'onboarding' && (
            <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: '#f1f5f9' }}>
              <div style={{ background: '#fff', width: '100%', maxWidth: '660px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <div style={{ background: '#2563eb', color: '#fff', padding: '32px' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '6px' }}>🌞 춘천 청년 맞춤 스마트 진단</h2>
                  <p style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '20px' }}>나의 학력 상태와 직무에 맞춘 춘천시 정주 기회를 분석합니다.</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3].map(num => (
                      <div key={num} style={{ flex: 1, height: '6px', borderRadius: '3px', background: num <= onboardingStep ? '#fff' : 'rgba(255,255,255,0.3)' }} />
                    ))}
                  </div>
                </div>

                <div style={{ padding: '36px 32px', minHeight: '300px' }}>
                  {onboardingStep === 1 && (
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '18px', color: '#0f172a' }}>1. 학력 상태 및 희망 직무 선택</h3>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>학력 / 현재 상태</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          {['대학 재학', '대학 졸업 / 취준생', '고졸·특성화고 (학력무관)'].map(edu => (
                            <button
                              key={edu}
                              onClick={() => handleEduTypeChange(edu)}
                              style={{ padding: '12px 8px', borderRadius: '10px', border: userProfile.eduType === edu ? '2px solid #2563eb' : '1px solid #cbd5e1', background: userProfile.eduType === edu ? '#eff6ff' : '#fff', color: userProfile.eduType === edu ? '#2563eb' : '#475569', fontWeight: '800', cursor: 'pointer', fontSize: '0.88rem' }}
                            >
                              {edu}
                            </button>
                          ))}
                        </div>
                      </div>

                      {userProfile.eduType === '대학 재학' && (
                        <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#2563eb', marginBottom: '8px' }}>✔ 현재 재학 중인 학년</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                            {['1학년', '2학년', '3학년', '4학년'].map(grade => (
                              <button
                                key={grade}
                                onClick={() => setUserProfile({ ...userProfile, grade })}
                                style={{ padding: '10px', borderRadius: '8px', border: userProfile.grade === grade ? '2px solid #2563eb' : '1px solid #e2e8f0', background: userProfile.grade === grade ? '#2563eb' : '#fff', color: userProfile.grade === grade ? '#fff' : '#475569', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' }}
                              >
                                {grade}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>
                          {userProfile.eduType === '고졸·특성화고 (학력무관)' ? '관심 산업 분야' : '전공 계열 / 관심 분야'}
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                          {Object.keys(MAJOR_JOB_MAPPING).map(major => (
                            <button
                              key={major}
                              onClick={() => handleMajorCategoryChange(major)}
                              style={{ padding: '13px', borderRadius: '10px', border: userProfile.majorCategory === major ? '2px solid #2563eb' : '1px solid #cbd5e1', background: userProfile.majorCategory === major ? '#eff6ff' : '#fff', color: userProfile.majorCategory === major ? '#2563eb' : '#475569', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem' }}
                            >
                              {major}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#2563eb', marginBottom: '8px' }}>
                          ⚡ [{userProfile.majorCategory}] {userProfile.eduType === '고졸·특성화고 (학력무관)' ? '실무 중심 추천 직무' : '세부 희망 직무'}
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {getCurrentMapping(userProfile.eduType)[userProfile.majorCategory].map(job => (
                            <button
                              key={job}
                              onClick={() => setUserProfile({ ...userProfile, job })}
                              style={{ padding: '11px 16px', borderRadius: '30px', border: userProfile.job === job ? '2px solid #2563eb' : '1px solid #cbd5e1', background: userProfile.job === job ? '#2563eb' : '#fff', color: userProfile.job === job ? '#fff' : '#475569', fontWeight: '800', cursor: 'pointer', fontSize: '0.88rem' }}
                            >
                              {job}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {onboardingStep === 2 && (
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>2. 진행한 프로젝트 및 협업 경험</h3>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>진행한 프로젝트 수</label>
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
                    onClick={() => onboardingStep > 1 ? setOnboardingStep(onboardingStep - 1) : setCareerScreen('landing')}
                    style={{ padding: '10px 20px', border: 'none', background: '#f1f5f9', color: '#64748b', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    ← 이전
                  </button>
                  <span style={{ fontWeight: '800', color: '#64748b' }}>{onboardingStep} / 3 단계</span>
                  <button
                    onClick={() => onboardingStep < 3 ? setOnboardingStep(onboardingStep + 1) : handleFinishOnboarding()}
                    style={{ padding: '12px 28px', border: 'none', background: '#2563eb', color: '#fff', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    {onboardingStep < 3 ? '다음 ➔' : '진단 완료 및 로드맵 보기 ✔'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {careerScreen === 'step1_roadmap' && (
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '6px 14px', borderRadius: '20px', fontWeight: '800' }}>
                  STEP 1 / 4 : AI 맞춤 커리어 로드맵
                </span>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>
                  {userProfile.eduType === '대학 재학' ? `${userProfile.grade} · ` : ''}{userProfile.job} 트랙
                </span>
              </div>

              <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '8px', color: '#0f172a' }}>
                현재 단계에서 집중해야 할 5단계 빌드업 로드맵입니다
              </h2>
              <p style={{ color: '#64748b', marginBottom: '32px' }}>
                💡 참여를 희망하는 단계를 1개 이상 선택(클릭)하면 <b>다음 단계(실전 빌드업 기회) 이동 버튼이 활성화</b>됩니다.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '40px' }}>
                {[
                  { step: '1단계', title: '직무 탐색 & 상담', desc: '직무 비교 특강 및 컨설팅', benefit: '💡 진로 설명회 무료' },
                  { step: '2단계', title: '기초 역량 학습', desc: '코딩 및 실습 부트캠프', benefit: '💡 실습 수당 월 31만' },
                  { step: '3단계', title: '춘천시 공공 해커톤', desc: '공공 API 활용 시정 프로젝트', benefit: '💰 활동비 150만 원' },
                  { step: '4단계', title: '춘천 IT기업 인턴십', desc: '강원테크솔루션 등 실무 연계', benefit: '💼 정규직 전환 연계' },
                  { step: '5단계', title: '지역 IT기업 정착', desc: '춘천 관내 전문직군 정주', benefit: '🏡 취업장려금 지급' }
                ].map((item, idx) => {
                  const isSelected = selectedRoadmapIdx === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => { setSelectedRoadmapIdx(idx); setIsRoadmapSelected(true); }}
                      style={{
                        background: isSelected ? '#eff6ff' : '#fff',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '20px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isSelected ? '0 10px 20px rgba(37,99,235,0.1)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: isSelected ? '#2563eb' : '#64748b' }}>{item.step}</span>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '8px 0', color: '#0f172a' }}>{item.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.4', marginBottom: '16px' }}>{item.desc}</p>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#16a34a', background: '#f1f5f9', padding: '6px 10px', borderRadius: '6px' }}>
                        {item.benefit}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ textAlign: 'right', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                <button
                  disabled={!isRoadmapSelected}
                  onClick={() => setCareerScreen('step2_now')}
                  style={{
                    padding: '16px 36px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isRoadmapSelected ? '#2563eb' : '#cbd5e1',
                    color: '#fff',
                    fontSize: '1.1rem',
                    fontWeight: '900',
                    cursor: isRoadmapSelected ? 'pointer' : 'not-allowed',
                    boxShadow: isRoadmapSelected ? '0 10px 20px rgba(37,99,235,0.3)' : 'none'
                  }}
                >
                  {isRoadmapSelected ? '선택 완료 — STEP 2. 역량 빌드업 기회 보기 ➔' : '↑ 단계를 선택하면 버튼이 열립니다'}
                </button>
              </div>
            </div>
          )}

          {/* 🌟 STEP 2 화면: 역량 빌드업 */}
          {careerScreen === 'step2_now' && (
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '6px 14px', borderRadius: '20px', fontWeight: '800' }}>
                  STEP 2 / 4 : 역량 빌드업 — {diagnosedTitle}
                </span>
                <button onClick={() => setCareerScreen('step1_roadmap')} style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: '700', cursor: 'pointer' }}>
                  ← 이전 로드맵으로
                </button>
              </div>

              <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '6px', color: '#0f172a' }}>
                실제 등록된 춘천 관내 실전 빌드업 기회입니다
              </h2>
              <p style={{ color: '#64748b', marginBottom: '28px' }}>
                💡 실제 서버 공고 및 추천 공고에서 원하는 항목의 <b>⭐ 찜(북마크)</b>이나 <b>📝 메모</b>를 자유롭게 작성하세요.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '40px' }}>
                {getNoticesForCareerStep(notices, 2, userProfile).slice(0, 6).map(item => {
                  const isBookmarked = bookmarks.includes(String(item.id));
                  const hasMemo = Boolean(memos[String(item.id)]?.trim());
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        toggleBookmark(null, item);
                        setIsOpportunityActioned(true);
                      }}
                      style={{
                        background: '#fff',
                        border: isBookmarked ? '2px solid #2563eb' : (item.isTop ? '2px solid #93c5fd' : '1px solid #e2e8f0'),
                        borderRadius: '16px',
                        padding: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isBookmarked ? '0 10px 20px rgba(37,99,235,0.1)' : 'none',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: '800' }}>{item.category}</span>
                            {hasMemo && <span style={{ fontSize: '0.75rem', background: '#fef9c3', color: '#854d0e', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>📝 메모 있음</span>}
                          </div>
                          <span style={{ fontSize: '1.2rem' }}>{isBookmarked ? '⭐' : '☆'}</span>
                        </div>

                        <div style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: '800', background: item.statusBg, color: item.statusColor, padding: '4px 10px', borderRadius: '6px', marginBottom: '12px' }}>
                          {item.statusText}
                        </div>

                        <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>{item.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>🏢 {item.orgName}</p>
                      </div>

                      <div>
                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', color: '#1e3a8a', marginBottom: '12px' }}>
                          {item.desc}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(item);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            color: '#334155',
                            cursor: 'pointer'
                          }}
                        >
                          📝 이 공고 메모하기 &gt;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ textAlign: 'right', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                <button
                  disabled={!isOpportunityActioned}
                  onClick={() => setCareerScreen('step3_job')}
                  style={{
                    padding: '16px 36px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isOpportunityActioned ? '#2563eb' : '#cbd5e1',
                    color: '#fff',
                    fontSize: '1.1rem',
                    fontWeight: '900',
                    cursor: isOpportunityActioned ? 'pointer' : 'not-allowed',
                    boxShadow: isOpportunityActioned ? '0 10px 20px rgba(37,99,235,0.3)' : 'none'
                  }}
                >
                  {isOpportunityActioned ? '기회 찜 완료 — STEP 3. 기업 연결 & 취업 보기 ➔' : '↑ 공고를 1개 이상 찜하면 버튼이 열립니다'}
                </button>
              </div>
            </div>
          )}

          {/* 🌟 STEP 3 화면: 기업 연결 & 취업 */}
          {careerScreen === 'step3_job' && (
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '6px 14px', borderRadius: '20px', fontWeight: '800' }}>
                  STEP 3 / 4 : 기업 연결 · 취업 · 창업 매칭
                </span>
                <button onClick={() => setCareerScreen('step2_now')} style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: '700', cursor: 'pointer' }}>
                  ← 이전 실전 빌드업으로
                </button>
              </div>

              <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '6px', color: '#0f172a' }}>
                실제 등록된 춘천 관내 기업 연결 및 일자리 공고입니다
              </h2>
              <p style={{ color: '#64748b', marginBottom: '28px' }}>
                💡 실제 채용 및 인턴십 공고에서 원하는 항목의 <b>⭐ 찜(북마크)</b>이나 <b>📝 메모</b>를 자유롭게 작성하세요.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '40px' }}>
                {getNoticesForCareerStep(notices, 5, userProfile).slice(0, 6).map(item => {
                  const isBookmarked = bookmarks.includes(String(item.id));
                  const hasMemo = Boolean(memos[String(item.id)]?.trim());
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        toggleBookmark(null, item);
                        setIsJobActioned(true);
                      }}
                      style={{
                        background: '#fff',
                        border: isBookmarked ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isBookmarked ? '0 10px 20px rgba(124,58,237,0.1)' : 'none',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', background: '#ede9fe', color: '#6d28d9', padding: '4px 8px', borderRadius: '6px', fontWeight: '800' }}>{item.category}</span>
                            {hasMemo && <span style={{ fontSize: '0.75rem', background: '#fef9c3', color: '#854d0e', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>📝 메모 있음</span>}
                          </div>
                          <span style={{ fontSize: '1.2rem' }}>{isBookmarked ? '⭐' : '☆'}</span>
                        </div>

                        <div style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: '800', background: item.statusBg, color: item.statusColor, padding: '4px 10px', borderRadius: '6px', marginBottom: '12px' }}>
                          {item.statusText}
                        </div>

                        <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>{item.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>🏢 {item.orgName}</p>
                      </div>

                      <div>
                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', color: '#1e3a8a', marginBottom: '12px' }}>
                          {item.desc}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(item);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            color: '#334155',
                            cursor: 'pointer'
                          }}
                        >
                          📝 이 공고 메모하기 &gt;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ textAlign: 'right', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                <button
                  disabled={!isJobActioned}
                  onClick={() => setCareerScreen('step4_settle')}
                  style={{
                    padding: '16px 36px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isJobActioned ? '#7c3aed' : '#cbd5e1',
                    color: '#fff',
                    fontSize: '1.1rem',
                    fontWeight: '900',
                    cursor: isJobActioned ? 'pointer' : 'not-allowed',
                    boxShadow: isJobActioned ? '0 10px 20px rgba(124,58,237,0.3)' : 'none'
                  }}
                >
                  {isJobActioned ? '취업 기회 찜 완료 — STEP 4. 최종 정착 & 인프라 보기 ➔' : '↑ 공고를 1개 이상 찜하면 버튼이 열립니다'}
                </button>
              </div>
            </div>
          )}

          {/* 🌟 STEP 4 화면: 최종 정착 & 인프라 (순수 주거/복지 정책만 보장) */}
          {careerScreen === 'step4_settle' && (
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ background: '#0284c7', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontWeight: '800' }}>
                  STEP 4 / 4 : 최종 정착 — 인프라 & 주거·복지 지원
                </span>
                <button onClick={() => setCareerScreen('step3_job')} style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: '700', cursor: 'pointer' }}>
                  ← 이전 기업 연결로
                </button>
              </div>

              <h2 style={{ fontSize: '2.2rem', fontWeight: '900', marginBottom: '6px', color: '#0f172a' }}>
                주거·월세·교통·인프라 지원이 더해져 완성되는 춘천 정착
              </h2>
              <p style={{ color: '#64748b', marginBottom: '28px' }}>
                💡 춘천시가 제공하는 정착 정책을 확인하고, <b>아래로 스크롤하여 서울 취업 대비 자산 형성 차이</b>를 체험하세요.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '56px' }}>
                {getNoticesForCareerStep(notices, 7, userProfile).slice(0, 6).map(item => {
                  const hasMemo = Boolean(memos[String(item.id)]?.trim());
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontWeight: '800' }}>{item.category}</span>
                            {hasMemo && <span style={{ fontSize: '0.75rem', background: '#fef9c3', color: '#854d0e', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>📝 메모 있음</span>}
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', background: item.statusBg, color: item.statusColor, padding: '3px 8px', borderRadius: '6px' }}>{item.statusText}</span>
                        </div>

                        <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>{item.title}</h4>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>🏢 {item.orgName}</p>
                      </div>

                      <div>
                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', color: '#16a34a', border: '1px solid #bbf7d0', marginBottom: '12px' }}>
                          {item.desc}
                        </div>
                        <button
                          onClick={() => handleCardClick(item)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            color: '#334155',
                            cursor: 'pointer'
                          }}
                        >
                          📝 이 정책 메모하기 &gt;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 하단 스크롤 서울 vs 춘천 시뮬레이터 */}
              <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '48px', marginBottom: '40px' }}>
                <div style={{ marginBottom: '28px' }}>
                  <span style={{ background: '#0284c7', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontWeight: '800', fontSize: '0.85rem' }}>
                    STEP 4 완결 시뮬레이터
                  </span>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#0f172a', margin: '10px 0 6px' }}>
                    서울 vs 춘천 — 정책 지원 시 실제로 얼마나 다를까요?
                  </h2>
                  <p style={{ color: '#64748b' }}>
                    위에서 확인한 주거/월세/취업 지원금이 반영된 정착 시뮬레이터입니다. 슬라이더를 조정해 차이를 확인하세요.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
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
                        💰 월세 지원 20만 + 생활/취업 지원 27만 = 월 +{chuncheonSupport}만 원 혜택
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifycontent: 'space-between' }}>
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

                {/* 최종 완결 CTA */}
                <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '32px', borderRadius: '24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                      alert('춘천시 청년 월세 지원 & 정착 패키지 원스톱 신청을 진행합니다!');
                      setMainMode('directory');
                    }}
                    style={{ padding: '16px 32px', borderRadius: '50px', border: 'none', background: '#fff', color: '#1e3a8a', fontWeight: '900', fontSize: '1.1rem', cursor: 'pointer' }}
                  >
                    통합 공고 홈으로 가기 ➔
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* 디렉토리 메인 화면 (1페이즈) */}
      {mainMode === 'directory' && !selectedPost && !showMyPage && (
        <>
          <nav className="main-nav">
            <div className="nav-inner">
              {NAV_TABS.map((tab) => (
                <button
                  key={tab}
                  className={`nav-item ${selectedCategory === tab ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </nav>

          {CATEGORY_TREE[selectedCategory] && CATEGORY_TREE[selectedCategory].length > 0 && (
            <div className="sub-nav animate-fade-in">
              <div className="sub-nav-inner">
                {CATEGORY_TREE[selectedCategory].map((subTab) => (
                  <button
                    key={subTab}
                    className={`sub-nav-item ${selectedSubCategory === subTab ? 'active' : ''}`}
                    onClick={() => { setSelectedSubCategory(subTab); setCurrentPage(1); }}
                  >
                    {subTab}
                  </button>
                ))}
              </div>
            </div>
          )}

          <main className="content-area">
            {selectedCategory === '전체' && !showBookmarksOnly && (
              <div className="animate-fade-in">
                <div className={`hero-section ${isLoggedIn ? 'logged-in' : ''}`}>
                  <div className="hero-banner">
                    {currentBannerIdx === 0 ? (
                      <div
                        className="banner-content"
                        onClick={() => {
                          setMainMode('career_road');
                          setCareerScreen('landing');
                          scrollToTop();
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="banner-text" style={{ maxWidth: '100%' }}>
                          <span className="banner-badge" style={{ background: '#fbbf24', color: '#1e293b' }}>
                            ⚡ 모아봄 메인 서비스
                          </span>
                          <h2 style={{ fontSize: '1.85rem', marginBottom: '10px' }}>
                            나에게 꼭 맞는 춘천시 정착 경로,<br />
                            AI 커리어 로드맵으로 맞춤 진단하기
                          </h2>
                          <p style={{ fontSize: '0.95rem', opacity: 0.95, marginBottom: '20px' }}>
                            학력과 관심 직무만 선택하면 1단계부터 7단계까지 1초 만에 완성해 드려요.
                          </p>
                          <button
                            className="btn-go"
                            style={{ background: '#ffffff', color: '#1e3a8a', padding: '10px 24px', fontWeight: '800' }}
                          >
                            🚀 지금 바로 AI 커리어로드 시작하기 &gt;
                          </button>
                        </div>
                        <div className="banner-controls" onClick={(e) => e.stopPropagation()}>
                          <button onClick={prevBanner}>◀</button>
                          <span className="banner-page">1 / 4</span>
                          <button onClick={nextBanner}>▶</button>
                        </div>
                      </div>
                    ) : (
                      (() => {
                        const pick = topPicks[currentBannerIdx - 1];
                        if (!pick) {
                          return (
                            <div className="banner-content" onClick={() => { setMainMode('career_road'); setCareerScreen('landing'); scrollToTop(); }}>
                              <div className="banner-text" style={{ maxWidth: '100%' }}>
                                <span className="banner-badge" style={{ background: '#fbbf24', color: '#1e293b' }}>⚡ 모아봄 메인 서비스</span>
                                <h2 style={{ fontSize: '1.85rem', marginBottom: '10px' }}>나에게 꼭 맞는 춘천시 정착 경로, AI 커리어 로드맵</h2>
                                <button className="btn-go" style={{ background: '#ffffff', color: '#1e3a8a' }}>🚀 시작하기 &gt;</button>
                              </div>
                              <div className="banner-controls" onClick={(e) => e.stopPropagation()}>
                                <button onClick={prevBanner}>◀</button>
                                <span className="banner-page">{currentBannerIdx + 1} / 4</span>
                                <button onClick={nextBanner}>▶</button>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="banner-content" onClick={() => handleCardClick(pick)}>
                            <div className="banner-text">
                              <span className="banner-badge">🔥 실시간 인기/추천 공고</span>
                              <h2>{pick.title}</h2>
                              <p>{pick.orgName} | 마감: {formatDateString(pick.deadline)}</p>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
                                <button className="btn-go">바로가기 &gt;</button>
                                <button
                                  className="btn-go"
                                  style={{ background: '#fbbf24', color: '#1e293b', fontWeight: '800' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMainMode('career_road');
                                    setCareerScreen('landing');
                                    scrollToTop();
                                  }}
                                >
                                  🚀 AI 커리어로드 시작 &gt;
                                </button>
                              </div>
                            </div>
                            <img src={pick.imageUrl} alt="인기 공고 이미지" className="banner-image" onError={handleImgError} />
                            <div className="banner-controls" onClick={(e) => e.stopPropagation()}>
                              <button onClick={prevBanner}>◀</button>
                              <span className="banner-page">{currentBannerIdx + 1} / 4</span>
                              <button onClick={nextBanner}>▶</button>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {isLoggedIn ? (
                    (() => {
                      const todayStr = new Date().toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      });

                      const fixedPolicyList = [
                        {
                          id: 'cr-701',
                          title: '춘천 청년 월세 특별지원사업',
                          displayMoney: '2,400,000원',
                          orgName: '춘천시 청년지원과',
                          category: '지원금·정책',
                          deadline: '2026-09-30',
                          description: '연간 총 240만 원의 주거비를 지원받아 춘천 정착 부담을 덜어보세요.',
                          url: '#'
                        },
                        {
                          id: 'cr-703',
                          title: '청년 취업장려금 및 구직수당',
                          displayMoney: '1,000,000원',
                          orgName: '춘천시 기업지원과',
                          category: '지원금·정책',
                          deadline: '2026-11-30',
                          description: '춘천 소재 중소기업 근로 청년에게 연 최대 100만 원 지원 장려금 지급',
                          url: '#'
                        },
                        {
                          id: 'cr-702',
                          title: '대학생 및 청년 전입장려금 지원',
                          displayMoney: '300,000원',
                          orgName: '춘천시 자치행정과',
                          category: '지원금·정책',
                          deadline: '상시모집',
                          description: '관내 대학교 전입 학생에게 학기별 정착 축하금 30만 원 지급',
                          url: '#'
                        }
                      ];

                      return (
                        <div className="receipt-wrapper">
                          <div className="receipt-card">
                            <div className="receipt-title">🧾 미수령 혜택 영수증</div>
                            <div className="receipt-subtitle">
                              발급대상: {userName} 님<br />
                              발급일자: {todayStr}
                            </div>
                            <div className="receipt-line"></div>
                            {fixedPolicyList.map((item, idx) => (
                              <div
                                key={item.id || idx}
                                className="receipt-item dynamic-receipt-item"
                                onClick={() => handleCardClick(item)}
                                title="클릭하여 공고 상세 확인하기"
                                style={{ cursor: 'pointer' }}
                              >
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '12px', textAlign: 'left' }}>
                                  {item.title}
                                </span>
                                <span style={{ whiteSpace: 'nowrap', textAlign: 'right', color: '#475569', fontWeight: '600' }}>
                                  {item.displayMoney}
                                </span>
                              </div>
                            ))}
                            <div className="receipt-line"></div>
                            <div className="receipt-total">
                              <span>총 놓친 금액</span>
                              <span>3,700,000원</span>
                            </div>
                            <div className="receipt-footer-text">
                              "이번 달은 모아봄에서 꼭 다 챙겨가세요!"
                            </div>
                            <button
                              className="receipt-cta-btn"
                              onClick={() => {
                                setMainMode('career_road');
                                setCareerScreen('landing');
                                scrollToTop();
                              }}
                            >
                              🚀 내 맞춤 AI 커리어로드 시작하기 &gt;
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="login-box">
                      <div className="login-box-header">
                        <div className="profile-icon">👤</div>
                        <p>로그인하시면 상세한<br />맞춤 정보를 확인할 수 있습니다.</p>
                      </div>
                      <p className="login-subtext">회원가입 시 다양한 서비스를 제공합니다.</p>
                      <div className="login-btn-group">
                        <button className="btn-login-main" onClick={() => setAuthModal('login')}>로그인</button>
                        <button className="btn-signup-sub" onClick={() => setAuthModal('signup')}>회원가입</button>
                      </div>
                    </div>
                  )}
                </div>

                {isLoggedIn && displayRecommendedPicks.length > 0 && (
                  <div className="recommendation-wrapper animate-fade-in">
                    <h3>✨ {userName}님을 위한 맞춤 추천 공고</h3>
                    <p className="rec-desc">최근 조회하신 관심사(클릭 패턴)를 분석하여 추천해 드립니다.</p>
                    <div className="horizontal-scroll">
                      {displayRecommendedPicks.map((item) => (
                        <div key={`rec-${item.id}`} className="recommend-card" onClick={() => handleCardClick(item)}>
                          <div className="rec-card-header"><span className="rec-badge">{item.category}</span><div className="rec-dday">{calculateDDay(item.deadline)}</div></div>
                          <h4 className="rec-title">{item.title}</h4>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="content-header animate-fade-in" key={`header-${selectedCategory}-${selectedSubCategory}`}>
              <h2>
                {showBookmarksOnly
                  ? '⭐ 내가 찜한 공고 '
                  : selectedCategory === '전체'
                  ? '📌 통합 공고 목록 '
                  : `${categoryEmojiMap[selectedCategory] || '📌'} ${selectedCategory}${selectedSubCategory !== '전체' ? ` > ${selectedSubCategory}` : ''} `}
                <span className="count-text">({!loading ? sortedData.length : 0}건)</span>
              </h2>
              <div className="header-controls">
                <div className="view-toggle">
                  <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>목록형</button>
                  <button className={viewMode === 'calendar' ? 'active' : ''} onClick={() => setViewMode('calendar')}>달력형</button>
                </div>
                <label className="filter-label">
                  <input type="checkbox" className="filter-checkbox" checked={showActiveOnly} onChange={(e) => { setShowActiveOnly(e.target.checked); setCurrentPage(1); }} />
                  ✅ 모집 중만 보기
                </label>
                <select className="sort-dropdown" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}>
                  <option value="latest">최신순</option><option value="deadline">⏳ 마감 임박순</option><option value="popular">🔥 인기순</option>
                </select>
              </div>
            </div>

            {viewMode === 'calendar' ? (
              <div className="calendar-wrapper animate-fade-in">
                <div className="calendar-header-nav">
                  <button onClick={() => setCurrentCalDate(new Date(currentCalDate.getFullYear(), currentCalDate.getMonth() - 1, 1))}>&lt;</button>
                  <h3>{currentCalDate.getFullYear()}년 {currentCalDate.getMonth() + 1}월</h3>
                  <button onClick={() => setCurrentCalDate(new Date(currentCalDate.getFullYear(), currentCalDate.getMonth() + 1, 1))}>&gt;</button>
                </div>
                <div className="calendar-grid">
                  {['일', '월', '화', '수', '목', '금', '토'].map(day => <div key={day} className="cal-head">{day}</div>)}
                  {Array.from({ length: new Date(currentCalDate.getFullYear(), currentCalDate.getMonth(), 1).getDay() }).map((_, i) => <div key={`empty-${i}`} className="cal-cell empty"></div>)}
                  {Array.from({ length: new Date(currentCalDate.getFullYear(), currentCalDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                    const day = i + 1;
                    const cellDate = new Date(currentCalDate.getFullYear(), currentCalDate.getMonth(), day);
                    const isToday = new Date().toDateString() === cellDate.toDateString();
                    const dayEvents = sortedData.filter(item => {
                      if (!item.deadline) return false;
                      const d = new Date(item.deadline);
                      return d.getFullYear() === cellDate.getFullYear() && d.getMonth() === cellDate.getMonth() && d.getDate() === cellDate.getDate();
                    });
                    return (
                      <div key={day} className={`cal-cell ${isToday ? 'today' : ''}`}>
                        <span className="cal-date">{day}</span>
                        <div className="cal-events">
                          {dayEvents.map(event => <div key={event.id} className="cal-event-badge" onClick={() => handleCardClick(event)} title={event.title}>{event.title}</div>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="force-grid animate-fade-in" key={`grid-${selectedCategory}-${selectedSubCategory}-${showBookmarksOnly}-${showActiveOnly}`}>
                {(loading || isLoadingMore) ? (
                  Array.from({ length: ITEMS_PER_PAGE }).map((_, n) => (
                    <div key={n} className="force-card skeleton-card">
                      <div className="force-img-wrap skeleton-img"></div>
                      <div className="force-body">
                        <div className="skeleton-badge"></div>
                        <div className="skeleton-title"></div>
                        <div className="skeleton-title" style={{ width: '70%' }}></div>
                        <div style={{ marginTop: 'auto' }}>
                          <div className="skeleton-desc"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : currentDisplayData.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">{showBookmarksOnly ? '⭐' : '📂'}</div>
                    <h3>{showBookmarksOnly ? '아직 북마크한 공고가 없습니다.' : '조건에 맞는 공고가 없습니다.'}</h3>
                    {showActiveOnly && <button className="btn-reset secondary" onClick={() => setShowActiveOnly(false)}>마감된 공고 포함해서 보기</button>}
                    <button className="btn-reset" onClick={() => { setSearchTerm(''); handleCategoryClick('전체'); }}>전체 보기로 돌아가기</button>
                  </div>
                ) : (
                  currentDisplayData.map((item) => {
                    const views = viewCounts[item.id] || 0;
                    const isBookmarked = bookmarks.includes(String(item.id));
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const isExpired = item.deadline ? new Date(item.deadline) < today : false;
                    const dynamicDDay = calculateDDay(item.deadline);
                    return (
                      <div key={item.id} className={`force-card ${isExpired ? 'expired' : ''}`} onClick={() => handleCardClick(item)}>
                        <div className="force-img-wrap">
                          <img src={item.imageUrl} alt={item.title} onError={handleImgError} />
                          {isExpired && <div className="expired-overlay">마감됨</div>}
                          <button className="bookmark-btn" onClick={(e) => toggleBookmark(e, item)}>{isBookmarked ? '⭐' : '☆'}</button>
                        </div>
                        <div className="force-body">
                          <div className="card-header-row"><span className="card-badge">{item.category}</span><span className={`card-dday ${isExpired ? 'expired' : 'active'}`}>{dynamicDDay}</span></div>
                          <h3 className="card-title">{highlightText(item.title, debouncedSearchTerm)}</h3>
                          <p className="card-org">{highlightText(item.orgName, debouncedSearchTerm)}</p>
                          <div className="card-meta"><span>조회 {views}</span><span>마감: {formatDateString(item.deadline)}</span></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {viewMode === 'list' && (totalPages > 0) && !loading && !isLoadingMore && (
              <div className="pagination-container animate-fade-in">
                <button
                  className="page-nav-btn"
                  onClick={() => {
                    const currentBlock = Math.ceil(currentPage / PAGES_PER_BLOCK);
                    setCurrentPage((currentBlock - 2) * PAGES_PER_BLOCK + 1);
                  }}
                  disabled={currentPage <= PAGES_PER_BLOCK}
                >
                  &lt;
                </button>

                {(() => {
                  const currentBlock = Math.ceil(currentPage / PAGES_PER_BLOCK);
                  const startPage = (currentBlock - 1) * PAGES_PER_BLOCK + 1;
                  const endPage = Math.min(startPage + PAGES_PER_BLOCK - 1, totalPages);

                  return Array.from({ length: Math.max(0, endPage - startPage + 1) }, (_, i) => startPage + i).map(pageNum => (
                    <button
                      key={pageNum}
                      className={`page-num-btn ${pageNum === currentPage ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  ));
                })()}

                <button
                  className="page-nav-btn"
                  onClick={() => {
                    const currentBlock = Math.ceil(currentPage / PAGES_PER_BLOCK);
                    const maxLoadedBlock = Math.ceil(totalPages / PAGES_PER_BLOCK);

                    if (currentBlock >= maxLoadedBlock && hasMore) {
                      setPage(prev => prev + 1);
                    } else if (currentBlock < maxLoadedBlock) {
                      setCurrentPage(currentBlock * PAGES_PER_BLOCK + 1);
                    }
                  }}
                  disabled={((Math.ceil(currentPage / PAGES_PER_BLOCK) >= Math.ceil(totalPages / PAGES_PER_BLOCK)) && !hasMore)}
                >
                  &gt;
                </button>
              </div>
            )}
          </main>
        </>
      )}

      
      {/* AI 챗봇 모달 */}
      <button className="chatbot-fab" onClick={() => setShowChat(!showChat)}>{showChat ? '✕' : '💬'}</button>
      {showChat && (
        <div className="chatbot-window animate-fade-in">
          <div className="chatbot-header">
            <span>🤖 모아봄 AI 챗봇</span>
            <button className="chatbot-close" onClick={() => setShowChat(false)}>✕</button>
          </div>
          <div className="chatbot-messages">
            {chatMessages.map((msg, idx) => (
            <div key={idx} className={`msg-bubble ${msg.type === 'bot' ? 'msg-bot' : 'msg-user'}`}>
              {msg.type === 'bot' ? renderChatMessage(msg.text) : msg.text}
            </div>
          ))}
        </div>
        
          <form
    className="chatbot-input"
    onSubmit={async (e) => {
      e.preventDefault();
      if (!chatInput.trim() || isChatLoading) return;
      const userMsg = chatInput;
      setChatMessages(prev => [...prev, { type: 'user', text: userMsg }]);
      setChatInput('');
      setIsChatLoading(true);

      try {
        // 1. 현재 로드된 공고들의 제목과 요약 정보를 텍스트로 압축
        const noticesSummary = notices.slice(0, 40).map(n => `- [${n.category}] ${n.title} (${n.orgName}, 마감: ${n.deadline || '상시'})`).join('\n');

        // 2. Vercel 서버less API (/api/chat) 호출
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMsg,
            noticesSummary: noticesSummary
          })
        });

        if (!response.ok) throw new Error('챗봇 서버 응답 오류');

        const data = await response.json();
        const botReply = data.reply || '답변을 생성하지 못했습니다.';

        setChatMessages(prev => [...prev, { type: 'bot', text: botReply }]);
      } catch (err) {
        console.error('챗봇 통신 에러:', err);
        setChatMessages(prev => [...prev, { type: 'bot', text: '🤖 죄송합니다. 일시적인 통신 오류가 발생했습니다. 잠시 후 다시 시도해 주세요!' }]);
      } finally {
        setIsChatLoading(false);
      }
    }}
  >
    <input
      type="text"
      placeholder="공고나 정착 정책에 대해 물어보세요!"
      value={chatInput}
      onChange={(e) => setChatInput(e.target.value)}
    />
    <button type="submit" disabled={isChatLoading}>↑</button>
  </form>
        </div>
      )}

      {/* 인증 모달 (로그인 / 회원가입) */}
      {authModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setAuthModal(null)}>✕</button>
            <h2 className="modal-title">{authModal === 'login' ? '환영합니다! 👋' : '모아봄 시작하기 🚀'}</h2>
            <p className="modal-desc">{authModal === 'login' ? '로그인하고 맞춤 공고를 추천받으세요.' : '간편하게 가입하고 춘천시 공고를 한눈에!'}</p>

            <form onSubmit={handleAuthSubmit}>
              <input type="email" placeholder="이메일 아이디" className="auth-input" required />
              <input type="password" placeholder="비밀번호" className="auth-input" required />
              {authModal === 'signup' && <input type="password" placeholder="비밀번호 확인" className="auth-input" required />}
              <button type="submit" className="auth-submit-btn">
                {authModal === 'login' ? '이메일로 로그인' : '이메일로 가입하기'}
              </button>
            </form>

            <div className="auth-toggle-wrap">
              {authModal === 'login' ? (
                <p>아직 계정이 없으신가요? <button type="button" className="auth-toggle-btn" onClick={() => setAuthModal('signup')}>회원가입</button></p>
              ) : (
                <p>이미 계정이 있으신가요? <button type="button" className="auth-toggle-btn" onClick={() => setAuthModal('login')}>로그인</button></p>
              )}
            </div>

            <button className="test-login-btn" onClick={() => { setIsLoggedIn(true); setAuthModal(null); }}>(테스트) 비회원으로 둘러보기</button>
          </div>
        </div>
      )}

      {showTopBtn && <button className={`btn-scroll-top ${showChat ? 'chat-open' : ''}`} onClick={scrollToTop}>↑</button>}
    </div>
  );
}