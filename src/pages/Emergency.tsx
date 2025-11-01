import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Hospital, MapPin, Phone, Navigation, ArrowLeft, Bed, Users } from "lucide-react";
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

const Emergency = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [emergencyRooms, setEmergencyRooms] = useState<any[]>([]);
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

          // Fetch nearby facilities using HIRA (반경/좌표 기반) → 응급실만 30개 추출
          try {
            const emergencyResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-hospitals`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lat, lng, radiusKm: 50, numOfRows: 300 }), // 더 넓게 수집 후 근접 30개 추출
              }
            );
            const hospitalData = await emergencyResponse.json();
            
            if (hospitalData.hospitals && hospitalData.hospitals.length > 0) {
              const isPharmacy = (item: any) => (item.dutyName?.includes("약국")) || item.dutyEryn === 2 || (item.hpid?.startsWith("C"));
              const isEmergency = (item: any) => item.dutyEryn === 1 || /응급/.test(item.dutyName || "");

              const normalized = hospitalData.hospitals
                .filter((room: any) => !isPharmacy(room) && isEmergency(room))
                .map((room: any) => {
                  const latNum = parseFloat(room.wgs84Lat) || lat;
                  const lonNum = parseFloat(room.wgs84Lon) || lng;
                  const calculatedDistance = calculateDistance(lat, lng, latNum, lonNum);
                  return {
                    id: room.hpid || Math.random().toString(),
                    name: room.dutyName || '이름 없음',
                    phone: room.dutyTel1 || '연락처 없음',
                    address: room.dutyAddr || '주소 없음',
                    lat: latNum,
                    lng: lonNum,
                    totalBeds: parseInt(room.hvec) || 0,
                    availableBeds: parseInt(room.hvec) || 0,
                    doctors: ["응급의학과"],
                    calculatedDistance,
                  };
                })
                .sort((a: any, b: any) => a.calculatedDistance - b.calculatedDistance)
                .slice(0, 30)
                .map((room: any) => ({
                  ...room,
                  distance: `${room.calculatedDistance.toFixed(1)}km`,
                }));
              
              setEmergencyRooms(normalized);
            }
          } catch (error) {
            console.error("응급실 정보 조회 실패:", error);
            toast.error("응급실 정보를 가져올 수 없습니다");
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

  const handleNavigation = (hospitalName: string, hospitalAddress: string) => {
    if (!userLocation) {
      toast.error("현재 위치를 가져오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    // Naver Map directions URL with current location as start point
    const startPoint = `${userLocation.lng},${userLocation.lat},현재위치`;
    const endPoint = `place:${encodeURIComponent(hospitalName)}`;
    const naverMapUrl = `https://map.naver.com/v5/directions/${startPoint}/${endPoint}/-/transit`;
    
    window.open(naverMapUrl, "_blank");
  };

  // Mock data with coordinates (fallback if API fails)
  const emergencyRoomsData = [
    {
      id: 1,
      name: "서울대학교병원 응급의료센터",
      phone: "02-2072-2345",
      address: "서울특별시 종로구 대학로 101",
      lat: 37.5799,
      lng: 127.0017,
      totalBeds: 45,
      availableBeds: 12,
      doctors: ["외과", "내과", "신경외과"],
    },
    {
      id: 2,
      name: "삼성서울병원 응급의료센터",
      phone: "02-3410-2345",
      address: "서울특별시 강남구 일원로 81",
      lat: 37.4885,
      lng: 127.0857,
      totalBeds: 60,
      availableBeds: 8,
      doctors: ["외과", "내과", "정형외과", "소아과"],
    },
    {
      id: 3,
      name: "아산병원 응급의료센터",
      phone: "02-3010-3000",
      address: "서울특별시 송파구 올림픽로 43길 88",
      lat: 37.5267,
      lng: 127.1104,
      totalBeds: 55,
      availableBeds: 15,
      doctors: ["외과", "내과", "신경외과", "흉부외과"],
    },
  ];

  // Use real data if available, otherwise use mock data
  const displayRooms = emergencyRooms.length > 0 ? emergencyRooms : 
    userLocation
      ? emergencyRoomsData
          .map((room) => ({
            ...room,
            calculatedDistance: calculateDistance(
              userLocation.lat,
              userLocation.lng,
              room.lat,
              room.lng
            ),
          }))
          .sort((a, b) => a.calculatedDistance - b.calculatedDistance)
          .map((room) => ({
            ...room,
            distance: `${room.calculatedDistance.toFixed(1)}km`,
          }))
      : emergencyRoomsData.map((room) => ({ ...room, distance: "계산 중..." }));

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
              <Hospital className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">응급실 찾기</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Location Search */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
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
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {loading ? "응급실 정보를 불러오는 중..." : (
              <>총 <span className="font-semibold text-foreground">{displayRooms.length}개</span>의 응급실이 있습니다</>
            )}
          </p>
        </div>

        <div className="space-y-4">
          {displayRooms.map((room) => (
            <Card key={room.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">{room.name}</h3>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{room.distance}</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">{room.address}</p>
                  </div>
                </div>
              </div>

              {/* Bed Information */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted rounded-lg">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">총 병상</span>
                  </div>
                  <p className="text-2xl font-bold">{room.totalBeds}개</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Bed className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">남은 병상</span>
                  </div>
                  <p className="text-2xl font-bold text-success">{room.availableBeds}개</p>
                </div>
              </div>

              {/* Doctors Information */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">진료 가능 전문의</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {room.doctors.map((doctor, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-secondary/10 text-secondary text-sm rounded-full"
                    >
                      {doctor}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" asChild>
                  <a href={`tel:${room.phone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    {room.phone}
                  </a>
                </Button>
                <Button onClick={() => handleNavigation(room.name, room.address)}>
                  <Navigation className="h-4 w-4 mr-2" />
                  길찾기
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Emergency;
