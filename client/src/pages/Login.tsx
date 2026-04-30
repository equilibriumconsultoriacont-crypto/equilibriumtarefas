import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import type { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "../../../server/routers";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const login = (trpc.auth as any).login.useMutation({
    onSuccess: () => {
      navigate("/");
    },
    onError: (err: any) => {
      setError(err.message || "Falha ao fazer login. Verifique suas credenciais.");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login.mutateAsync({ email, password });
    } catch (err) {
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "#24646c" }}
          >
            <span className="text-2xl font-bold" style={{ color: "#e5e5e5" }}>EQ</span>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#e5e5e5" }}>Equilibrium</h1>
          <p className="text-sm" style={{ color: "#a1a1aa" }}>Gestão de Tarefas Contábeis</p>
        </div>

        {/* Login Form */}
        <Card className="border" style={{ borderColor: "#1e4f5c", background: "#111" }}>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#e5e5e5" }}>
                  E-mail
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@example.com"
                  disabled={isLoading}
                  className="w-full"
                  style={{
                    background: "#0a0a0a",
                    borderColor: "#1e4f5c",
                    color: "#e5e5e5",
                  }}
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#e5e5e5" }}>
                  Senha
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full pr-10"
                    style={{
                      background: "#0a0a0a",
                      borderColor: "#1e4f5c",
                      color: "#e5e5e5",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:opacity-70 transition-opacity"
                    style={{ color: "#a1a1aa" }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg"
                  style={{ background: "rgba(214,40,40,0.1)", borderColor: "#d62828" }}
                >
                  <AlertCircle size={16} style={{ color: "#d62828" }} />
                  <span className="text-sm" style={{ color: "#d62828" }}>
                    {error}
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full font-medium"
                style={{
                  background: isLoading || !email || !password ? "#1e4f5c" : "#24646c",
                  color: "#fff",
                }}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: "#52525b" }}>
          Sistema de gestão de tarefas contábeis © 2026 Equilibrium
        </p>
      </div>
    </div>
  );
}
