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
  if (!text) return '';
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, index) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <span key={index} className="highlight-text">{part}</span>
    ) : (
      part
    )
  );
};

// 🌟 D-Day 자동 계산 함수 (새 규격 반영)
const calculateDDay = (endDate) => {
  if (!endDate) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return '마감됨';
  if (diffDays === 0) return 'D-Day';
  return `D-${diffDays}`;
};

export default function App() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
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
          setNotices(data);
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
    // 추천 가중치를 fields(관심분야) 기준으로 누적
    const fieldKey = post.fields || '기타';
    setCategoryWeights((prev) => ({
      ...prev,
      [fieldKey]: (prev[fieldKey] || 0) + 1,
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

  // 🌟 새 JSON 규격 필드에 맞춘 필터링
  const filteredData = notices.filter((item) => {
    if (showBookmarksOnly && !bookmarks.includes(item.id)) return false;

    const matchesCategory = selectedCategory === '전체' || item.source_site === selectedCategory;
    const searchLower = debouncedSearchTerm ? debouncedSearchTerm.toLowerCase() : '';
    const matchesSearch =
      (item.title?.toLowerCase() || '').includes(searchLower) ||
      (item.fields?.toLowerCase() || '').includes(searchLower) ||
      (item.organization?.toLowerCase() || '').includes(searchLower);
      
    return matchesCategory && matchesSearch;
  });

  // 🌟 새 JSON 규격 필드에 맞춘 정렬
  const sortedData = [...filteredData].sort((a, b) => {
    if (sortBy === 'popular') return (viewCounts[b.id] || 0) - (viewCounts[a.id] || 0);
    if (sortBy === 'recommend') {
      const weightA = (categoryWeights[a.fields || '기타'] || 0);
      const weightB = (categoryWeights[b.fields || '기타'] || 0);
      return weightB - weightA;
    }
    if (sortBy === 'deadline') {
      if (!a.recruit_end_date) return 1;
      if (!b.recruit_end_date) return -1;
      return new Date(a.recruit_end_date) - new Date(b.recruit_end_date);
    }
    return b.id - a.id; // 최신순 (id가 클수록 최신)
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
      {/* 상단 헤더 */}
      <header className="top-header">
        <div className="header-inner">
          <div className="logo-area" onClick={() => { setSearchTerm(''); setSelectedCategory('전체'); setShowBookmarksOnly(false); }}>
            <span className="logo-icon">🎓</span>
            <h1 className="logo-text">대학·공공 데이터 Hub</h1>
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

      {/* 네비게이션 탭 (임의의 카테고리 구성) */}
      <nav className="main-nav">
        <div className="nav-inner">
          {['전체', '강원대', '한림대', '나라장터', '온통청년'].map((tab) => (
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
                  <p>{activePick.organization || '주관기관'} | 마감: {activePick.recruit_end_date}</p>
                  <button className="btn-go">바로가기 &gt;</button>
                </div>
                <img 
                  src={activePick.imageUrl || `https://picsum.photos/seed/${activePick.id}/600/400`} 
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

        {/* 리스트 영역 헤더 */}
        <div className="content-header">
          <h2>
            {showBookmarksOnly ? '⭐ 내가 찜한 공고 ' : '📌 통합 공고 목록 '}
            <span className="count-text">({!loading ? sortedData.length : 0}건)</span>
          </h2>
          
          <select 
            className="sort-dropdown"
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="latest">최신순</option>
            <option value="deadline">⏳ 마감 임박순</option>
            <option value="recommend">✨ 맞춤 추천순</option>
            <option value="popular">🔥 인기순</option>
          </select>
        </div>

        {/* 리스트 출력 */}
        {loading ? (
          <div className="card-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="skeleton-card">
                <div className="skeleton-image"></div>
                <div className="skeleton-content">
                  <div className="skeleton skeleton-badge"></div>
                  <div className="skeleton skeleton-title"></div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{showBookmarksOnly ? '⭐' : '📂'}</div>
            <h3>{showBookmarksOnly ? '아직 북마크한 공고가 없습니다.' : '검색결과가 없습니다.'}</h3>
            <button className="btn-reset" onClick={() => { setSearchTerm(''); setSelectedCategory('전체'); setShowBookmarksOnly(false); }}>
              초기화하기
            </button>
          </div>
        ) : (
          <div className="card-grid">
            {sortedData.map((item) => {
              const views = viewCounts[item.id] || 0;
              const isBookmarked = bookmarks.includes(item.id);
              
              // 🌟 마감 여부 판별 및 자동 D-Day
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isExpired = item.recruit_end_date ? new Date(item.recruit_end_date) < today : false;
              const dynamicDDay = calculateDDay(item.recruit_end_date);

              return (
                <div 
                  key={item.id} 
                  className={`card ${isExpired ? 'expired' : ''}`} 
                  onClick={() => handleCardClick(item)}
                >
                  <div className="card-thumbnail-wrap">
                    <img 
                      src={item.imageUrl || `https://picsum.photos/seed/${item.id}/400/400`} 
                      alt={item.title} 
                      className="card-image"
                    />
                    {isExpired && <div className="expired-badge">마감됨</div>}
                    
                    <div className="bookmark-overlay">
                      <button
                        className={`btn-bookmark ${isBookmarked ? 'active' : ''}`}
                        onClick={(e) => toggleBookmark(e, item.id)}
                      >
                        {isBookmarked ? '★' : '☆'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="card-body">
                    <div className="card-tags">
                      <span className={`tag source-default`}>[{item.source_site || '기타'}]</span>
                      {item.activity_type && <span className="tag">#{item.activity_type}</span>}
                    </div>
                    
                    <h3 className="card-title">
                      {highlightText(item.title, debouncedSearchTerm)}
                    </h3>
                    <div className="card-sub-info">
                      {item.summary || (item.fields ? highlightText(`분야: ${item.fields}`, debouncedSearchTerm) : '분야 미지정')}
                    </div>

                    <div className="card-footer">
                      <div className="footer-left">
                        <span className="organizer">
                          {highlightText(item.organization || '주관기관 미상', debouncedSearchTerm)}
                        </span>
                      </div>
                      <div className="footer-right">
                        <span className={`d-day ${isExpired ? 'expired-text' : ''}`}>
                          {dynamicDDay}
                        </span>
                        <span className="views">조회 {views}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 맨 위로 가기 버튼 */}
      <button 
        className={`btn-scroll-top ${showTopBtn ? 'visible' : ''}`} 
        onClick={scrollToTop}
        title="맨 위로 가기"
      >
        ↑
      </button>

      {/* 🌟 상세정보 모달 (새 규격 필드 반영) */}
      {selectedPost && (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="tag">{selectedPost.source_site}</span>
              <button className="modal-close" onClick={() => setSelectedPost(null)}>✕</button>
            </div>
            {selectedPost.imageUrl && (
              <img src={selectedPost.imageUrl} alt="포스터" className="modal-poster" />
            )}
            <h3>{selectedPost.title}</h3>
            
            <div className="modal-info-box">
              {selectedPost.summary && <p style={{marginBottom: '12px', color: '#3b82f6'}}><strong>"{selectedPost.summary}"</strong></p>}
              <p><strong>🏢 주관기관:</strong> {selectedPost.organization}</p>
              <p><strong>🎯 지원대상:</strong> {selectedPost.targets || '제한없음'}</p>
              <p><strong>💡 활동유형:</strong> {selectedPost.activity_type} ({selectedPost.operation_type || '온/오프라인 미정'})</p>
              {selectedPost.benefits && <p><strong>🎁 혜택:</strong> {selectedPost.benefits}</p>}
              <hr style={{margin: '12px 0', border: 'none', borderTop: '1px solid #e2e8f0'}} />
              <p><strong>모집마감:</strong> {selectedPost.recruit_end_date || '상시모집'} ({calculateDDay(selectedPost.recruit_end_date)})</p>
              <p><strong>누적 조회수:</strong> {viewCounts[selectedPost.id] || 1}회</p>
            </div>
            
            {selectedPost.description && (
              <div className="modal-description" style={{fontSize: '0.9rem', color: '#475569', padding: '0 8px', maxHeight: '100px', overflowY: 'auto'}}>
                {selectedPost.description}
              </div>
            )}

            <div className="modal-footer-btn">
              <a href={selectedPost.source_url} target="_blank" rel="noreferrer" className="btn-primary">
                원문 페이지로 이동 🔗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 로그인/회원가입 모달 */}
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
              <button 
                className="btn-login-main auth-submit"
                onClick={() => {
                  alert(authModal === 'login' ? '로그인 되었습니다.' : '회원가입이 완료되었습니다.');
                  setAuthModal(null);
                }}
              >
                {authModal === 'login' ? '로그인' : '가입하기'}
              </button>
            </div>
            {authModal === 'login' ? (
              <p className="auth-switch">계정이 없으신가요? <span onClick={() => setAuthModal('signup')}>회원가입</span></p>
            ) : (
              <p className="auth-switch">이미 계정이 있으신가요? <span onClick={() => setAuthModal('login')}>로그인</span></p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}