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

const Clinic = () => {
  const navigate = useNavigate();
  const [distance, setDistance] = useState("3");
  const [department, setDepartment] = useState("all");
  const [sortBy, setSortBy] = useState("distance");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("위치 정보를 가져올 수 없습니다:", error);
          toast.error("위치 정보를 가져올 수 없습니다");
        }
      );
    }
  }, []);

  const handleNavigation = (clinicName: string, clinicAddress: string) => {
    // Naver Map directions URL
    const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(clinicName)}`;
    window.open(naverMapUrl, "_blank");
  };

  const handleNaverBooking = (clinicName: string) => {
    // Naver Booking URL
    const naverBookingUrl = `https://booking.naver.com/booking/search?query=${encodeURIComponent(clinicName)}`;
    window.open(naverBookingUrl, "_blank");
  };

  // Mock data for demonstration
  const clinics = [
    {
      id: 1,
      name: "서울내과의원",
      distance: "0.3km",
      phone: "02-1234-5678",
      address: "서울특별시 종로구 종로 123",
      department: "내과",
      isOpen: true,
      closingTime: "18:00",
      hours: "평일 09:00~18:00, 토 09:00~13:00",
      hasNaverBooking: true,
    },
    {
      id: 2,
      name: "우리소아청소년과",
      distance: "0.8km",
      phone: "02-2345-6789",
      address: "서울특별시 종로구 율곡로 456",
      department: "소아청소년과",
      isOpen: true,
      closingTime: "19:00",
      hours: "평일 09:00~19:00, 토 09:00~14:00",
      hasNaverBooking: true,
    },
    {
      id: 3,
      name: "튼튼정형외과",
      distance: "1.2km",
      phone: "02-3456-7890",
      address: "서울특별시 종로구 삼일대로 789",
      department: "정형외과",
      isOpen: false,
      closingTime: null,
      hours: "평일 09:00~18:00, 일요일 휴무",
      hasNaverBooking: false,
    },
  ];

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
                placeholder="지역을 입력하세요"
                className="pl-10"
                defaultValue="서울시 종로구"
              />
            </div>
            <Button variant="secondary">
              <MapPin className="h-4 w-4 mr-2" />
              현재 위치
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={distance} onValueChange={setDistance}>
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

            <Select value={department} onValueChange={setDepartment}>
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

            <Select value={sortBy} onValueChange={setSortBy}>
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
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            총 <span className="font-semibold text-foreground">{clinics.length}개</span>의 병원이 있습니다
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
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{clinic.distance}</span>
                    </div>
                    <span className="px-2 py-1 bg-secondary/10 text-secondary rounded">
                      {clinic.department}
                    </span>
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
