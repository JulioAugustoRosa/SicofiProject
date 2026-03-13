import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Plus, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  deadline: string | null;
}

export default function Goals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", target_amount: "", monthly_contribution: "", deadline: "" });

  const fetchGoals = async () => {
    if (!user) return;
    const { data } = await supabase.from("goals").select("*").eq("user_id", user.id).order("created_at");
    if (data) setGoals(data as Goal[]);
  };

  useEffect(() => { fetchGoals(); }, [user]);

  const handleAdd = async () => {
    if (!user || !form.name || !form.target_amount) return;
    const { error } = await supabase.from("goals").insert({
      user_id: user.id,
      name: form.name,
      target_amount: parseFloat(form.target_amount),
      monthly_contribution: form.monthly_contribution ? parseFloat(form.monthly_contribution) : 0,
      deadline: form.deadline || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setForm({ name: "", target_amount: "", monthly_contribution: "", deadline: "" });
      setShowAdd(false);
      fetchGoals();
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Metas Financeiras</h1>
          <p className="text-sm text-muted-foreground">Acompanhe seu progresso</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass-card p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Nome da meta" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="bg-secondary/50 border-border/50" />
            <Input type="number" placeholder="Valor alvo (R$)" value={form.target_amount} onChange={(e) => setForm(p => ({ ...p, target_amount: e.target.value }))} min="0" className="bg-secondary/50 border-border/50" />
            <Input type="number" placeholder="Contribuição mensal (R$)" value={form.monthly_contribution} onChange={(e) => setForm(p => ({ ...p, monthly_contribution: e.target.value }))} min="0" className="bg-secondary/50 border-border/50" />
            <Input type="date" placeholder="Prazo" value={form.deadline} onChange={(e) => setForm(p => ({ ...p, deadline: e.target.value }))} className="bg-secondary/50 border-border/50" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">Salvar</Button>
          </div>
        </motion.div>
      )}

      {goals.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Target className="w-12 h-12 text-primary/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma meta cadastrada. Crie uma meta ou converse com a IA!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {goals.map((goal, i) => {
            const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold">{goal.name}</h3>
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{formatCurrency(goal.current_amount)}</span>
                    <span className="text-foreground font-medium">{formatCurrency(goal.target_amount)}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress, 100)}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progress.toFixed(0)}% concluído</span>
                    {goal.monthly_contribution > 0 && <span>{formatCurrency(goal.monthly_contribution)}/mês</span>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
