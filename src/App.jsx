import React, { useState, useEffect, useDeferredValue, useRef, useCallback } from 'react';
import './App.css'; 

// ==========================================
// 1. 공통 유틸리티 및 데이터 정제 함수
// ==========================================
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

const categoryMap = {
  'INTERN': '인턴', 'HACKATHON': '해커톤', 'CONTEST': '공모전', 'JOB': '채용·일자리',
  'EDUCATION': '교육·강좌', 'PROGRAM': '교육·강좌', 'ACTIVITY': '대외활동',
  'POLICY': '지원금·정책', 'EVENT': '행사·공연', 'VOLUNTEER': '자원봉사',
  'BUSINESS_OPPORTUNITY': '사업·창업', 'BUSINESS': '사업·창업'
};

const categoryEmojiMap = {
  '인턴': '💼', '채용·일자리': '🏢', '공모전': '🏆', '해커톤': '💻',
  '교육·강좌': '📚', '대외활동': '🤝', '지원금·정책': '💰', '행사·공연': '🎪',
  '사업·창업': '💡', '기타': '📌'
};

const detailKeyMap = {
  capacity: '모집 인원', recruitment_count: '모집 인원', recruitment_count_text: '모집 인원',
  team_size: '팀원 수', employmentType: '고용 형태', employment_type: '고용 형태',
  salaryText: '급여 / 지원금', salary: '급여 / 지원금', fee: '참가비 / 관람료',
  prize: '상금 내역', tuition: '교육비', certificate: '수료증 발급',
  working_hours: '근무 시간', event_hours: '행사 시간', event_time: '행사 시간',
  applicationMethod: '지원 방법', application_method: '지원 방법',
  education_requirement: '학력 요건', career_requirement: '경력 요건',
  host: '주최', organizer: '주관', contact_name: '담당자',
  contact_phone: '연락처', contact_email: '이메일 주소'
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
  const sourceName = item.source || item.source?.sourceName || '기타';

  let categoryRaw = item.category || '기타';
  let category = categoryMap[categoryRaw] || categoryRaw;
  let topics = item.topics || [];

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

  // 🌟 [로고 교체] 썸네일 이미지가 없으면 랜덤 이미지 대신 공식 모아봄 로고('/moabom.png') 사용
  const imageUrl = item.thumbnail_url || item.imageUrl || '/moabom.png';

  return {
    id,
    title: item.title || '제목 없음',
    orgName,
    deadline,
    sourceName,
    category,
    topics,
    locTag,
    imageUrl,
    url: item.source_url || item.url || '#',
    targets: item.targets?.length > 0 ? item.targets.join(', ') : '제한없음',
    activityStart,
    activityEnd,
    details,
    description: item.summary || item.description || '상세 내용이 없습니다.'
  };
};

// ==========================================
// 2. 카테고리 트리 및 유의어 사전
// ==========================================
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

