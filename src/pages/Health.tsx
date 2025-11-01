import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Activity, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";

const Health = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Form data
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [menstrualCycle, setMenstrualCycle] = useState("");
  
  // Analysis result
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [bmi, setBmi] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      
      // Load existing health data
      const { data: healthData, error } = await supabase
        .from("health_info")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error loading health data:", error);
      } else if (healthData) {
        setHeight(healthData.height?.toString() || "");
        setWeight(healthData.weight?.toString() || "");
        setAge(healthData.age?.toString() || "");
        setSleepHours(healthData.sleep_hours?.toString() || "");
        if (healthData.gender === "male" || healthData.gender === "female") {
          setGender(healthData.gender);
        }
        setMenstrualCycle(healthData.menstrual_cycle?.toString() || "");
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

  const handleSaveHealthInfo = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("health_info")
        .upsert({
          user_id: user.id,
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          age: age ? parseInt(age) : null,
          sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
          gender: gender,
          menstrual_cycle: gender === "female" && menstrualCycle ? parseInt(menstrualCycle) : null,
        });

      if (error) {
        toast({
          title: "저장 실패",
          description: "건강 정보 저장 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "저장 완료",
          description: "건강 정보가 저장되었습니다.",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "건강 정보 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!height || !weight || !age || !sleepHours) {
      toast({
        title: "입력 오류",
        description: "모든 필수 정보를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setBmi(null);

    try {
      const { data, error } = await supabase.functions.invoke("health-analysis", {
        body: {
          height: parseFloat(height),
          weight: parseFloat(weight),
          age: parseInt(age),
          sleepHours: parseFloat(sleepHours),
          menstrualCycle: gender === "female" && menstrualCycle ? parseInt(menstrualCycle) : null,
          gender: gender,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
      setBmi(data.bmi);
      
      toast({
        title: "분석 완료",
        description: "AI가 건강 상태를 분석했습니다.",
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "분석 실패",
        description: error.message || "건강 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
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
              <Activity className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">나의 건강</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Health Info Form */}
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Basic Info */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">기본 정보</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="gender">성별</Label>
              <RadioGroup value={gender} onValueChange={(value: string) => {
                if (value === "male" || value === "female") {
                  setGender(value);
                }
              }}>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="font-normal cursor-pointer">남성</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="font-normal cursor-pointer">여성</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <Label htmlFor="age">나이 (세)</Label>
              <Input
                id="age"
                type="number"
                placeholder="예: 30"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="height">키 (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder="예: 170"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="weight">몸무게 (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="예: 65"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="sleep">하루 평균 수면시간 (시간)</Label>
              <Input
                id="sleep"
                type="number"
                step="0.5"
                placeholder="예: 7"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
              />
            </div>

            {gender === "female" && (
              <div>
                <Label htmlFor="menstrual">생리 주기 (일)</Label>
                <Input
                  id="menstrual"
                  type="number"
                  placeholder="예: 28"
                  value={menstrualCycle}
                  onChange={(e) => setMenstrualCycle(e.target.value)}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Save Button */}
        <Button 
          className="w-full" 
          onClick={handleSaveHealthInfo}
          disabled={isLoading}
        >
          {isLoading ? "저장 중..." : "건강 정보 저장"}
        </Button>

        {/* Analyze Button */}
        <Button 
          className="w-full" 
          variant="secondary"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              AI 분석 중...
            </>
          ) : (
            "AI 건강 상태 분석"
          )}
        </Button>

        {/* Analysis Result */}
        {analysis && (
          <Card className="p-6 bg-primary/5">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              AI 건강 분석 결과
            </h2>
            {bmi && (
              <div className="mb-4 p-3 bg-background rounded-md">
                <span className="font-semibold">BMI: </span>
                <span className="text-primary font-bold">{bmi}</span>
              </div>
            )}
            <div className="prose prose-sm max-w-none text-foreground">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Health;
