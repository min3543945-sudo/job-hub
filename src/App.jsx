import React, { useState, useEffect, useDeferredValue } from 'react';
import './App.css';

// 🌟 검색 최적화를 위한 디바운스 훅
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// 🌟 검색어 하이라이팅 함수
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

// 🌟 D-Day 자동 계산 함수
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

// 🌟 엑셀 규격 코드값 번역 딕셔너리
const contentTypeMap = {
  'PROGRAM': '교육·강좌',
  'CONTEST': '공모전·해커톤',
  'JOB': '채용·일자리',
  'PROJECT': '공공사업',
  'POLICY': '정책·지원금',
  'EVENT': '행사·세미나',
  'SCHOLARSHIP': '장학금',
  'NEWS': '청년 소식',
  'VOLUNTEER': '자원봉사'
};

const categoryMap = {
  'PRACTICE_STARTUP': '실무 경험 및 창업',
  'SKILL_EDUCATION': '교육·강좌',
  'GLOBAL_LOCAL': '글로벌·로컬',
  'YOUTH_NEWS': '청년 소식'
};

const locationTypeMap = {
  'OFFLINE': '오프라인',
  'ONLINE': '온라인',
  'MIXED': '온·오프라인 혼합'
};

// 🌟 [핵심] 새롭게 주신 통합 JSON 규격을 완벽하게 읽어들이는 함수
const normalizeItem = (item, index) => {
  let orgName = '주관기관 미상';
  if (item.organization && typeof item.organization === 'object') {
    orgName = item.organization.name || item.organization.department || '주관기관 미상';
  } else if (typeof item.organization === 'string') {
    orgName = item.organization;
  }

  // 마감일 (새 규격 dates.recruit_end_at 지원)
  const deadline = item.dates?.recruit_end_at || item.dates?.applicationEndAt || item.deadline || '';
  
  // 출처 (새 규격 지원)
  let sourceName = item.source || item.source_site || '기타';
  if (typeof item.source === 'object') {
    sourceName = item.source.sourceName || '기타';
  }

  // 분야
  let categoryRaw = item.category || (item.topics && item.topics[0]) || '분야 미상';
  let category = categoryMap[categoryRaw] || contentTypeMap[categoryRaw] || categoryRaw;

  // 태그 및 장소
  let locType = item.location?.operation_type || item.location?.type || '';
  let locName = item.location?.region || '';
  let locTag = locationTypeMap[locType] || locType;
  if (locName) locTag += `(${locName})`;

  const tag = locTag || '기타';
  const id = item.id || item.externalId || `item-${index}`;

  return {
    id: String(id),
    title: item.title || '제목 없음',
    orgName,
    deadline,
    sourceName,
    category,
    tag,
    imageUrl: item.thumbnail_url || item.imageUrl || `https://picsum.photos/seed/${String(id).length + index}/800/400`,
    url: item.source_url || item.url || item.source?.listUrl || '#',
    targets: (item.targets && item.targets[0]) || item.target?.targetText || '제한없음',
    activityStart: item.dates?.activity_start_at || item.dates?.activityStartAt || '',
    activityEnd: item.dates?.activity_end_at || item.dates?.activityEndAt || '',
    benefits: item.details?.salaryText || item.benefits || '',
    description: item.summary || item.description || '상세 내용이 없습니다.',
    capacity: item.details?.capacity || item.recruitment?.capacity || null,
    contact: {
      name: item.details?.contact_name || item.contact?.name,
      phone: item.details?.contact_phone || item.contact?.phone,
      email: item.details?.contact_email || item.contact?.email
    }
  };
};

