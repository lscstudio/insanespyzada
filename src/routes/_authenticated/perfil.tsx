import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Upload, Trash2, Mail, Lock, User as UserIcon, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useUpdateProfile, useUploadAvatar } from "@/hooks/use-profile";
import { deleteMyAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil · InsaneSpy" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const { data, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAcc = useServerFn(deleteMyAccount);
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // hydrate state once data arrives
  if (data && name === "" && data.profile?.display_name) {
    setName(data.profile.display_name);
  }
  if (data && email === "" && data.email) {
    setEmail(data.email);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    try {
      await uploadAvatar.mutateAsync(file);
      toast.success("Foto atualizada");
    } catch (err) {
      toast.error("Erro ao enviar foto", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      e.target.value = "";
    }
  }

  async function handleSaveName() {
    setSavingName(true);
    try {
      await updateProfile.mutateAsync({ display_name: name.trim() || null });
      toast.success("Nome atualizado");
    } catch (err) {
      toast.error("Erro ao salvar nome", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingName(false);
    }
  }

  async function handleSaveEmail() {
    if (!email || email === data?.email) return;
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      toast.success("Verifique seu e-mail", {
        description: "Enviamos um link de confirmação para o novo endereço.",
      });
    } catch (err) {
      toast.error("Erro ao atualizar e-mail", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleSavePassword() {
    if (password.length < 6) {
      toast.error("Senha precisa ter ao menos 6 caracteres");
      return;
    }
    if (password !== password2) {
      toast.error("Senhas não coincidem");
      return;
    }
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setPassword2("");
      toast.success("Senha alterada");
    } catch (err) {
      toast.error("Erro ao alterar senha", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingPwd(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAcc();
      await supabase.auth.signOut();
      toast.success("Conta excluída");
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error("Erro ao excluir conta", {
        description: err instanceof Error ? err.message : undefined,
      });
      setDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const initials = (name || data?.email || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-3xl space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">Gerencie sua conta e preferências.</p>
      </div>

      {/* Avatar + nome */}
      <Card className="p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="relative">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 border-primary/40 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent text-2xl font-semibold text-foreground shadow-lg ring-4 ring-background">
              {data?.avatarUrl ? (
                <img src={data.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploadAvatar.isPending}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-border bg-background shadow-md transition hover:bg-accent"
              aria-label="Trocar foto"
            >
              {uploadAvatar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <Label htmlFor="name" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" /> Nome de exibição
              </Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como devemos te chamar?"
                />
                <Button onClick={handleSaveName} disabled={savingName}>
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Email */}
      <Card className="space-y-3 p-6">
        <Label htmlFor="email" className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" /> E-mail
        </Label>
        <div className="flex gap-2">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            onClick={handleSaveEmail}
            disabled={savingEmail || email === data?.email}
            variant="secondary"
          >
            {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Você receberá um e-mail de confirmação no novo endereço.
        </p>
      </Card>

      {/* Senha */}
      <Card className="space-y-3 p-6">
        <Label className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" /> Alterar senha
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="password"
            placeholder="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirmar nova senha"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </div>
        <Button onClick={handleSavePassword} disabled={savingPwd} variant="secondary">
          {savingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : "Alterar senha"}
        </Button>
      </Card>

      {/* Zona perigosa */}
      <Card className="space-y-3 border-destructive/40 bg-destructive/5 p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <h2 className="font-semibold">Zona perigosa</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Excluir sua conta remove permanentemente todas as suas bibliotecas, snapshots,
          criativos e sua foto. Esta ação não pode ser desfeita.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleting}>
              <Trash2 className="h-4 w-4" />
              Excluir minha conta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é irreversível. Todos os seus dados serão apagados imediatamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </motion.div>
  );
}
