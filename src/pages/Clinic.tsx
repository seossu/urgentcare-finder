import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, MapPin, Phone, Navigation, ArrowLeft, Clock, Calendar, Sparkles, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check if hospital is currently open based on operating hours
const checkHospitalStatus = (startTime: string, endTime: string): { isOpen: boolean; closingTime: string | null } => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Parse start time (format: "0900" or "09:00")
  const startTimeStr = startTime.replace(/:/g, '').padStart(4, '0');
  const startHour = parseInt(startTimeStr.substring(0, 2), 10);
  const startMin = parseInt(startTimeStr.substring(2, 4), 10);
  const startTimeInMinutes = startHour * 60 + startMin;

  // Parse end time (format: "1800" or "18:00")
  const endTimeStr = endTime.replace(/:/g, '').padStart(4, '0');
  const endHour = parseInt(endTimeStr.substring(0, 2), 10);
  const endMin = parseInt(endTimeStr.substring(2, 4), 10);
  const endTimeInMinutes = endHour * 60 + endMin;

  // Check if current time is within operating hours
  const isOpen = currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
  
  // Format closing time
  const closingTime = isOpen ? `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}` : null;

  return { isOpen, closingTime };
};

// Extract department from hospital name
const extractDepartment = (name: string): string => {
  if (name.includes("가정의학과")) return "가정의학과";
  if (name.includes("내과")) return "내과";
  if (name.includes("소아청소년과") || name.includes("소아과")) return "소아청소년과";
  if (name.includes("정형외과")) return "정형외과";
  if (name.includes("피부과")) return "피부과";
  if (name.includes("이비인후과")) return "이비인후과";
  if (name.includes("안과")) return "안과";
  if (name.includes("산부인과")) return "산부인과";
  if (name.includes("치과")) return "치과";
  if (name.includes("한의원")) return "한의원";
  if (name.includes("정신건강의학과") || name.includes("정신과")) return "정신건강의학과";
  if (name.includes("비뇨기과")) return "비뇨기과";
  if (name.includes("외과")) return "외과";
  if (name.includes("신경과")) return "신경과";
  if (name.includes("재활의학과")) return "재활의학과";
  return "일반";
};

