import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { height, weight, age, sleepHours, menstrualCycle, gender } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // BMI 계산
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    // AI에게 전달할 프롬프트 구성
    let prompt = `다음 건강 정보를 분석하여 한국어로 친절하고 전문적인 건강 상태 피드백을 제공해주세요:

- 키: ${height}cm
- 몸무게: ${weight}kg
- 나이: ${age}세
- 수면시간: ${sleepHours}시간
- BMI: ${bmi.toFixed(1)}
- 성별: ${gender === 'female' ? '여성' : '남성'}`;

    if (gender === 'female' && menstrualCycle) {
      prompt += `\n- 생리 주기: ${menstrualCycle}일`;
    }

    prompt += `\n\n다음 내용을 포함하여 분석해주세요:
1. BMI 기준 체중 상태 평가
2. 수면시간 적절성
3. 나이대별 건강 관리 조언
4. 전반적인 건강 상태 피드백
5. 개선이 필요한 부분과 구체적인 조언

친절하고 격려하는 톤으로 작성하되, 의학적으로 정확한 정보를 제공해주세요.`;

    console.log('Sending request to Lovable AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: '당신은 친절하고 전문적인 건강 상담사입니다. 사용자의 건강 정보를 바탕으로 도움이 되는 피드백을 제공합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: '크레딧이 부족합니다. 관리자에게 문의하세요.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI 분석 중 오류가 발생했습니다.');
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    console.log('Health analysis completed successfully');

    return new Response(
      JSON.stringify({ analysis, bmi: bmi.toFixed(1) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in health-analysis function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '건강 분석 중 오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
