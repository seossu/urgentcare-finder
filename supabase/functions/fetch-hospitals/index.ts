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
    const { lat, lng, radius = 5 } = await req.json();

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

    // 의료기관 정보 조회 API
    const baseUrl = 'http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList';
    const params = new URLSearchParams({
      serviceKey: PUBLIC_DATA_API_KEY,
      xPos: lng.toString(),
      yPos: lat.toString(),
      radius: (radius * 1000).toString(), // km to meters
      pageNo: '1',
      numOfRows: '50',
    });

    console.log('Fetching hospitals from:', `${baseUrl}?${params.toString()}`);

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Public Data API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch hospitals', details: errorText }),
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
