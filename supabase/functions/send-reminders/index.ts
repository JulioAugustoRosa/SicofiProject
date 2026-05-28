import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

/**
 * Edge function chamada pelo pg_cron a cada minuto.
 *
 * - Busca lembretes ativos cujo `remind_at` já passou e ainda não foram enviados
 * - Envia email via Resend
 * - Para lembretes únicos: marca como sent
 * - Para lembretes recorrentes (monthly/weekly/yearly): recalcula remind_at e due_date para o próximo ciclo
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface Reminder {
  id: string;
  user_id: string;
  description: string;
  amount: number | null;
  due_date: string | null;
  remind_at: string;
  email: string;
  frequency: "once" | "weekly" | "monthly" | "yearly";
  sent: boolean;
  active: boolean;
}

const formatCurrencyBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDateBR = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
};

// Soma um intervalo na data, retornando ISO string
function addInterval(dateIso: string, frequency: "weekly" | "monthly" | "yearly"): string {
  const date = new Date(dateIso);
  if (frequency === "weekly") date.setDate(date.getDate() + 7);
  if (frequency === "monthly") date.setMonth(date.getMonth() + 1);
  if (frequency === "yearly") date.setFullYear(date.getFullYear() + 1);
  return date.toISOString();
}

function buildEmailHtml(reminder: Reminder): string {
  const dueLine = reminder.due_date
    ? `<p style="margin:0 0 12px;color:#cbd5e1;"><strong>Data prevista:</strong> ${formatDateBR(reminder.due_date)}</p>`
    : "";
  const amountLine = reminder.amount !== null && reminder.amount > 0
    ? `<p style="margin:0 0 12px;color:#cbd5e1;"><strong>Valor:</strong> ${formatCurrencyBRL(reminder.amount)}</p>`
    : "";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#0b1018;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:540px;margin:0 auto;background:#141a24;border-radius:16px;padding:32px;border:1px solid #1f2937;">
    <div style="font-size:14px;color:#10b981;font-weight:600;letter-spacing:.05em;margin-bottom:8px;">SICOFI · LEMBRETE</div>
    <h1 style="margin:0 0 16px;color:#f1f5f9;font-size:22px;font-weight:700;">🔔 ${reminder.description}</h1>
    ${amountLine}
    ${dueLine}
    <p style="margin:20px 0 0;color:#94a3b8;font-size:14px;line-height:1.5;">
      Este é um lembrete automático configurado por você no SICOFI. Acesse seu painel
      para ver detalhes, marcar como pago ou ajustar o lembrete.
    </p>
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #1f2937;font-size:12px;color:#64748b;">
      Você está recebendo este email porque criou um lembrete no SICOFI — Sistema Inteligente de Controle Financeiro.
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(reminder: Reminder, resendApiKey: string, fromName: string, fromEmail: string) {
  const subject = reminder.due_date
    ? `🔔 Lembrete: ${reminder.description} — ${formatDateBR(reminder.due_date)}`
    : `🔔 Lembrete: ${reminder.description}`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [reminder.email],
      subject,
      html: buildEmailHtml(reminder),
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend ${resp.status}: ${text}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Proteção simples para não permitir invocações externas anônimas
    const CRON_SECRET = Deno.env.get("CRON_SECRET");
    if (CRON_SECRET) {
      const provided = req.headers.get("x-cron-secret");
      if (provided !== CRON_SECRET) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");
    const FROM_EMAIL = Deno.env.get("REMINDER_FROM_EMAIL") ?? "onboarding@resend.dev";
    const FROM_NAME = Deno.env.get("REMINDER_FROM_NAME") ?? "SICOFI";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const nowIso = new Date().toISOString();

    const { data: reminders, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("active", true)
      .eq("sent", false)
      .lte("remind_at", nowIso)
      .limit(50);

    if (error) throw error;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const reminder of reminders as Reminder[]) {
      try {
        await sendEmail(reminder, RESEND_API_KEY, FROM_NAME, FROM_EMAIL);

        if (reminder.frequency === "once") {
          // Lembrete único: marca como enviado
          await supabase
            .from("reminders")
            .update({ sent: true })
            .eq("id", reminder.id);
        } else {
          // Recorrente: agenda próximo ciclo
          const nextRemindAt = addInterval(reminder.remind_at, reminder.frequency);
          const nextDueDate = reminder.due_date
            ? addInterval(reminder.due_date + "T00:00:00", reminder.frequency).split("T")[0]
            : null;
          await supabase
            .from("reminders")
            .update({ remind_at: nextRemindAt, due_date: nextDueDate, sent: false })
            .eq("id", reminder.id);
        }

        results.push({ id: reminder.id, ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Falha ao enviar lembrete ${reminder.id}:`, msg);
        results.push({ id: reminder.id, ok: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Erro em send-reminders:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
