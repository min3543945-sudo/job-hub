import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  // 1. 상태(State) 정의
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);

  // 🔥 [P1/P2 신규] 가중치 및 정렬 상태
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'recommend' | 'popular'
  const [categoryWeights, setCategoryWeights] = useState({}); // { "IT/SW": 3, "데이터/AI": 1 }
  const [viewCounts, setViewCounts] = useState({}); // { 1: 5, 2: 2 } (공고 ID별 조회수)

  // 2. notices.json 데이터 불러오기
  useEffect(() => {
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
  }, []);

  // 카드 클릭 시 모달 열기 + 가중치 및 조회수 증가
  const handleCardClick = (post) => {
    setSelectedPost(post);

    // 1) 클릭한 카테고리 가중치 +1
    setCategoryWeights((prev) => ({
      ...prev,
      [post.category]: (prev[post.category] || 0) + 1,
    }));

    // 2) 클릭한 공고 조회수 +1
    setViewCounts((prev) => ({
      ...prev,
      [post.id]: (prev[post.id] || 0) + 1,
    }));
  };

  // 북마크 토글
  const toggleBookmark = (e, id) => {
    e.stopPropagation();
    setBookmarks((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
    );
  };

  // 카테고리 + 검색어 1차 필터링
  const filteredData = notices.filter((item) => {
    const matchesCategory = selectedCategory === '전체' || item.source === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 🔥 [P1/P2 신규] 정렬 알고리즘 적용
  const sortedData = [...filteredData].sort((a, b) => {
    if (sortBy === 'popular') {
      // 인기순: 조회수가 높은 순서대로
      const viewsA = viewCounts[a.id] || 0;
      const viewsB = viewCounts[b.id] || 0;
      return viewsB - viewsA;
    }

    if (sortBy === 'recommend') {
      // 맞춤 추천순: (카테고리 가중치 * 2) + (추천 공고 점수)
      const weightA = (categoryWeights[a.category] || 0) * 2 + (a.isRecommended ? 3 : 0);
      const weightB = (categoryWeights[b.category] || 0) * 2 + (b.isRecommended ? 3 : 0);
      return weightB - weightA;
    }

    // 최신순 (기본값): ID 기준 역순
    return b.id - a.id;
  });

  if (loading) {
    return <div className="loading">공고 데이터를 불러오는 중입니다... ⏳</div>;
  }

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

      {/* 공고 카드 목록 & 정렬 바 */}
      <main className="content">
        <div className="content-header">
          <h2>📌 통합 공고 목록 ({sortedData.length})</h2>
          
          {/* 🔥 정렬 옵션 선택 */}
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

        <div className="card-grid">
          {sortedData.map((item) => {
            const views = viewCounts[item.id] || 0;
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
                      className={`btn-bookmark ${bookmarks.includes(item.id) ? 'active' : ''}`}
                      onClick={(e) => toggleBookmark(e, item.id)}
                    >
                      {bookmarks.includes(item.id) ? '★' : '☆'}
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