// ==========================================
// 3. 메인 App 컴포넌트
// ==========================================
export default function App() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1); 
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedSubCategory, setSelectedSubCategory] = useState('전체');
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const PAGES_PER_BLOCK = 5;

  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedPost, setSelectedPost] = useState(null);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [authModal, setAuthModal] = useState(null); 
  const [userName, setUserName] = useState('춘천 청년'); 
  
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(true); 
  
  const [viewMode, setViewMode] = useState('list'); 
  const [showMyPage, setShowMyPage] = useState(false);
  const [currentCalDate, setCurrentCalDate] = useState(new Date());

  const [currentBannerIdx, setCurrentBannerIdx] = useState(0); 
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [showNoti, setShowNoti] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { type: 'bot', text: '안녕하세요! 춘천 청년들을 위한 AI 모아봄 챗봇입니다. 🎓\n\n어떤 공고를 찾고 계신가요?' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [bookmarks, setBookmarks] = useState(() => {
    try { const saved = localStorage.getItem('bookmarks'); return saved ? JSON.parse(saved) : []; } catch (error) { return []; }
  });

  const [memos, setMemos] = useState(() => {
    try { const saved = localStorage.getItem('memos'); return saved ? JSON.parse(saved) : {}; } catch (error) { return {}; }
  });
  const [currentMemo, setCurrentMemo] = useState('');

  const [editingMemoId, setEditingMemoId] = useState(null);
  const [editingMemoText, setEditingMemoText] = useState('');

  const [sortBy, setSortBy] = useState('latest');
  const [categoryWeights, setCategoryWeights] = useState({});
  const [viewCounts, setViewCounts] = useState({});

  const [serverRecommendedPicks, setServerRecommendedPicks] = useState([]);
  const BASE_URL = 'https://moabom-backend.onrender.com';

  // 🌟 이미지 로딩 실패 시 공식 로고('/moabom.png')로 대체하는 핸들러
  const handleImgError = (e) => {
    e.target.onerror = null; // 무한 루프 방지
    e.target.src = '/moabom.png';
  };

  useEffect(() => { localStorage.setItem('bookmarks', JSON.stringify(bookmarks)); }, [bookmarks]);
  useEffect(() => { localStorage.setItem('memos', JSON.stringify(memos)); }, [memos]);

  // 🌟 [DB 연동] 백엔드 맞춤 추천 목록 조회 함수 (로그인 직후 및 클릭/찜 이벤트 발생 시 자동 호출)
  const fetchRecommendations = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setServerRecommendedPicks([]);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/recommendations`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        // 백엔드 응답 포맷(배열 또는 { data: [] }, { content: [] }, { recommendations: [] }) 완벽 대응
        const listData = Array.isArray(data) ? data : data.content || data.items || data.data || data.recommendations || [];
        const normalizedRecs = listData.map((item, index) => normalizeItem(item, index));
        setServerRecommendedPicks(normalizedRecs);
      }
    } catch (error) {
      console.error('추천 데이터 로드 실패:', error);
    }
  }, [BASE_URL]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedName = localStorage.getItem('userName');
    if (token) {
      setIsLoggedIn(true);
      if (savedName) setUserName(savedName);
      fetchRecommendations();
    }
  }, [fetchRecommendations]);

  useEffect(() => {
    const fetchNotices = async () => {
      if (page > 1) setIsLoadingMore(true);
      else setLoading(true);

      const API_URL = `${BASE_URL}/api/opportunities?page=${page}&size=125`; 
      
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`서버 응답 오류: ${res.status}`);
        const data = await res.json();
        const listData = Array.isArray(data) ? data : data.content || data.items || data.data || [];
        
        if (listData.length < 125) setHasMore(false);
        
        const normalizedData = listData.map((item, index) => normalizeItem(item, index + (page - 1) * 125));
        
        if (page === 1) {
          setNotices(normalizedData);
        } else {
          setNotices(prev => [...prev, ...normalizedData]);
          setCurrentPage((page - 1) * PAGES_PER_BLOCK + 1);
        }
      } catch (err) {
        if (page === 1) setNotices([]); 
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    };
    fetchNotices();
  }, [page]); 

  useEffect(() => {
    if (viewMode === 'list' && !selectedPost && !showMyPage) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage, showMyPage]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) setShowTopBtn(true);
      else setShowTopBtn(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleCategoryClick = (tab) => {
    setSelectedCategory(tab);
    setSelectedSubCategory('전체');
    setCurrentPage(1); 
    setShowBookmarksOnly(false);
    setShowMyPage(false);
  };

  // 🌟 [DB 연동] 카드 클릭 시 DB에 사용자 관심사('click') 이벤트 전송 후 추천 목록 실시간 업데이트
  const handleCardClick = async (post) => {
    setSelectedPost(post);
    setShowMyPage(false);
    const postIdStr = String(post.id);
    setCurrentMemo(memos[postIdStr] || ''); 
    scrollToTop(); 
    
    setCategoryWeights((prev) => ({ ...prev, [post.category]: (prev[post.category] || 0) + 1 }));
    setViewCounts((prev) => ({ ...prev, [post.id]: (prev[post.id] || 0) + 1 }));

    const token = localStorage.getItem('token');
    if (isLoggedIn && token && post.id && !post.id.startsWith('default-')) {
      try {
        await fetch(`${BASE_URL}/api/user-events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            action: 'click', 
            postId: post.id, 
            category: post.category 
          })
        });
        // 사용자 이벤트 기록 직후 최신 맞춤 추천 목록 갱신
        fetchRecommendations();
      } catch (error) {
        console.error('클릭 이벤트 전송 실패:', error);
      }
    }
  };

  const handleSaveMemo = () => {
    if (!selectedPost) return;
    const postIdStr = String(selectedPost.id);
    
    setMemos(prev => {
      const updated = { ...prev };
      if (!currentMemo.trim()) {
        delete updated[postIdStr];
      } else {
        updated[postIdStr] = currentMemo;
      }
      return updated;
    });
    alert('메모가 안전하게 저장되었습니다! 📝');
  };

  const handleDeleteMemo = (postId) => {
    const postIdStr = String(postId);
    if (window.confirm('이 메모를 삭제하시겠습니까?')) {
      setMemos((prev) => {
        const updated = { ...prev };
        delete updated[postIdStr];
        return updated;
      });
    }
  };

  const handleUpdateMemo = (postId) => {
    const postIdStr = String(postId);
    setMemos((prev) => {
      const updated = { ...prev };
      if (!editingMemoText.trim()) {
        delete updated[postIdStr];
      } else {
        updated[postIdStr] = editingMemoText;
      }
      return updated;
    });
    setEditingMemoId(null);
  };

  // 🌟 [DB 연동] 찜하기 시 DB에 사용자 관심사('bookmark') 이벤트 전송 후 추천 목록 실시간 업데이트
  const toggleBookmark = async (e, item) => {
    e.stopPropagation();
    const itemIdStr = String(item.id);
    const isAdding = !bookmarks.includes(itemIdStr);
    
    setBookmarks((prev) => isAdding ? [...prev, itemIdStr] : prev.filter((bId) => String(bId) !== itemIdStr));

    const token = localStorage.getItem('token');
    if (isLoggedIn && token && item.id && !item.id.startsWith('default-')) {
      try {
        await fetch(`${BASE_URL}/api/user-events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            action: isAdding ? 'bookmark' : 'unbookmark', 
            postId: item.id, 
            category: item.category 
          })
        });
        // 찜하기 완료 후 백엔드 DB 기반 추천 목록 즉시 새로고침
        fetchRecommendations();
      } catch (error) {
        console.error('북마크 이벤트 전송 실패:', error);
      }
    }
  };

  const handleExtractAITips = async () => {
    if (!selectedPost || isChatLoading) return;
    setShowChat(true);
    setIsChatLoading(true);
    const userPrompt = `[${selectedPost.title}] 공고에 지원하려고 해. 예상 면접 질문 3가지와 자소서 작성 팁을 알려줘!`;
    setChatMessages(prev => [...prev, { type: 'user', text: userPrompt }]);
    setChatMessages(prev => [...prev, { type: 'bot', text: '공고의 상세 내용을 꼼꼼하게 분석하고 있습니다... 🔍' }]);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userPrompt, noticesSummary: `[공고 상세 내용]: ${selectedPost.description || selectedPost.title}` }),
      });
      const text = await response.text();
      let data = text ? JSON.parse(text) : {};
      if (!response.ok) throw new Error(data.error || 'API 요청 실패');
      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); 
        newMessages.push({ type: 'bot', text: data.reply }); 
        return newMessages;
      });
    } catch (error) {
      setTimeout(() => {
        setChatMessages(prev => {
          const newMessages = [...prev];
          newMessages.pop();
          newMessages.push({ 
            type: 'bot', 
            text: `🤖 [임시 데모 모드 - AI 분석 결과]\n\n**✨ 예상 면접 질문 TOP 3**\n1. 우리 기관(${selectedPost.orgName})이 진행하는 사업 중 가장 관심 있는 것은 무엇이며, 본인이 어떻게 기여할 수 있나요?\n2. 이 공고에 지원하기 위해 본인이 특별히 준비하거나 노력한 경험이 있나요?\n3. 팀 프로젝트나 조직 생활 중 갈등이 발생했을 때 본인만의 해결 노하우는 무엇인가요?\n\n**💡 자소서 작성 핵심 팁**\n단순한 스펙 나열보다는 춘천 지역 사회에 대한 관심도와 실무에 바로 투입될 수 있는 '실행력'을 강조하는 것이 유리합니다. 본인의 경험을 구체적인 수치와 함께 풀어내세요!`
          });
          return newMessages;
        });
        setIsChatLoading(false);
      }, 1500);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { type: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);
    setChatMessages(prev => [...prev, { type: 'bot', text: '춘천시 공고 데이터를 분석하고 있습니다... 🔍' }]);
    try {
      const noticesSummary = notices.map(n => `- [${n.category}] ${n.title} (기관: ${n.orgName}, 마감: ${n.deadline || '상시'})`).join('\n');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, noticesSummary }),
      });
      const text = await response.text();
      let data = text ? JSON.parse(text) : {};
      if (!response.ok) throw new Error(data.error || `API 요청 실패`);
      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop();
        newMessages.push({ type: 'bot', text: data.reply });
        return newMessages;
      });
    } catch (error) {
      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop();
        newMessages.push({ type: 'bot', text: `앗, 오류가 발생했어요. 😢\n(에러: ${error.message})` });
        return newMessages;
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const renderChatMessage = (text) => {
    if (!text) return null;
    let cleanText = text.replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    const parts = cleanText.split(/(\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const label = match[1]; 
        const target = match[2]; 
        if (target === 'open_post' || target.includes('post_id:')) {
          return (
            <button key={i} className="chat-action-btn" onClick={() => {
                const cleanLabel = label.replace(/\s/g, ''); 
                let post = notices.find(n => n.title.replace(/\s/g, '') === cleanLabel);
                if (!post) post = notices.find(n => n.title.includes(label) || label.includes(n.title));
                if (post) handleCardClick(post);
                else alert(`"${label}" 공고를 찾을 수 없거나 이미 마감되었습니다.`);
              }} 
            >{label}</button>
          );
        } else {
          return (<a key={i} href={target} target="_blank" rel="noreferrer" className="chat-link">{label}</a>);
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  const filteredData = notices.filter((item) => {
    if (showBookmarksOnly && !bookmarks.includes(String(item.id))) return false;
    
    const matchesCategory = selectedCategory === '전체' || item.category.includes(selectedCategory);
    
    let matchesSubCategory = true;
    if (selectedSubCategory !== '전체') {
      const subKeywords = selectedSubCategory.split('/').map(k => k.trim().toLowerCase());
      let expandedKeywords = [...subKeywords];
      
      subKeywords.forEach(keyword => {
        if (SUBCATEGORY_SYNONYMS[keyword]) {
          expandedKeywords = [...expandedKeywords, ...SUBCATEGORY_SYNONYMS[keyword]];
        }
      });

      expandedKeywords = [...new Set(expandedKeywords)];
      matchesSubCategory = expandedKeywords.some(keyword => 
        item.title.toLowerCase().includes(keyword) || 
        item.topics.some(t => t.toLowerCase().includes(keyword)) || 
        item.description.toLowerCase().includes(keyword)
      );
    }

    const searchLower = debouncedSearchTerm ? debouncedSearchTerm.toLowerCase() : '';
    const matchesSearch = item.title.toLowerCase().includes(searchLower) || item.category.toLowerCase().includes(searchLower) || item.orgName.toLowerCase().includes(searchLower) || item.topics.some(t => t.toLowerCase().includes(searchLower)); 
    
    let isExpired = false;
    if (item.deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(item.deadline);
      if (!isNaN(end.getTime())) {
        end.setHours(0, 0, 0, 0);
        if (end < today) isExpired = true;
      }
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

  const topPicks = notices.length > 0 ? [...notices].sort((a, b) => (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0)).slice(0, 4) : [];
  const displayRecommendedPicks = serverRecommendedPicks.length > 0 
    ? serverRecommendedPicks 
    : (notices.length > 0 ? [...notices].sort((a, b) => (categoryWeights[b.category] || 0) - (categoryWeights[a.category] || 0)).slice(0, 5) : []);

  const activePick = topPicks[currentBannerIdx];

  const nextBanner = (e) => { e.stopPropagation(); setCurrentBannerIdx((prev) => (prev + 1) % topPicks.length); };
  const prevBanner = (e) => { e.stopPropagation(); setCurrentBannerIdx((prev) => (prev === 0 ? topPicks.length - 1 : prev - 1)); };
  
  // 🌟 [DB 연동] 로그인/회원가입 처리 및 로그인 성공 직후 추천 목록 즉시 호출
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '인증에 실패했습니다.');
      }

      const data = await response.json();
      
      if (data.token) localStorage.setItem('token', data.token);
      
      const newUserName = data.name || data.user?.name || email.split('@')[0];
      localStorage.setItem('userName', newUserName);
      
      setIsLoggedIn(true); 
      setUserName(newUserName); 
      setAuthModal(null); 
      
      // 로그인 완료 직후 DB에 저장된 사용자의 추천 목록 동기화
      fetchRecommendations();
      
      alert(`${isLogin ? '로그인' : '회원가입'} 완료되었습니다!`);
    } catch (error) {
      alert(`오류: ${error.message}`);
      console.error(error);
    }
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

  useEffect(() => {
    const chatContainer = document.querySelector('.chatbot-messages');
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  }, [chatMessages]);

  return (
    <div className="app-container">
      <header className="top-header">
        <div className="header-inner">
          <div className="logo-area" onClick={() => { setSelectedPost(null); setShowMyPage(false); setSearchTerm(''); handleCategoryClick('전체'); }}>
            {/* 🌟 헤더에 실제 모아봄 로고 이미지 적용 */}
            <img src="/moabom.png" alt="모아봄 로고" className="logo-icon-img" onError={handleImgError} />
            <h1 className="logo-text">모아봄</h1>
          </div>
          
          <div className="search-area">
            <div className="search-bar">
              <input type="text" placeholder="공고 제목, 분야, 주관기관 검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {searchTerm && <button className="btn-clear" onClick={() => setSearchTerm('')}>✕</button>}
              <button className="btn-search">🔍</button>
            </div>
            
            <div className="header-links">
              <button className="noti-btn" onClick={() => setShowNoti(!showNoti)}>🔔<span className="noti-badge"></span></button>
              {showNoti && (
                <div className="noti-dropdown animate-fade-in">
                  <div className="noti-header">알림 <span className="noti-read-all">모두 읽음 처리</span></div>
                  <div className="noti-item"><h4>🔥 [해커톤] 신청 마감 D-1</h4><p>북마크하신 '강원 해커톤 대회' 마감이 내일입니다. 잊지 말고 지원하세요!</p></div>
                  <div className="noti-item"><h4>✨ 맞춤 공고 추천</h4><p>{userName}님을 위한 새로운 [마케팅 인턴] 공고가 3건 등록되었습니다.</p></div>
                </div>
              )}
              {isLoggedIn ? (
                <div className="user-info">
                  <button 
                    className={`btn-mypage-top ${showMyPage ? 'active' : ''}`}
                    onClick={() => { setShowMyPage(true); setSelectedPost(null); }}
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

      {selectedPost ? (
        <main className="detail-main animate-fade-in">
          <button className="back-btn" onClick={() => setSelectedPost(null)}>← 목록으로 돌아가기</button>
          <div className="detail-card">
            <div className="detail-tags">
              <span className="detail-tag-cat">{selectedPost.category}</span>
              <span className="detail-tag-src">출처: {selectedPost.sourceName}</span>
            </div>
            <h1 className="detail-title">{selectedPost.title}</h1>
            <img src={selectedPost.imageUrl} alt="포스터" className="detail-img" onError={handleImgError} />
            <div className="detail-info-grid">
              <p className="detail-info-item"><strong>🏢 주관기관:</strong> {selectedPost.orgName}</p>
              {selectedPost.targets !== '제한없음' && <p className="detail-info-item"><strong>🎯 지원대상:</strong> {selectedPost.targets}</p>}
              <p className="detail-info-item"><strong>⏳ 모집마감:</strong> <span className="detail-highlight">{formatDateString(selectedPost.deadline)} ({calculateDDay(selectedPost.deadline)})</span></p>
              {selectedPost.activityStart && (
                <p className="detail-info-full"><strong>📅 활동/근무 기간:</strong> {formatDateString(selectedPost.activityStart)} ~ {formatDateString(selectedPost.activityEnd)}</p>
              )}
              {Object.entries(selectedPost.details).map(([key, value]) => {
                if (!value || typeof value === 'object') return null; 
                const label = detailKeyMap[key] || key; 
                return <p key={key} className="detail-info-item"><strong>💡 {label}:</strong> {value}</p>;
              })}
            </div>
            <h3 className="detail-subtitle">상세 안내</h3>
            <div className="detail-desc">{selectedPost.description}</div>
            <button className={`btn-ai-extract ${isChatLoading ? 'animate-pulse' : ''}`} onClick={handleExtractAITips} disabled={isChatLoading}>
              {isChatLoading ? '🤖 챗봇이 공고를 분석 중입니다...' : '✨ 이 공고 맞춤 AI 면접/자소서 팁 뽑기'}
            </button>
            <div className="detail-link-wrap">
              <a href={selectedPost.url} target="_blank" rel="noreferrer" className="detail-link-btn">원문 페이지로 이동하여 확인하기 🔗</a>
            </div>
            {isLoggedIn && (
              <div className="memo-pad animate-fade-in">
                <h3 className="memo-title">📝 {userName}님의 비밀 메모장</h3>
                <textarea placeholder="관련된 나만의 메모를 자유롭게 남겨보세요!" value={currentMemo} onChange={(e) => setCurrentMemo(e.target.value)} />
                <div className="memo-btn-wrap"><button onClick={handleSaveMemo}>메모 저장하기</button></div>
              </div>
            )}
          </div>
        </main>
      ) : showMyPage ? (
        <main className="mypage-main animate-fade-in">
          <button className="back-btn" onClick={() => setShowMyPage(false)}>← 전체 공고 목록으로 돌아가기</button>
          
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
            <p className="mypage-section-desc">공고별로 작성한 메모를 바로 확인하고, 이 자리에서 즉시 수정하거나 삭제할 수 있습니다.</p>
            
            {Object.keys(memos).filter(k => memos[k]?.trim()).length === 0 ? (
              <div className="mypage-empty">
                <span>📝</span>
                <p>아직 작성된 메모가 없습니다. 관심 있는 공고에 나만의 메모를 남겨보세요!</p>
              </div>
            ) : (
              <div className="memo-card-grid">
                {Object.entries(memos).map(([postId, memoText]) => {
                  if (!memoText?.trim()) return null;
                  const post = notices.find(n => String(n.id) === String(postId));
                  const title = post ? post.title : `저장된 공고 #${postId}`;
                  const orgName = post ? post.orgName : '주관기관 미상';
                  const dDay = post ? calculateDDay(post.deadline) : '상시';
                  const category = post ? post.category : '기타';

                  return (
                    <div key={postId} className="memo-manage-card">
                      <div className="memo-card-header">
                        <span className="memo-badge">{category}</span>
                        <span className="memo-dday">{dDay}</span>
                      </div>
                      <h4 className="memo-post-title" onClick={() => post && handleCardClick(post)}>
                        {title}
                      </h4>
                      <p className="memo-post-org">🏢 {orgName}</p>
                      
                      {editingMemoId === postId ? (
                        <div className="memo-edit-area">
                          <textarea
                            className="memo-edit-textarea"
                            value={editingMemoText}
                            onChange={(e) => setEditingMemoText(e.target.value)}
                          />
                          <div className="memo-edit-btns">
                            <button className="btn-memo-save" onClick={() => handleUpdateMemo(postId)}>저장</button>
                            <button className="btn-memo-cancel" onClick={() => setEditingMemoId(null)}>취소</button>
                          </div>
                        </div>
                      ) : (
                        <div className="memo-text-box">
                          {memoText}
                        </div>
                      )}

                      <div className="memo-card-footer">
                        {editingMemoId !== postId && (
                          <>
                            <button 
                              className="btn-memo-action"
                              onClick={() => {
                                setEditingMemoId(postId);
                                setEditingMemoText(memoText);
                              }}
                            >
                              ✏️ 수정
                            </button>
                            <button 
                              className="btn-memo-action delete"
                              onClick={() => handleDeleteMemo(postId)}
                            >
                              🗑️ 삭제
                            </button>
                          </>
                        )}
                        {post && (
                          <button 
                            className="btn-memo-go"
                            onClick={() => handleCardClick(post)}
                          >
                            공고 보기 &gt;
                          </button>
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
            
            {bookmarks.length === 0 ? (
              <div className="mypage-empty">
                <span>⭐</span>
                <p>아직 찜한 공고가 없습니다. 마음에 드는 공고의 별 모양을 눌러보세요!</p>
              </div>
            ) : (
              <div className="force-grid">
                {notices.filter(n => bookmarks.includes(String(n.id))).map((item) => {
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const isExpired = item.deadline ? new Date(item.deadline) < today : false;
                  return (
                    <div key={item.id} className={`force-card ${isExpired ? 'expired' : ''}`} onClick={() => handleCardClick(item)}>
                      <div className="force-img-wrap">
                        <img src={item.imageUrl} alt={item.title} onError={handleImgError} />
                        {isExpired && <div className="expired-overlay">마감됨</div>}
                        <button className="bookmark-btn" onClick={(e) => toggleBookmark(e, item)}>⭐</button>
                      </div>
                      <div className="force-body">
                        <div className="card-header-row">
                          <span className="card-badge">{item.category}</span>
                          <span className={`card-dday ${isExpired ? 'expired' : 'active'}`}>{calculateDDay(item.deadline)}</span>
                        </div>
                        <h3 className="card-title">{item.title}</h3>
                        <p className="card-org">{item.orgName}</p>
                        <div className="card-meta"><span>조회 {viewCounts[item.id] || 0}</span><span>마감: {formatDateString(item.deadline)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      ) : (
        <>
          <nav className="main-nav">
            <div className="nav-inner">
              {NAV_TABS.map((tab) => (
                <button key={tab} className={`nav-item ${selectedCategory === tab ? 'active' : ''}`} onClick={() => handleCategoryClick(tab)}>{tab}</button>
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
                    {activePick ? (
                      <div className="banner-content" onClick={() => handleCardClick(activePick)}>
                        <div className="banner-text">
                          <span className="banner-badge">🔥 실시간 인기/추천 공고</span>
                          <h2>{activePick.title}</h2>
                          <p>{activePick.orgName} | 마감: {formatDateString(activePick.deadline)}</p>
                          <button className="btn-go">바로가기 &gt;</button>
                        </div>
                        <img src={activePick.imageUrl} alt="인기 공고 이미지" className="banner-image" onError={handleImgError} />
                        <div className="banner-controls">
                          <button onClick={prevBanner}>◀</button>
                          <span className="banner-page">{currentBannerIdx + 1} / {topPicks.length}</span>
                          <button onClick={nextBanner}>▶</button>
                        </div>
                      </div>
                    ) : <div className="banner-loading">로딩 중...</div>}
                  </div>
                  {isLoggedIn ? (
                    (() => {
                      const todayStr = new Date().toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      });

                      const fixedReceiptItems = [
                        { id: 'receipt-1', title: '청년 구직활동 지원금', displayMoney: '500,000원', numMoney: 500000 },
                        { id: 'receipt-2', title: '면접 정장 대여 (춘천 날개)', displayMoney: '50,000원', numMoney: 50000 },
                        { id: 'receipt-3', title: '자격증 응시료 지원', displayMoney: '100,000원', numMoney: 100000 }
                      ];

                      const totalSum = fixedReceiptItems.reduce((acc, cur) => acc + cur.numMoney, 0);

                      return (
                        <div className="receipt-wrapper">
                          <div className="receipt-card">
                            <div className="receipt-title">🧾 미수령 혜택 영수증</div>
                            <div className="receipt-subtitle">
                              발급대상: {userName} 님<br />
                              발급일자: {todayStr}
                            </div>
                            <div className="receipt-line"></div>
                            
                            {fixedReceiptItems.map((item, idx) => (
                              <div 
                                key={item.id || idx} 
                                className="receipt-item dynamic-receipt-item"
                                onClick={() => alert(`[${item.title}] 상세 지원 안내 페이지로 이동합니다.`)}
                                title="클릭하여 공고 확인하기"
                                style={{ cursor: 'pointer' }}
                              >
                                <span style={{ 
                                  flex: 1,
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap',
                                  marginRight: '12px',
                                  textAlign: 'left'
                                }}>
                                  {item.title}
                                </span>
                                <span style={{ 
                                  whiteSpace: 'nowrap', 
                                  textAlign: 'right',
                                  color: '#475569', 
                                  fontWeight: '600' 
                                }}>
                                  {item.displayMoney}
                                </span>
                              </div>
                            ))}

                            <div className="receipt-line"></div>
                            
                            <div className="receipt-total">
                              <span>총 놓친 금액</span>
                              <span>
                                {totalSum.toLocaleString()}원
                              </span>
                            </div>
                            
                            <div className="receipt-footer-text">
                              "이번 달은 모아봄에서 꼭 다 챙겨가세요!"
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="login-box">
                      <div className="login-box-header">
                        <div className="profile-icon">👤</div>
                        <p>로그인하시면 상세한<br/>맞춤 정보를 확인할 수 있습니다.</p>
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
                {showBookmarksOnly ? '⭐ 내가 찜한 공고 ' : selectedCategory === '전체' ? '📌 통합 공고 목록 ' : `${categoryEmojiMap[selectedCategory] || '📌'} ${selectedCategory}${selectedSubCategory !== '전체' ? ` > ${selectedSubCategory}` : ''} `}
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

      <button className="chatbot-fab" onClick={() => setShowChat(!showChat)}>{showChat ? '✕' : '💬'}</button>
      {showChat && (
        <div className="chatbot-window animate-fade-in">
          <div className="chatbot-header"><span>🤖 모아봄 AI 챗봇</span><button className="chatbot-close" onClick={() => setShowChat(false)}>✕</button></div>
          <div className="chatbot-messages">{chatMessages.map((msg, idx) => <div key={idx} className={`msg-bubble ${msg.type === 'bot' ? 'msg-bot' : 'msg-user'}`}>{msg.type === 'bot' ? renderChatMessage(msg.text) : msg.text}</div>)}</div>
          <form className="chatbot-input" onSubmit={handleSendMessage}>
            <input type="text" placeholder="공고에 대해 물어보세요!" value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
            <button type="submit">↑</button>
          </form>
        </div>
      )}

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