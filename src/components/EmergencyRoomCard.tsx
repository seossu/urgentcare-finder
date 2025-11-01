import { Phone, MapPin, Bed, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmergencyRoom } from "@/types/emergency";

interface EmergencyRoomCardProps {
  room: EmergencyRoom;
}

export const EmergencyRoomCard = ({ room }: EmergencyRoomCardProps) => {
  const handleNavigation = () => {
    const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(room.dutyName)}`;
    window.open(naverMapUrl, "_blank");
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold mb-2">{room.dutyName}</h3>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{room.dutyAddr}</span>
          </div>
        </div>

        {(room.hvec !== undefined || room.hv1 !== undefined) && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            {room.hvec !== undefined && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Bed className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">총 병상</span>
                </div>
                <p className="text-2xl font-bold">{room.hvec}개</p>
              </div>
            )}
            {room.hv1 !== undefined && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Bed className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">남은 병상</span>
                </div>
                <p className="text-2xl font-bold text-success">{room.hv1}개</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {room.dutyTel3 && (
            <Button variant="outline" asChild>
              <a href={`tel:${room.dutyTel3}`}>
                <Phone className="h-4 w-4 mr-2" />
                전화
              </a>
            </Button>
          )}
          <Button onClick={handleNavigation}>
            <Navigation className="h-4 w-4 mr-2" />
            길찾기
          </Button>
        </div>
      </div>
    </Card>
  );
};
