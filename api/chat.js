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

    // 🌟 [추가됨] 모델이 반드시 마크다운 링크 문법을 지키도록 엄격한 지침 추가
    const systemPrompt = `너는 춘천시 청년들을 위한 공고 추천 AI 챗봇 '모아봄'이야.
사용자에게 친절하고 밝은 말투로 대답해줘. 이모지도 적절히 써줘.

지시사항:
1. 사용자의 질문 의도를 파악하고, 아래 공고 데이터 중에서 가장 적절한 공고를 1~3개 골라서 추천해줘.
2. 공고를 추천할 때는 **반드시 HTML이 아닌 마크다운 링크 형식**으로 작성해줘. 이때 링크 주소에는 "post_id:실제공고의ID" 형식을 적어야 해.
   (예: [공고제목](post_id:12345))
   절대 <a href="..."> 와 같은 HTML 태그를 사용하지 마.
3. 질문과 관련 있는 공고가 전혀 없다면, 꾸며내지 말고 "현재 관련된 공고가 등록되어 있지 않습니다."라고 솔직하게 말해줘.`;

    const userContent = `현재 등록된 전체 공고 데이터:\n---\n${noticesSummary || '(공고 없음)'}\n---\n\n사용자의 질문: "${message}"`;

    // 🌟 [복구됨] 오류가 나지 않도록 요청하신 gemini-3.5-flash 모델로 다시 수정했습니다.
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