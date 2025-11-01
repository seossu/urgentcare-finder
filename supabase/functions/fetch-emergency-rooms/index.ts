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

// Function to fetch phone number using Lovable AI
async function fetchPhoneWithAI(
  hospitalName: string,
  address: string
): Promise<string> {
  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.warn('LOVABLE_API_KEY not found');
      return '';
    }

    const prompt = `병원 이름: ${hospitalName}\n주소: ${address}\n\n이 병원의 대표 전화번호를 찾아서 숫자만 반환해주세요. 전화번호를 찾을 수 없으면 빈 문자열을 반환하세요.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: '당신은 병원 전화번호를 찾는 도우미입니다. 정확한 전화번호만 반환하고, 찾을 수 없으면 빈 문자열을 반환하세요.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      console.warn(`AI phone lookup failed for ${hospitalName}: ${response.status}`);
      return '';
    }

    const data = await response.json();
    const phoneNumber = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Validate phone number format (Korean phone numbers)
    const phoneRegex = /^\d{2,4}-?\d{3,4}-?\d{4}$/;
    if (phoneNumber && phoneRegex.test(phoneNumber)) {
      console.info(`AI found phone for ${hospitalName}: ${phoneNumber}`);
      return phoneNumber;
    }
    
    return '';
  } catch (error) {
    console.error(`Error fetching phone for ${hospitalName}:`, error);
    return '';
  }
}

// Region code mapping for NEMC API
const REGION_CODE_MAP: { [key: string]: string } = {
  '서울': '11',
  '서울특별시': '11',
  '부산': '12',
  '부산광역시': '12',
  '대구': '13',
  '대구광역시': '13',
  '인천': '14',
  '인천광역시': '14',
  '광주': '15',
  '광주광역시': '15',
  '대전': '16',
  '대전광역시': '16',
  '울산': '17',
  '울산광역시': '17',
  '세종': '18',
  '세종특별자치시': '18',
  '경기': '21',
  '경기도': '21',
  '강원': '22',
  '강원특별자치도': '22',
  '충북': '23',
  '충청북도': '23',
  '충남': '24',
  '충청남도': '24',
  '전북': '25',
  '전북특별자치도': '25',
  '전남': '26',
  '전라남도': '26',
  '경북': '27',
  '경상북도': '27',
  '경남': '28',
  '경상남도': '28',
  '제주': '29',
  '제주특별자치도': '29',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, radius = 10000, region1, region2 } = await req.json();

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
            
            // Transform NEMC data to match expected format and fetch phone numbers
            const transformedItems = await Promise.all(hospitals.map(async (hospital: any) => {
              // Calculate distance from user location if lat/lng provided
              let distance = 0;
              if (lat && lng) {
                distance = calculateDistance(
                  lat,
                  lng,
                  hospital.latitude,
                  hospital.longitude
                );
              }
              
              // Fetch phone number using AI
              const phoneNumber = await fetchPhoneWithAI(
                hospital.emergencyRoomName,
                hospital.address
              );
              
              return {
                hpid: hospital.emogCode,
                dutyName: hospital.emergencyRoomName,
                dutyAddr: hospital.address,
                dutyTel1: hospital.hotlineTel || '',
                dutyTel3: phoneNumber || hospital.emergencyRoomTel || '',
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
            }));
            
            // Sort by distance if lat/lng provided, otherwise keep original order
            if (lat && lng) {
              transformedItems.sort((a: any, b: any) => a.distance - b.distance);
            }
            
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
