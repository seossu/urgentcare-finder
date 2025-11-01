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

    // Build request with retries across endpoints and key encodings
    const radiusMeters = Math.min(Math.round(radiusKm * 1000), 5000);
    const rows = Math.min(Number(numOfRows) || 100, 100);

    const endpoints = [
      'https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList',
      'http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList',
      'https://apis.data.go.kr/B551182/HospInfoService1/getHospBasisList1',
      'http://apis.data.go.kr/B551182/HospInfoService1/getHospBasisList1',
    ];
    const keysToTry = [PUBLIC_DATA_API_KEY, encodeURIComponent(PUBLIC_DATA_API_KEY)];
    const keyParamNames = ['ServiceKey', 'serviceKey'] as const;
    const typeParamNames = ['_type', 'type'] as const;

    let response: Response | null = null;
    let lastStatus = 0;
    let lastBody = '';
    let lastUrl = '';

    for (const baseUrl of endpoints) {
      for (const key of keysToTry) {
        for (const keyName of keyParamNames) {
          for (const typeName of typeParamNames) {
            const params = new URLSearchParams({
              xPos: String(lng),
              yPos: String(lat),
              radius: String(radiusMeters),
              pageNo: '1',
              numOfRows: String(rows),
            });
            params.set(keyName, key);
            params.set(typeName, 'json');
            const url = `${baseUrl}?${params.toString()}`;
            lastUrl = url;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (res.ok) { response = res; break; }
            lastStatus = res.status;
            lastBody = await res.text();
            console.error('Upstream error', lastStatus, url, lastBody.slice(0, 200));
          }
          if (response) break;
        }
        if (response) break;
      }
      if (response) break;
    }

    if (!response) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch hospitals', status: lastStatus || 502, details: lastBody || 'Unknown upstream error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Public Data API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch hospitals', status: response.status, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (_) {
      console.error('Upstream returned non-JSON. First 300 chars:', text.slice(0, 300));
      return new Response(
        JSON.stringify({ error: 'Upstream returned non-JSON', status: 502, details: text.slice(0, 1000) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const header = data?.response?.header;
    if (!header || header?.resultCode !== '00') {
      console.error('Public API header error:', header);
      return new Response(
        JSON.stringify({ error: 'Upstream error', status: 502, resultCode: header?.resultCode, resultMsg: header?.resultMsg }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('API Response OK');

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
