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

        {room.realtimeBeds && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Bed className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">응급실 총 병상</span>
                </div>
                <p className="text-2xl font-bold">{room.realtimeBeds.totalBeds}개</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Bed className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">가용 병상</span>
                </div>
                <p className="text-2xl font-bold text-success">{room.realtimeBeds.erAvailable}개</p>
              </div>
            </div>
            {room.realtimeBeds.erStatus && (
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <span className="text-sm font-medium">응급실 상태</span>
                <span className="text-sm font-bold">{room.realtimeBeds.erStatus}</span>
              </div>
            )}
            {room.realtimeBeds.lastUpdated && (
              <p className="text-xs text-muted-foreground text-right">
                최종 업데이트: {room.realtimeBeds.lastUpdated}
              </p>
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
