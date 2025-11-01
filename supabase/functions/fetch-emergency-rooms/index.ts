import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Region code mapping for NEMC API
const REGION_CODE_MAP: { [key: string]: string } = {
  '서울': '11',
  '부산': '21',
  '대구': '22',
  '인천': '23',
  '광주': '24',
  '대전': '25',
  '울산': '26',
  '세종': '29',
  '경기': '31',
  '강원': '32',
  '충북': '33',
  '충남': '34',
  '전북': '35',
  '전남': '36',
  '경북': '37',
  '경남': '38',
  '제주': '39',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, radius = 10000, region1, region2 } = await req.json();

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

    // Fetch real-time bed info from NEMC API
    let realtimeBedData = new Map();
    
    if (region1) {
      const regionCode = REGION_CODE_MAP[region1];
      
      if (regionCode) {
        try {
          const nemcUrl = `https://mediboard.nemc.or.kr/api/v1/search/handy?searchCondition=regional&emogloca=${regionCode}`;
          console.info(`Fetching real-time bed info from NEMC for region ${region1} (code: ${regionCode})`);
          
          const nemcResponse = await fetch(nemcUrl, {
            method: "GET",
            headers: { Accept: "application/json" },
          });
          
          if (nemcResponse.ok) {
            const nemcData = await nemcResponse.json();
            const hospitals = nemcData.hospitalList || [];
            
            console.info(`NEMC API: Found ${hospitals.length} hospitals with real-time bed info`);
            
            // Map NEMC data by hospital ID
            hospitals.forEach((hospital: any) => {
              // NEMC uses 'hpid' field for hospital ID
              if (hospital.hpid) {
                realtimeBedData.set(hospital.hpid, {
                  totalBeds: parseInt(hospital.hvec) || 0,  // 응급실 병상수
                  availableBeds: parseInt(hospital.hvoc) || 0,  // 수술실 병상수
                  erAvailable: hospital.hvec ? parseInt(hospital.hvec) - (parseInt(hospital.hv1) || 0) : 0,  // 응급실 가용 병상
                  erStatus: hospital.MKioskTy25 || '',  // 응급실 포화도
                  lastUpdated: hospital.hvidate || '',  // 업데이트 시간
                });
              }
            });
            
            console.info(`Mapped ${realtimeBedData.size} hospitals with real-time bed data`);
          } else {
            console.warn(`NEMC API error ${nemcResponse.status}`);
          }
        } catch (err) {
          console.error("Failed to fetch NEMC real-time bed info:", err);
        }
      } else {
        console.warn(`No region code mapping for ${region1}`);
      }
    } else {
      console.warn("No region1 provided, skipping NEMC real-time bed info");
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
            
            // Enrich items with real-time bed data from NEMC
            const enrichedItems = items.map((item: any) => {
              const bedInfo = realtimeBedData.get(item.hpid);
              if (bedInfo) {
                console.info(`Enriched ${item.dutyName} with NEMC real-time bed info`);
                return { 
                  ...item, 
                  realtimeBeds: bedInfo 
                };
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
