import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, MapPin, Pill, Activity, UserPlus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();

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
              <User className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">마이페이지</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* User Info */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            내 정보
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                defaultValue="user@example.com"
                disabled
              />
            </div>
          </div>
        </Card>

        {/* Address */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-secondary" />
            주거 지역
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">주소</Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  placeholder="주소를 입력하세요"
                  defaultValue="서울시 종로구"
                />
                <Button variant="secondary">주소 검색</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Medical Conditions */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            기저질환
          </h2>
          <div className="space-y-4">
            <Textarea
              placeholder="예: 당뇨, 고혈압"
              rows={3}
            />
            <Button variant="outline" size="sm">
              저장
            </Button>
          </div>
        </Card>

        {/* Medications */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Pill className="h-5 w-5 text-secondary" />
            복용 중인 약
          </h2>
          <div className="space-y-4">
            <Textarea
              placeholder="예: 아스피린, 메트포르민"
              rows={3}
            />
            <Button variant="outline" size="sm">
              저장
            </Button>
          </div>
        </Card>

        {/* Family Members */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-accent" />
              가족 구성원
            </h2>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              가족 추가
            </Button>
          </div>
          <div className="space-y-4">
            <Card className="p-4 bg-muted">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">김철수</h3>
                <span className="text-sm text-muted-foreground">아버지</span>
              </div>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">기저질환:</span> 고혈압</p>
                <p><span className="font-medium">복용약:</span> 혈압약</p>
              </div>
            </Card>
          </div>
        </Card>

        {/* Logout */}
        <div className="pt-4">
          <Button variant="destructive" className="w-full">
            로그아웃
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
