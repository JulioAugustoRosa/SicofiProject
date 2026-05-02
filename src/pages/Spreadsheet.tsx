import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { downloadTransactionsCsv, filterTransactionsByDateRange } from "@/lib/export-utils";
import { toLocalISODate } from "@/lib/utils";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  frequency: string;
  date: string;
}

interface TransactionForm {
  description: string;
  amount: string;
  type: "income" | "expense";
  frequency: string;
  date: string;
}

const emptyForm = (): TransactionForm => ({
  description: "",
  amount: "",
  type: "expense",
  frequency: "once",
  date: toLocalISODate(),
});

export default function Spreadsheet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<TransactionForm>(emptyForm());

  // Edição manual
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TransactionForm>(emptyForm());

  // Download por intervalo de datas
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloadRange, setDownloadRange] = useState<{ from: string; to: string }>({
    from: "",
    to: toLocalISODate(),
  });

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
      setForm(emptyForm());
      setShowAdd(false);
      fetchTransactions();
      toast({ title: "Lançamento adicionado", description: "O lançamento foi salvo com sucesso." });
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    fetchTransactions();
  };

  // ---- Edição manual ----
  const openEdit = (t: Transaction) => {
    setEditingId(t.id);
    setEditForm({
      description: t.description,
      amount: String(t.amount),
      type: t.type,
      frequency: t.frequency,
      date: t.date,
    });
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm());
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.description || !editForm.amount) return;
    const { error } = await supabase
      .from("transactions")
      .update({
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        type: editForm.type,
        frequency: editForm.frequency,
        date: editForm.date,
      })
      .eq("id", editingId);

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lançamento atualizado", description: "As alterações foram salvas." });
      closeEdit();
      fetchTransactions();
    }
  };

  // ---- Download ----
  const handleConfirmDownload = () => {
    const filtered = filterTransactionsByDateRange(
      transactions,
      downloadRange.from || undefined,
      downloadRange.to || undefined,
    );
    if (filtered.length === 0) {
      toast({
        title: "Nenhum lançamento no intervalo",
        description: "Ajuste o período ou cadastre lançamentos antes de exportar.",
        variant: "destructive",
      });
      return;
    }
    downloadTransactionsCsv(transactions, {
      from: downloadRange.from || undefined,
      to: downloadRange.to || undefined,
    });
    setShowDownloadDialog(false);
    toast({
      title: "Download iniciado",
      description: `Exportados ${filtered.length} lançamento(s) em CSV.`,
    });
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
        <div className="flex gap-2">
          <Button
            onClick={() => setShowDownloadDialog(true)}
            variant="outline"
            disabled={transactions.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar
          </Button>
          <Button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </div>
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
                    <td className="p-4 text-sm">{new Date(`${t.date}T00:00:00`).toLocaleDateString("pt-BR")}</td>
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
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(t)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Editar lançamento"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diálogo de download por período */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className="glass-card border-border/50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Baixar planilha</DialogTitle>
            <DialogDescription>
              Selecione o intervalo de datas que deseja exportar. Deixe os campos em branco para baixar tudo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">De</label>
              <Input
                type="date"
                value={downloadRange.from}
                max={downloadRange.to || undefined}
                onChange={(e) => setDownloadRange((prev) => ({ ...prev, from: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Até</label>
              <Input
                type="date"
                value={downloadRange.to}
                min={downloadRange.from || undefined}
                onChange={(e) => setDownloadRange((prev) => ({ ...prev, to: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDownloadRange({ from: "", to: "" })}
            >
              Tudo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const from = new Date(today.getFullYear(), today.getMonth(), 1);
                setDownloadRange({ from: toLocalISODate(from), to: toLocalISODate(today) });
              }}
            >
              Este mês
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const from = new Date(today.getFullYear(), 0, 1);
                setDownloadRange({ from: toLocalISODate(from), to: toLocalISODate(today) });
              }}
            >
              Este ano
            </Button>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDownloadDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDownload}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de edição manual de lançamento */}
      <Dialog open={editingId !== null} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className="glass-card border-border/50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Editar lançamento</DialogTitle>
            <DialogDescription>
              Altere os campos abaixo e clique em "Salvar alterações".
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Valor</label>
              <Input
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                min="0"
                step="0.01"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Data</label>
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select
                value={editForm.type}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, type: v as "income" | "expense" }))}
              >
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Frequência</label>
              <Select
                value={editForm.frequency}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, frequency: v }))}
              >
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
