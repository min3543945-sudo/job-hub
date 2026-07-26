import React, { useState, useEffect, useDeferredValue } from 'react';
import './App.css'; 

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
      <span key={index} style={{backgroundColor: '#fef08a', color: '#1e293b', fontWeight: '800', padding: '0 2px', borderRadius: '4px'}}>{part}</span>
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
  'INTERN': '인턴',
  'HACKATHON': '해커톤',
  'CONTEST': '공모전',
  'JOB': '채용·일자리',
  'EDUCATION': '교육·강좌',
  'PROGRAM': '교육·강좌',
  'ACTIVITY': '대외활동',
  'POLICY': '지원금·정책',
  'EVENT': '행사·공연',
  'VOLUNTEER': '자원봉사'
};

const categoryEmojiMap = {
  '인턴': '💼',
  '채용·일자리': '🏢',
  '공모전': '🏆',
  '해커톤': '💻',
  '교육·강좌': '📚',
  '대외활동': '🤝',
  '지원금·정책': '💰',
  '행사·공연': '🎪',
  '기타': '📌'
};

const detailKeyMap = {
  capacity: '모집 인원',
  recruitment_count: '모집 인원',
  team_size: '팀원 수',
  employmentType: '고용 형태',
  salaryText: '급여 / 지원금',
  fee: '참가비 / 관람료',
  prize: '상금 내역',
  tuition: '교육비',
  certificate: '수료증 발급',
  working_hours: '근무 시간',
  applicationMethod: '지원 방법',
  education_requirement: '학력 요건',
  career_requirement: '경력 요건',
  host: '주최',
  organizer: '주관',
  contact_name: '담당자',
  contact_phone: '연락처',
  contact_email: '이메일 주소'
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

  const id = item.id || item.externalId || `item-${index}`;

  const details = { ...(item.details || {}) };
  if (details.contact) {
    if (details.contact.name) details.contact_name = details.contact.name;
    if (details.contact.phone) details.contact_phone = details.contact.phone;
    if (details.contact.email) details.contact_email = details.contact.email;
  }

  return {
    id: String(id),
    title: item.title || '제목 없음',
    orgName,
    deadline,
    sourceName,
    category,
    topics,
    locTag,
    imageUrl: item.thumbnail_url || item.imageUrl || `[https://picsum.photos/seed/$](https://picsum.photos/seed/$){String(id).length + index}/800/800`,
    url: item.source_url || item.url || '#',
    targets: item.targets?.length > 0 ? item.targets.join(', ') : '제한없음',
    activityStart,
    activityEnd,
    details,
    description: item.summary || item.description || '상세 내용이 없습니다.'
  };
};

