

# NotionCharts - Plano de Implementação

## Visão Geral
Aplicação SaaS que permite usuários logarem via Notion, criarem workspaces e gerarem gráficos customizados a partir de seus bancos de dados do Notion para embed.

---

## Fase 1: Fundação e Design System

### 1.1 Dark Theme e Layout Base
- Implementar tema escuro como padrão (fundo preto/cinza escuro)
- Cores de destaque em verde neon (#22c55e) e branco
- Layout principal com sidebar lateral colapsável
- Header com logo "NotionCharts" e área do usuário

### 1.2 Sidebar de Navegação
- Ícones para: Workspaces, Charts, Settings
- Estado ativo destacado
- Versão compacta (apenas ícones) quando colapsada

---

## Fase 2: Autenticação via Notion OAuth

### 2.1 Página de Login
- Tela inicial com branding e botão "Conectar com Notion"
- Redirect para OAuth do Notion
- Callback para processar token de autorização

### 2.2 Edge Function para OAuth
- Endpoint para iniciar fluxo OAuth
- Endpoint de callback para trocar código por access token
- Armazenamento seguro do token do usuário

### 2.3 Gestão de Sessão
- Persistência do usuário logado
- Exibição de avatar/nome do Notion no header
- Opção de logout/desconectar

---

## Fase 3: Gestão de Workspaces

### 3.1 Dashboard de Workspaces
- Estado vazio: mensagem "No Workspaces Yet" + botão "Add Workspace"
- Lista de workspaces em formato de cards
- Cada card mostra: nome, link para Charts, menu de opções (editar/deletar)

### 3.2 Modal de Criação/Edição
- Input para nome do workspace
- Botões "Create Workspace" e "Create And Link" (para conectar database Notion)
- Validação de campos obrigatórios

### 3.3 Vinculação com Notion Database
- Listar databases acessíveis do Notion do usuário
- Permitir selecionar qual database vincular ao workspace
- Feedback de sucesso/erro na vinculação

---

## Fase 4: Criação de Gráficos Customizados

### 4.1 Página de Charts do Workspace
- Estado vazio: "No Charts Yet" + botão "Add Chart"
- Lista de charts criados em grid
- Preview miniatura de cada gráfico

### 4.2 Modal de Criação de Chart
- Dropdown: selecionar workspace
- Dropdown: selecionar Notion database (com refresh)
- Botão "Continue" para próxima etapa

### 4.3 Configurador de Chart
- Painel esquerdo com configurações:
  - Templates pré-definidos (Financial Overview, Category Distribution, etc.)
  - Tipo de gráfico (barras, linhas, pizza, card stats)
  - Seletor de coluna de valor
  - Nome do chart
  - Filtros opcionais
- Painel direito com preview ao vivo do gráfico
- Botão "Save" para salvar configuração

### 4.4 Tipos de Gráficos Suportados
- Card Stats (métricas resumidas)
- Gráfico de Barras
- Gráfico de Linhas
- Gráfico de Pizza/Donut

---

## Fase 5: Embed e Visualização

### 5.1 Renderização Pública do Chart
- Rota pública `/embed/:chartId` para exibir o gráfico
- URL copiável para embed no Notion
- Atualização automática dos dados do Notion

### 5.2 Gerenciamento de Charts
- Editar configuração de charts existentes
- Duplicar charts
- Deletar charts
- Copiar link de embed

---

## Requisitos Técnicos

### Backend (Supabase + Edge Functions)
- Tabelas: users, workspaces, charts, notion_connections
- Edge Functions para: OAuth Notion, buscar databases, buscar dados
- Row Level Security para isolamento de dados por usuário

### Frontend (React + Tailwind + Recharts)
- Componentes reutilizáveis de UI
- Estado global para usuário/workspaces
- Recharts para renderização dos gráficos

---

## Próximos Passos (Pós-MVP)
- Calendars e Milestones
- Mais tipos de gráficos
- Temas customizáveis para embeds
- Sistema de planos/assinaturas

