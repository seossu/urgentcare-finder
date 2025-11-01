import { useState, useEffect } from "react";
import { Search, MapPin, Loader2, Hospital, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmergencyRoomCard } from "./EmergencyRoomCard";
import { useToast } from "@/hooks/use-toast";
import { REGIONS, RegionKey, EmergencyRoom } from "@/types/emergency";
import { useNavigate } from "react-router-dom";

const shortenRegionName = (fullName: string): string => {
  const regionMap: Record<string, string> = {
    "서울특별시": "서울",
    "부산광역시": "부산",
    "대구광역시": "대구",
    "인천광역시": "인천",
    "광주광역시": "광주",
    "대전광역시": "대전",
    "울산광역시": "울산",
    "세종특별자치시": "세종",
    "경기도": "경기",
    "강원특별자치도": "강원",
    "충청북도": "충북",
    "충청남도": "충남",
    "전북특별자치도": "전북",
    "전라남도": "전남",
    "경상북도": "경북",
    "경상남도": "경남",
    "제주특별자치도": "제주"
  };
  return regionMap[fullName] || fullName;
};

export const EmergencySearch = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stage1, setStage1] = useState<string>("");
  const [stage2, setStage2] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [emergencyRooms, setEmergencyRooms] = useState<EmergencyRoom[]>([]);
  const [currentAddress, setCurrentAddress] = useState<string>("");
  const [currentLat, setCurrentLat] = useState<number>(0);
  const [currentLng, setCurrentLng] = useState<number>(0);

  // Get current location and set default region
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCurrentLat(lat);
          setCurrentLng(lng);
          
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
              setCurrentAddress(data.address);
            }
            
            if (data.region1) {
              // Map short names to full names
              const regionMap: Record<string, string> = {
                "서울": "서울특별시",
                "부산": "부산광역시",
                "대구": "대구광역시",
                "인천": "인천광역시",
                "광주": "광주광역시",
                "대전": "대전광역시",
                "울산": "울산광역시",
                "세종": "세종특별자치시",
                "경기": "경기도",
                "강원": "강원특별자치도",
                "충북": "충청북도",
                "충남": "충청남도",
                "전북": "전북특별자치도",
                "전남": "전라남도",
                "경북": "경상북도",
                "경남": "경상남도",
                "제주": "제주특별자치도",
              };
              
              const fullRegionName = regionMap[data.region1] || data.region1;
              setStage1(fullRegionName);
              if (data.region2) {
                setStage2(data.region2);
              }
              
              toast({
                title: "현재 위치",
                description: data.address || `${fullRegionName} ${data.region2 || ''}`,
              });
            }
          } catch (error) {
            console.error("현재 위치 조회 실패:", error);
            setStage1("서울특별시");
            toast({
              title: "위치 조회 실패",
              description: "기본 위치(서울)로 설정되었습니다.",
              variant: "destructive",
            });
          }
        },
        (error) => {
          console.error("위치 정보를 가져올 수 없습니다:", error);
          setStage1("서울특별시");
          toast({
            title: "위치 정보 없음",
            description: "기본 위치(서울)로 설정되었습니다.",
            variant: "destructive",
          });
        }
      );
    } else {
      setStage1("서울특별시");
      toast({
        title: "위치 서비스 없음",
        description: "기본 위치(서울)로 설정되었습니다.",
        variant: "destructive",
      });
    }
  }, []);

  const handleFindNearMe = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "위치 서비스 없음",
        description: "브라우저가 위치 서비스를 지원하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLat(lat);
        setCurrentLng(lng);
        
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
            setCurrentAddress(data.address);
          }
          
          if (data.region1) {
            const regionMap: Record<string, string> = {
              "서울": "서울특별시",
              "부산": "부산광역시",
              "대구": "대구광역시",
              "인천": "인천광역시",
              "광주": "광주광역시",
              "대전": "대전광역시",
              "울산": "울산광역시",
              "세종": "세종특별자치시",
              "경기": "경기도",
              "강원": "강원특별자치도",
              "충북": "충청북도",
              "충남": "충청남도",
              "전북": "전북특별자치도",
              "전남": "전라남도",
              "경북": "경상북도",
              "경남": "경상남도",
              "제주": "제주특별자치도",
            };
            
            const fullRegionName = regionMap[data.region1] || data.region1;
            const region2 = data.region2 || "";
            
            setStage1(fullRegionName);
            setStage2(region2);
            
            toast({
              title: "현재 위치 설정",
              description: data.address || `${fullRegionName} ${region2}`,
            });

            // 자동으로 검색 실행 (업데이트된 값으로 직접 검색)
            await performSearch(fullRegionName, region2);
          }
        } catch (error) {
          console.error("현재 위치 조회 실패:", error);
          toast({
            title: "위치 조회 실패",
            description: "현재 위치를 가져올 수 없습니다.",
            variant: "destructive",
          });
          setLoading(false);
        }
      },
      (error) => {
        console.error("위치 정보를 가져올 수 없습니다:", error);
        toast({
          title: "위치 정보 없음",
          description: "위치 권한을 허용해주세요.",
          variant: "destructive",
        });
        setLoading(false);
      }
    );
  };

  const performSearch = async (region1: string, region2: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-emergency-rooms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            region1,
            region2,
          }),
        }
      );

      const data = await response.json();

      if (data.response?.header?.resultCode === "00") {
        const items = data.response.body.items?.item || [];
        let roomsArray = Array.isArray(items) ? items : [items];
        
        // Filter by stage2 (district) if selected
        if (region2) {
          roomsArray = roomsArray.filter((room: EmergencyRoom) => 
            room.dutyAddr?.includes(region2)
          );
        }
        
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

  const handleSearch = async () => {
    if (!stage1) {
      toast({
        title: "지역을 선택해주세요",
        description: "시도를 선택해야 합니다.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    await performSearch(stage1, stage2);
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

      {/* Region Selection Section */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          {currentAddress && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <MapPin className="inline h-4 w-4 mr-1" />
                현재 위치: {currentAddress}
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Province/City Select */}
            <div className="lg:col-span-3">
              <Select value={stage1} onValueChange={(value) => {
                setStage1(value);
                setStage2("");
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="시/도 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(REGIONS).map((region) => (
                    <SelectItem key={region} value={region}>
                      {shortenRegionName(region)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* District Select */}
            <div className="lg:col-span-3">
              <Select 
                value={stage2 || "all"} 
                onValueChange={(value) => setStage2(value === "all" ? "" : value)}
                disabled={!stage1}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={stage1 ? "시/군/구 선택" : "시/도를 먼저 선택하세요"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {availableDistricts.map((district) => (
                    <SelectItem key={district} value={district}>
                      {district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <div className="lg:col-span-4">
              <Button 
                onClick={handleSearch} 
                disabled={loading || !stage1} 
                className="w-full" 
                size="default"
              >
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

            {/* Current Location Button */}
            <div className="lg:col-span-2">
              <Button 
                variant="outline"
                onClick={handleFindNearMe}
                disabled={loading}
                className="w-full"
                size="default"
              >
                <MapPin className="w-4 h-4 mr-2" />
                내 위치에서 찾기
              </Button>
            </div>
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
                <EmergencyRoomCard 
                  key={room.hpid || index} 
                  room={room} 
                  currentAddress={currentAddress}
                  currentLat={currentLat}
                  currentLng={currentLng}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
