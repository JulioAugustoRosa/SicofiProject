import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { evaluatePassword } from "@/lib/password-validation";

export default function Account() {
  const { user, updatePassword } = useAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !user?.email) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A confirmação precisa ser igual à nova senha.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword === currentPassword) {
      toast({
        title: "Senha repetida",
        description: "A nova senha precisa ser diferente da atual.",
        variant: "destructive",
      });
      return;
    }
    const evaluation = evaluatePassword(newPassword);
    if (!evaluation.isValid) {
      toast({
        title: "Senha fraca",
        description: "Atenda a todos os requisitos de senha forte.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Reautentica para confirmar que quem está alterando realmente conhece
      // a senha atual — mesmo que já exista uma sessão ativa.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) {
        toast({
          title: "Senha atual incorreta",
          description: "Confira sua senha atual e tente novamente.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await updatePassword(newPassword);
      if (error) {
        toast({ title: "Erro ao alterar senha", description: error, variant: "destructive" });
        return;
      }

      reset();
      toast({
        title: "Senha alterada!",
        description: "Sua nova senha já está ativa.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Minha Conta</h1>
        <p className="text-sm text-muted-foreground">Gerencie suas informações de acesso e segurança</p>
      </div>

      {/* Informações da conta */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-display font-semibold">Dados da conta</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Nome</p>
            <p className="text-sm font-medium">
              {(user?.user_metadata as { full_name?: string })?.full_name || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email
            </p>
            <p className="text-sm font-medium break-all">{user?.email}</p>
          </div>
        </div>
      </motion.div>

      {/* Trocar senha */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-display font-semibold">Alterar senha</h2>
            <p className="text-xs text-muted-foreground">
              Use uma senha forte e única que você não utilize em outros sites.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Senha atual</label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Digite sua senha atual"
                className="bg-secondary/50 border-border/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showCurrent ? "Ocultar senha atual" : "Mostrar senha atual"}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Nova senha</label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Digite a nova senha"
                className="bg-secondary/50 border-border/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showNew ? "Ocultar nova senha" : "Mostrar nova senha"}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrengthIndicator password={newPassword} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Confirmar nova senha</label>
            <Input
              type={showNew ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Repita a nova senha"
              className="bg-secondary/50 border-border/50"
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-destructive">As senhas não coincidem.</p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              disabled={submitting}
            >
              Limpar
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={submitting}
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              {submitting ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