const Clinic = () => {
  const navigate = useNavigate();
  // Applied filters
  const [distance, setDistance] = useState("3");
  const [department, setDepartment] = useState("all");
  const [sortBy, setSortBy] = useState("distance");
  // Temporary filters for selection
  const [tempDistance, setTempDistance] = useState("3");
  const [tempDepartment, setTempDepartment] = useState("all");
  const [tempSortBy, setTempSortBy] = useState("distance");
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addressInput, setAddressInput] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  
  // AI symptom checker states
  const [symptoms, setSymptoms] = useState("");
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    // Get user's current location on initial load only
    if (navigator.geolocation && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setUserLocation({ lat, lng });

          // Convert coordinates to address using Kakao API via Edge Function
          try {
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kakao-reverse-geocode`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lat, lng }),
              }
            );
            const data = await response.json();
            
            if (data.address) {
              setUserLocation({ lat, lng, address: data.address });
              setAddressInput(data.address);
            }
          } catch (error) {
            console.error("주소 변환 실패:", error);
          }

          // Fetch hospitals from Public Data API (반경/좌표 기반)
          try {
            const radiusKm = Number(distance) || 5;
            const hospitalResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-hospitals`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lat, lng, radiusKm, numOfRows: 300 }),
              }
            );
            const hospitalData = await hospitalResponse.json();
            
            if (hospitalData.hospitals && hospitalData.hospitals.length > 0) {
              // API가 거리순으로 반환된다고 보장하지 않으므로 직접 계산/정렬
              const isPharmacy = (item: any) => (item.dutyName?.includes("약국")) || item.dutyEryn === 2 || (item.hpid?.startsWith("C"));
              const isEmergency = (item: any) => item.dutyEryn === 1 || /응급/.test(item.dutyName || "");

              const normalized = hospitalData.hospitals
                .filter((item: any) => !isPharmacy(item) && !isEmergency(item))
                .map((hospital: any) => {
                  const latNum = parseFloat(hospital.wgs84Lat) || lat;
                  const lonNum = parseFloat(hospital.wgs84Lon) || lng;
                  const calculatedDistance = calculateDistance(lat, lng, latNum, lonNum);
                  const hospitalName = hospital.dutyName || '이름 없음';
                  const startTime = hospital.dutyTime1s || "0900";
                  const endTime = hospital.dutyTime1c || "1800";
                  const status = checkHospitalStatus(startTime, endTime);
                  
                  return {
                    id: hospital.hpid || Math.random().toString(),
                    name: hospitalName,
                    phone: hospital.dutyTel1 || '연락처 없음',
                    address: hospital.dutyAddr || '주소 없음',
                    lat: latNum,
                    lng: lonNum,
                    department: extractDepartment(hospitalName),
                    isOpen: status.isOpen,
                    closingTime: status.closingTime,
                    hours: `평일 ${startTime}~${endTime}`,
                    hasNaverBooking: false,
                    calculatedDistance,
                  };
                })
                .sort((a: any, b: any) => a.calculatedDistance - b.calculatedDistance)
                .slice(0, 30)
                .map((hospital: any) => ({
                  ...hospital,
                  distance: `${hospital.calculatedDistance.toFixed(1)}km`,
                }));
              
              setHospitals(normalized);
            }
          } catch (error) {
            console.error("병원 정보 조회 실패:", error);
            toast.error("병원 정보를 가져올 수 없습니다");
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error("위치 정보를 가져올 수 없습니다:", error);
          toast.error("위치 정보를 가져올 수 없습니다");
          setLoading(false);
        }
      );
    }
  }, []);

  // Fetch hospitals when location or filters change
  useEffect(() => {
    if (userLocation) {
      fetchHospitals(userLocation.lat, userLocation.lng);
    }
  }, [userLocation, distance, department]);

  const fetchHospitals = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const radiusKm = Number(distance) || 5;
      const hospitalResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-hospitals`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ lat, lng, radiusKm, numOfRows: 500 }),
        }
      );
      const hospitalData = await hospitalResponse.json();

      if (hospitalData.hospitals && hospitalData.hospitals.length > 0) {
        const isPharmacy = (item: any) => (item.dutyName?.includes("약국")) || item.dutyEryn === 2 || (item.hpid?.startsWith("C"));
        const isEmergency = (item: any) => item.dutyEryn === 1 || /응급/.test(item.dutyName || "");

        const normalized = hospitalData.hospitals
          .filter((item: any) => !isPharmacy(item) && !isEmergency(item))
          .map((hospital: any) => {
            const latNum = parseFloat(hospital.wgs84Lat) || lat;
            const lonNum = parseFloat(hospital.wgs84Lon) || lng;
            const calculatedDistance = calculateDistance(lat, lng, latNum, lonNum);
            const hospitalName = hospital.dutyName || '이름 없음';
            const startTime = hospital.dutyTime1s || "0900";
            const endTime = hospital.dutyTime1c || "1800";
            const status = checkHospitalStatus(startTime, endTime);
            
            return {
              id: hospital.hpid || Math.random().toString(),
              name: hospitalName,
              phone: hospital.dutyTel1 || '연락처 없음',
              address: hospital.dutyAddr || '주소 없음',
              lat: latNum,
              lng: lonNum,
              department: extractDepartment(hospitalName),
              isOpen: status.isOpen,
              closingTime: status.closingTime,
              hours: `평일 ${startTime}~${endTime}`,
              hasNaverBooking: false,
              calculatedDistance,
            };
          })
          .sort((a: any, b: any) => a.calculatedDistance - b.calculatedDistance)
          .map((hospital: any) => ({
            ...hospital,
            distance: `${hospital.calculatedDistance.toFixed(1)}km`,
          }));
        
        setHospitals(normalized);
      } else {
        setHospitals([]);
      }
    } catch (error) {
      console.error("병원 정보 조회 실패:", error);
      toast.error("병원 정보를 가져올 수 없습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (hospital: any) => {
    if (!userLocation) {
      toast.error("현재 위치를 가져오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const start = encodeURIComponent(userLocation.address || "현재 위치");
    const destination = encodeURIComponent(hospital.name);
    
    // Naver Map directions format with coordinates
    const naverMapUrl = `https://map.naver.com/p/directions/${userLocation.lng},${userLocation.lat},${start},,ADDRESS_POI/${hospital.lng},${hospital.lat},${destination},${hospital.id},PLACE_POI/-/transit?c=14.00,0,0,0,dh`;
    
    window.open(naverMapUrl, "_blank");
  };

  const handleNaverBooking = (clinicName: string) => {
    // Naver Booking URL
    const naverBookingUrl = `https://booking.naver.com/booking/search?query=${encodeURIComponent(clinicName)}`;
    window.open(naverBookingUrl, "_blank");
  };

  const handleApplyFilters = () => {
    setDistance(tempDistance);
    setDepartment(tempDepartment);
    setSortBy(tempSortBy);
  };

  const searchByAddress = async () => {
    if (!addressInput.trim()) {
      toast.error("주소를 입력해주세요");
      return;
    }

    setSearchLoading(true);
    try {
      // Convert address to coordinates using Kakao Geocoding API via Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kakao-geocode`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address: addressInput }),
        }
      );
      const data = await response.json();

      if (data.lat && data.lng) {
        setUserLocation({ lat: data.lat, lng: data.lng, address: addressInput });
        toast.success("병원 정보를 불러왔습니다");
      } else {
        toast.error("주소를 찾을 수 없습니다. 정확한 주소를 입력해주세요.");
      }
    } catch (error) {
      console.error("주소 검색 실패:", error);
      toast.error("주소 검색에 실패했습니다");
    } finally {
      setSearchLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          try {
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kakao-reverse-geocode`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lat, lng }),
              }
            );
            const data = await response.json();

            if (data.address) {
              setUserLocation({ lat, lng, address: data.address });
              setAddressInput(data.address);
            } else {
              setUserLocation({ lat, lng });
            }
            toast.success("현재 위치를 기준으로 병원을 찾았습니다");
          } catch (error) {
            console.error("주소 변환 실패:", error);
            setUserLocation({ lat, lng });
          }
        },
        (error) => {
          console.error("위치 정보를 가져올 수 없습니다:", error);
          toast.error("위치 정보를 가져올 수 없습니다");
        }
      );
    }
  };

  const analyzeSymptoms = async () => {
    if (!symptoms.trim()) {
      toast.error("증상을 입력해주세요");
      return;
    }

    setAiLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/symptom-checker`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symptoms }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setAiRecommendation(data);
        toast.success("증상 분석이 완료되었습니다");
        
        // If AI recommends a specific department, filter hospitals by that department
        if (data.department) {
          const departmentMapping: { [key: string]: string } = {
            "가정의학과": "family",
            "내과": "internal",
            "소아청소년과": "pediatrics",
            "정형외과": "orthopedics",
            "피부과": "dermatology",
            "이비인후과": "ent",
            "안과": "ophthalmology",
            "산부인과": "obgyn",
            "치과": "dental",
            "한의원": "korean",
            "정신건강의학과": "psychiatry",
          };
          
          const mappedDepartment = departmentMapping[data.department];
          if (mappedDepartment) {
            setTempDepartment(mappedDepartment);
            setDepartment(mappedDepartment);
          }
        }
      } else {
        toast.error(data.error || "증상 분석 중 오류가 발생했습니다");
      }
    } catch (error) {
      console.error("증상 분석 실패:", error);
      toast.error("증상 분석에 실패했습니다");
    } finally {
      setAiLoading(false);
    }
  };

  // Mock data with coordinates (fallback if API fails)
  const clinicsData = [
    {
      id: 1,
      name: "서울내과의원",
      phone: "02-1234-5678",
      address: "서울특별시 종로구 종로 123",
      lat: 37.5701,
      lng: 126.9870,
      department: "내과",
      isOpen: true,
      closingTime: "18:00",
      hours: "평일 09:00~18:00, 토 09:00~13:00",
      hasNaverBooking: true,
    },
    {
      id: 2,
      name: "우리소아청소년과",
      phone: "02-2345-6789",
      address: "서울특별시 종로구 율곡로 456",
      lat: 37.5829,
      lng: 126.9900,
      department: "소아청소년과",
      isOpen: true,
      closingTime: "19:00",
      hours: "평일 09:00~19:00, 토 09:00~14:00",
      hasNaverBooking: true,
    },
    {
      id: 3,
      name: "튼튼정형외과",
      phone: "02-3456-7890",
      address: "서울특별시 종로구 삼일대로 789",
      lat: 37.5730,
      lng: 126.9850,
      department: "정형외과",
      isOpen: false,
      closingTime: null,
      hours: "평일 09:00~18:00, 일요일 휴무",
      hasNaverBooking: false,
    },
  ];

  // Use real data if available, otherwise use mock data
  let clinics = hospitals.length > 0 ? hospitals :
    userLocation
      ? clinicsData
          .map((clinic) => ({
            ...clinic,
            calculatedDistance: calculateDistance(
              userLocation.lat,
              userLocation.lng,
              clinic.lat,
              clinic.lng
            ),
          }))
          .sort((a, b) => a.calculatedDistance - b.calculatedDistance)
          .map((clinic) => ({
            ...clinic,
            distance: `${clinic.calculatedDistance.toFixed(1)}km`,
          }))
      : clinicsData.map((clinic) => ({ ...clinic, distance: "계산 중..." }));

  // Apply filters and sorting
  // Filter by department
  if (department !== "all") {
    const departmentMap: { [key: string]: string[] } = {
      family: ["가정의학과"],
      internal: ["내과"],
      pediatrics: ["소아청소년과"],
      orthopedics: ["정형외과"],
      dermatology: ["피부과"],
      ent: ["이비인후과"],
      ophthalmology: ["안과"],
      obgyn: ["산부인과"],
      dental: ["치과"],
      korean: ["한의원"],
      psychiatry: ["정신건강의학과"],
    };
    const targetDepartments = departmentMap[department] || [];
    clinics = clinics.filter((clinic) =>
      targetDepartments.some((dept) => clinic.department?.includes(dept))
    );
  }

  // Filter by distance
  const maxDistance = parseFloat(distance);
  clinics = clinics.filter((clinic) => {
    const distanceValue = parseFloat(clinic.distance);
    return !isNaN(distanceValue) && distanceValue <= maxDistance;
  });

  // Sort by selected method
  if (sortBy === "distance") {
    clinics = clinics.sort((a, b) => {
      const distA = parseFloat(a.distance) || 999;
      const distB = parseFloat(b.distance) || 999;
      return distA - distB;
    });
  } else if (sortBy === "open") {
    clinics = clinics.sort((a, b) => {
      if (a.isOpen === b.isOpen) {
        const distA = parseFloat(a.distance) || 999;
        const distB = parseFloat(b.distance) || 999;
        return distA - distB;
      }
      return a.isOpen ? -1 : 1;
    });
  }

  // Limit to 30 results
  clinics = clinics.slice(0, 30);

  const departments = [
    { value: "all", label: "전체" },
    { value: "family", label: "가정의학과" },
    { value: "internal", label: "내과" },
    { value: "pediatrics", label: "소아청소년과" },
    { value: "orthopedics", label: "정형외과" },
    { value: "dermatology", label: "피부과" },
    { value: "ent", label: "이비인후과" },
    { value: "ophthalmology", label: "안과" },
    { value: "obgyn", label: "산부인과" },
    { value: "dental", label: "치과" },
    { value: "korean", label: "한의원" },
    { value: "psychiatry", label: "정신건강의학과" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-secondary" />
              <h1 className="text-xl font-bold">동네 병원 찾기</h1>
            </div>
          </div>
        </div>
      </header>

      {/* AI Symptom Checker */}
      <div className="border-b bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">AI 증상 분석</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            증상을 설명하시면 AI가 적절한 진료과를 추천해드립니다
          </p>
          
          <div className="space-y-3">
            <Textarea
              placeholder="예: 머리가 아프고 열이 나요. 기침도 조금 나고 목이 아픕니다."
              className="min-h-[100px] resize-none"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
            />
            <Button 
              onClick={analyzeSymptoms}
              disabled={aiLoading || !symptoms.trim()}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {aiLoading ? "분석 중..." : "증상 분석하기"}
            </Button>
          </div>

          {aiRecommendation && (
            <Alert className={
              aiRecommendation.urgency === "high" 
                ? "border-destructive bg-destructive/10" 
                : "border-primary bg-primary/10"
            }>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold">추천 진료과: </span>
                    <Badge variant="secondary" className="ml-2">
                      {aiRecommendation.department}
                    </Badge>
                  </div>
                  <p className="text-sm">{aiRecommendation.reason}</p>
                  {aiRecommendation.additionalAdvice && (
                    <p className="text-sm text-muted-foreground italic">
                      {aiRecommendation.additionalAdvice}
                    </p>
                  )}
                  {aiRecommendation.urgency === "high" && (
                    <p className="text-sm font-semibold text-destructive">
                      ⚠️ 응급 상황으로 판단됩니다. 즉시 응급실을 방문하거나 119에 연락하세요.
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Location and Filters */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 space-y-4">
          {/* Location */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="도로명 주소를 입력하세요 (예: 서울 강남구 테헤란로 123)"
                  className="pl-10"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      searchByAddress();
                    }
                  }}
                />
              </div>
              <Button 
                onClick={searchByAddress}
                disabled={searchLoading}
              >
                검색
              </Button>
            </div>
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={getCurrentLocation}
              disabled={loading}
            >
              <MapPin className="h-4 w-4 mr-2" />
              현재 위치로 재설정
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={tempDistance} onValueChange={setTempDistance}>
              <SelectTrigger>
                <SelectValue placeholder="거리 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1km 이내</SelectItem>
                <SelectItem value="3">3km 이내</SelectItem>
                <SelectItem value="5">5km 이내</SelectItem>
                <SelectItem value="10">10km 이내</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tempDepartment} onValueChange={setTempDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="진료과 선택" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tempSortBy} onValueChange={setTempSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="정렬 방식" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">거리순</SelectItem>
                <SelectItem value="open">진료 중</SelectItem>
                <SelectItem value="all">전체 보기</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Apply Filters Button */}
          <Button onClick={handleApplyFilters} className="w-full">
            확인
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {loading ? "병원 정보를 불러오는 중..." : (
              <>총 <span className="font-semibold text-foreground">{clinics.length}개</span>의 병원이 있습니다</>
            )}
          </p>
        </div>

        <div className="space-y-4">
          {clinics.map((clinic) => (
            <Card key={clinic.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold">{clinic.name}</h3>
                    {clinic.isOpen ? (
                      <Badge className="bg-success">
                        진료 중 (~{clinic.closingTime})
                      </Badge>
                    ) : (
                      <Badge variant="secondary">휴진</Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{clinic.distance}</span>
                      </div>
                      <span className="px-2 py-1 bg-secondary/10 text-secondary rounded">
                        {clinic.department}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-5">{clinic.address}</p>
                  </div>
                </div>
              </div>

              {/* Hours */}
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">운영 시간</span>
                </div>
                <p className="text-sm text-muted-foreground">{clinic.hours}</p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button variant="outline" asChild>
                  <a href={`tel:${clinic.phone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    전화하기
                  </a>
                </Button>
                <Button onClick={() => handleNavigation(clinic)}>
                  <Navigation className="h-4 w-4 mr-2" />
                  길찾기
                </Button>
                {clinic.hasNaverBooking && (
                  <Button variant="secondary" onClick={() => handleNaverBooking(clinic.name)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    네이버 예약
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Clinic;
