import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Shield,
  MessageSquare,
  BarChart3,
  Target,
  ArrowRight,
  Sparkles,
  Zap,
  PieChart,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: MessageSquare,
    title: "Chat Financeiro com IA",
    description:
      "Converse naturalmente sobre suas finanças. A IA organiza tudo automaticamente.",
  },
  {
    icon: BarChart3,
    title: "Planilha Inteligente",
    description:
      "Planilhas geradas automaticamente com cálculos, categorias e indicadores.",
  },
  {
    icon: PieChart,
    title: "Dashboard Visual",
    description:
      "Gráficos interativos de gastos, receitas e saúde financeira em tempo real.",
  },
  {
    icon: Target,
    title: "Metas & Objetivos",
    description:
      "Defina metas financeiras e acompanhe seu progresso com projeções inteligentes.",
  },
  {
    icon: Shield,
    title: "IR 2026 Integrado",
    description:
      "Cálculo automático do Imposto de Renda com a nova lei de isenção até R$ 5.000.",
  },
  {
    icon: Zap,
    title: "Totalmente Automático",
    description:
      "Gastos fixos, dívidas e investimentos são calculados e atualizados sozinhos.",
  },
];

const stats = [
  { value: "100%", label: "Gratuito" },
  { value: "IA", label: "Integrada" },
  { value: "24/7", label: "Disponível" },
  { value: "🇧🇷", label: "Brasileiro" },
];

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-display font-bold gradient-text">
              SICOFI
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Entrar
              </Button>
            </Link>
            <Link to="/auth?signup=true">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                Criar conta
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-info/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Powered by Inteligência Artificial
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
              Suas finanças no
              <br />
              <span className="gradient-text">piloto automático</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Converse naturalmente com a IA e transforme suas finanças em
              planilhas inteligentes, dashboards visuais e planejamento
              personalizado. Tudo em português, 100% gratuito.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?signup=true">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg px-8 py-6 rounded-xl glow"
                >
                  Começar agora — é grátis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border/50 text-foreground hover:bg-secondary/50 text-lg px-8 py-6 rounded-xl"
                >
                  Ver funcionalidades
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-3xl mx-auto"
          >
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-display font-bold text-foreground">
                  {s.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-border/20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Como funciona?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Três passos simples para organizar toda sua vida financeira
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Converse",
                desc: 'Diga coisas como "Gastei 200 no mercado" ou "Meu salário é 4.500".',
              },
              {
                step: "02",
                title: "A IA organiza",
                desc: "Categoriza automaticamente, calcula saldos e gera sua planilha financeira.",
              },
              {
                step: "03",
                title: "Acompanhe",
                desc: "Dashboard visual, gráficos, metas e alertas — tudo atualizado em tempo real.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass-card p-8 text-center group hover:border-primary/30 transition-colors"
              >
                <div className="text-5xl font-display font-bold text-primary/20 group-hover:text-primary/40 transition-colors mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 border-t border-border/20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Funcionalidades pensadas para o brasileiro organizar suas finanças
              com facilidade
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-6 group hover:border-primary/30 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-border/20">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Pronto para organizar suas finanças?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Crie sua conta em segundos e comece a conversar com a IA sobre
              seus gastos, receitas e metas.
            </p>
            <Link to="/auth?signup=true">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg px-10 py-6 rounded-xl glow"
              >
                Criar conta gratuita
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="font-display font-bold gradient-text">SICOFI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SICOFI — Sistema Inteligente de
            Controle Financeiro. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
