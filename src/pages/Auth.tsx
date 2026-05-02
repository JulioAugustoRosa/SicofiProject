import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Shield, ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { evaluatePassword } from "@/lib/password-validation";

type Mode = "login" | "signup" | "forgot";

export default function Auth() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(searchParams.get("signup") ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { signIn, signUp, requestPasswordReset } = useAuth();
  const { toast } = useToast();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) toast({ title: "Erro", description: error, variant: "destructive" });
      } else if (mode === "signup") {
        // Bloqueia cadastro se a senha não atender aos requisitos.
        const evaluation = evaluatePassword(password);
        if (!evaluation.isValid) {
          toast({
            title: "Senha fraca",
            description: "Atenda a todos os requisitos de senha forte antes de criar a conta.",
            variant: "destructive",
          });
          return;
        }
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({ title: "Erro", description: error, variant: "destructive" });
        } else {
          toast({ title: "Conta criada!", description: "Verifique seu email para confirmar o cadastro." });
        }
      } else if (mode === "forgot") {
        const { error } = await requestPasswordReset(email);
        if (error) {
          toast({ title: "Erro", description: error, variant: "destructive" });
        } else {
          setForgotSent(true);
          toast({
            title: "Email enviado",
            description: "Enviamos um link de recuperação para o seu email.",
          });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    { icon: DollarSign, label: "Controle total das finanças" },
    { icon: TrendingUp, label: "Assistente que organiza seus gastos" },
    { icon: Shield, label: "Seguro e personalizado" },
  ];

  const headings: Record<Mode, { title: string; subtitle: string; cta: string }> = {
    login: { title: "Entrar", subtitle: "Acesse sua conta financeira", cta: "Entrar" },
    signup: { title: "Criar conta", subtitle: "Comece a organizar suas finanças", cta: "Criar conta" },
    forgot: {
      title: "Recuperar senha",
      subtitle: "Informe seu email e enviaremos um link para redefinir sua senha.",
      cta: "Enviar link de recuperação",
    },
  };
  const heading = headings[mode];

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <h1 className="text-5xl font-display font-bold mb-3">
            <span className="gradient-text">SICOFI</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10">
            Sistema Inteligente de Controle Financeiro
          </p>

          <div className="space-y-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.15 }}
                className="flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-foreground/80 text-lg">{f.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>

          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-display font-bold gradient-text">SICOFI</h1>
            <p className="text-muted-foreground text-sm mt-1">Controle Financeiro Inteligente</p>
          </div>

          <div className="glass-card p-8">
            <h2 className="text-2xl font-display font-semibold mb-1">{heading.title}</h2>
            <p className="text-muted-foreground text-sm mb-6">{heading.subtitle}</p>

            {mode === "forgot" && forgotSent ? (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm">
                  <p className="font-medium text-primary mb-1">Pronto! ✉️</p>
                  <p className="text-muted-foreground">
                    Se houver uma conta com <span className="font-medium text-foreground">{email}</span>,
                    você receberá em instantes um link para redefinir sua senha.
                    Confira também a caixa de spam.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setForgotSent(false);
                    setMode("login");
                    setEmail("");
                  }}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  Voltar para o login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <Input
                    placeholder="Nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="bg-secondary/50 border-border/50"
                  />
                )}
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-secondary/50 border-border/50"
                />
                {mode !== "forgot" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={mode === "signup" ? 8 : 6}
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
                    {mode === "signup" && <PasswordStrengthIndicator password={password} />}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                  disabled={submitting}
                >
                  {submitting ? "Carregando..." : heading.cta}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="block w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </form>
            )}

            <p className="text-center text-sm text-muted-foreground mt-6">
              {mode === "login" && (
                <>
                  Não tem conta?{" "}
                  <button onClick={() => setMode("signup")} className="text-primary hover:underline font-medium">
                    Criar conta
                  </button>
                </>
              )}
              {mode === "signup" && (
                <>
                  Já tem conta?{" "}
                  <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
                    Entrar
                  </button>
                </>
              )}
              {mode === "forgot" && !forgotSent && (
                <>
                  Lembrou da senha?{" "}
                  <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
                    Voltar ao login
                  </button>
                </>
              )}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
