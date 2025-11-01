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
        },
        (error) => {
          console.error("위치 정보를 가져올 수 없습니다:", error);
          toast.error("위치 정보를 가져올 수 없습니다");
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

  // Mock data with coordinates
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
    {
      id: 4,
      name: "세브란스병원 응급의료센터",
      phone: "02-2228-5000",
      address: "서울특별시 서대문구 연세로 50-1",
      lat: 37.5626,
      lng: 126.9404,
      totalBeds: 50,
      availableBeds: 10,
      doctors: ["외과", "내과", "신경외과", "정형외과"],
    },
    {
      id: 5,
      name: "서울아산병원 어린이병원 응급실",
      phone: "02-3010-3350",
      address: "서울특별시 송파구 올림픽로 43길 88",
      lat: 37.5268,
      lng: 127.1105,
      totalBeds: 30,
      availableBeds: 7,
      doctors: ["소아과", "소아외과"],
    },
    {
      id: 6,
      name: "강남세브란스병원 응급의료센터",
      phone: "02-2019-3000",
      address: "서울특별시 강남구 언주로 211",
      lat: 37.5194,
      lng: 127.0403,
      totalBeds: 45,
      availableBeds: 9,
      doctors: ["외과", "내과", "정형외과"],
    },
    {
      id: 7,
      name: "고려대학교안암병원 응급의료센터",
      phone: "02-920-5114",
      address: "서울특별시 성북구 고려대로 73",
      lat: 37.5866,
      lng: 127.0266,
      totalBeds: 40,
      availableBeds: 11,
      doctors: ["외과", "내과", "신경외과"],
    },
    {
      id: 8,
      name: "서울성모병원 응급의료센터",
      phone: "02-2258-5114",
      address: "서울특별시 서초구 반포대로 222",
      lat: 37.5011,
      lng: 127.0063,
      totalBeds: 48,
      availableBeds: 6,
      doctors: ["외과", "내과", "정형외과", "신경외과"],
    },
    {
      id: 9,
      name: "한양대학교병원 응급의료센터",
      phone: "02-2290-8114",
      address: "서울특별시 성동구 왕십리로 222",
      lat: 37.5597,
      lng: 127.0421,
      totalBeds: 38,
      availableBeds: 13,
      doctors: ["외과", "내과", "흉부외과"],
    },
    {
      id: 10,
      name: "분당서울대병원 응급의료센터",
      phone: "031-787-7119",
      address: "경기도 성남시 분당구 구미로 173번길 82",
      lat: 37.3527,
      lng: 127.1246,
      totalBeds: 42,
      availableBeds: 8,
      doctors: ["외과", "내과", "정형외과", "신경외과"],
    },
    {
      id: 11,
      name: "이대서울병원 응급의료센터",
      phone: "02-6986-4119",
      address: "서울특별시 강서구 공항대로 260",
      lat: 37.5609,
      lng: 126.8510,
      totalBeds: 35,
      availableBeds: 14,
      doctors: ["외과", "내과", "산부인과"],
    },
    {
      id: 12,
      name: "중앙대학교병원 응급의료센터",
      phone: "02-6299-1114",
      address: "서울특별시 동작구 흑석로 102",
      lat: 37.5042,
      lng: 126.9547,
      totalBeds: 36,
      availableBeds: 10,
      doctors: ["외과", "내과", "정형외과"],
    },
  ];

  // Calculate distances and sort by nearest
  const emergencyRooms = userLocation
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
            총 <span className="font-semibold text-foreground">{emergencyRooms.length}개</span>의 응급실이 있습니다
          </p>
        </div>

        <div className="space-y-4">
          {emergencyRooms.map((room) => (
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
