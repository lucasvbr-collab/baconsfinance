# Bacon's Finance

## Objetivo

Gerenciador financeiro inteligente com controle de limites por categoria e leitura de notas fiscais via IA.

## Telas

### Autenticação

**Rota:** `/`

**Objetivo:** Página de entrada para identificação do usuário.

**Componentes:**

- **Botão de Login com Google**: Realiza o login via Supabase Auth e redireciona para /dashboard.
- **Link Criar Conta**: Exibe campos para criação de nova conta.

### Dashboard

**Rota:** `/dashboard`

**Objetivo:** Visão geral das finanças com indicadores de consumo e atalhos rápidos.

**Componentes:**

- **Gráfico de Pizza (Gastos por Categoria)**
- **Botão Upload de Nota Fiscal (IA)**: Abre o seletor de arquivos para upload da nota fiscal e processamento via IA.
- **Botão Nova Transação Manual**: Redireciona para /transactions/new.
- **Lista de Transações Recentes**: Exibe os últimos 5 lançamentos.

### Gerenciar Categorias

**Rota:** `/categories`

**Objetivo:** Configurar categorias personalizadas e definir limites de gastos mensais.

**Componentes:**

- **Input Limites por Categoria**: Salva as novas definições de limite no banco de dados.
- **Ícone Excluir Categoria**: Deleta a categoria selecionada.
- **Botão Adicionar Categoria**: Abre formulário para criar nova categoria.

### Nova Transação

**Rota:** `/transactions/new`

**Objetivo:** Formulário para inserção manual de movimentações financeiras.

**Componentes:**

- **Botão Salvar Transação**: Salva a entrada ou saída no Supabase.
- **Select Categoria**: Seleciona a categoria (Aluguel, Mercado, etc).
- **Toggle Tipo (Entrada/Saída)**: Define se o valor é positivo ou negativo.

### Extrato

**Rota:** `/transactions`

**Objetivo:** Listagem completa e detalhada de todas as entradas e saídas.

**Componentes:**

- **Filtro de Data**: Filtra os gastos por período.
- **Tabela de Gastos Detalhada**: Abre tela de edição da transação.

### Configurações do Perfil

**Rota:** `/settings`

**Objetivo:** Gerenciamento de dados da conta e preferências.

**Componentes:**

- **Botão Sair da Conta**: Faz o logoff do usuário e redireciona para /.
- **Input Nome do Usuário**: Atualiza os dados de perfil vinculados ao Supabase.

## Banco de Dados

### categories

Armazena as categorias de despesas e receitas do usuário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | - |
| name | text | - |
| monthly_limit | number | - |

### transactions

Registra todas as movimentações financeiras (entradas e saídas).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | - |
| description | text | - |
| amount | number | - |
| date | timestamp | - |
| category_id | fk | - |
| type | text | - |

### users

Armazena informações básicas dos usuários autenticados.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | - |
| name | text | - |
| email | text | - |

