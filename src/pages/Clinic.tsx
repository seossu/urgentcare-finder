import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, MapPin, Phone, Navigation, ArrowLeft, Clock, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
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
                  return {
                    id: hospital.hpid || Math.random().toString(),
                    name: hospital.dutyName || '이름 없음',
                    phone: hospital.dutyTel1 || '연락처 없음',
                    address: hospital.dutyAddr || '주소 없음',
                    lat: latNum,
                    lng: lonNum,
                    department: "일반",
                    isOpen: true,
                    closingTime: "18:00",
                    hours: `평일 ${hospital.dutyTime1s || "09:00"}~${hospital.dutyTime1c || "1800"}`,
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
  }, [distance]);

  const handleNavigation = (clinicName: string, clinicAddress: string) => {
    if (!userLocation) {
      toast.error("현재 위치를 가져오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    // Naver Map directions URL with current location as start point
    const startPoint = `${userLocation.lng},${userLocation.lat},현재위치`;
    const endPoint = `place:${encodeURIComponent(clinicName)}`;
    const naverMapUrl = `https://map.naver.com/v5/directions/${startPoint}/${endPoint}/-/transit`;
    
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
      internal: ["내과"],
      pediatrics: ["소아청소년과"],
      orthopedics: ["정형외과"],
      dermatology: ["피부과"],
      ent: ["이비인후과"],
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

  const departments = [
    { value: "all", label: "전체" },
    { value: "internal", label: "내과" },
    { value: "pediatrics", label: "소아청소년과" },
    { value: "orthopedics", label: "정형외과" },
    { value: "dermatology", label: "피부과" },
    { value: "ent", label: "이비인후과" },
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

      {/* Location and Filters */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 space-y-4">
          {/* Location */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="위치를 가져오는 중..."
                className="pl-10"
                value={userLocation?.address || "위치를 가져오는 중..."}
                readOnly
              />
            </div>
            <Button variant="secondary">
              <MapPin className="h-4 w-4 mr-2" />
              현재 위치
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
                      <Badge variant="secondary">진료 마감</Badge>
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
                <Button onClick={() => handleNavigation(clinic.name, clinic.address)}>
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
