// api/chat.js
// Vercel Serverless Function - Google Gemini 챗봇 프록시
import { GoogleGenAI } from '@google/genai';

// 새 SDK 방식: process.env.GEMINI_API_KEY를 자동으로 읽어옵니다.
const ai = new GoogleGenAI();

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

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: '서버에 GEMINI_API_KEY가 설정되지 않았습니다.' });
    }

    const systemPrompt = `너는 춘천시 청년들을 위한 공고 추천 AI 챗봇 '모아봄'이야.
사용자에게 친절하고 밝은 말투로 대답해줘. 이모지도 적절히 써줘.

지시사항:
1. 사용자의 질문 의도를 파악하고, 아래 공고 데이터 중에서 가장 적절한 공고를 1~3개 골라서 추천해줘.
2. 질문과 관련 있는 공고가 전혀 없다면, 꾸며내지 말고 "현재 관련된 공고가 등록되어 있지 않습니다."라고 솔직하게 말해줘.`;

    const userContent = `현재 등록된 전체 공고 데이터:\n---\n${noticesSummary || '(공고 없음)'}\n---\n\n사용자의 질문: "${message}"`;

    // 구글 제미나이 API 호출 (gemini-2.5-flash 또는 gemini-2.5-pro 등 사용 가능)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userContent,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const replyText = response.text || '답변을 생성하지 못했습니다.';

    return res.status(200).json({ reply: replyText });

  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: error.message || '서버 내부 오류가 발생했습니다.' });
  }
}