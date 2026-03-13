import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowRight, Calculator, CalendarIcon } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import { calculateMonthlyTax, getTaxExplanation, type TaxResult } from "@/lib/tax-calculator";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Stats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  goalsTotal: number;
}

interface CategoryExpense {
  name: string;
  value: number;
}

const COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(200, 80%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(40, 90%, 55%)",
  "hsl(0, 72%, 51%)",
  "hsl(120, 50%, 45%)",
];

const presets = [
  { label: "Este mês", range: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Mês passado", range: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Últimos 3 meses", range: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
  { label: "Este ano", range: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalIncome: 0, totalExpense: 0, balance: 0, goalsTotal: 0 });
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryExpense[]>([]);
  const [hasData, setHasData] = useState(false);
  const [profile, setProfile] = useState<{ onboarding_completed: boolean; full_name: string } | null>(null);
  const [taxResult, setTaxResult] = useState<TaxResult | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("onboarding_completed, full_name")
        .eq("user_id", user.id)
        .single();
      setProfile(profileData);

      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      const toStr = format(dateRange.to, "yyyy-MM-dd");

      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, type, description")
        .eq("user_id", user.id)
        .gte("date", fromStr)
        .lte("date", toStr);

      if (transactions && transactions.length > 0) {
        setHasData(true);
        const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
        const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
        setStats(prev => ({ ...prev, totalIncome: income, totalExpense: expense, balance: income - expense }));
        setTaxResult(calculateMonthlyTax(income));

        const expMap: Record<string, number> = {};
        transactions.filter(t => t.type === "expense").forEach(t => {
          const key = t.description || "Outros";
          expMap[key] = (expMap[key] || 0) + Number(t.amount);
        });
        setCategoryExpenses(Object.entries(expMap).map(([name, value]) => ({ name, value })));
      } else {
        setHasData(false);
        setStats(prev => ({ ...prev, totalIncome: 0, totalExpense: 0, balance: 0 }));
        setCategoryExpenses([]);
        setTaxResult(null);
      }

      const { data: goals } = await supabase
        .from("goals")
        .select("current_amount")
        .eq("user_id", user.id);

      if (goals) {
        setStats(prev => ({ ...prev, goalsTotal: goals.reduce((s, g) => s + Number(g.current_amount), 0) }));
      }
    };

    fetchData();
  }, [user, dateRange]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const healthScore = stats.totalIncome > 0
    ? Math.max(0, Math.min(100, Math.round(((stats.totalIncome - stats.totalExpense) / stats.totalIncome) * 100)))
    : 0;

  const healthColor = healthScore >= 50 ? "text-primary" : healthScore >= 25 ? "text-warning" : "text-destructive";

  const statCards = [
    { label: "Receitas", value: stats.totalIncome, icon: TrendingUp, color: "text-primary" },
    { label: "Despesas", value: stats.totalExpense, icon: TrendingDown, color: "text-destructive" },
    { label: "Saldo", value: stats.balance, icon: Wallet, color: stats.balance >= 0 ? "text-primary" : "text-destructive" },
    { label: "Investido", value: stats.goalsTotal, icon: PiggyBank, color: "text-info" },
  ];

  const firstName = profile?.full_name?.split(" ")[0] || "Usuário";

  const dateLabel = `${format(dateRange.from, "dd MMM", { locale: ptBR })} — ${format(dateRange.to, "dd MMM yyyy", { locale: ptBR })}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">
            Olá, <span className="gradient-text">{firstName}</span> 👋
          </h1>
          <p className="text-muted-foreground mt-1">Aqui está o resumo das suas finanças</p>
        </div>

        {/* Date range picker */}
        <div className="flex items-center gap-2 flex-wrap">
          {presets.map((p) => (
            <Button
              key={p.label}
              variant="outline"
              size="sm"
              className={cn(
                "text-xs border-border/50",
                format(dateRange.from, "yyyy-MM-dd") === format(p.range().from, "yyyy-MM-dd") &&
                format(dateRange.to, "yyyy-MM-dd") === format(p.range().to, "yyyy-MM-dd")
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground"
              )}
              onClick={() => setDateRange(p.range())}
            >
              {p.label}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs border-border/50 text-muted-foreground">
                <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                {dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  } else if (range?.from) {
                    setDateRange({ from: range.from, to: range.from });
                  }
                }}
                numberOfMonths={2}
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {!hasData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-display font-semibold mb-2">Nenhum dado neste período</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Converse com nossa IA para organizar seus gastos, receitas e metas. É simples como mandar uma mensagem!
          </p>
          <button
            onClick={() => navigate("/chat")}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Iniciar conversa com a IA
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className={`text-xl font-display font-bold ${card.color}`}>
              {formatCurrency(card.value)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Tax Card */}
      {hasData && taxResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold">Imposto de Renda 2026</h3>
              <p className="text-xs text-muted-foreground">Nova lei — isenção até R$ 5.000/mês</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Renda Bruta</p>
              <p className="text-sm font-semibold">{formatCurrency(taxResult.grossIncome)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Faixa</p>
              <p className={`text-sm font-semibold ${taxResult.isExempt ? "text-primary" : "text-warning"}`}>
                {taxResult.bracket}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">IR Mensal</p>
              <p className={`text-sm font-semibold ${taxResult.isExempt ? "text-primary" : "text-destructive"}`}>
                {taxResult.isExempt ? "R$ 0,00" : formatCurrency(taxResult.netTax)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alíquota Efetiva</p>
              <p className="text-sm font-semibold">{taxResult.effectiveRate.toFixed(1)}%</p>
            </div>
          </div>
          {taxResult.reduction > 0 && (
            <div className="bg-primary/5 border border-primary/10 rounded-lg px-4 py-2 mb-3">
              <p className="text-xs text-primary">
                💡 Redutor aplicado: {formatCurrency(taxResult.reduction)} (benefício da nova lei)
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{getTaxExplanation(taxResult.grossIncome)}</p>
          {!taxResult.isExempt && (
            <div className="mt-3 text-xs text-muted-foreground">
              <p>📊 IR Anual estimado: {formatCurrency(taxResult.netTax * 12)}</p>
              <p>💰 Renda líquida mensal: {formatCurrency(taxResult.netIncome)}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Health Score */}
      {hasData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-display font-semibold mb-4">Saúde Financeira</h3>
          <div className="flex items-center gap-6">
            <div className={`text-5xl font-display font-bold ${healthColor}`}>
              {healthScore}%
            </div>
            <div className="flex-1">
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${healthScore}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, hsl(var(--destructive)), hsl(var(--warning)), hsl(var(--primary)))` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {healthScore >= 50 ? "Suas finanças estão saudáveis! 🎉" :
                 healthScore >= 25 ? "Atenção: seus gastos estão altos ⚠️" :
                 "Alerta: seus gastos excedem suas receitas 🚨"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Charts */}
      {hasData && categoryExpenses.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-display font-semibold mb-4">Despesas por Categoria</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryExpenses} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" stroke="none">
                  {categoryExpenses.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2">
              {categoryExpenses.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {c.name}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-display font-semibold mb-4">Receitas vs Despesas</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { name: "Receitas", value: stats.totalIncome },
                { name: "Despesas", value: stats.totalExpense },
              ]}>
                <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ background: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)" }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  <Cell fill="hsl(160, 84%, 39%)" />
                  <Cell fill="hsl(0, 72%, 51%)" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}
    </div>
  );
}
