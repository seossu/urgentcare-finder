import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Hospital, Stethoscope, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    // Check current session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hospital className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">메디파인더</h1>
          </div>
          {user ? (
            <Button variant="outline" onClick={() => navigate("/profile")}>
              <User className="h-4 w-4 mr-2" />
              마이페이지
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate("/auth")}>
              <User className="h-4 w-4 mr-2" />
              로그인
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          가까운 응급실과 병원을
          <br />
          <span className="text-primary">빠르게 찾아보세요</span>
        </h2>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          실시간 응급실 현황과 주변 병원 정보를 한눈에 확인하고,
          <br />
          빠르게 길찾기까지 한번에
        </p>

        {/* Service Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card
            className="p-8 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary"
            onClick={() => navigate("/emergency")}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Hospital className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">응급실 찾기</h3>
            <p className="text-muted-foreground mb-4">
              실시간 병상 현황과 거리를 확인하고
              <br />
              가까운 응급실을 빠르게 찾아보세요
            </p>
            <div className="inline-flex items-center gap-2 text-primary font-semibold">
              응급실 보기 →
            </div>
          </Card>

          <Card
            className="p-8 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-secondary"
            onClick={() => navigate("/clinic")}
          >
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">동네 병원 찾기</h3>
            <p className="text-muted-foreground mb-4">
              진료과별로 필터링하고
              <br />
              현재 진료 중인 병원을 찾아보세요
            </p>
            <div className="inline-flex items-center gap-2 text-secondary font-semibold">
              병원 보기 →
            </div>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">
            메디파인더의 특징
          </h3>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Hospital className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-bold mb-2">실시간 병상 정보</h4>
              <p className="text-sm text-muted-foreground">
                응급실의 실시간 병상 현황을 확인하세요
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-6 w-6 text-secondary" />
              </div>
              <h4 className="font-bold mb-2">거리 기반 검색</h4>
              <p className="text-sm text-muted-foreground">
                가까운 병원부터 빠르게 찾아보세요
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="h-6 w-6 text-accent" />
              </div>
              <h4 className="font-bold mb-2">진료 중 병원 표시</h4>
              <p className="text-sm text-muted-foreground">
                현재 진료 중인 병원만 골라보세요
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
