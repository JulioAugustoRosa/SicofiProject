import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Bell, BellOff, CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
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

interface Reminder {
  id: string;
  description: string;
  amount: number | null;
  due_date: string | null;
  remind_at: string;
  email: string;
  frequency: "once" | "weekly" | "monthly" | "yearly";
  sent: boolean;
  active: boolean;
}

interface ReminderForm {
  description: string;
  amount: string;
  due_date: string;
  remind_date: string;   // YYYY-MM-DD
  remind_time: string;   // HH:MM
  frequency: "once" | "weekly" | "monthly" | "yearly";
  active: boolean;
}

const emptyForm = (): ReminderForm => {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return {
    description: "",
    amount: "",
    due_date: "",
    remind_date: d.toISOString().split("T")[0],
    remind_time: "09:00",
    frequency: "once",
    active: true,
  };
};

const FREQUENCY_LABEL: Record<string, string> = {
  once: "Única",
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDateBR = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");

const formatDateTimeBR = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// Combina data local + hora local em ISO 8601 (sem timezone)
const buildRemindAtIso = (date: string, time: string): string => {
  return `${date}T${time}:00`;
};

// Extrai data e hora de um ISO/timestamp pra preencher o form
const splitRemindAt = (iso: string): { date: string; time: string } => {
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date, time };
};

export default function Reminders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<ReminderForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ReminderForm>(emptyForm());

  const fetchReminders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("remind_at", { ascending: true });
    if (data) setReminders(data as Reminder[]);
  };

  useEffect(() => { fetchReminders(); }, [user]);

  const handleAdd = async () => {
    if (!user || !user.email || !form.description) return;
    const remind_at = buildRemindAtIso(form.remind_date, form.remind_time);
    const { error } = await supabase.from("reminders").insert({
      user_id: user.id,
      description: form.description,
      amount: form.amount ? parseFloat(form.amount) : null,
      due_date: form.due_date || null,
      remind_at,
      email: user.email,
      frequency: form.frequency,
      active: true,
      sent: false,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setForm(emptyForm());
      setShowAdd(false);
      fetchReminders();
      toast({ title: "Lembrete criado", description: "Você receberá um email no horário programado." });
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("reminders").delete().eq("id", id);
    fetchReminders();
  };

  const handleToggleActive = async (r: Reminder) => {
    await supabase.from("reminders").update({ active: !r.active }).eq("id", r.id);
    fetchReminders();
  };

  const openEdit = (r: Reminder) => {
    const { date, time } = splitRemindAt(r.remind_at);
    setEditingId(r.id);
    setEditForm({
      description: r.description,
      amount: r.amount !== null ? String(r.amount) : "",
      due_date: r.due_date ?? "",
      remind_date: date,
      remind_time: time,
      frequency: r.frequency,
      active: r.active,
    });
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm());
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.description) return;
    const remind_at = buildRemindAtIso(editForm.remind_date, editForm.remind_time);
    const { error } = await supabase.from("reminders").update({
      description: editForm.description,
      amount: editForm.amount ? parseFloat(editForm.amount) : null,
      due_date: editForm.due_date || null,
      remind_at,
      frequency: editForm.frequency,
      sent: false, // reabre pra ser enviado se já tinha sido marcado
    }).eq("id", editingId);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lembrete atualizado", description: "As alterações foram salvas." });
      closeEdit();
      fetchReminders();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Lembretes</h1>
          <p className="text-sm text-muted-foreground">
            Receba um email no horário programado pra não esquecer nenhum pagamento
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Lembrete
        </Button>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="glass-card p-5 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Input
                placeholder="Ex: Aluguel, Conta de luz, Van do colégio..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Valor (opcional)</label>
              <Input
                type="number"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                min="0"
                step="0.01"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Data do pagamento (opcional)</label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Dia do lembrete</label>
              <Input
                type="date"
                value={form.remind_date}
                onChange={(e) => setForm((p) => ({ ...p, remind_date: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Hora do lembrete</label>
              <Input
                type="time"
                value={form.remind_time}
                onChange={(e) => setForm((p) => ({ ...p, remind_time: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs text-muted-foreground">Frequência</label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm((p) => ({ ...p, frequency: v as ReminderForm["frequency"] }))}
              >
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Única vez</SelectItem>
                  <SelectItem value="weekly">Toda semana</SelectItem>
                  <SelectItem value="monthly">Todo mês</SelectItem>
                  <SelectItem value="yearly">Todo ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">Criar lembrete</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            📧 O email será enviado para <span className="font-medium text-foreground">{user?.email}</span> no horário programado.
          </p>
        </motion.div>
      )}

      {reminders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CalendarClock className="w-12 h-12 text-primary/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhum lembrete criado. Crie um aqui ou peça ao assistente: "Me lembre de pagar o aluguel todo dia 5 às 9h".
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {reminders.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card p-5 ${!r.active ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2 min-w-0">
                  <Bell className={`w-4 h-4 mt-1 shrink-0 ${r.active ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold truncate">{r.description}</h3>
                    <p className="text-xs text-muted-foreground">
                      {FREQUENCY_LABEL[r.frequency]}
                      {r.sent && r.frequency === "once" ? " · Enviado ✓" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleActive(r)}
                    className="text-muted-foreground hover:text-primary transition-colors p-1"
                    title={r.active ? "Pausar lembrete" : "Ativar lembrete"}
                  >
                    {r.active ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="text-muted-foreground hover:text-primary transition-colors p-1"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                {r.amount !== null && r.amount > 0 && (
                  <p>
                    <span className="text-muted-foreground">Valor: </span>
                    <span className="font-medium">{formatCurrency(r.amount)}</span>
                  </p>
                )}
                {r.due_date && (
                  <p>
                    <span className="text-muted-foreground">Pagamento: </span>
                    <span className="font-medium">{formatDateBR(r.due_date)}</span>
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Lembrete: </span>
                  <span className="font-medium">{formatDateTimeBR(r.remind_at)}</span>
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Diálogo de edição manual */}
      <Dialog open={editingId !== null} onOpenChange={(open) => { if (!open) closeEdit(); }}>
        <DialogContent className="glass-card border-border/50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Editar lembrete</DialogTitle>
            <DialogDescription>
              Ajuste os dados do lembrete. Salvar reabre o envio (o email será disparado novamente no novo horário).
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Valor</label>
              <Input
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm((p) => ({ ...p, amount: e.target.value }))}
                min="0"
                step="0.01"
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Data do pagamento</label>
              <Input
                type="date"
                value={editForm.due_date}
                onChange={(e) => setEditForm((p) => ({ ...p, due_date: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Dia do lembrete</label>
              <Input
                type="date"
                value={editForm.remind_date}
                onChange={(e) => setEditForm((p) => ({ ...p, remind_date: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Hora do lembrete</label>
              <Input
                type="time"
                value={editForm.remind_time}
                onChange={(e) => setEditForm((p) => ({ ...p, remind_time: e.target.value }))}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Frequência</label>
              <Select
                value={editForm.frequency}
                onValueChange={(v) => setEditForm((p) => ({ ...p, frequency: v as ReminderForm["frequency"] }))}
              >
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Única vez</SelectItem>
                  <SelectItem value="weekly">Toda semana</SelectItem>
                  <SelectItem value="monthly">Todo mês</SelectItem>
                  <SelectItem value="yearly">Todo ano</SelectItem>
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
