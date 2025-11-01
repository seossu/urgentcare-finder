import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Region code mapping for NEMC API
const REGION_CODE_MAP: { [key: string]: string } = {
  '서울': '11',
  '부산': '12',
  '대구': '13',
  '인천': '14',
  '광주': '15',
  '대전': '16',
  '울산': '17',
  '세종': '18',
  '경기': '21',
  '강원': '22',
  '충북': '23',
  '충남': '24',
  '전북': '25',
  '전남': '26',
  '경북': '27',
  '경남': '28',
  '제주': '29',
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

    // Fetch emergency rooms from NEMC API
    if (!region1) {
      return new Response(
        JSON.stringify({ error: "지역 정보(region1)가 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (region1) {
      const regionCode = REGION_CODE_MAP[region1];
      console.info(`Looking up region code for: ${region1}, found: ${regionCode}`);
      
      if (regionCode) {
        try {
          const nemcUrl = `https://mediboard.nemc.or.kr/api/v1/search/handy?searchCondition=regional&emogloca=${regionCode}`;
          console.info(`Fetching NEMC API: ${nemcUrl}`);
          
          const nemcResponse = await fetch(nemcUrl, {
            method: "GET",
            headers: { Accept: "application/json" },
          });
          
          console.info(`NEMC API response status: ${nemcResponse.status}`);
          
          if (nemcResponse.ok) {
            const nemcData = await nemcResponse.json();
            console.info(`NEMC API response: ${nemcData.message || 'No message'}`);
            
            // NEMC API structure: { result: { count: N, data: [...] } }
            let hospitals = [];
            if (nemcData.result && Array.isArray(nemcData.result.data)) {
              hospitals = nemcData.result.data;
            }
            
            console.info(`NEMC API: Found ${hospitals.length} hospitals with real-time bed info`);
            
            if (hospitals.length > 0) {
              console.info(`Sample NEMC hospital: ${JSON.stringify(hospitals[0]).substring(0, 300)}`);
            }
            
            // Transform NEMC data to match expected format
            const transformedItems = hospitals.map((hospital: any) => {
              // Calculate distance from user location
              const distance = calculateDistance(
                lat,
                lng,
                hospital.latitude,
                hospital.longitude
              );
              
              return {
                hpid: hospital.emogCode,
                dutyName: hospital.emergencyRoomName,
                dutyAddr: hospital.address,
                dutyTel1: hospital.hotlineTel || '',
                dutyTel3: hospital.emergencyRoomTel || '',
                wgs84Lat: hospital.latitude,
                wgs84Lon: hospital.longitude,
                distance: distance,
                realtimeBeds: {
                  totalBeds: parseInt(hospital.generalEmergencyTotal || '0') + parseInt(hospital.childEmergencyTotal || '0'),
                  availableBeds: parseInt(hospital.generalEmergencyAvailable || '0') + parseInt(hospital.childEmergencyAvailable || '0'),
                  erAvailable: parseInt(hospital.generalEmergencyAvailable || '0') + parseInt(hospital.childEmergencyAvailable || '0'),
                  erStatus: hospital.emergencyInstitutionType || '',
                  lastUpdated: '',
                }
              };
            });
            
            // Sort by distance
            transformedItems.sort((a: any, b: any) => a.distance - b.distance);
            
            console.info(`Transformed ${transformedItems.length} hospitals`);
            // Return data in expected format
            return new Response(
              JSON.stringify({
                response: {
                  header: {
                    resultCode: "00",
                    resultMsg: "NORMAL SERVICE."
                  },
                  body: {
                    items: {
                      item: transformedItems
                    },
                    numOfRows: transformedItems.length,
                    pageNo: 1,
                    totalCount: transformedItems.length
                  }
                }
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            const errorText = await nemcResponse.text();
            console.error(`NEMC API error ${nemcResponse.status}: ${errorText}`);
            return new Response(
              JSON.stringify({ error: "NEMC API 호출 실패" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (err) {
          console.error("Failed to fetch NEMC data:", err);
          return new Response(
            JSON.stringify({ error: "NEMC API 호출 중 오류 발생" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        console.warn(`No region code mapping for region: "${region1}"`);
        return new Response(
          JSON.stringify({ error: "지원하지 않는 지역입니다." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "지역 정보가 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Function error:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
