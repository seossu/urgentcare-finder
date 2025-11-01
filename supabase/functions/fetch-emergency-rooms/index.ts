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
    const { lat, lng, radius = 5000 } = await req.json(); // 기본 5km

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

    // Try multiple combinations to access the API
    const endpoints = [
      'https://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytBassInfoInqire',
      'http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytBassInfoInqire',
    ];
    const keysToTry = [PUBLIC_DATA_API_KEY, encodeURIComponent(PUBLIC_DATA_API_KEY)];
    const keyParamNames = ['serviceKey', 'ServiceKey'] as const;

    let response: Response | null = null;
    let lastStatus = 0;
    let lastBody = '';
    let lastUrl = '';

    for (const baseUrl of endpoints) {
      for (const key of keysToTry) {
        for (const keyName of keyParamNames) {
          const params = new URLSearchParams({
            WGS84_LON: lng.toString(),
            WGS84_LAT: lat.toString(),
            pageNo: '1',
            numOfRows: '30',
          });
          params.set(keyName, key);
          const url = `${baseUrl}?${params.toString()}`;
          lastUrl = url;
          
          console.log(`Trying: ${url.substring(0, 100)}...`);
          
          const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
          if (res.ok) { 
            response = res; 
            console.log('Success with:', baseUrl, keyName);
            break; 
          }
          lastStatus = res.status;
          lastBody = await res.text();
          console.error('Error', lastStatus, lastBody.slice(0, 200));
        }
        if (response) break;
      }
      if (response) break;
    }

    if (!response) {
      // Fallback to Kakao Local Search filtering by "응급"
      try {
        const KAKAO_REST_API_KEY = Deno.env.get('KAKAO_REST_API_KEY');
        if (KAKAO_REST_API_KEY) {
          const radiusMeters = Math.min(Math.round((radius / 1000) * 1000), 20000);
          const kakaoUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=응급실&x=${lng}&y=${lat}&radius=${radiusMeters}&size=30&sort=distance`;
          console.warn('Emergency API failed. Falling back to Kakao:', kakaoUrl);
          const kakaoRes = await fetch(kakaoUrl, {
            headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
          });
          if (kakaoRes.ok) {
            const kakaoData = await kakaoRes.json();
            const docs = Array.isArray(kakaoData?.documents) ? kakaoData.documents : [];
            const emergencyRooms = docs.map((d: any) => ({
              hpid: d.id,
              dutyName: d.place_name,
              dutyAddr: d.road_address_name || d.address_name,
              dutyTel3: d.phone || '',
              dutyTel1: d.phone || '',
              wgs84Lat: d.y,
              wgs84Lon: d.x,
              hvec: '0',
            }));
            return new Response(
              JSON.stringify({ emergencyRooms }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (fbErr) {
        console.error('Kakao fallback error:', fbErr);
      }

      return new Response(
        JSON.stringify({ error: 'Failed to fetch emergency rooms', status: lastStatus, details: lastBody || 'All attempts failed', lastUrl }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (_) {
      console.error('Non-JSON response:', text.slice(0, 300));
      return new Response(
        JSON.stringify({ error: 'Non-JSON response', details: text.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('API Response OK:', JSON.stringify(data).substring(0, 500));

    // Parse response and extract emergency room data
    const items = data?.response?.body?.items?.item || [];
    const emergencyRooms = Array.isArray(items) ? items : [items];

    return new Response(
      JSON.stringify({ emergencyRooms }),
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
