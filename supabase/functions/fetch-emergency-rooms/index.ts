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

    // 1. Try Public Data Portal API
    const publicDataApiKey = Deno.env.get("PUBLIC_DATA_API_KEY");
    
    if (publicDataApiKey) {
      const encodedKey = encodeURIComponent(publicDataApiKey);
      const publicDataUrl = `http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytBassInfoInqire?WGS84_LON=${lng}&WGS84_LAT=${lat}&pageNo=1&numOfRows=30&serviceKey=${encodedKey}`;
      
      console.info(`Trying Public Data API: ${publicDataUrl.substring(0, 100)}...`);
      
      try {
        const response = await fetch(publicDataUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          
          // Check if data is valid
          if (data.response?.body?.items?.item) {
            console.info("Successfully fetched from Public Data API");
            return new Response(
              JSON.stringify(data),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          console.error(`Public Data API Error: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        console.error("Public Data API fetch failed:", err);
      }
    }

    // 2. Fallback to Kakao Local Search
    console.warn("Falling back to Kakao Local Search");
    
    const kakaoApiKey = Deno.env.get("KAKAO_REST_API_KEY");
    
    if (!kakaoApiKey) {
      return new Response(
        JSON.stringify({ error: "API 키가 설정되지 않았습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const kakaoUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=응급실&x=${lng}&y=${lat}&radius=${radius}&size=30&sort=distance`;
    
    console.info(`Trying Kakao API: ${kakaoUrl}`);
    
    const kakaoResponse = await fetch(kakaoUrl, {
      headers: {
        Authorization: `KakaoAK ${kakaoApiKey}`,
      },
    });

    if (!kakaoResponse.ok) {
      const errorText = await kakaoResponse.text();
      console.error(`Kakao API Error: ${kakaoResponse.status}`, errorText);
      throw new Error(`Kakao API 호출 실패: ${kakaoResponse.status}`);
    }

    const kakaoData = await kakaoResponse.json();
    
    // Filter out pharmacies and only keep hospitals/emergency rooms
    const filteredDocuments = kakaoData.documents.filter((doc: any) => {
      const name = doc.place_name.toLowerCase();
      const category = doc.category_name.toLowerCase();
      
      // Exclude pharmacies
      if (category.includes('약국') || name.includes('약국')) {
        return false;
      }
      
      // Include only hospitals and emergency-related places
      return category.includes('병원') || 
             name.includes('응급') || 
             name.includes('병원') ||
             category.includes('의료');
    });
    
    // Transform Kakao data to match expected format
    const transformedData = {
      response: {
        body: {
          items: {
            item: filteredDocuments.map((doc: any) => ({
              dutyName: doc.place_name,
              dutyAddr: doc.address_name,
              dutyTel1: doc.phone || "정보 없음",
              wgs84Lat: parseFloat(doc.y),
              wgs84Lon: parseFloat(doc.x),
              distance: doc.distance,
              // Kakao doesn't provide bed info
              hvec: null,
              hvoc: null,
            }))
          },
          totalCount: kakaoData.meta.total_count,
        }
      },
      source: "kakao" // Indicate this is from Kakao
    };

    return new Response(
      JSON.stringify(transformedData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
