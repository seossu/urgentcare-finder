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
    const { lat, lng, radius = 10 } = await req.json();

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

    // 응급의료기관 기본정보 조회 API
    const baseUrl = 'http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytBassInfoInqire';
    const params = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY,
      WGS84_LON: lng.toString(),
      WGS84_LAT: lat.toString(),
      pageNo: '1',
      numOfRows: '100', // Increased to get more results
    });

    console.log('Fetching emergency rooms from:', `${baseUrl}?${params.toString()}`);

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Public Data API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch emergency rooms', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('API Response:', JSON.stringify(data).substring(0, 500));

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
