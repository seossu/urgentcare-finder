import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, radius = 10000 } = await req.json();

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: "위도(lat)와 경도(lng)가 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const publicDataApiKey = Deno.env.get("PUBLIC_DATA_API_KEY");
    
    if (!publicDataApiKey) {
      return new Response(
        JSON.stringify({ error: "API 키가 설정되지 않았습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // First get the list of emergency rooms with real-time bed info
    // This endpoint provides: hvec (응급실 병상 수), hvoc (수술실 병상 수), hv1-hv40 (various bed availability)
    const realtimeEndpoint = `https://apis.data.go.kr/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire?STAGE1=전체&pageNo=1&numOfRows=300`;
    
    let realtimeBedData = new Map();
    
    try {
      const realtimeUrl = `${realtimeEndpoint}&serviceKey=${encodeURIComponent(publicDataApiKey)}`;
      console.info(`Fetching real-time bed info from: ${realtimeUrl.substring(0, 120)}...`);
      
      const realtimeResponse = await fetch(realtimeUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      
      if (realtimeResponse.ok) {
        const realtimeText = await realtimeResponse.text();
        const realtimeData = JSON.parse(realtimeText);
        const realtimeItems = realtimeData.response?.body?.items?.item || [];
        
        console.info(`Real-time bed info: Found ${realtimeItems.length} items`);
        if (realtimeItems.length > 0) {
          console.info(`Sample real-time item: ${JSON.stringify(realtimeItems[0])}`);
          // Map hpid to bed info
          realtimeItems.forEach((item: any) => {
            realtimeBedData.set(item.hpid, {
              hvec: parseInt(item.hvec) || 0,  // 응급실 병상 수
              hv1: parseInt(item.hv1) || 0,     // 응급실 가용 병상 수
              hvoc: parseInt(item.hvoc) || 0,   // 수술실
            });
          });
        }
      }
    } catch (err) {
      console.warn("Failed to fetch real-time bed info:", err);
    }

    // Then get the list of emergency rooms with location
    const endpoints = [
      `https://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytListInfoInqire?WGS84_LON=${lng}&WGS84_LAT=${lat}&pageNo=1&numOfRows=50`,
      `https://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytBassInfoInqire?WGS84_LON=${lng}&WGS84_LAT=${lat}&pageNo=1&numOfRows=50`,
    ];

    for (const endpoint of endpoints) {
      try {
        const url = `${endpoint}&serviceKey=${encodeURIComponent(publicDataApiKey)}`;
        console.info(`Trying endpoint: ${url.substring(0, 120)}...`);
        
        const response = await fetch(url, {
          method: "GET",
          headers: { 
            Accept: "application/json",
          },
        });

        console.info(`Response status: ${response.status}`);
        
        if (response.ok) {
          const text = await response.text();
          console.info(`Response text (first 200 chars): ${text.substring(0, 200)}`);
          
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.error("Failed to parse JSON:", e);
            continue;
          }

          // Check various response structures
          const items = data.response?.body?.items?.item || 
                       data.response?.body?.items || 
                       [];
          
          if (Array.isArray(items) && items.length > 0) {
            console.info(`Success! Found ${items.length} items`);
            console.info(`Sample item structure: ${JSON.stringify(items[0])}`);
            
            // Enrich items with real-time bed data
            const enrichedItems = items.map((item: any) => {
              const bedInfo = realtimeBedData.get(item.hpid);
              if (bedInfo) {
                return { ...item, ...bedInfo };
              }
              return item;
            });
            
            // Return enriched data
            const enrichedData = {
              ...data,
              response: {
                ...data.response,
                body: {
                  ...data.response.body,
                  items: {
                    item: enrichedItems
                  }
                }
              }
            };
            
            return new Response(
              JSON.stringify(enrichedData),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            console.warn(`No items found in response for endpoint: ${endpoint}`);
          }
        } else {
          const errorText = await response.text();
          console.error(`Error ${response.status}: ${errorText.substring(0, 200)}`);
        }
      } catch (err) {
        console.error(`Failed to fetch from ${endpoint}:`, err);
      }
    }

    // If all endpoints fail, return error
    console.error("All Public Data API endpoints failed");
    return new Response(
      JSON.stringify({ 
        error: "응급의료기관 API에서 데이터를 가져올 수 없습니다. API 키와 서비스 신청 상태를 확인해주세요.",
        details: "모든 API endpoint에서 데이터를 가져오는데 실패했습니다."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Function error:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
