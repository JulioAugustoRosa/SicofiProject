-- Tabela de lembretes financeiros
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) CHECK (amount IS NULL OR amount >= 0),
  due_date DATE,                                   -- data prevista do gasto
  remind_at TIMESTAMPTZ NOT NULL,                  -- quando enviar o email
  email TEXT NOT NULL,                             -- destinatário (geralmente o próprio usuário)
  frequency TEXT NOT NULL DEFAULT 'once' CHECK (frequency IN ('once', 'weekly', 'monthly', 'yearly')),
  sent BOOLEAN NOT NULL DEFAULT false,             -- só relevante para once; recorrentes resetam
  active BOOLEAN NOT NULL DEFAULT true,            -- pausar sem deletar
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reminders" ON public.reminders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Índice para o cron buscar os lembretes pendentes rapidamente
CREATE INDEX idx_reminders_due ON public.reminders (remind_at)
  WHERE active = true AND sent = false;
CREATE INDEX idx_reminders_user ON public.reminders (user_id);

-- Extensões necessárias para o cron job e chamadas HTTP a partir do banco
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
