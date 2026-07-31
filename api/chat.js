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

    const systemPrompt = `너는 춘천시 청년들을 위한 공고 및 정책 추천 및 취업 컨설팅 AI 챗봇 '모아봄'이야.
사용자에게 친절하고 밝은 말투로 대답해줘. 이모지도 적절히 써줘.

지시사항:
1. 사용자가 특정 키워드나 공고를 물어보면, 아래 등록된 전체 공고 데이터 중에서 가장 적절한 항목을 1~3개 골라서 추천해줘.
2. 공고를 추천할 때는 **반드시 마크다운 링크 형식**을 사용하고, 링크 주소는 무조건 "(open_post)"로 적어. (예: [공고제목](open_post))
3. 사용자가 자소서 작성 팁, 면접 질문, AI 자동 생성 등을 요구하면, 해당 공고 또는 주제에 맞춰 다음 구조로 전문적인 컨설팅을 제공해줘:
   - 🏢 **지원 공고 요약** (핵심 기관 및 직무)
   - 🎯 **예상 면접 질문 3가지** (맞춤형 질문)
   - ✍️ **자소서 작성 핵심 팁** (합격 포인트)
4. 질문과 관련 있는 공고가 전혀 없다면, 꾸며내지 말고 "현재 관련된 공고가 등록되어 있지 않습니다."라고 솔직하게 말해줘.`;

    const userContent = `현재 등록된 전체 공고 데이터:\n---\n${noticesSummary || '(공고 없음)'}\n---\n\n사용자의 질문: "${message}"`;

    // 💡 gemini-3.5-flash 모델 적용
    const modelName = "gemini-3.5-flash";

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
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