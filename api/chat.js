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

    // 🌟 [핵심] 출력 양식을 엄격하게 고정하여 UI 깨짐 방지 및 원클릭 상세 모달 연동
    const systemPrompt = `너는 춘천시 청년들을 위한 공고 및 정책 추천 AI 챗봇 '모아봄'이야.
사용자에게 친절하고 밝은 말투로 대답해. 

지시사항:
1. 사용자의 질문 의도를 파악하고, 아래 공고 및 정책 데이터 중에서 가장 적절한 항목을 1~3개 골라서 추천해줘.
2. 공고를 추천할 때는 **반드시 마크다운 링크 형식**을 사용하고, 링크 주소는 무조건 "open_post"로 적어.
3. **[매우 중요: 출력 형식 제한]** 추천 목록을 작성할 때는 대괄호([])가 겹쳐서 깨지지 않도록 카테고리 기호는 빼고, 무조건 아래 양식과 똑같은 스타일(이모지, 굵은 글씨, 짧은 설명)로 작성해!

[출력 예시 양식]
1. 💻 **[제4회 춘천시 공공데이터 문제해결 해커톤](open_post)**
- 대상 상금 300만 원과 춘천시장 표창을 받을 수 있는 최고의 프로젝트 기회입니다!

2. 🏡 **[춘천 청년 월세 특별지원사업 (월 20만 원 x 12개월)](open_post)**
- 연간 총 240만 원의 주거비를 지원받아 춘천 정착 부담을 덜어보세요.

4. 질문과 관련 있는 공고가 전혀 없다면, 꾸며내지 말고 "현재 관련된 공고가 등록되어 있지 않습니다."라고 솔직하게 말해.`;

    const userContent = `현재 등록된 전체 공고 데이터:\n---\n${noticesSummary || '(공고 없음)'}\n---\n\n사용자의 질문: "${message}"`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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