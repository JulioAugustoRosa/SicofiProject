import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  frequency: string;
  date: string;
}

export default function Spreadsheet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<{ description: string; amount: string; type: "income" | "expense"; frequency: string; date: string }>({ description: "", amount: "", type: "expense", frequency: "once", date: new Date().toISOString().split("T")[0] });

  const fetchTransactions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    if (data) setTransactions(data as Transaction[]);
  };

  useEffect(() => { fetchTransactions(); }, [user]);

  const handleAdd = async () => {
    if (!user || !form.description || !form.amount) return;
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      description: form.description,
      amount: parseFloat(form.amount),
      type: form.type,
      frequency: form.frequency,
      date: form.date,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setForm({ description: "", amount: "", type: "expense", frequency: "once", date: new Date().toISOString().split("T")[0] });
      setShowAdd(false);
      fetchTransactions();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    fetchTransactions();
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Planilha Financeira</h1>
          <p className="text-sm text-muted-foreground">Todos os seus lançamentos</p>
        </div>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Receitas</p>
          <p className="text-lg font-display font-bold text-primary">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Despesas</p>
          <p className="text-lg font-display font-bold text-destructive">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Saldo</p>
          <p className={`text-lg font-display font-bold ${totalIncome - totalExpense >= 0 ? "text-primary" : "text-destructive"}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="glass-card p-5 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Descrição"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="bg-secondary/50 border-border/50"
            />
            <Input
              type="number"
              placeholder="Valor"
              value={form.amount}
              onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
              min="0"
              step="0.01"
              className="bg-secondary/50 border-border/50"
            />
            <Select value={form.type} onValueChange={(v) => setForm(prev => ({ ...prev, type: v as "income" | "expense" }))}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.frequency} onValueChange={(v) => setForm(prev => ({ ...prev, frequency: v }))}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Única</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
              className="bg-secondary/50 border-border/50"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">Salvar</Button>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-xs text-muted-foreground font-medium p-4">Data</th>
                <th className="text-left text-xs text-muted-foreground font-medium p-4">Descrição</th>
                <th className="text-left text-xs text-muted-foreground font-medium p-4">Tipo</th>
                <th className="text-left text-xs text-muted-foreground font-medium p-4">Frequência</th>
                <th className="text-right text-xs text-muted-foreground font-medium p-4">Valor</th>
                <th className="text-right text-xs text-muted-foreground font-medium p-4"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                    Nenhum lançamento ainda. Use o chat para adicionar ou clique em "Novo".
                  </td>
                </tr>
              ) : (
                transactions.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/30 hover:bg-secondary/20 transition-colors"
                  >
                    <td className="p-4 text-sm">{new Date(t.date).toLocaleDateString("pt-BR")}</td>
                    <td className="p-4 text-sm font-medium">{t.description}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        t.type === "income" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                      }`}>
                        {t.type === "income" ? "Receita" : "Despesa"}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground capitalize">
                      {{ once: "Única", monthly: "Mensal", weekly: "Semanal", yearly: "Anual" }[t.frequency] || t.frequency}
                    </td>
                    <td className={`p-4 text-sm font-medium text-right ${t.type === "income" ? "text-primary" : "text-destructive"}`}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDelete(t.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