export default function App() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedPost, setSelectedPost] = useState(null);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [authModal, setAuthModal] = useState(null); 
  const [userName, setUserName] = useState('춘천 청년'); 
  
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(true); 
  const [viewMode, setViewMode] = useState('list'); 

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
    try { return JSON.parse(localStorage.getItem('bookmarks')) || []; } catch (e) { return []; }
  });

  const [memos, setMemos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('memos')) || {}; } catch (e) { return {}; }
  });
  const [currentMemo, setCurrentMemo] = useState('');

  const [sortBy, setSortBy] = useState('latest');
  const [categoryWeights, setCategoryWeights] = useState({});
  const [viewCounts, setViewCounts] = useState({});

  useEffect(() => { localStorage.setItem('bookmarks', JSON.stringify(bookmarks)); }, [bookmarks]);
  useEffect(() => { localStorage.setItem('memos', JSON.stringify(memos)); }, [memos]);

  useEffect(() => {
    const fetchNotices = async () => {
      if (page > 1) setIsLoadingMore(true); else setLoading(true);
      const API_URL = `[https://moabom-backend.onrender.com/api/opportunities?page=$](https://moabom-backend.onrender.com/api/opportunities?page=$){page}&size=16`; 
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`서버 응답 오류`);
        const data = await res.json();
        const listData = Array.isArray(data) ? data : data.content || data.items || data.data || [];
        if (listData.length < 16) setHasMore(false);
        const normalizedData = listData.map((item, index) => normalizeItem(item, index + (page - 1) * 16));
        if (page === 1) setNotices(normalizedData);
        else setNotices(prev => [...prev, ...normalizedData]);
      } catch (err) {
        console.error('데이터 가져오기 실패:', err);
        if (page === 1) setNotices([]); 
      } finally {
        setLoading(false); setIsLoadingMore(false);
      }
    };
    fetchNotices();
  }, [page]); 

  useEffect(() => {
    const handleScroll = () => setShowTopBtn(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleCardClick = (post) => {
    setSelectedPost(post);
    setCurrentMemo(memos[post.id] || ''); 
    scrollToTop(); 
    setCategoryWeights((prev) => ({ ...prev, [post.category]: (prev[post.category] || 0) + 1 }));
    setViewCounts((prev) => ({ ...prev, [post.id]: (prev[post.id] || 0) + 1 }));
  };

  const handleSaveMemo = () => {
    if (!selectedPost) return;
    setMemos(prev => ({ ...prev, [selectedPost.id]: currentMemo }));
    alert('메모가 저장되었습니다! 📝\n(기기에 임시 저장됨)');
  };

  const toggleBookmark = (e, id) => {
    e.stopPropagation();
    setBookmarks((prev) => prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]);
  };

  const handleExtractAITips = async () => {
    if (!selectedPost || isChatLoading) return;
    setShowChat(true); setIsChatLoading(true);

    const userPrompt = `[${selectedPost.title}] 공고에 지원하려고 해. 예상 면접 질문 3가지와 자소서 작성 팁을 알려줘!`;
    setChatMessages(prev => [...prev, { type: 'user', text: userPrompt }]);
    setChatMessages(prev => [...prev, { type: 'bot', text: '공고의 상세 내용을 분석 중입니다... 🔍' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userPrompt, noticesSummary: `[공고 상세 내용]: ${selectedPost.description || selectedPost.title}` }),
      });
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch (e) { throw new Error('파싱 실패'); }
      if (!response.ok) throw new Error(data.error || '요청 실패');

      setChatMessages(prev => {
        const newMessages = [...prev]; newMessages.pop(); newMessages.push({ type: 'bot', text: data.reply }); return newMessages;
      });
    } catch (error) {
      setTimeout(() => {
        setChatMessages(prev => {
          const newMessages = [...prev]; newMessages.pop();
          newMessages.push({ 
            type: 'bot', 
            text: `🤖 [임시 데모 모드 - AI 분석 결과]\n\n**✨ 예상 면접 질문 TOP 3**\n1. 이 기관(${selectedPost.orgName})이 진행하는 사업 중 가장 관심 있는 것은 무엇이며, 본인이 어떻게 기여할 수 있나요?\n2. 이 공고에 지원하기 위해 특별히 준비한 경험이 있나요?\n3. 팀 프로젝트 중 갈등이 발생했을 때 본인만의 해결 노하우는 무엇인가요?\n\n**💡 자소서 작성 핵심 팁**\n단순한 스펙 나열보다는 춘천 지역 사회에 대한 관심도와 실무에 바로 투입될 수 있는 '실행력'을 강조하는 것이 유리합니다.`
          });
          return newMessages;
        });
        setIsChatLoading(false);
      }, 1500);
    } finally { setIsChatLoading(false); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { type: 'user', text: userMsg }]);
    setChatInput(''); setIsChatLoading(true);
    setChatMessages(prev => [...prev, { type: 'bot', text: '데이터를 분석 중입니다... 🔍' }]);

    try {
      const noticesSummary = notices.map(n => `- [${n.category}] ${n.title}`).join('\n');
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, noticesSummary }),
      });
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch (e) { throw new Error('파싱 오류'); }
      if (!response.ok) throw new Error(data.error || '요청 실패');

      setChatMessages(prev => {
        const newMessages = [...prev]; newMessages.pop(); newMessages.push({ type: 'bot', text: data.reply }); return newMessages;
      });
    } catch (error) {
      setChatMessages(prev => {
        const newMessages = [...prev]; newMessages.pop(); newMessages.push({ type: 'bot', text: `앗, 연결 오류가 발생했어요. 😢` }); return newMessages;
      });
    } finally { setIsChatLoading(false); }
  };

  const renderChatMessage = (text) => {
    if (!text) return null;
    let cleanText = text.replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    const parts = cleanText.split(/(\[.*?\]\(.*?\))/g);
    
    return parts.map((part, i) => {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const label = match[1]; const target = match[2]; 
        if (target === 'open_post' || target.includes('post_id:')) {
          return (
            <button key={i} onClick={() => {
                const cleanLabel = label.replace(/\s/g, ''); 
                let post = notices.find(n => n.title.replace(/\s/g, '') === cleanLabel) || notices.find(n => n.title.includes(label));
                if (post) handleCardClick(post); else alert(`"${label}" 공고를 찾을 수 없습니다.`);
              }} style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontWeight: 'bold' }}>
              {label}
            </button>
          );
        }
        return <a key={i} href={target} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 'bold' }}>{label}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const filteredData = notices.filter((item) => {
    if (showBookmarksOnly && !bookmarks.includes(item.id)) return false;
    if (selectedCategory === '🗺️ 내 주변 맵') return true; 

    const matchesCategory = selectedCategory === '전체' || item.category.includes(selectedCategory);
    const searchLower = debouncedSearchTerm ? debouncedSearchTerm.toLowerCase() : '';
    const matchesSearch = item.title.toLowerCase().includes(searchLower) || item.orgName.toLowerCase().includes(searchLower); 

    let isExpired = false;
    if (item.deadline) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const end = new Date(item.deadline);
      if (!isNaN(end.getTime())) { end.setHours(0, 0, 0, 0); if (end < today) isExpired = true; }
    }
    if (showActiveOnly && isExpired) return false;
    return matchesCategory && matchesSearch;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortBy === 'popular') return (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0);
    if (sortBy === 'recommend') return (categoryWeights[b.category] || 0) - (categoryWeights[a.category] || 0);
    if (sortBy === 'deadline') {
      if (!a.deadline) return 1; if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    }
    return a.id > b.id ? -1 : 1; 
  });

  const topPicks = notices.length > 0 ? [...notices].sort((a, b) => (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0)).slice(0, 4) : [];
  const recommendedPicks = notices.length > 0 ? [...notices].sort((a, b) => (categoryWeights[b.category] || 0) - (categoryWeights[a.category] || 0)).slice(0, 5) : [];
  const activePick = topPicks[currentBannerIdx];

  const handleAuthSubmit = (e) => { e.preventDefault(); setIsLoggedIn(true); setUserName('김모아'); setAuthModal(null); };

  useEffect(() => {
    const chatContainer = document.querySelector('.chatbot-messages');
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  }, [chatMessages]);

  const renderCalendar = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); 
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); 
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="cal-cell empty"></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayNotices = sortedData.filter(notice => {
        if (!notice.deadline) return false;
        const d = new Date(notice.deadline);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === day;
      });

      const isToday = today.getDate() === day;

      days.push(
        <div key={day} className={`cal-cell ${isToday ? 'today' : ''}`}>
          <div className="cal-date">{day}</div>
          <div className="cal-events">
            {dayNotices.slice(0, 3).map(notice => (
              <div key={notice.id} className="cal-event-badge" onClick={() => handleCardClick(notice)} title={notice.title}>
                {bookmarks.includes(notice.id) ? '⭐ ' : ''}{notice.title}
              </div>
            ))}
            {dayNotices.length > 3 && <div className="cal-event-more">+{dayNotices.length - 3}개 더보기</div>}
          </div>
        </div>
      );
    }

    return (
      <div className="calendar-wrapper animate-fade-in">
        <div className="calendar-header-nav">
          <button>&lt;</button><h3>{currentYear}년 {currentMonth + 1}월</h3><button>&gt;</button>
        </div>
        <div className="calendar-grid">
          {['일', '월', '화', '수', '목', '금', '토'].map(day => <div key={day} className="cal-head">{day}</div>)}
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="top-header">
        <div className="header-inner">
          <div className="logo-area" onClick={() => { setSelectedPost(null); setSearchTerm(''); setSelectedCategory('전체'); setShowBookmarksOnly(false); }}>
            <span className="logo-icon">🎓</span>
            <h1 className="logo-text">모아봄</h1>
          </div>
          
          <div className="search-area">
            <div className="search-bar">
              <input type="text" placeholder="공고 제목, 분야, 주관기관 검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              {searchTerm && <button className="btn-clear" onClick={() => setSearchTerm('')}>✕</button>}
              <button className="btn-search">🔍</button>
            </div>
            
            <div className="header-links" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => setShowNoti(!showNoti)} style={{ position: 'relative', fontSize: '1.2rem', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                🔔 <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }}></span>
              </button>
              {showNoti && (
                <div className="noti-dropdown">
                  <div style={{ padding: '12px 16px', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    알림 <span style={{ color: '#3b82f6', fontSize: '0.8rem', cursor: 'pointer' }}>모두 읽음 처리</span>
                  </div>
                  <div className="noti-item"><h4>🔥 [해커톤] 신청 마감 D-1</h4><p>북마크하신 '강원 해커톤 대회' 마감이 내일입니다.</p></div>
                  <div className="noti-item"><h4>✨ 맞춤 공고 추천</h4><p>{userName}님을 위한 [마케팅 인턴] 공고가 등록되었습니다.</p></div>
                </div>
              )}
              {isLoggedIn ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b' }}>{userName}님</span>
                  <button onClick={() => { setIsLoggedIn(false); alert('로그아웃 되었습니다.'); }} style={{ fontWeight: 'bold', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>로그아웃</button>
                </div>
              ) : (
                <>
                  <button onClick={() => setAuthModal('login')} style={{ fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}>로그인</button>
                  <button onClick={() => setAuthModal('signup')} style={{ fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}>회원가입</button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {selectedPost ? (
        <main className="animate-fade-in" style={{ maxWidth: '850px', margin: '0 auto', padding: '40px 20px' }}>
          <button onClick={() => setSelectedPost(null)} style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: 'bold', color: '#64748b', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ← 목록으로 돌아가기
          </button>
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '40px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ background: '#e0e7ff', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', color: '#4338ca', fontSize: '0.9rem' }}>{selectedPost.category}</span>
              <span style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>출처: {selectedPost.sourceName}</span>
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '800', lineHeight: '1.3', marginBottom: '24px', color: '#0f172a', wordBreak: 'keep-all' }}>{selectedPost.title}</h1>
            <img src={selectedPost.imageUrl} alt="포스터" style={{ width: '100%', maxHeight: '450px', objectFit: 'cover', borderRadius: '12px', marginBottom: '32px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '40px', fontSize: '1rem' }}>
              <p><strong>🏢 주관기관:</strong> {selectedPost.orgName}</p>
              {selectedPost.targets !== '제한없음' && <p><strong>🎯 지원대상:</strong> {selectedPost.targets}</p>}
              <p><strong>⏳ 모집마감:</strong> <span style={{color: '#ef4444', fontWeight: 'bold'}}>{formatDateString(selectedPost.deadline)} ({calculateDDay(selectedPost.deadline)})</span></p>
              {selectedPost.activityStart && <p style={{ gridColumn: '1 / -1' }}><strong>📅 활동/근무 기간:</strong> {formatDateString(selectedPost.activityStart)} ~ {formatDateString(selectedPost.activityEnd)}</p>}
              {Object.entries(selectedPost.details).map(([key, value]) => {
                if (!value || typeof value === 'object') return null; 
                return <p key={key}><strong>💡 {detailKeyMap[key] || key}:</strong> {value}</p>;
              })}
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>상세 안내</h3>
            <div style={{ lineHeight: '1.8', fontSize: '1.05rem', color: '#334155', marginBottom: '40px', whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{selectedPost.description}</div>
            
            <button className={`btn-ai-extract ${isChatLoading ? 'animate-pulse' : ''}`} onClick={handleExtractAITips} disabled={isChatLoading}>
              {isChatLoading ? '🤖 챗봇이 공고를 분석 중입니다...' : '✨ 이 공고 맞춤 AI 면접/자소서 팁 뽑기'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '32px', borderTop: '1px solid #e2e8f0' }}>
              <a href={selectedPost.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#3b82f6', color: 'white', padding: '16px 48px', borderRadius: '50px', fontSize: '1.2rem', fontWeight: '800', textDecoration: 'none', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)' }}>원문 페이지로 이동하여 확인하기 🔗</a>
            </div>
            {isLoggedIn && (
              <div className="memo-pad animate-fade-in">
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '8px' }}>📝 {userName}님의 비밀 메모장</h3>
                <textarea placeholder="공고와 관련된 나만의 메모를 자유롭게 남겨보세요!" value={currentMemo} onChange={(e) => setCurrentMemo(e.target.value)} />
                <div style={{ overflow: 'hidden' }}><button onClick={handleSaveMemo}>메모 저장하기</button></div>
              </div>
            )}
          </div>
        </main>
      ) : (
        <>
          <nav className="main-nav">
            <div className="nav-inner">
              {['전체', '인턴', '채용·일자리', '공모전', '해커톤', '교육·강좌', '대외활동', '지원금·정책', '🗺️ 내 주변 맵'].map((tab) => (
                <button
                  key={tab}
                  className={`nav-item ${selectedCategory === tab ? 'active' : ''}`}
                  onClick={() => { setSelectedCategory(tab); setShowBookmarksOnly(false); }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </nav>

          <main className="content-area">
            {selectedCategory === '🗺️ 내 주변 맵' ? (
              <div className="animate-fade-in">
                <div className="content-header">
                  <h2>🗺️ 춘천시 청년 활동/교육 자원 지도 <span className="count-text" style={{fontSize: '0.9rem', color: '#64748b'}}>(데이터 연동 준비 중)</span></h2>
                </div>
                <div className="map-container">
                  <div className="map-sidebar">
                    <div className="map-sidebar-header">
                      <h3>📍 현재 내 주변 (3km)</h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>검색된 로컬 기회: 4건</p>
                    </div>
                    <div className="map-sidebar-list">
                      <div className="map-list-item"><h4>🏢 강원대학교 취창업지원센터</h4><p>이력서 첨삭 및 면접 컨설팅 (상시)</p></div>
                      <div className="map-list-item"><h4>💻 춘천 ICT 벤처센터</h4><p>로컬 해커톤 대회 장소 (D-4)</p></div>
                      <div className="map-list-item"><h4>🎨 커먼즈필드 춘천</h4><p>청년 팝업스토어 기획단 모집 (D-12)</p></div>
                      <div className="map-list-item"><h4>📚 시립도서관</h4><p>청년 독서 스터디 공간 대여</p></div>
                    </div>
                  </div>
                  <div className="map-area">
                    <button className="map-search-btn">🔍 이 지역에서 다시 검색</button>
                    <div className="fake-marker" style={{ top: '40%', left: '30%' }}><div className="marker-icon">📍</div><div className="marker-label">강원대학교</div></div>
                    <div className="fake-marker" style={{ top: '60%', left: '50%' }}><div className="marker-icon">💻</div><div className="marker-label">ICT 벤처센터</div></div>
                    <div className="fake-marker" style={{ top: '35%', left: '65%' }}><div className="marker-icon">🎨</div><div className="marker-label">커먼즈필드</div></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in">
                {selectedCategory === '전체' && !showBookmarksOnly && (
                  <>
                    {isLoggedIn && (
                      <div className="dashboard-hero">
                        <div className="receipt-wrapper">
                          <div className="receipt-card">
                            <div className="receipt-title">🧾 미수령 혜택 영수증</div>
                            <div className="receipt-subtitle">발급대상: {userName} 님<br/>발급일자: 2026. 07. 31</div>
                            <div className="receipt-line"></div>
                            <div className="receipt-item"><span>청년 구직활동 지원금</span><span>500,000원</span></div>
                            <div className="receipt-item"><span>면접 정장 대여 (춘천 날개)</span><span>50,000원</span></div>
                            <div className="receipt-item"><span>자격증 응시료 지원</span><span>100,000원</span></div>
                            <div className="receipt-item"><span>청년 도서구입비 지원</span><span>120,000원</span></div>
                            <div className="receipt-line"></div>
                            <div className="receipt-total"><span>총 놓친 금액</span><span>770,000원</span></div>
                            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', marginTop: '20px' }}>"이번 달은 모아봄에서 꼭 다 챙겨가세요!"</div>
                          </div>
                        </div>
                        {recommendedPicks.length > 0 && (
                          <div className="recommendation-wrapper">
                            <h3>✨ {userName}님을 위한 맞춤 추천 공고</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px', marginTop: 0 }}>최근 조회하신 관심사를 분석하여 추천해 드립니다.</p>
                            <div className="horizontal-scroll">
                              {recommendedPicks.map((item) => (
                                <div key={`rec-${item.id}`} className="recommend-card" onClick={() => handleCardClick(item)}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>{item.category}</span>
                                  <h4 style={{ fontSize: '0.95rem', margin: '8px 0', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</h4>
                                  <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 'bold' }}>{calculateDDay(item.deadline)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {!isLoggedIn && (
                      <div className="hero-section">
                        <div className="hero-banner">
                          {activePick ? (
                            <div className="banner-content" onClick={() => handleCardClick(activePick)}>
                              <div className="banner-text">
                                <span className="banner-badge">🔥 실시간 인기/추천 공고</span>
                                <h2>{activePick.title}</h2>
                                <p>{activePick.orgName} | 마감: {formatDateString(activePick.deadline)}</p>
                                <button className="btn-go">바로가기 &gt;</button>
                              </div>
                              <img src={activePick.imageUrl} alt="인기 공고" className="banner-image" />
                              <div className="banner-controls">
                                <button onClick={prevBanner}>◀</button><span className="banner-page">{currentBannerIdx + 1} / {topPicks.length}</span><button onClick={nextBanner}>▶</button>
                              </div>
                            </div>
                          ) : <div className="banner-loading">로딩 중...</div>}
                        </div>
                        <div className="login-box">
                          <div className="login-box-header"><div className="profile-icon">👤</div><p>로그인하시면 상세한<br/>맞춤 정보를 확인할 수 있습니다.</p></div>
                          <p className="login-subtext">회원가입 시 다양한 서비스를 제공합니다.</p>
                          <button className="btn-login-main" onClick={() => setAuthModal('login')}>로그인 / 회원가입</button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="content-header animate-fade-in" key={`header-${selectedCategory}`}>
                  <h2>
                    {showBookmarksOnly ? '⭐ 내가 찜한 공고 ' : selectedCategory === '전체' ? '📌 통합 공고 목록 ' : `${categoryEmojiMap[selectedCategory] || '📌'} ${selectedCategory} 모아봄 `}
                    <span className="count-text" style={{ whiteSpace: 'nowrap' }}>({!loading ? sortedData.length : 0}건)</span>
                  </h2>
                  
                  <div className="header-controls">
                    <div className="view-toggle">
                      <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>목록형</button>
                      <button className={viewMode === 'calendar' ? 'active' : ''} onClick={() => setViewMode('calendar')}>달력형</button>
                    </div>
                    <label className="filter-label">
                      <input type="checkbox" checked={showActiveOnly} onChange={(e) => setShowActiveOnly(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }}/>
                      ✅ 모집 중만 보기
                    </label>
                    <select className="sort-dropdown" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      <option value="latest">최신순</option><option value="deadline">⏳ 마감 임박순</option><option value="popular">🔥 인기순</option>
                    </select>
                  </div>
                </div>

                {viewMode === 'calendar' ? (
                  renderCalendar()
                ) : (
                  <div className="force-grid animate-fade-in" key={`grid-${selectedCategory}-${showBookmarksOnly}-${showActiveOnly}`}>
                    {loading ? (
                      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <div key={n} className="force-card">
                          <div className="force-img-wrap" style={{background: '#e2e8f0'}}></div>
                          <div className="force-body"><div style={{ width: '40px', height: '16px', background: '#e2e8f0', marginBottom: '8px' }}></div><div style={{ width: '100%', height: '20px', background: '#e2e8f0', marginBottom: '8px' }}></div><div style={{ width: '70%', height: '20px', background: '#e2e8f0' }}></div></div>
                        </div>
                      ))
                    ) : sortedData.length === 0 ? (
                      <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                        <div className="empty-icon">{showBookmarksOnly ? '⭐' : '📂'}</div>
                        <h3>{showBookmarksOnly ? '아직 북마크한 공고가 없습니다.' : '조건에 맞는 공고가 없습니다.'}</h3>
                        {showActiveOnly && <button className="btn-reset" onClick={() => setShowActiveOnly(false)} style={{ background: '#475569', marginTop: '12px' }}>마감된 공고 포함해서 보기</button>}
                        <button className="btn-reset" onClick={() => { setSearchTerm(''); setSelectedCategory('전체'); setShowBookmarksOnly(false); setShowActiveOnly(true); }} style={{ marginLeft: '8px' }}>전체 보기로 돌아가기</button>
                      </div>
                    ) : (
                      sortedData.map((item) => {
                        const views = viewCounts[item.id] || 0;
                        const isBookmarked = bookmarks.includes(item.id);
                        const today = new Date(); today.setHours(0, 0, 0, 0);
                        const isExpired = item.deadline ? new Date(item.deadline) < today : false;
                        const dynamicDDay = calculateDDay(item.deadline);

                        return (
                          <div key={item.id} className="force-card" onClick={() => handleCardClick(item)} style={{ filter: isExpired ? 'grayscale(100%)' : 'none', opacity: isExpired ? 0.7 : 1 }}>
                            <div className="force-img-wrap">
                              <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              {isExpired && <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>마감됨</div>}
                              <button onClick={(e) => toggleBookmark(e, item.id)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10 }}>{isBookmarked ? '⭐' : '☆'}</button>
                            </div>
                            <div className="force-body">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#3b82f6', background: '#eff6ff', padding: '4px 8px', borderRadius: '4px' }}>{item.category}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: isExpired ? '#94a3b8' : '#ef4444' }}>{dynamicDDay}</span>
                              </div>
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
                
                {!loading && hasMore && sortedData.length > 0 && selectedCategory === '전체' && !showBookmarksOnly && viewMode === 'list' && (
                  <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <button onClick={() => setPage(prev => prev + 1)} disabled={isLoadingMore} style={{ padding: '12px 32px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '50px', fontWeight: 'bold', color: '#475569', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}>
                      {isLoadingMore ? '불러오는 중...' : '더 보기 ↓'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </>
      )}

      <button className="chatbot-fab" onClick={() => setShowChat(!showChat)}>{showChat ? '✕' : '💬'}</button>
      {showChat && (
        <div className="chatbot-window">
          <div className="chatbot-header"><span>🤖 모아봄 AI 챗봇</span><button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button></div>
          <div className="chatbot-messages" style={{ display: 'flex', flexDirection: 'column' }}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`msg-bubble ${msg.type === 'bot' ? 'msg-bot' : 'msg-user'}`}>{msg.type === 'bot' ? renderChatMessage(msg.text) : msg.text}</div>
            ))}
          </div>
          <form className="chatbot-input" onSubmit={handleSendMessage}>
            <input type="text" placeholder="공고에 대해 물어보세요!" value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
            <button type="submit">↑</button>
          </form>
        </div>
      )}

      {authModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeInUp 0.2s' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '16px', width: '90%', maxWidth: '400px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <button onClick={() => setAuthModal(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            <h2 style={{ marginBottom: '8px', textAlign: 'center', color: '#0f172a' }}>{authModal === 'login' ? '환영합니다! 👋' : '모아봄 시작하기 🚀'}</h2>
            <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '24px', fontSize: '0.9rem' }}>{authModal === 'login' ? '로그인하고 맞춤 공고를 추천받으세요.' : '간편하게 가입하고 춘천시 공고를 한눈에!'}</p>
            <form onSubmit={handleAuthSubmit}>
              <input type="email" placeholder="이메일 아이디" className="auth-input" required />
              <input type="password" placeholder="비밀번호" className="auth-input" required />
              {authModal === 'signup' && <input type="password" placeholder="비밀번호 확인" className="auth-input" required />}
              <button type="submit" className="auth-submit-btn">{authModal === 'login' ? '이메일로 로그인' : '이메일로 가입하기'}</button>
            </form>
            <div className="auth-divider">또는 SNS로 시작하기</div>
            <button className="social-btn kakao-btn">카카오로 {authModal === 'login' ? '로그인' : '3초만에 시작하기'}</button>
            <button className="social-btn google-btn">Google로 {authModal === 'login' ? '로그인' : '시작하기'}</button>
            <button onClick={() => { setIsLoggedIn(true); setAuthModal(null); }} style={{ width: '100%', padding: '12px', marginTop: '16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>(테스트) 비회원으로 둘러보기</button>
          </div>
        </div>
      )}

      {showTopBtn && <button className={`btn-scroll-top ${showChat ? 'chat-open' : ''}`} onClick={scrollToTop}>↑</button>}
    </div>
  );
}