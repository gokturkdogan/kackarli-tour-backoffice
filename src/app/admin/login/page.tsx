"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mountain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("E-posta veya şifre hatalı");
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch {
      toast.error("Giriş yapılırken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-forest-900 via-forest-800 to-forest-700 p-4 w-full overflow-x-hidden">
      <Toaster richColors position="top-right" />
      <Card className="w-full max-w-md border-forest-200/20 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-600">
            <Mountain className="h-7 w-7 text-cream" />
          </div>
          <div>
            <CardTitle className="text-2xl text-forest-900">Kaçkarlı Tur</CardTitle>
            <CardDescription>Yönetim paneline giriş yapın</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="admin@kackarlitur.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-forest-600 hover:bg-forest-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
