import { useState } from "react";
import { Search, MapPin, Loader2, Hospital, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmergencyRoomCard } from "./EmergencyRoomCard";
import { useToast } from "@/hooks/use-toast";
import { REGIONS, RegionKey, EmergencyRoom } from "@/types/emergency";
import { useNavigate } from "react-router-dom";

export const EmergencySearch = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
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

      {/* Search Section */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
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
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-6">
        {emergencyRooms.length > 0 && (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                총 <span className="font-semibold text-foreground">{emergencyRooms.length}개</span>의 응급실이 있습니다
              </p>
            </div>
            <div className="space-y-4">
              {emergencyRooms.map((room, index) => (
                <EmergencyRoomCard key={room.hpid || index} room={room} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
