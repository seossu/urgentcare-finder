import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, LogOut, User, Activity, Pill, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Profile data
  const [medicalConditions, setMedicalConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      
      // Load profile data
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile:", error);
        toast({
          title: "프로필 로딩 오류",
          description: "프로필 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } else if (profile) {
        setMedicalConditions(profile.medical_conditions || "");
        setMedications(profile.medications || "");
        setFamilyHistory(profile.family_history || "");
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSaveMedicalInfo = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          medical_conditions: medicalConditions,
          medications: medications,
          family_history: familyHistory,
        });

      if (error) {
        toast({
          title: "저장 실패",
          description: "정보 저장 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "저장 완료",
          description: "의료 정보가 저장되었습니다.",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "정보 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

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

      {/* Profile Content */}
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* User Information */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            기본 정보
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
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
              placeholder="기저질환 정보를 입력하세요 (예: 당뇨병, 고혈압 등)"
              className="min-h-[100px]"
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
            />
          </div>
        </Card>

        {/* Medications */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Pill className="h-5 w-5 text-secondary" />
            복용중인 약
          </h2>
          <div className="space-y-4">
            <Textarea
              placeholder="현재 복용중인 약 정보를 입력하세요"
              className="min-h-[100px]"
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
            />
          </div>
        </Card>

        {/* Family History */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            가족력
          </h2>
          <div className="space-y-4">
            <Textarea
              placeholder="가족력 정보를 입력하세요 (예: 가족 중 특정 질병 병력 등)"
              className="min-h-[100px]"
              value={familyHistory}
              onChange={(e) => setFamilyHistory(e.target.value)}
            />
          </div>
        </Card>

        {/* Save Button */}
        <Button 
          className="w-full" 
          onClick={handleSaveMedicalInfo}
          disabled={isLoading}
        >
          {isLoading ? "저장 중..." : "의료 정보 저장"}
        </Button>

        {/* Logout Button */}
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          로그아웃
        </Button>
      </div>
    </div>
  );
};

export default Profile;
