import React, { useState, useEffect, useDeferredValue } from 'react';
import './App.css';

// 🌟 디바운스 커스텀 훅 (검색 최적화)
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function App() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedPost, setSelectedPost] = useState(null);

  // 🌟 검색어 디바운스 적용 (300ms 지연)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // 🌟 북마크 로컬 스토리지 연동 (에러 방지 적용)
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('북마크 데이터를 불러오는데 실패했습니다.', error);
      return [];
    }
  });

  const [sortBy, setSortBy] = useState('latest');
  const [categoryWeights, setCategoryWeights] = useState({});
  const [viewCounts, setViewCounts] = useState({});

  // 북마크 상태가 변경될 때마다 로컬 스토리지 업데이트
  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // 공고 데이터 불러오기 (스켈레톤 UI를 보기 위해 의도적 1초 지연)
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

  const handleCardClick = (post) => {
    setSelectedPost(post);
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

 
 // 🌟 안전하고 깔끔한 통합 필터링 로직 (수정됨)
  const filteredData = notices.filter((item) => {
    const matchesCategory = selectedCategory === '전체' || item.source === selectedCategory;
    
    // 이 부분이 핵심! 안전하게 소문자로 변환
    const searchLower = debouncedSearchTerm ? debouncedSearchTerm.toLowerCase() : '';
    
    const matchesSearch =
      (item.title?.toLowerCase() || '').includes(searchLower) ||
      (item.category?.toLowerCase() || '').includes(searchLower);
      
    return matchesCategory && matchesSearch;
  });

  // 데이터 정렬
  const sortedData = [...filteredData].sort((a, b) => {
    if (sortBy === 'popular') {
      const viewsA = viewCounts[a.id] || 0;
      const viewsB = viewCounts[b.id] || 0;
      return viewsB - viewsA;
    }

    if (sortBy === 'recommend') {
      const weightA = (categoryWeights[a.category] || 0) * 2 + (a.isRecommended ? 3 : 0);
      const weightB = (categoryWeights[b.category] || 0) * 2 + (b.isRecommended ? 3 : 0);
      return weightB - weightA;
    }

    return b.id - a.id;
  });

  return (
    <div className="container">
      {/* 헤더 & 검색바 */}
      <header className="header">
        <h1>🎓 대학·공공 데이터 Hub</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="관심 있는 공고나 키워드를 입력해 보세요"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="btn-clear" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>
      </header>

      {/* 퀵 필터 탭 */}
      <nav className="filter-tabs">
        {['전체', '강원대', '한림대', '나라장터'].map((tab) => (
          <button
            key={tab}
            className={selectedCategory === tab ? 'active' : ''}
            onClick={() => setSelectedCategory(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main className="content">
        <div className="content-header">
          <h2>📌 통합 공고 목록 ({!loading ? sortedData.length : 0})</h2>
          
          <div className="sort-buttons">
            <button
              className={sortBy === 'latest' ? 'active' : ''}
              onClick={() => setSortBy('latest')}
            >
              최신순
            </button>
            <button
              className={sortBy === 'recommend' ? 'active' : ''}
              onClick={() => setSortBy('recommend')}
            >
              ✨ 맞춤 추천순
            </button>
            <button
              className={sortBy === 'popular' ? 'active' : ''}
              onClick={() => setSortBy('popular')}
            >
              🔥 인기순
            </button>
          </div>
        </div>

        {/* 🌟 조건부 렌더링: 로딩 중 -> 결과 없음 -> 목록 표시 */}
        {loading ? (
          <div className="card-grid">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="skeleton-card">
                <div className="skeleton skeleton-badge"></div>
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-title short"></div>
                <div className="skeleton skeleton-text"></div>
              </div>
            ))}
          </div>
        ) : sortedData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>조건에 맞는 공고가 없습니다.</h3>
            <p>다른 검색어나 카테고리를 선택해 보세요.</p>
            <button
              className="btn-reset"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('전체');
              }}
            >
              초기화하기
            </button>
          </div>
        ) : (
          <div className="card-grid">
            {sortedData.map((item) => {
              const views = viewCounts[item.id] || 0;
              const isBookmarked = bookmarks.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`card ${item.isRecommended ? 'recommended' : ''}`}
                  onClick={() => handleCardClick(item)}
                >
                  <div className="card-header">
                    <span className={`badge ${item.source}`}>{item.source}</span>
                    <div className="card-header-right">
                      <span className="d-day">{item.dDay}</span>
                      <button
                        className={`btn-bookmark ${isBookmarked ? 'active' : ''}`}
                        onClick={(e) => toggleBookmark(e, item.id)}
                      >
                        {isBookmarked ? '★' : '☆'}
                      </button>
                    </div>
                  </div>
                  <h3 className="card-title">{item.title}</h3>
                  <p className="card-category">
                    분야: {item.category} {views > 0 && <span className="view-count">• 조회 {views}</span>}
                  </p>
                  <div className="card-footer">
                    <span className="deadline">마감일: {item.deadline}</span>
                    <span className="btn-detail">상세보기 ➔</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 모달 팝업 */}
      {selectedPost && (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className={`badge ${selectedPost.source}`}>{selectedPost.source}</span>
              <button className="modal-close" onClick={() => setSelectedPost(null)}>✕</button>
            </div>
            <h3>{selectedPost.title}</h3>
            <div className="modal-info">
              <p><strong>분야:</strong> {selectedPost.category}</p>
              <p><strong>마감일:</strong> {selectedPost.deadline} ({selectedPost.dDay})</p>
              <p><strong>누적 조회수:</strong> {viewCounts[selectedPost.id] || 1}회</p>
            </div>
            <div className="modal-body">
              <h4>📋 상세 내용</h4>
              <p>{selectedPost.description}</p>
            </div>
            <div className="modal-footer">
              <a href={selectedPost.url} target="_blank" rel="noreferrer" className="btn-primary">
                원문 페이지로 이동 🔗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}