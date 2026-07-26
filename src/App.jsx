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
  
  // 🌟 [추가] 페이징(더 보기) 관리를 위한 상태
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedPost, setSelectedPost] = useState(null);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authModal, setAuthModal] = useState(null); 
  
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(true); 
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0); 
  const [showTopBtn, setShowTopBtn] = useState(false);

  const [showNoti, setShowNoti] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  
  const [chatMessages, setChatMessages] = useState([
    { type: 'bot', text: '안녕하세요! 춘천 청년들을 위한 AI 모아봄 챗봇입니다. 🎓\n\n어떤 공고를 찾고 계신가요? (예: "주말에 할 수 있는 대외활동 찾아줘", "컴퓨터 관련 강좌 있어?")' }
  ]);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  });

  const [sortBy, setSortBy] = useState('latest');
  const [categoryWeights, setCategoryWeights] = useState({});
  const [viewCounts, setViewCounts] = useState({});

  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // 🌟 [핵심 변경] 페이징 처리 및 더 보기 로직 적용
  useEffect(() => {
    const fetchNotices = async () => {
      if (page > 1) setIsLoadingMore(true);
      else setLoading(true);

      // 백엔드 파라미터에 맞게 page와 size를 명시하여 16개씩 끊어서 호출
      const API_URL = `https://moabom-backend.onrender.com/api/opportunities?page=${page}&size=16`; 

      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`서버 응답 오류: ${res.status}`);
        const data = await res.json();

        const listData = Array.isArray(data) ? data : data.content || data.items || data.data || [];
        
        // 받아온 데이터가 요청한 16개보다 적으면, 더 이상 남은 데이터가 없는 것으로 판단
        if (listData.length < 16) {
          setHasMore(false);
        }

        const normalizedData = listData.map((item, index) => normalizeItem(item, index + (page - 1) * 16));
        
        if (page === 1) {
          setNotices(normalizedData);
        } else {
          // 기존 데이터 뒤에 새로 가져온 데이터를 이어붙임
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
  }, [page]); // page 번호가 바뀔 때마다 실행됨

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

  const toggleBookmark = (e, id) => {
    e.stopPropagation();
    setBookmarks((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
    );
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { type: 'user', text: userMsg }]);
    setChatInput('');
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
        throw new Error(`서버가 올바른 응답을 주지 않았습니다. (상태 코드: ${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data.error || `API 요청 실패 (${response.status})`);
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
              onClick={() => {
                const cleanLabel = label.replace(/\s/g, ''); 
                
                let post = notices.find(n => n.title.replace(/\s/g, '') === cleanLabel);
                
                if (!post) {
                  post = notices.find(n => n.title.includes(label) || label.includes(n.title));
                }

                if (post) handleCardClick(post);
                else alert(`"${label}" 공고를 찾을 수 없거나 이미 마감되었습니다.`);
              }} 
              style={{
                background: 'none', border: 'none', color: '#2563eb', 
                textDecoration: 'underline', cursor: 'pointer', 
                padding: 0, fontSize: 'inherit', fontWeight: 'bold', textAlign: 'left'
              }}
            >
              {label}
            </button>
          );
        } else {
          return (
            <a 
              key={i} 
              href={target} 
              target="_blank" 
              rel="noreferrer"
              style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 'bold' }}
            >
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
    setAuthModal(null);
  };

  return (
    <div className="app-container">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap; 
          gap: 16px;
          margin-bottom: 24px;
        }
        .content-header h2 {
          margin: 0;
          word-break: keep-all; 
        }
        .header-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .filter-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9rem;
          color: #475569;
          cursor: pointer;
          font-weight: 600;
          white-space: nowrap; 
        }

        .force-grid {
          display: grid !important;
          grid-template-columns: repeat(5, 1fr) !important;
          gap: 40px 20px !important;
        }
        .force-card {
          display: flex !important;
          flex-direction: column !important;
          background-color: transparent !important;
          border: none !important;
          cursor: pointer !important;
          transition: transform 0.2s !important;
          height: 100% !important; 
        }
        .force-card:hover { transform: translateY(-4px) !important; }
        .force-img-wrap {
          width: 100% !important;
          aspect-ratio: 1 / 1 !important;
          height: auto !important;
          position: relative !important;
          background-color: #f1f5f9 !important;
          border-radius: 12px !important; 
          border: 1px solid #e2e8f0 !important;
          overflow: hidden !important;
        }
        .force-body {
          padding: 12px 4px 0px 4px !important;
          display: flex !important;
          flex-direction: column !important;
          flex-grow: 1 !important; 
        }
        
        .social-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; margin-bottom: 10px; border: none;
        }
        .kakao-btn { background-color: #FEE500; color: #000000; }
        .google-btn { background-color: #ffffff; color: #333333; border: 1px solid #d1d5db; }
        
        .auth-input {
          width: 100%; padding: 12px; margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; box-sizing: border-box;
        }
        .auth-input:focus { border-color: #3b82f6; }
        .auth-submit-btn {
          width: 100%; padding: 12px; background-color: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer; margin-bottom: 20px; transition: background-color 0.2s;
        }
        .auth-submit-btn:hover { background-color: #2563eb; }
        .auth-divider {
          display: flex; align-items: center; color: #94a3b8; font-size: 0.85rem; margin-bottom: 20px;
        }
        .auth-divider::before, .auth-divider::after {
          content: ''; flex: 1; border-bottom: 1px solid #e2e8f0; margin: 0 10px;
        }

        .noti-dropdown {
          position: absolute; top: 50px; right: 0; width: 320px; background: white;
          border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;
          z-index: 100; overflow: hidden; animation: fadeInUp 0.2s;
        }
        .noti-item { padding: 16px; border-bottom: 1px solid #f1f5f9; cursor: pointer; text-align: left; }
        .noti-item:hover { background-color: #f8fafc; }
        .noti-item h4 { font-size: 0.9rem; margin-bottom: 4px; color: #1e293b; }
        .noti-item p { font-size: 0.8rem; color: #64748b; line-height: 1.4; }
        
        .chatbot-fab {
          position: fixed; bottom: 40px; right: 40px; width: 64px; height: 64px;
          background: linear-gradient(135deg, #6366f1, #3b82f6); color: white; border: none;
          border-radius: 50%; font-size: 1.8rem; cursor: pointer; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
          z-index: 999; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;
        }
        .chatbot-fab:hover { transform: scale(1.1); }
        
        .chatbot-window {
          position: fixed; bottom: 120px; right: 40px; width: 380px; height: 550px;
          background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.15);
          display: flex; flex-direction: column; z-index: 999; overflow: hidden; border: 1px solid #e2e8f0;
          animation: fadeInUp 0.3s;
        }
        .chatbot-header {
          background: #3b82f6; color: white; padding: 16px 20px; font-weight: bold;
          display: flex; justify-content: space-between; align-items: center; 
        }
        .chatbot-messages {
          flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: #f8fafc;
        }
        .msg-bubble {
          max-width: 85%; padding: 12px 16px; border-radius: 16px; font-size: 0.95rem; line-height: 1.5; white-space: pre-line; word-break: break-word;
        }
        .msg-bot { background: white; color: #334155; border: 1px solid #e2e8f0; align-self: flex-start; border-bottom-left-radius: 4px; }
        .msg-user { background: #3b82f6; color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
        .chatbot-input {
          padding: 16px; background: white; border-top: 1px solid #e2e8f0; display: flex; gap: 8px;
        }
        .chatbot-input input {
          flex: 1; padding: 10px 16px; border: 1px solid #cbd5e1; border-radius: 20px; outline: none; font-size: 0.95rem;
        }
        .chatbot-input button {
          background: #3b82f6; color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold;
        }

        .btn-scroll-top {
          position: fixed;
          bottom: 40px;
          right: 40px;
          width: 48px;
          height: 48px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          z-index: 998;
          transition: right 0.3s, transform 0.2s;
        }
        .btn-scroll-top:hover {
          transform: translateY(-4px);
        }
        .btn-scroll-top.chat-open {
          right: 120px; 
        }

        @media (max-width: 1024px) {
          .force-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }

        @media (max-width: 768px) {
          .content-header {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 12px;
          }
          .header-controls {
            width: 100%;
            justify-content: space-between; 
          }

          .force-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 24px 12px !important;
          }
          
          .chatbot-window {
            width: calc(100% - 40px);
            height: 65vh;
            bottom: 90px;
            right: 20px;
          }
          .chatbot-fab {
            width: 56px; height: 56px;
            bottom: 24px; right: 24px;
            font-size: 1.5rem;
          }
          .btn-scroll-top {
            bottom: 28px; 
            right: 96px; 
            width: 48px; height: 48px;
          }
          .btn-scroll-top.chat-open {
            display: none; 
          }
          .noti-dropdown {
            width: 280px;
            right: -10px;
          }
          .nav-inner {
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-bottom: 5px;
          }
          .nav-item {
            flex-shrink: 0;
            white-space: nowrap;
          }
        }
      `}</style>

      {/* 상단 헤더 */}
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
            
            <div className="header-links" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => setShowNoti(!showNoti)} 
                style={{ position: 'relative', fontSize: '1.2rem', marginRight: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                🔔
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }}></span>
              </button>
              
              {showNoti && (
                <div className="noti-dropdown">
                  <div style={{ padding: '12px 16px', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    알림 <span style={{ color: '#3b82f6', fontSize: '0.8rem', cursor: 'pointer' }}>모두 읽음 처리</span>
                  </div>
                  <div className="noti-item">
                    <h4>🔥 [해커톤] 신청 마감 D-1</h4>
                    <p>북마크하신 '강원 해커톤 대회' 마감이 내일입니다. 잊지 말고 지원하세요!</p>
                  </div>
                  <div className="noti-item">
                    <h4>✨ 맞춤 공고 추천</h4>
                    <p>회원님을 위한 새로운 [마케팅 인턴] 공고가 3건 등록되었습니다.</p>
                  </div>
                </div>
              )}

              {isLoggedIn ? (
                <button onClick={() => { setIsLoggedIn(false); alert('로그아웃 되었습니다.'); }} style={{ fontWeight: 'bold', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>로그아웃</button>
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

      {/* 상세 페이지 화면 */}
      {selectedPost ? (
        <main className="animate-fade-in" style={{ maxWidth: '850px', margin: '0 auto', padding: '40px 20px' }}>
          <button 
            onClick={() => setSelectedPost(null)}
            style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: 'bold', color: '#64748b', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            ← 목록으로 돌아가기
          </button>

          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '40px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ background: '#e0e7ff', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', color: '#4338ca', fontSize: '0.9rem' }}>
                {selectedPost.category}
              </span>
              <span style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>
                출처: {selectedPost.sourceName}
              </span>
            </div>
            
            <h1 style={{ fontSize: '2.2rem', fontWeight: '800', lineHeight: '1.3', marginBottom: '24px', color: '#0f172a', wordBreak: 'keep-all' }}>
              {selectedPost.title}
            </h1>
            
            <img 
              src={selectedPost.imageUrl} 
              alt="포스터" 
              style={{ width: '100%', maxHeight: '450px', objectFit: 'cover', borderRadius: '12px', marginBottom: '32px' }} 
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '40px', fontSize: '1rem' }}>
              <p><strong>🏢 주관기관:</strong> {selectedPost.orgName}</p>
              {selectedPost.targets !== '제한없음' && <p><strong>🎯 지원대상:</strong> {selectedPost.targets}</p>}
              
              <p><strong>⏳ 모집마감:</strong> <span style={{color: '#ef4444', fontWeight: 'bold'}}>{formatDateString(selectedPost.deadline)} ({calculateDDay(selectedPost.deadline)})</span></p>
              
              {selectedPost.activityStart && (
                <p style={{ gridColumn: '1 / -1' }}><strong>📅 활동/근무 기간:</strong> {formatDateString(selectedPost.activityStart)} ~ {formatDateString(selectedPost.activityEnd)}</p>
              )}

              {Object.entries(selectedPost.details).map(([key, value]) => {
                if (!value || typeof value === 'object') return null; 
                const label = detailKeyMap[key] || key; 
                return (
                  <p key={key}><strong>💡 {label}:</strong> {value}</p>
                );
              })}
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>상세 안내</h3>
            <div style={{ lineHeight: '1.8', fontSize: '1.05rem', color: '#334155', marginBottom: '40px', whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
              {selectedPost.description}
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '32px', borderTop: '1px solid #e2e8f0' }}>
              <a 
                href={selectedPost.url} 
                target="_blank" 
                rel="noreferrer" 
                style={{ display: 'inline-block', background: '#3b82f6', color: 'white', padding: '16px 48px', borderRadius: '50px', fontSize: '1.2rem', fontWeight: '800', textDecoration: 'none', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)', transition: 'transform 0.2s' }}
              >
                원문 페이지로 이동하여 확인하기 🔗
              </a>
            </div>
          </div>
        </main>

      ) : (
        // 기본 목록 화면
        <>
          <nav className="main-nav">
            <div className="nav-inner">
              {['전체', '인턴', '채용·일자리', '공모전', '해커톤', '교육·강좌', '대외활동', '지원금·정책', '행사·공연'].map((tab) => (
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
              <div className="hero-section animate-fade-in">
                <div className="hero-banner">
                  {activePick ? (
                    <div className="banner-content" onClick={() => handleCardClick(activePick)}>
                      <div className="banner-text">
                        <span className="banner-badge">🔥 실시간 인기/추천 공고</span>
                        <h2>{activePick.title}</h2>
                        <p>{activePick.orgName} | 마감: {formatDateString(activePick.deadline)}</p>
                        <button className="btn-go">바로가기 &gt;</button>
                      </div>
                      <img 
                        src={activePick.imageUrl} 
                        alt="인기 공고 이미지" 
                        className="banner-image"
                      />
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

                {/* 메인 로그인 박스 */}
                <div className="login-box">
                  <div className="login-box-header">
                    <div className="profile-icon">👤</div>
                    <p>로그인하시면 상세한<br/>맞춤 정보를 확인할 수 있습니다.</p>
                  </div>
                  <p className="login-subtext">회원가입 시 다양한 서비스를 제공합니다.</p>
                  <div className="login-box-quick">
                    <div 
                      className={`quick-btn ${showBookmarksOnly ? 'active' : ''}`}
                      onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                    >
                      <span className="icon">📄</span>
                      <span>{showBookmarksOnly ? '전체 보기' : '북마크한 공고'}</span>
                    </div>
                    <div className="quick-btn" onClick={() => setAuthModal('login')}>
                      <span className="icon">💡</span>
                      <span>내게 맞는 공고</span>
                    </div>
                  </div>
                  <button className="btn-login-main" onClick={() => setAuthModal('login')}>로그인</button>
                  <div className="login-links-bottom">
                    <span>아이디 찾기</span>
                    <span>비밀번호 찾기</span>
                    <span onClick={() => setAuthModal('signup')} style={{ cursor: 'pointer' }}>회원가입</span>
                  </div>
                </div>
              </div>
            )}

            <div className="content-header animate-fade-in" key={`header-${selectedCategory}`}>
              <h2>
                {showBookmarksOnly ? '⭐ 내가 찜한 공고 ' : 
                  selectedCategory === '전체' ? '📌 통합 공고 목록 ' : 
                  `${categoryEmojiMap[selectedCategory] || '📌'} ${selectedCategory} 모아봄 `}
                <span className="count-text" style={{ whiteSpace: 'nowrap' }}>({!loading ? sortedData.length : 0}건)</span>
              </h2>
              
              <div className="header-controls">
                <label className="filter-label">
                  <input 
                    type="checkbox" 
                    checked={showActiveOnly} 
                    onChange={(e) => setShowActiveOnly(e.target.checked)} 
                    style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }}
                  />
                  ✅ 모집 중만 보기
                </label>

                <select className="sort-dropdown" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="latest">최신순</option>
                  <option value="deadline">⏳ 마감 임박순</option>
                  <option value="recommend">✨ 맞춤 추천순</option>
                  <option value="popular">🔥 인기순</option>
                </select>
              </div>
            </div>

            <div className="force-grid animate-fade-in" key={`grid-${selectedCategory}-${showBookmarksOnly}-${showActiveOnly}`}>
              {loading ? (
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <div key={n} className="force-card">
                    <div className="force-img-wrap" style={{background: '#e2e8f0'}}></div>
                    <div className="force-body">
                      <div style={{ width: '40px', height: '16px', background: '#e2e8f0', marginBottom: '8px' }}></div>
                      <div style={{ width: '100%', height: '20px', background: '#e2e8f0', marginBottom: '8px' }}></div>
                      <div style={{ width: '70%', height: '20px', background: '#e2e8f0' }}></div>
                    </div>
                  </div>
                ))
              ) : sortedData.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <div className="empty-icon">{showBookmarksOnly ? '⭐' : '📂'}</div>
                  <h3>{showBookmarksOnly ? '아직 북마크한 공고가 없습니다.' : '조건에 맞는 공고가 없습니다.'}</h3>
                  {showActiveOnly && (
                    <button className="btn-reset" onClick={() => setShowActiveOnly(false)} style={{ background: '#475569', marginTop: '12px' }}>
                      마감된 공고 포함해서 보기
                    </button>
                  )}
                  <button className="btn-reset" onClick={() => { setSearchTerm(''); setSelectedCategory('전체'); setShowBookmarksOnly(false); setShowActiveOnly(true); }} style={{ marginLeft: '8px' }}>
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
                      className="force-card"
                      onClick={() => handleCardClick(item)}
                      style={{ filter: isExpired ? 'grayscale(100%)' : 'none', opacity: isExpired ? 0.7 : 1 }}
                    >
                      <div className="force-img-wrap">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                        />
                        
                        {/* 마감된 공고일 경우 오버레이 표시 */}
                        {isExpired && (
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            마감됨
                          </div>
                        )}
                        
                        {/* 북마크 버튼 */}
                        <button 
                          onClick={(e) => toggleBookmark(e, item.id)}
                          style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10 }}
                        >
                          {isBookmarked ? '⭐' : '☆'}
                        </button>
                      </div>

                      <div className="force-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#3b82f6', background: '#eff6ff', padding: '4px 8px', borderRadius: '4px' }}>
                            {item.category}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: '900', color: isExpired ? '#94a3b8' : '#ef4444' }}>
                            {dynamicDDay}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: '0 0 8px 0', color: '#1e293b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4', height: '2.8em' }}>
                          {highlightText(item.title, debouncedSearchTerm)}
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {highlightText(item.orgName, debouncedSearchTerm)}
                        </p>
                        
                        <div style={{ marginTop: 'auto', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                          <span>조회 {views}</span>
                          <span>마감: {formatDateString(item.deadline)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* 🌟 더 보기 버튼 */}
            {!loading && hasMore && sortedData.length > 0 && selectedCategory === '전체' && !showBookmarksOnly && (
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <button 
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={isLoadingMore}
                  style={{ padding: '12px 32px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '50px', fontWeight: 'bold', color: '#475569', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                >
                  {isLoadingMore ? '불러오는 중...' : '더 보기 ↓'}
                </button>
              </div>
            )}
          </main>
        </>
      )}

      {/* 🌟 챗봇 플로팅 버튼 */}
      <button className="chatbot-fab" onClick={() => setShowChat(!showChat)}>
        {showChat ? '✕' : '💬'}
      </button>
      
      {/* 🌟 챗봇 윈도우 */}
      {showChat && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span>🤖 모아봄 AI 챗봇</span>
            <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>
          <div className="chatbot-messages" style={{ display: 'flex', flexDirection: 'column' }}>
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

      {/* 🌟 인증 모달 (로그인/회원가입) */}
      {authModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeInUp 0.2s' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '16px', width: '90%', maxWidth: '400px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <button onClick={() => setAuthModal(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            <h2 style={{ marginBottom: '8px', textAlign: 'center', color: '#0f172a' }}>
              {authModal === 'login' ? '환영합니다! 👋' : '모아봄 시작하기 🚀'}
            </h2>
            <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '24px', fontSize: '0.9rem' }}>
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
            
            <button 
              onClick={() => { setIsLoggedIn(true); setAuthModal(null); }} 
              style={{ width: '100%', padding: '12px', marginTop: '16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              (테스트) 비회원으로 둘러보기
            </button>
          </div>
        </div>
      )}

      {/* 🌟 위로 가기 버튼 */}
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