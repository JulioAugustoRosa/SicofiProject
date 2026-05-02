# SICOFI — Sistema Inteligente de Controle Financeiro

Aplicação web de controle financeiro pessoal com assistente conversacional integrado, desenvolvida como projeto acadêmico.

## Tecnologias

- **Frontend:** Vite + React 18 + TypeScript
- **Estilo:** Tailwind CSS + shadcn/ui (Radix UI)
- **Backend / Banco:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Gráficos:** Recharts
- **Animações:** Framer Motion

## Pré-requisitos

- Node.js 18+
- npm (ou bun)
- Conta no Supabase com as variáveis de ambiente configuradas:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

## Como executar localmente

```sh
# 1. Clone o repositório
git clone <URL_DO_REPOSITORIO>

# 2. Acesse a pasta do projeto
cd SicofiProject

# 3. Instale as dependências
npm install

# 4. Configure as variáveis de ambiente em um arquivo .env
#    (use o .env.example como referência)

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

A aplicação ficará disponível em `http://localhost:8080`.

## Scripts disponíveis

| Script | O que faz |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento com HMR |
| `npm run build` | Gera o build de produção |
| `npm run preview` | Pré-visualiza o build de produção |
| `npm run lint` | Roda o ESLint |
| `npm test` | Executa a suíte de testes (Vitest) |

## Estrutura

```
src/
 ├── pages/         Páginas (Dashboard, Chat, Planilha, Metas...)
 ├── components/    Componentes reutilizáveis e UI base
 ├── hooks/         Hooks customizados (useAuth, useToast)
 ├── integrations/  Cliente do Supabase
 └── lib/           Utilitários (cálculo de IR, exportação, etc.)

supabase/
 ├── migrations/    Migrations SQL do banco
 └── functions/     Edge Functions (chat com IA)
```
