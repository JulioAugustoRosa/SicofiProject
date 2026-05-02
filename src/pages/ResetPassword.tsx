import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { evaluatePassword } from "@/lib/password-validation";

/**
 * Página de redefinição de senha.
 *
 * O Supabase, ao chamar `resetPasswordForEmail`, envia um link que volta para
 * esta rota com um token na URL. O cliente do Supabase (no client.ts) detecta
 * o token automaticamente e dispara o evento `PASSWORD_RECOVERY`. Aqui só
 * precisamos disponibilizar o formulário de nova senha.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    // Aguarda o Supabase processar o token contido no link recebido por email.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setRecoveryReady(true);
      }
    });

    // Se o usuário já tem sessão (porque o token foi processado antes da
    // gente registrar o listener), também deixamos o formulário acessível.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setRecoveryReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const evaluation = evaluatePassword(password);
    if (!evaluation.isValid) {
      toast({
        title: "Senha fraca",
        description: "Atenda a todos os requisitos de senha forte.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "Confirme corretamente a nova senha.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);

    if (error) {
      toast({ title: "Erro ao redefinir senha", description: error, variant: "destructive" });
      return;
    }

    toast({
      title: "Senha redefinida!",
      description: "Use sua nova senha para acessar a conta.",
    });
    // Garante que sessões antigas são encerradas e o usuário entra de novo.
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-primary/5 via-background to-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao login
        </Link>

        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-semibold">Redefinir senha</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            Defina uma nova senha forte para sua conta SICOFI.
          </p>

          {!recoveryReady ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Este link expirou ou ainda não foi validado.</p>
              <p>
                Se você acabou de chegar pelo email de recuperação, aguarde alguns segundos.
                Caso o problema persista, solicite um novo link na tela de login.
              </p>
              <Button
                onClick={() => navigate("/auth")}
                variant="outline"
                className="w-full mt-4"
              >
                Solicitar novo link
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Nova senha</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite a nova senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="bg-secondary/50 border-border/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrengthIndicator password={password} />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Confirmar nova senha</label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-secondary/50 border-border/50"
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-destructive">As senhas não coincidem.</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                disabled={submitting}
              >
                {submitting ? "Salvando..." : "Salvar nova senha"}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
