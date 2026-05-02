import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Pencil, Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  deadline: string | null;
}

interface GoalForm {
  name: string;
  target_amount: string;
  current_amount: string;
  monthly_contribution: string;
  deadline: string;
}

const emptyForm = (): GoalForm => ({
  name: "",
  target_amount: "",
  current_amount: "",
  monthly_contribution: "",
  deadline: "",
});

export default function Goals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<GoalForm>(emptyForm());

  // Edição manual
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<GoalForm>(emptyForm());

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
      current_amount: form.current_amount ? parseFloat(form.current_amount) : 0,
      monthly_contribution: form.monthly_contribution ? parseFloat(form.monthly_contribution) : 0,
      deadline: form.deadline || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setForm(emptyForm());
      setShowAdd(false);
      fetchGoals();
      toast({ title: "Meta criada", description: "Sua nova meta foi adicionada com sucesso." });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Meta excluída", description: "A meta foi removida." });
      fetchGoals();
    }
  };

  // ---- Edição manual ----
  const openEdit = (g: Goal) => {
    setEditingId(g.id);
    setEditForm({
      name: g.name,
      target_amount: String(g.target_amount),
      current_amount: String(g.current_amount),
      monthly_contribution: String(g.monthly_contribution),
      deadline: g.deadline ?? "",
    });
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm());
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name || !editForm.target_amount) return;
    const { error } = await supabase
      .from("goals")
      .update({
        name: editForm.name,
        target_amount: parseFloat(editForm.target_amount),
        current_amount: editForm.current_amount ? parseFloat(editForm.current_amount) : 0,
        monthly_contribution: editForm.monthly_contribution ? parseFloat(editForm.monthly_contribution) : 0,
        deadline: editForm.deadline || null,
      })
      .eq("id", editingId);

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Meta atualizada", description: "As alterações foram salvas." });
      closeEdit();
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
            <Input type="number" placeholder="Valor já guardado (R$)" value={form.current_amount} onChange={(e) => setForm(p => ({ ...p, current_amount: e.target.value }))} min="0" className="bg-secondary/50 border-border/50" />
            <Input type="number" placeholder="Contribuição mensal (R$)" value={form.monthly_contribution} onChange={(e) => setForm(p => ({ ...p, monthly_contribution: e.target.value }))} min="0" className="bg-secondary/50 border-border/50" />
            <Input type="date" placeholder="Prazo" value={form.deadline} onChange={(e) => setForm(p => ({ ...p, deadline: e.target.value }))} className="bg-secondary/50 border-border/50 md:col-span-2" />
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
          <p className="text-muted-foreground">Nenhuma meta cadastrada. Crie uma meta ou converse com o assistente!</p>
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
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold">{goal.name}</h3>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(goal)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Editar meta"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir meta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
                  {goal.deadline && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Prazo: {new Date(`${goal.deadline}T00:00:00`).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Diálogo de edição manual de meta */}
      <Dialog open={editingId !== null} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className="glass-card border-border/50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Editar meta</DialogTitle>
            <DialogDescription>
              Atualize os valores da meta. Os campos em branco mantêm o valor atual.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Nome da meta</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Valor alvo (R$)</label>
              <Input
                type="number"
                value={editForm.target_amount}
                onChange={(e) => setEditForm((prev) => ({ ...prev, target_amount: e.target.value }))}
                min="0"
                step="0.01"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Valor já guardado (R$)</label>
              <Input
                type="number"
                value={editForm.current_amount}
                onChange={(e) => setEditForm((prev) => ({ ...prev, current_amount: e.target.value }))}
                min="0"
                step="0.01"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Contribuição mensal (R$)</label>
              <Input
                type="number"
                value={editForm.monthly_contribution}
                onChange={(e) => setEditForm((prev) => ({ ...prev, monthly_contribution: e.target.value }))}
                min="0"
                step="0.01"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Prazo</label>
              <Input
                type="date"
                value={editForm.deadline}
                onChange={(e) => setEditForm((prev) => ({ ...prev, deadline: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeEdit}>Cancelar</Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
