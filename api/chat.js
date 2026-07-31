// api/chat.js
// Vercel Serverless Function - Google Gemini REST API

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: '잘못된 JSON 요청 형식입니다.' });
      }
    }

    const { message, noticesSummary } = body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '메시지가 없거나 올바르지 않습니다.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: '서버에 GEMINI_API_KEY가 설정되지 않았습니다.' });
    }

    // 🌟 [핵심] 춘천시 정착 및 4단계 로드맵 전문 컨설턴트 AI
    const systemPrompt = `너는 춘천시 청년들의 역량 성장과 지역 정착을 이끄는 원스톱 커리어 AI '모아봄'이야.
사용자에게 친절하고 열정적인 말투로 대답하며, '대학 재학 ➔ 실무 프로젝트 ➔ 지역 취업 및 정주'로 이어지는 춘천시 특화 전략을 안내해 줘.

지시사항:
1. 사용자의 질문 의도(직무 로드맵, 관내 공모전/인턴 추천, 면접/자소서 팁 등)를 정확히 파악해.
2. 공고를 추천할 때는 **반드시 마크다운 링크 형식**을 사용하고, 링크 주소는 무조건 "open_post"로 적어.
3. **[출력 예시 양식]** 아래 양식과 똑같은 스타일(이모지, 굵은 글씨, 핵심 혜택)로 작성해:

[출력 예시 양식]
1. 💻 **[춘천시 공공데이터 시각화 웹 개발 프로젝트](open_post)**
- 💰 활동비 150만원 지원 및 춘천시장 인증서 발급으로 실전 포트폴리오에 최적입니다!

2. 💼 **[2026년 제8회 춘천시 임기제공무원 채용 재공고](open_post)**
- 데이터 분석 전문 인재를 구인 중인 춘천 관내 추천 공고입니다.

4. 로드맵 관련 질문이라면 1단계(공공데이터/교육) ➔ 2단계(시정 외주 마이크로 프로젝트) ➔ 3단계(춘천 IT기업 채용 연계)로 이어지는 구체적인 단계별 매칭 조언을 해 줘.`;

    const userContent = `현재 등록된 전체 공고 데이터:\n---\n${noticesSummary || '(공고 없음)'}\n---\n\n사용자의 질문: "${message}"`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userContent}` }]
            }
          ]
        }),
      }
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error('Gemini API Error Response:', errorText);
      return res.status(geminiRes.status).json({ error: `Gemini API 오류 (${geminiRes.status})` });
    }

    const data = await geminiRes.json();
    const replyText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || '답변을 생성하지 못했습니다.';

    return res.status(200).json({ reply: replyText });

  } catch (error) {
    console.error('Gemini API Exception:', error);
    return res.status(500).json({ error: error.message || '서버 내부 오류가 발생했습니다.' });
  }
}