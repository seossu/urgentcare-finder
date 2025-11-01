import { useState } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmergencyRoomCard } from "./EmergencyRoomCard";
import { useToast } from "@/hooks/use-toast";
import { REGIONS, RegionKey, EmergencyRoom } from "@/types/emergency";
import { supabase } from "@/integrations/supabase/client";

export const EmergencySearch = () => {
  const { toast } = useToast();
  const [stage1, setStage1] = useState<string>("서울특별시");
  const [stage2, setStage2] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [emergencyRooms, setEmergencyRooms] = useState<EmergencyRoom[]>([]);

  const handleSearch = async () => {
    if (!stage1 || !stage2) {
      toast({
        title: "지역을 선택해주세요",
        description: "시도와 시군구를 모두 선택해야 합니다.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-emergency-rooms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            region1: stage1,
            region2: stage2,
          }),
        }
      );

      const data = await response.json();

      if (data.response?.header?.resultCode === "00") {
        const items = data.response.body.items?.item || [];
        const roomsArray = Array.isArray(items) ? items : [items];
        setEmergencyRooms(roomsArray);

        if (roomsArray.length === 0) {
          toast({
            title: "검색 결과 없음",
            description: "해당 지역에 응급실 정보가 없습니다.",
          });
        } else {
          toast({
            title: "검색 완료",
            description: `${roomsArray.length}개의 응급실을 찾았습니다.`,
          });
        }
      } else {
        throw new Error(data.response?.header?.resultMsg || "검색 실패");
      }
    } catch (error) {
      console.error("Error fetching emergency rooms:", error);
      toast({
        title: "검색 실패",
        description: "응급실 정보를 가져오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedRegion = stage1 as RegionKey;
  const availableDistricts = selectedRegion ? REGIONS[selectedRegion] : [];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-6">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-destructive mb-4">
          <MapPin className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-destructive bg-clip-text text-transparent">
          응급실 찾기
        </h1>
        <p className="text-muted-foreground text-lg">가까운 응급실을 빠르게 찾아보세요</p>
      </div>

      <div className="bg-card rounded-xl shadow-lg p-6 border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            value={stage1}
            onValueChange={(value) => {
              setStage1(value);
              setStage2("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="시도 선택" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(REGIONS).map((region) => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stage2} onValueChange={setStage2} disabled={!stage1}>
            <SelectTrigger>
              <SelectValue placeholder="시군구 선택" />
            </SelectTrigger>
            <SelectContent>
              {availableDistricts.map((district) => (
                <SelectItem key={district} value={district}>
                  {district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleSearch} disabled={loading || !stage1 || !stage2} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                검색 중...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                검색
              </>
            )}
          </Button>
        </div>
      </div>

      {emergencyRooms.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-primary to-destructive rounded-full" />
            검색 결과 ({emergencyRooms.length}개)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergencyRooms.map((room, index) => (
              <div
                key={room.hpid || index}
                className="animate-in fade-in-50 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <EmergencyRoomCard room={room} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
