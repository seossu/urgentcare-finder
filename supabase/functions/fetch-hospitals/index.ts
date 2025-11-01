import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { lat, lng, radiusKm = 5, numOfRows = 100 } = await req.json();

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'lat and lng are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Primary data source: Kakao Local Search (Hospitals: HP8)
    const KAKAO_REST_API_KEY = Deno.env.get('KAKAO_REST_API_KEY');
    if (!KAKAO_REST_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'KAKAO_REST_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Kakao constraints: radius up to 20000m, size up to 15 per page
    const radiusMeters = Math.max(0, Math.min(Math.round((Number(radiusKm) || 5) * 1000), 20000));
    const rows = Math.max(1, Math.min(Number(numOfRows) || 300, 300));
    const pageSize = 15; // Kakao API maximum size limit

    const headers = { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` };

    const collected: any[] = [];
    let page = 1;
    // Fetch up to 5 pages to get more results (15 * 5 = 75 hospitals)
    while (collected.length < rows && page <= 5) {
      const kakaoUrl = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=HP8&x=${lng}&y=${lat}&radius=${radiusMeters}&size=${pageSize}&page=${page}&sort=distance`;
      const res = await fetch(kakaoUrl, { headers });
      const text = await res.text();
      if (!res.ok) {
        console.error('Kakao API error:', res.status, text.slice(0, 300));
        break;
      }
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (_) {
        console.error('Kakao returned non-JSON. First 200 chars:', text.slice(0, 200));
        break;
      }

      const docs = Array.isArray(data?.documents) ? data.documents : [];
      if (!docs.length) break;
      collected.push(...docs);

      // Stop if meta says end
      const isEnd = data?.meta?.is_end === true;
      if (isEnd) break;
      page += 1;
    }

    // Normalize into the structure used in the frontend
    const hospitals = collected.slice(0, rows).map((d: any) => ({
      hpid: d.id, // Kakao place id
      dutyName: d.place_name,
      dutyAddr: d.road_address_name || d.address_name || '',
      dutyTel1: d.phone || '',
      wgs84Lat: d.y, // latitude (string)
      wgs84Lon: d.x, // longitude (string)
      dutyEryn: 0, // unknown from Kakao; pages handle filtering
    }));

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
