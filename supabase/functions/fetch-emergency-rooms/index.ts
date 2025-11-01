// supabase/functions/fetch-emergency-rooms/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // 1. Supabase Secrets에 저장된 API 키를 불러옵니다.
  const apiKey = Deno.env.get("PUBLIC_DATA_API_KEY");

  if (!apiKey) {
    // 키가 없으면 바로 오류 반환
    return new Response(JSON.stringify({ error: "API 키가 설정되지 않았습니다." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. (가장 중요) API 키를 URL에 사용할 수 있도록 인코딩합니다.
  const encodedKey = encodeURIComponent(apiKey);

  try {
    // 3. API 호출 URL을 만듭니다.
    // (예시: 사용자의 현재 위치 위도/경도를 req.json()으로 받았다고 가정)
    const { lat, lon } = await req.json(); // 예시: { "lat": 37.5665, "lon": 126.9780 }

    // 응급의료기관 정보조회 서비스(B552657)의 '주변 응급실 조회' 엔드포인트 예시입니다.
    // (정확한 URL은 data.go.kr 문서에서 확인해야 합니다)
    const API_URL = `http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgyInfoList?WGS84_LON=${lon}&WGS84_LAT=${lat}&serviceKey=${encodedKey}&_type=json`;

    // 4. fetch를 사용해 data.go.kr API를 호출합니다.
    console.log("Calling API:", API_URL); // 로그 확인용

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      // API 서버가 401, 404, 500 등 오류를 반환한 경우
      console.error("API Error Status:", response.status);
      const errorText = await response.text();
      console.error("API Error Body:", errorText);

      // 401 오류가 여기서 발생합니다.
      if (response.status === 401) {
        throw new Error("Unauthorized: API 키에 권한이 없거나 잘못되었습니다.");
      }
      throw new Error(`API 호출 실패: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // 5. 성공한 데이터를 클라이언트(웹)에 반환합니다.
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    // 401 오류 포함 모든 예외 처리
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
