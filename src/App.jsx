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
  'INTERN': '인턴',
  'HACKATHON': '해커톤',
  'CONTEST': '공모전',
  'JOB': '채용·일자리',
  'EDUCATION': '교육·강좌',
  'PROGRAM': '교육·강좌',
  'ACTIVITY': '대외활동',
  'POLICY': '지원금·정책',
  'EVENT': '행사·공연',
  'VOLUNTEER': '자원봉사',
  'BUSINESS_OPPORTUNITY': '사업·창업',
  'BUSINESS': '사업·창업'
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
  '사업·창업': '💡',
  '기타': '📌'
};

const detailKeyMap = {
  capacity: '모집 인원',
  recruitment_count: '모집 인원',
  recruitment_count_text: '모집 인원',
  team_size: '팀원 수',
  employmentType: '고용 형태',
  employment_type: '고용 형태',
  salaryText: '급여 / 지원금',
  salary: '급여 / 지원금',
  fee: '참가비 / 관람료',
  prize: '상금 내역',
  tuition: '교육비',
  certificate: '수료증 발급',
  working_hours: '근무 시간',
  event_hours: '행사 시간',
  event_time: '행사 시간',
  applicationMethod: '지원 방법',
  application_method: '지원 방법',
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
    imageUrl: item.thumbnail_url || item.imageUrl || `https://picsum.photos/seed/${String(id).length + index}/800/800`,
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
    { type: 'bot', text: '안녕하세요! 춘천 청년들을 위한 AI 모아봄 챗봇입니다. 🎓\n\n어떤 공고를 찾고 계신가요? (예: "주말에 할 수 있는 대외활동 찾아줘", "컴퓨터 관련 강좌 있어?")' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // 🌟 네비게이션 탭 배열 추가 (모든 카테고리가 보이도록)
  const NAV_TABS = ['전체', '인턴', '채용·일자리', '사업·창업', '공모전', '해커톤', '교육·강좌', '대외활동', '지원금·정책', '행사·공연', '자원봉사'];

  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  });

  const [memos, setMemos] = useState(() => {
    try {
      const saved = localStorage.getItem('memos');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      return {};
    }
  });
  const [currentMemo, setCurrentMemo] = useState('');

  const [sortBy, setSortBy] = useState('latest');
  const [categoryWeights, setCategoryWeights] = useState({});
  const [viewCounts, setViewCounts] = useState({});

  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('memos', JSON.stringify(memos));
  }, [memos]);

  useEffect(() => {
    const fetchNotices = async () => {
      if (page > 1) setIsLoadingMore(true);
      else setLoading(true);

      const API_URL = `https://moabom-backend.onrender.com/api/opportunities?page=${page}&size=16`; 

      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`서버 응답 오류: ${res.status}`);
        const data = await res.json();

        const listData = Array.isArray(data) ? data : data.content || data.items || data.data || [];
        
        if (listData.length < 16) {
          setHasMore(false);
        }

        const normalizedData = listData.map((item, index) => normalizeItem(item, index + (page - 1) * 16));
        
        if (page === 1) {
          setNotices(normalizedData);
        } else {
          setNotices(prev => [...prev, ...normalizedData]);
        }
      } catch (err) {
        console.error('서버에서 데이터 가져오기 실패 🚨:', err);
        if (page === 1) setNotices([]); 
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    };

    fetchNotices();
  }, [page]); 

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) setShowTopBtn(true);
      else setShowTopBtn(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCardClick = (post) => {
    setSelectedPost(post);
    setCurrentMemo(memos[post.id] || ''); 
    scrollToTop(); 
    
    setCategoryWeights((prev) => ({
      ...prev,
      [post.category]: (prev[post.category] || 0) + 1,
    }));
    setViewCounts((prev) => ({
      ...prev,
      [post.id]: (prev[post.id] || 0) + 1,
    }));
  };

  const handleSaveMemo = () => {
    if (!selectedPost) return;
    setMemos(prev => ({
      ...prev,
      [selectedPost.id]: currentMemo
    }));
    alert('메모가 안전하게 저장되었습니다! 📝\n(현재는 내 기기에만 임시 저장됩니다)');
  };

  const toggleBookmark = (e, id) => {
    e.stopPropagation();
    setBookmarks((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
    );
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
        body: JSON.stringify({ 
          message: userPrompt, 
          noticesSummary: `[공고 상세 내용]: ${selectedPost.description || selectedPost.title}` 
        }),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        throw new Error('서버 응답 파싱 실패');
      }

      if (!response.ok) {
        throw new Error(data.error || 'API 요청 실패');
      }

      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop(); 
        newMessages.push({ type: 'bot', text: data.reply }); 
        return newMessages;
      });
      
    } catch (error) {
      console.error('Chat API Error:', error);
      
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
      return; 
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
      const noticesSummary = notices.map(n =>
        `- [${n.category}] ${n.title} (기관: ${n.orgName}, 마감: ${n.deadline || '상시'})`
      ).join('\n');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, noticesSummary }),
      });

      const text = await response.text();
      let data;
      
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        throw new Error(`서버가 올바른 응답을 주지 않았습니다.`);
      }

      if (!response.ok) {
        throw new Error(data.error || `API 요청 실패`);
      }

      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages.pop();
        newMessages.push({ type: 'bot', text: data.reply });
        return newMessages;
      });
      
    } catch (error) {
      console.error('Chat API Error:', error);
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
            <button 
              key={i} 
              className="chat-action-btn"
              onClick={() => {
                const cleanLabel = label.replace(/\s/g, ''); 
                
                let post = notices.find(n => n.title.replace(/\s/g, '') === cleanLabel);
                if (!post) post = notices.find(n => n.title.includes(label) || label.includes(n.title));

                if (post) handleCardClick(post);
                else alert(`"${label}" 공고를 찾을 수 없거나 이미 마감되었습니다.`);
              }} 
            >
              {label}
            </button>
          );
        } else {
          return (
            <a key={i} href={target} target="_blank" rel="noreferrer" className="chat-link">
              {label}
            </a>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  const filteredData = notices.filter((item) => {
    if (showBookmarksOnly && !bookmarks.includes(item.id)) return false;
    const matchesCategory = selectedCategory === '전체' || item.category.includes(selectedCategory);
    const searchLower = debouncedSearchTerm ? debouncedSearchTerm.toLowerCase() : '';
    const matchesSearch =
      item.title.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower) ||
      item.orgName.toLowerCase().includes(searchLower) ||
      item.topics.some(t => t.toLowerCase().includes(searchLower)); 

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
    return matchesCategory && matchesSearch;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortBy === 'popular') return (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0);
    if (sortBy === 'recommend') {
      const weightA = (categoryWeights[a.category] || 0);
      const weightB = (categoryWeights[b.category] || 0);
      return weightB - weightA;
    }
    if (sortBy === 'deadline') {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    }
    return a.id > b.id ? -1 : 1; 
  });

  const topPicks = notices.length > 0 
    ? [...notices].sort((a, b) => (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0)).slice(0, 4)
    : [];
  
  const recommendedPicks = notices.length > 0
    ? [...notices].sort((a, b) => (categoryWeights[b.category] || 0) - (categoryWeights[a.category] || 0)).slice(0, 5)
    : [];

  const activePick = topPicks[currentBannerIdx];

  const nextBanner = (e) => {
    e.stopPropagation();
    setCurrentBannerIdx((prev) => (prev + 1) % topPicks.length);
  };
  const prevBanner = (e) => {
    e.stopPropagation();
    setCurrentBannerIdx((prev) => (prev === 0 ? topPicks.length - 1 : prev - 1));
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setIsLoggedIn(true);
    setUserName('김모아'); 
    setAuthModal(null);
  };

  useEffect(() => {
    const chatContainer = document.querySelector('.chatbot-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [chatMessages]);

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
              <input
                type="text"
                placeholder="공고 제목, 분야, 주관기관 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="btn-clear" onClick={() => setSearchTerm('')}>✕</button>
              )}
              <button className="btn-search">🔍</button>
            </div>
            
            <div className="header-links">
              <button className="noti-btn" onClick={() => setShowNoti(!showNoti)}>
                🔔
                <span className="noti-badge"></span>
              </button>
              
              {showNoti && (
                <div className="noti-dropdown animate-fade-in">
                  <div className="noti-header">
                    알림 <span className="noti-read-all">모두 읽음 처리</span>
                  </div>
                  <div className="noti-item">
                    <h4>🔥 [해커톤] 신청 마감 D-1</h4>
                    <p>북마크하신 '강원 해커톤 대회' 마감이 내일입니다. 잊지 말고 지원하세요!</p>
                  </div>
                  <div className="noti-item">
                    <h4>✨ 맞춤 공고 추천</h4>
                    <p>{userName}님을 위한 새로운 [마케팅 인턴] 공고가 3건 등록되었습니다.</p>
                  </div>
                </div>
              )}

              {isLoggedIn ? (
                <div className="user-info">
                  <span className="user-name">{userName}님</span>
                  <button className="btn-text" onClick={() => { setIsLoggedIn(false); alert('로그아웃 되었습니다.'); }}>로그아웃</button>
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
          <button className="back-btn" onClick={() => setSelectedPost(null)}>
            ← 목록으로 돌아가기
          </button>

          <div className="detail-card">
            
            <div className="detail-tags">
              <span className="detail-tag-cat">{selectedPost.category}</span>
              <span className="detail-tag-src">출처: {selectedPost.sourceName}</span>
            </div>
            
            <h1 className="detail-title">{selectedPost.title}</h1>
            
            <img src={selectedPost.imageUrl} alt="포스터" className="detail-img" />
            
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
                return (
                  <p key={key} className="detail-info-item"><strong>💡 {label}:</strong> {value}</p>
                );
              })}
            </div>

            <h3 className="detail-subtitle">상세 안내</h3>
            <div className="detail-desc">{selectedPost.description}</div>

            <button 
              className={`btn-ai-extract ${isChatLoading ? 'animate-pulse' : ''}`}
              onClick={handleExtractAITips}
              disabled={isChatLoading}
            >
              {isChatLoading ? '🤖 챗봇이 공고를 분석 중입니다...' : '✨ 이 공고 맞춤 AI 면접/자소서 팁 뽑기'}
            </button>

            <div className="detail-link-wrap">
              <a href={selectedPost.url} target="_blank" rel="noreferrer" className="detail-link-btn">
                원문 페이지로 이동하여 확인하기 🔗
              </a>
            </div>

            {isLoggedIn && (
              <div className="memo-pad animate-fade-in">
                <h3 className="memo-title">📝 {userName}님의 비밀 메모장</h3>
                <textarea 
                  placeholder="자기소개서 작성 기한, 필요한 서류, 팀원 모집 여부 등 이 공고와 관련된 나만의 메모를 자유롭게 남겨보세요!" 
                  value={currentMemo}
                  onChange={(e) => setCurrentMemo(e.target.value)}
                />
                <div className="memo-btn-wrap">
                  <button onClick={handleSaveMemo}>메모 저장하기</button>
                </div>
              </div>
            )}
          </div>
        </main>

      ) : (
        <>
          <nav className="main-nav">
            <div className="nav-inner">
              {/* 🌟 사업·창업 및 자원봉사 탭이 추가된 메뉴 렌더링 */}
              {NAV_TABS.map((tab) => (
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
                        <img src={activePick.imageUrl} alt="인기 공고 이미지" className="banner-image" />
                        <div className="banner-controls">
                          <button onClick={prevBanner}>◀</button>
                          <span className="banner-page">{currentBannerIdx + 1} / {topPicks.length}</span>
                          <button onClick={nextBanner}>▶</button>
                        </div>
                      </div>
                    ) : (
                      <div className="banner-loading">로딩 중...</div>
                    )}
                  </div>

                  {isLoggedIn ? (
                    <div className="receipt-wrapper">
                      <div className="receipt-card">
                        <div className="receipt-title">🧾 미수령 혜택 영수증</div>
                        <div className="receipt-subtitle">
                          발급대상: {userName} 님<br/>발급일자: 2026. 07. 27
                        </div>
                        <div className="receipt-line"></div>
                        <div className="receipt-item"><span>청년 구직활동 지원금</span><span>500,000원</span></div>
                        <div className="receipt-item"><span>면접 정장 대여 (춘천 날개)</span><span>50,000원</span></div>
                        <div className="receipt-item"><span>자격증 응시료 지원</span><span>100,000원</span></div>
                        <div className="receipt-item"><span>청년 도서구입비 지원</span><span>120,000원</span></div>
                        <div className="receipt-line"></div>
                        <div className="receipt-total">
                          <span>총 놓친 금액</span><span>770,000원</span>
                        </div>
                        <div className="receipt-footer-text">
                          "이번 달은 모아봄에서 꼭 다 챙겨가세요!"
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="login-box">
                      <div className="login-box-header">
                        <div className="profile-icon">👤</div>
                        <p>로그인하시면 상세한<br/>맞춤 정보를 확인할 수 있습니다.</p>
                      </div>
                      <p className="login-subtext">회원가입 시 다양한 서비스를 제공합니다.</p>
                      <button className="btn-login-main" onClick={() => setAuthModal('login')}>로그인 / 회원가입</button>
                    </div>
                  )}
                </div>

                {isLoggedIn && recommendedPicks.length > 0 && (
                  <div className="recommendation-wrapper animate-fade-in">
                    <h3>✨ {userName}님을 위한 맞춤 추천 공고</h3>
                    <p className="rec-desc">최근 조회하신 관심사(클릭 패턴)를 분석하여 추천해 드립니다.</p>
                    <div className="horizontal-scroll">
                      {recommendedPicks.map((item) => (
                        <div key={`rec-${item.id}`} className="recommend-card" onClick={() => handleCardClick(item)}>
                          <div className="rec-card-header">
                            <span className="rec-badge">{item.category}</span>
                            <div className="rec-dday">{calculateDDay(item.deadline)}</div>
                          </div>
                          <h4 className="rec-title">{item.title}</h4>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="content-header animate-fade-in" key={`header-${selectedCategory}`}>
              <h2>
                {showBookmarksOnly ? '⭐ 내가 찜한 공고 ' : 
                  selectedCategory === '전체' ? '📌 통합 공고 목록 ' : 
                  `${categoryEmojiMap[selectedCategory] || '📌'} ${selectedCategory} 모아봄 `}
                <span className="count-text">({!loading ? sortedData.length : 0}건)</span>
              </h2>
              
              <div className="header-controls">
                <div className="view-toggle">
                  <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>목록형</button>
                  <button className={viewMode === 'calendar' ? 'active' : ''} onClick={() => {
                    setViewMode('calendar');
                    alert('달력 뷰는 백엔드 일정 API 연결 후 제공될 예정입니다! 🗓️\n(현재는 시연용 UI 프레임만 존재합니다.)');
                  }}>달력형</button>
                </div>

                <label className="filter-label">
                  <input 
                    type="checkbox" 
                    className="filter-checkbox"
                    checked={showActiveOnly} 
                    onChange={(e) => setShowActiveOnly(e.target.checked)} 
                  />
                  ✅ 모집 중만 보기
                </label>

                <select className="sort-dropdown" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="latest">최신순</option>
                  <option value="deadline">⏳ 마감 임박순</option>
                  <option value="popular">🔥 인기순</option>
                </select>
              </div>
            </div>

            {viewMode === 'calendar' ? (
              <div className="calendar-wrapper animate-fade-in">
                <div className="calendar-header-nav">
                  <button>&lt;</button>
                  <h3>2026년 7월</h3>
                  <button>&gt;</button>
                </div>
                <div className="calendar-grid">
                  <div className="cal-head">일</div><div className="cal-head">월</div><div className="cal-head">화</div>
                  <div className="cal-head">수</div><div className="cal-head">목</div><div className="cal-head">금</div><div className="cal-head">토</div>
                  
                  <div className="cal-cell empty"></div><div className="cal-cell empty"></div><div className="cal-cell empty"></div>
                  
                  <div className="cal-cell"><span className="cal-date">1</span></div>
                  <div className="cal-cell"><span className="cal-date">2</span></div>
                  <div className="cal-cell"><span className="cal-date">3</span></div>
                  <div className="cal-cell">
                    <span className="cal-date">4</span>
                    <div className="cal-events">
                      <div className="cal-event-badge">강원 해커톤 대회 마감</div>
                    </div>
                  </div>
                  <div className="cal-cell today">
                    <span className="cal-date">5</span>
                    <div className="cal-events">
                      <div className="cal-event-badge urgent">청년 구직지원금 마감</div>
                    </div>
                  </div>
                  
                  {Array.from({length: 26}).map((_, i) => (
                    <div key={i} className="cal-cell">
                      <span className="cal-date">{i + 6}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="force-grid animate-fade-in" key={`grid-${selectedCategory}-${showBookmarksOnly}-${showActiveOnly}`}>
                {loading ? (
                  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <div key={n} className="force-card">
                      <div className="force-img-wrap"></div>
                      <div className="force-body">
                        <div className="skeleton-badge"></div>
                        <div className="skeleton-title"></div>
                        <div className="skeleton-desc"></div>
                      </div>
                    </div>
                  ))
                ) : sortedData.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">{showBookmarksOnly ? '⭐' : '📂'}</div>
                    <h3>{showBookmarksOnly ? '아직 북마크한 공고가 없습니다.' : '조건에 맞는 공고가 없습니다.'}</h3>
                    {showActiveOnly && (
                      <button className="btn-reset secondary" onClick={() => setShowActiveOnly(false)}>마감된 공고 포함해서 보기</button>
                    )}
                    <button className="btn-reset" onClick={() => { setSearchTerm(''); setSelectedCategory('전체'); setShowBookmarksOnly(false); setShowActiveOnly(true); }}>
                      전체 보기로 돌아가기
                    </button>
                  </div>
                ) : (
                  sortedData.map((item) => {
                    const views = viewCounts[item.id] || 0;
                    const isBookmarked = bookmarks.includes(item.id);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isExpired = item.deadline ? new Date(item.deadline) < today : false;
                    const dynamicDDay = calculateDDay(item.deadline);

                    return (
                      <div 
                        key={item.id} 
                        className={`force-card ${isExpired ? 'expired' : ''}`}
                        onClick={() => handleCardClick(item)}
                      >
                        <div className="force-img-wrap">
                          <img src={item.imageUrl} alt={item.title} />
                          {isExpired && <div className="expired-overlay">마감됨</div>}
                          <button 
                            className="bookmark-btn"
                            onClick={(e) => toggleBookmark(e, item.id)}
                          >
                            {isBookmarked ? '⭐' : '☆'}
                          </button>
                        </div>

                        <div className="force-body">
                          <div className="card-header-row">
                            <span className="card-badge">{item.category}</span>
                            <span className={`card-dday ${isExpired ? 'expired' : 'active'}`}>{dynamicDDay}</span>
                          </div>
                          <h3 className="card-title">{highlightText(item.title, debouncedSearchTerm)}</h3>
                          <p className="card-org">{highlightText(item.orgName, debouncedSearchTerm)}</p>
                          <div className="card-meta">
                            <span>조회 {views}</span>
                            <span>마감: {formatDateString(item.deadline)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
            
            {!loading && hasMore && sortedData.length > 0 && selectedCategory === '전체' && !showBookmarksOnly && viewMode === 'list' && (
              <div className="btn-more-container">
                <button 
                  className="btn-more"
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? '불러오는 중...' : '더 보기 ↓'}
                </button>
              </div>
            )}
          </main>
        </>
      )}

      <button className="chatbot-fab" onClick={() => setShowChat(!showChat)}>
        {showChat ? '✕' : '💬'}
      </button>
      
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
          <form className="chatbot-input" onSubmit={handleSendMessage}>
            <input 
              type="text" 
              placeholder="공고에 대해 물어보세요!" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
            />
            <button type="submit">↑</button>
          </form>
        </div>
      )}

      {authModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setAuthModal(null)}>✕</button>
            <h2 className="modal-title">
              {authModal === 'login' ? '환영합니다! 👋' : '모아봄 시작하기 🚀'}
            </h2>
            <p className="modal-desc">
              {authModal === 'login' ? '로그인하고 맞춤 공고를 추천받으세요.' : '간편하게 가입하고 춘천시 공고를 한눈에!'}
            </p>

            <form onSubmit={handleAuthSubmit}>
              <input type="email" placeholder="이메일 아이디" className="auth-input" required />
              <input type="password" placeholder="비밀번호" className="auth-input" required />
              {authModal === 'signup' && (
                 <input type="password" placeholder="비밀번호 확인" className="auth-input" required />
              )}
              <button type="submit" className="auth-submit-btn">
                {authModal === 'login' ? '이메일로 로그인' : '이메일로 가입하기'}
              </button>
            </form>

            <div className="auth-divider">또는 SNS로 시작하기</div>
            
            <button className="social-btn kakao-btn">카카오로 {authModal === 'login' ? '로그인' : '3초만에 시작하기'}</button>
            <button className="social-btn google-btn">Google로 {authModal === 'login' ? '로그인' : '시작하기'}</button>
            
            <button className="test-login-btn" onClick={() => { setIsLoggedIn(true); setAuthModal(null); }}>
              (테스트) 비회원으로 둘러보기
            </button>
          </div>
        </div>
      )}

      {showTopBtn && (
        <button 
          className={`btn-scroll-top ${showChat ? 'chat-open' : ''}`}
          onClick={scrollToTop} 
        >
          ↑
        </button>
      )}
    </div>
  );
}