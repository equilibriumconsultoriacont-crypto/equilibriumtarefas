import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff, KeyRound, PlusCircle, Smartphone, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ClientLoginsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ clientId: "", email: "", password: "" });

  const { data: clients = [] } = trpc.clients.list.useQuery({ includeInactive: false });
  const { data: logins = [], refetch } = trpc.clientAccess.listLogins.useQuery();
  const createMutation = trpc.clientAccess.createLogin.useMutation();

  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createMutation.mutateAsync({
        clientId: Number(form.clientId),
        email: form.email,
        password: form.password,
      });
      toast.success(result.action === "created" ? "Acesso criado com sucesso!" : "Senha atualizada com sucesso!");
      setDialogOpen(false);
      setForm({ clientId: "", email: "", password: "" });
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar acesso");
    }
  };

  // Find client for each login
  const loginsWithClient = logins.map((l) => ({
    ...l,
    client: l.clientId ? clientMap.get(l.clientId) : undefined,
  }));

  return (
    <AppLayout>
      <div className="max-w-3xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#e5e5e5" }}>Acessos do Portal</h1>
            <p className="text-sm mt-0.5" style={{ color: "#a1a1aa" }}>
              Gerencie os logins dos clientes para o portal mobile
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2" style={{ background: "#24646c", color: "#fff" }}>
            <PlusCircle size={15} /> Criar Acesso
          </Button>
        </div>

        {/* Info */}
        <div
          className="p-4 rounded-xl flex gap-3 items-start text-sm"
          style={{ background: "rgba(36,100,108,0.08)", border: "1px solid rgba(36,100,108,0.2)", color: "#9fd4dc" }}
        >
          <Smartphone size={15} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium mb-1">Como funciona o portal do cliente</p>
            <ul className="space-y-0.5 text-xs" style={{ color: "#a1a1aa" }}>
              <li>• O cliente acessa o sistema pelo mesmo endereço, mas com o login criado aqui</li>
              <li>• Após logar, ele vê apenas as próprias guias em um calendário mobile</li>
              <li>• Pode clicar em cada vencimento e baixar o documento diretamente</li>
              <li>• Não tem acesso ao painel administrativo — é uma interface separada</li>
            </ul>
          </div>
        </div>

        {/* Logins list */}
        {loginsWithClient.length === 0 ? (
          <div className="text-center py-16 rounded-xl border" style={{ borderColor: "#1e4f5c", background: "#111" }}>
            <KeyRound size={36} className="mx-auto mb-3" style={{ color: "#52525b" }} />
            <p className="text-sm font-medium" style={{ color: "#a1a1aa" }}>Nenhum acesso criado ainda</p>
            <p className="text-xs mt-1 mb-4" style={{ color: "#52525b" }}>
              Crie um login para cada cliente que vai acessar o portal
            </p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2 text-sm" style={{ background: "#24646c", color: "#fff" }}>
              <PlusCircle size={13} /> Criar primeiro acesso
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#1e4f5c", background: "#111" }}>
            <div className="px-4 py-3 text-xs font-medium" style={{ color: "#a1a1aa", borderBottom: "1px solid #1e4f5c", background: "rgba(0,0,0,0.2)" }}>
              {loginsWithClient.length} acesso{loginsWithClient.length !== 1 ? "s" : ""} criado{loginsWithClient.length !== 1 ? "s" : ""}
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(30,79,92,0.4)" }}>
              {loginsWithClient.map((login) => (
                <div key={login.id} className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "rgba(36,100,108,0.2)", color: "#9fd4dc" }}
                    >
                      {login.client?.name?.charAt(0).toUpperCase() ?? <User size={14} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#e5e5e5" }}>
                        {login.client?.name ?? `Cliente #${login.clientId}`}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#a1a1aa" }}>{login.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                      style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}
                    >
                      Ativo
                    </span>
                    <p className="text-xs mt-1" style={{ color: "#52525b" }}>
                      Último acesso: {new Date(login.lastSignedIn).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ background: "#111", borderColor: "#1e4f5c", color: "#e5e5e5" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#e5e5e5" }}>Criar Acesso ao Portal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label style={{ color: "#a1a1aa" }}>Cliente *</Label>
              <select
                value={form.clientId}
                onChange={(e) => {
                  const client = clients.find((c) => c.id === Number(e.target.value));
                  setForm({ ...form, clientId: e.target.value, email: client?.email ?? form.email });
                }}
                required
                className="w-full rounded-md px-3 py-2 text-sm"
                style={{ background: "#0d1f22", borderColor: "#1e4f5c", color: "#e5e5e5", border: "1px solid #1e4f5c", outline: "none" }}
              >
                <option value="">Selecione o cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label style={{ color: "#a1a1aa" }}>E-mail de acesso *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@cliente.com"
                required
                style={{ background: "#0d1f22", borderColor: "#1e4f5c", color: "#e5e5e5" }}
              />
              <p className="text-xs" style={{ color: "#52525b" }}>
                Pode ser o mesmo e-mail do cadastro do cliente
              </p>
            </div>

            <div className="space-y-1.5">
              <Label style={{ color: "#a1a1aa" }}>Senha *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="pr-10"
                  style={{ background: "#0d1f22", borderColor: "#1e4f5c", color: "#e5e5e5" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#52525b" }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div
              className="p-3 rounded-lg text-xs"
              style={{ background: "rgba(250,204,21,0.05)", border: "1px solid rgba(250,204,21,0.15)", color: "#a1a1aa" }}
            >
              💡 Se já existe um acesso para este e-mail, a senha será atualizada.
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1" style={{ borderColor: "#1e4f5c", color: "#a1a1aa" }}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
                style={{ background: "#24646c", color: "#fff" }}
              >
                {createMutation.isPending ? "Criando..." : "Criar Acesso"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