export default function App() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  
  // 🌟 선택된 게시물 (이 값이 있으면 상세 페이지로 화면 전환)
  const [selectedPost, setSelectedPost] = useState(null);
  
  const [authModal, setAuthModal] = useState(null); 
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0); 
  const [showTopBtn, setShowTopBtn] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/notices.json')
        .then((res) => res.json())
        .then((data) => {
          const normalizedData = data.map((item, index) => normalizeItem(item, index));
          setNotices(normalizedData);
          setLoading(false);
        })
        .catch((err) => {
          console.error('데이터 가져오기 실패:', err);
          setLoading(false);
        });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowTopBtn(true);
      } else {
        setShowTopBtn(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCardClick = (post) => {
    setSelectedPost(post);
    scrollToTop(); // 상세 페이지 진입 시 맨 위로 스크롤
    
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

  const filteredData = notices.filter((item) => {
    if (showBookmarksOnly && !bookmarks.includes(item.id)) return false;
    const matchesCategory = selectedCategory === '전체' || item.sourceName.includes(selectedCategory);
    const searchLower = debouncedSearchTerm ? debouncedSearchTerm.toLowerCase() : '';
    const matchesSearch =
      item.title.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower) ||
      item.orgName.toLowerCase().includes(searchLower);
      
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

  return (
    <div className="app-container">
      {/* 🚨 캐시 무시용 강력 스타일 주입 🚨 */}
      <style>{`
        .force-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
          gap: 24px !important;
        }
        .force-card {
          display: flex !important;
          flex-direction: column !important;
          background-color: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          cursor: pointer !important;
          transition: transform 0.2s, box-shadow 0.2s !important;
          height: 100% !important;
        }
        .force-card:hover {
          transform: translateY(-5px) !important;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1) !important;
        }
        .force-img-wrap {
          width: 100% !important;
          height: 180px !important;
          min-height: 180px !important;
          max-height: 180px !important;
          flex: 0 0 180px !important;
          position: relative !important;
          background-color: #f1f5f9 !important;
        }
        .force-body {
          padding: 16px !important;
          display: flex !important;
          flex-direction: column !important;
          flex-grow: 1 !important;
          min-height: 180px !important;
          background-color: #ffffff !important;
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
                placeholder="관심 공고나 키워드를 입력하세요"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="btn-clear" onClick={() => setSearchTerm('')}>✕</button>
              )}
              <button className="btn-search">🔍</button>
            </div>
            <div className="header-links">
              <button onClick={() => setAuthModal('login')}>로그인</button>
              <button onClick={() => setAuthModal('signup')}>회원가입</button>
            </div>
          </div>
        </div>
      </header>

      {/* 🌟 상세 페이지 화면 (selectedPost가 있을 때만 렌더링) */}
      {selectedPost ? (
        <main style={{ maxWidth: '850px', margin: '0 auto', padding: '40px 20px' }}>
          {/* 뒤로가기 버튼 */}
          <button 
            onClick={() => setSelectedPost(null)}
            style={{ background: 'none', border: 'none', fontSize: '1rem', fontWeight: 'bold', color: '#64748b', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            ← 목록으로 돌아가기
          </button>

          {/* 상세 내용 박스 */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '40px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            
            {/* 태그 */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <span style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>
                {selectedPost.sourceName}
              </span>
              <span style={{ background: '#e0e7ff', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', color: '#4338ca', fontSize: '0.9rem' }}>
                {selectedPost.category}
              </span>
            </div>
            
            {/* 제목 */}
            <h1 style={{ fontSize: '2.2rem', fontWeight: '800', lineHeight: '1.3', marginBottom: '24px', color: '#0f172a' }}>
              {selectedPost.title}
            </h1>
            
            {/* 포스터 이미지 */}
            <img 
              src={selectedPost.imageUrl} 
              alt="포스터" 
              style={{ width: '100%', maxHeight: '450px', objectFit: 'cover', borderRadius: '12px', marginBottom: '32px' }} 
            />
            
            {/* 요약 정보 박스 (회색 배경) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '40px', fontSize: '1rem' }}>
              <p><strong>🏢 주관기관:</strong> {selectedPost.orgName}</p>
              <p><strong>🎯 지원대상:</strong> {selectedPost.targets}</p>
              <p><strong>⏳ 모집마감:</strong> <span style={{color: '#ef4444', fontWeight: 'bold'}}>{selectedPost.deadline || '상시모집'} ({calculateDDay(selectedPost.deadline)})</span></p>
              <p><strong>💡 진행방식:</strong> {selectedPost.tag}</p>
              
              {selectedPost.capacity && <p><strong>👤 모집규모:</strong> {selectedPost.capacity}</p>}
              {selectedPost.benefits && <p><strong>🎁 혜택/급여:</strong> {selectedPost.benefits}</p>}
              
              {/* 활동기간이 있으면 표시 */}
              {selectedPost.activityStart && (
                <p style={{ gridColumn: '1 / -1' }}><strong>📅 활동기간:</strong> {selectedPost.activityStart} ~ {selectedPost.activityEnd}</p>
              )}
              
              {/* 문의처가 있으면 표시 */}
              {selectedPost.contact?.phone && (
                <p style={{ gridColumn: '1 / -1' }}>
                  <strong>📞 문의처:</strong> {selectedPost.contact.name ? `${selectedPost.contact.name} (` : ''} 
                  {selectedPost.contact.phone} 
                  {selectedPost.contact.name ? ')' : ''} 
                  {selectedPost.contact.email ? ` / ${selectedPost.contact.email}` : ''}
                </p>
              )}
            </div>

            {/* 본문 내용 */}
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>상세 안내</h3>
            <div style={{ lineHeight: '1.8', fontSize: '1.05rem', color: '#334155', marginBottom: '40px', whiteSpace: 'pre-line' }}>
              {selectedPost.description}
            </div>

            {/* CTA 원문 이동 버튼 */}
            <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '32px', borderTop: '1px solid #e2e8f0' }}>
              <a 
                href={selectedPost.url} 
                target="_blank" 
                rel="noreferrer" 
                style={{ display: 'inline-block', background: '#3b82f6', color: 'white', padding: '16px 48px', borderRadius: '50px', fontSize: '1.2rem', fontWeight: '800', textDecoration: 'none', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)', transition: 'transform 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                원문 페이지로 이동하여 신청하기 🔗
              </a>
            </div>
          </div>
        </main>

      ) : (
        // 🌟 기본 목록 화면 (selectedPost가 null일 때)
        <>
          {/* 네비게이션 탭 */}
          <nav className="main-nav">
            <div className="nav-inner">
              {['전체', '배워봄', '강원대', '한림대', '나라장터', '채용정보'].map((tab) => (
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
            {/* 히어로 섹션 */}
            <div className="hero-section">
              <div className="hero-banner">
                {activePick ? (
                  <div className="banner-content" onClick={() => handleCardClick(activePick)}>
                    <div className="banner-text">
                      <span className="banner-badge">🔥 실시간 인기/추천 공고</span>
                      <h2>{activePick.title}</h2>
                      <p>{activePick.orgName} | 마감: {activePick.deadline || '상시모집'}</p>
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
                  <span onClick={() => setAuthModal('signup')}>회원가입</span>
                </div>
              </div>
            </div>

            <div className="content-header">
              <h2>
                {showBookmarksOnly ? '⭐ 내가 찜한 공고 ' : '📌 통합 공고 목록 '}
                <span className="count-text">({!loading ? sortedData.length : 0}건)</span>
              </h2>
              <select className="sort-dropdown" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="latest">최신순</option>
                <option value="deadline">⏳ 마감 임박순</option>
                <option value="recommend">✨ 맞춤 추천순</option>
                <option value="popular">🔥 인기순</option>
              </select>
            </div>

            {/* 카드 리스트 영역 */}
            <div className="force-grid">
              {loading ? (
                [1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div key={n} className="force-card">
                    <div className="force-img-wrap" style={{background: '#e2e8f0'}}></div>
                    <div className="force-body"></div>
                  </div>
                ))
              ) : sortedData.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <div className="empty-icon">{showBookmarksOnly ? '⭐' : '📂'}</div>
                  <h3>{showBookmarksOnly ? '아직 북마크한 공고가 없습니다.' : '검색결과가 없습니다.'}</h3>
                  <button className="btn-reset" onClick={() => { setSearchTerm(''); setSelectedCategory('전체'); setShowBookmarksOnly(false); }}>
                    초기화하기
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
                        {isExpired && (
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold' }}>
                            마감됨
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                          <button 
                            onClick={(e) => toggleBookmark(e, item.id)}
                            style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: isBookmarked ? '#fbbf24' : '#fff', fontSize: '1.2rem', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            {isBookmarked ? '★' : '☆'}
                          </button>
                        </div>
                      </div>
                      
                      <div className="force-body">
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                            [{item.sourceName}]
                          </span>
                          {item.tag && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                              #{item.tag}
                            </span>
                          )}
                        </div>
                        
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', lineHeight: '1.4', marginBottom: '8px', color: '#1e293b', wordBreak: 'break-word' }}>
                          {highlightText(item.title, debouncedSearchTerm)}
                        </h3>
                        
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                          분야: {highlightText(item.category, debouncedSearchTerm)}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                          <div style={{ color: '#475569', fontWeight: 'bold', width: '65%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.orgName}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ color: isExpired ? '#94a3b8' : '#ef4444', fontWeight: 'bold', textDecoration: isExpired ? 'line-through' : 'none' }}>
                              {dynamicDDay}
                            </span>
                            <span style={{ color: '#94a3b8' }}>조회 {views}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </main>
        </>
      )}

      {/* 맨 위로 가기 */}
      <button className={`btn-scroll-top ${showTopBtn ? 'visible' : ''}`} onClick={scrollToTop} title="맨 위로 가기">↑</button>

      {/* 로그인 모달 */}
      {authModal && (
        <div className="modal-overlay" onClick={() => setAuthModal(null)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="auth-header">
              <h2>{authModal === 'login' ? '로그인' : '회원가입'}</h2>
              <button className="modal-close" onClick={() => setAuthModal(null)}>✕</button>
            </div>
            <div className="auth-body">
              <div className="input-group">
                <label>아이디</label>
                <input type="text" placeholder="아이디를 입력해주세요" />
              </div>
              <div className="input-group">
                <label>비밀번호</label>
                <input type="password" placeholder="비밀번호를 입력해주세요" />
              </div>
              {authModal === 'signup' && (
                <div className="input-group">
                  <label>비밀번호 확인</label>
                  <input type="password" placeholder="비밀번호를 다시 입력해주세요" />
                </div>
              )}
              <button className="btn-login-main auth-submit" onClick={() => { alert(authModal === 'login' ? '로그인 되었습니다.' : '회원가입이 완료되었습니다.'); setAuthModal(null); }} style={{marginTop: '16px'}}>
                {authModal === 'login' ? '로그인' : '가입하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}