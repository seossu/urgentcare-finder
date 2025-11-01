import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Hospital, MapPin, Phone, Navigation, ArrowLeft, Bed, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Emergency = () => {
  const navigate = useNavigate();

  // Mock data for demonstration
  const emergencyRooms = [
    {
      id: 1,
      name: "서울대학교병원 응급의료센터",
      distance: "1.2km",
      phone: "02-2072-2345",
      totalBeds: 45,
      availableBeds: 12,
      doctors: ["외과", "내과", "신경외과"],
    },
    {
      id: 2,
      name: "삼성서울병원 응급의료센터",
      distance: "2.5km",
      phone: "02-3410-2345",
      totalBeds: 60,
      availableBeds: 8,
      doctors: ["외과", "내과", "정형외과", "소아과"],
    },
    {
      id: 3,
      name: "아산병원 응급의료센터",
      distance: "3.8km",
      phone: "02-3010-3000",
      totalBeds: 55,
      availableBeds: 15,
      doctors: ["외과", "내과", "신경외과", "흉부외과"],
    },
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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{room.distance}</span>
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
                <Button>
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
