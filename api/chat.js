// api/chat.js
// Vercel Serverless Function - OpenAI 챗봇 프록시

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. req.body 안전하게 파싱
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

    // 2. API 키 유효성 검사
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: '서버에 OPENAI_API_KEY가 설정되지 않았습니다.' });
    }

    const systemPrompt = `너는 춘천시 청년들을 위한 공고 추천 AI 챗봇 '모아봄'이야.
사용자에게 친절하고 밝은 말투로 대답해줘. 이모지도 적절히 써줘.

지시사항:
1. 사용자의 질문 의도를 파악하고, 아래 공고 데이터 중에서 가장 적절한 공고를 1~3개 골라서 추천해줘.
2. 질문과 관련 있는 공고가 전혀 없다면, 꾸며내지 말고 "현재 관련된 공고가 등록되어 있지 않습니다."라고 솔직하게 말해줘.`;

    // 3. OpenAI API 호출
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `현재 등록된 전체 공고 데이터:\n---\n${noticesSummary || '(공고 없음)'}\n---\n\n사용자의 질문: "${message}"` }
        ],
      }),
    });

    // 4. 응답 성공 여부 확인 후 파싱
    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error('OpenAI Error Response:', errorText);
      return res.status(openaiRes.status).json({ error: `OpenAI API 오류 (${openaiRes.status})` });
    }

    const data = await openaiRes.json();
    const replyText = data.choices?.[0]?.message?.content || '답변을 생성하지 못했습니다.';

    return res.status(200).json({ reply: replyText });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    return res.status(500).json({ error: error.message || '서버 내부 오류가 발생했습니다.' });
  }
}