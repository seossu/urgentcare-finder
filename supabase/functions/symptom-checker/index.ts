import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symptoms } = await req.json();

    if (!symptoms || symptoms.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: '증상을 입력해주세요' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing symptoms:', symptoms);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `당신은 한국의 의료 시스템에 익숙한 의료 상담 도우미입니다. 
환자의 증상을 듣고 **가장 적합한 하나의 진료과만** 추천해주세요.

**중요: 반드시 하나의 진료과만 추천하세요. 여러 개를 나열하지 마세요.**

가능한 진료과 목록:
- 내과
- 소아청소년과
- 정형외과
- 피부과
- 이비인후과
- 안과
- 산부인과
- 치과
- 한의원
- 정신건강의학과
- 비뇨기과
- 외과
- 신경과
- 재활의학과
- 가정의학과

**응답 형식: 반드시 순수한 JSON만 반환하세요. 마크다운, 코드 블록, 설명 없이 JSON만 작성하세요.**

{
  "department": "하나의 진료과만 (예: 내과)",
  "reason": "추천 이유 (2-3문장)",
  "urgency": "low|medium|high",
  "additionalAdvice": "추가 조언 (선택사항)"
}

예시:
- department: "내과" (O)
- department: "내과, 이비인후과" (X - 절대 금지)
- department: "내과 또는 이비인후과" (X - 절대 금지)

만약 응급 상황으로 판단되면 urgency를 "high"로 설정하고 119 또는 응급실 방문을 권유하세요.`
          },
          {
            role: 'user',
            content: symptoms
          }
        ],
        max_completion_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI 분석 중 오류가 발생했습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const recommendation = data.choices[0].message.content;

    console.log('AI recommendation:', recommendation);

    // Parse the JSON response from AI - remove markdown code blocks if present
    let parsedRecommendation;
    try {
      // Remove markdown code blocks (```json ... ``` or ``` ... ```)
      let cleanedRecommendation = recommendation.trim();
      if (cleanedRecommendation.startsWith('```')) {
        // Remove opening ```json or ```
        cleanedRecommendation = cleanedRecommendation.replace(/^```(?:json)?\s*\n?/, '');
        // Remove closing ```
        cleanedRecommendation = cleanedRecommendation.replace(/\n?```\s*$/, '');
      }
      
      parsedRecommendation = JSON.parse(cleanedRecommendation.trim());
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      console.error('Raw response:', recommendation);
      // Fallback if AI doesn't return valid JSON
      parsedRecommendation = {
        department: "가정의학과",
        reason: recommendation,
        urgency: "medium",
        additionalAdvice: "정확한 진단을 위해 병원을 방문해주세요."
      };
    }

    return new Response(
      JSON.stringify(parsedRecommendation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in symptom-checker function:', error);
    const errorMessage = error instanceof Error ? error.message : '증상 분석 중 오류가 발생했습니다';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
