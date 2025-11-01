import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { lat, lng, radiusKm = 5, numOfRows = 300 } = await req.json();

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'lat and lng are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PUBLIC_DATA_API_KEY = Deno.env.get('PUBLIC_DATA_API_KEY');
    if (!PUBLIC_DATA_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'PUBLIC_DATA_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 의료기관 정보 조회 API (반경/좌표 기반) - v1 엔드포인트 사용 + 파라미터 표준화
    const baseUrl = 'https://apis.data.go.kr/B551182/HospInfoService1/getHospBasisList1';

    const radiusMeters = Math.min(Math.round(radiusKm * 1000), 5000); // API 최대 반경 제한 보호
    const rows = Math.min(Number(numOfRows) || 100, 100); // 최대 100 제한

    const params = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY, // 소문자 키 사용 (v1 호환)
      xPos: String(lng),
      yPos: String(lat),
      radius: String(radiusMeters),
      pageNo: '1',
      numOfRows: String(rows),
      _type: 'json',
    });

    const response = await fetch(`${baseUrl}?${params.toString()}`, { headers: { 'Accept': 'application/json' } });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Public Data API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch hospitals', status: response.status, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('API Response:', JSON.stringify(data).substring(0, 500));

    // Parse response and extract hospital data
    const items = data?.response?.body?.items?.item || [];
    const hospitals = Array.isArray(items) ? items : [items];

    return new Response(
      JSON.stringify({ hospitals }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
