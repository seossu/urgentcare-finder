import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hospital, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Implement Supabase authentication
    setTimeout(() => {
      setIsLoading(false);
      navigate("/");
    }, 1000);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Implement Supabase authentication
    setTimeout(() => {
      setIsLoading(false);
      navigate("/");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          돌아가기
        </Button>

        <Card className="p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Hospital className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">메디파인더</h1>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="signup">회원가입</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "로그인 중..." : "로그인"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">이메일</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="example@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">비밀번호</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password-confirm">비밀번호 확인</Label>
                  <Input
                    id="signup-password-confirm"
                    type="password"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "가입 중..." : "회원가입"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-sm text-muted-foreground text-center mt-6">
            회원가입 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
