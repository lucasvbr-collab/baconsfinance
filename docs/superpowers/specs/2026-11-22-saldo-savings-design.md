# Saldo guardado na savings

Data: 2026-11-22 · Status: aguardando aprovação do Lucas

## Por quê

O Lucas quer saber **quanto tem guardado na conta savings** do RBC, direto no app.
O CSV do RBC não traz saldo e as transações importadas não dizem de qual conta
vieram, então o saldo é informado à mão.

## Objetivos

1. Card "Guardado na savings" no painel com o saldo atual e a data da última
   atualização.
2. Botão "Atualizar saldo": digita o valor (e a data, padrão hoje) e salva.
3. Cada atualização fica guardada (histórico). O card mostra a variação desde a
   atualização anterior e desde a primeira atualização do ano.
4. Valor compartilhado pelo lar (household), como o resto das finanças.

## Fora do escopo

- Chequing (o Lucas disse que o que importa é a savings).
- Cálculo automático a partir do CSV (caminho B, descartado; pode vir depois sem
  perder o histórico).
- Gráfico de evolução (só números de variação por enquanto).

## Anti-objetivos

- Mexer nos totais de receita/despesa ou no "sobrou no mês": o saldo da savings
  é um número à parte.
- Mostrar um valor que parece atual mas está velho sem dizer a data.

## Abordagens consideradas

- **A. Saldo informado à mão, com histórico** (escolhida): número sempre igual ao
  do banco, pouco trabalho. Contra: fica parado entre atualizações (mitigado
  mostrando a data).
- **B. Saldo inicial + lançamentos do CSV**: automático, mas exige separar
  transações por conta (`Account Type`), importar a savings e arrisca divergir
  do banco sem ninguém notar.
- **C. Inferir pelas "ONLINE BANKING TRANSFER"**: descartada; não dá para saber
  o destino nem inclui juros.

## Como

- Tabela nova `savings_balances_baconsfinance`: `id`, `household_id`, `user_id`,
  `amount numeric(12,2) >= 0`, `as_of date`, `created_at`. RLS igual às outras
  tabelas do lar. Migration nova em `supabase/migrations/`.
- Server action para inserir; o painel lê as atualizações do lar ordenadas por
  `as_of`.
- Função pura (testada) que, dada a lista, devolve saldo atual, variação desde a
  anterior e desde a primeira do ano.
- Estado vazio: card convida a informar o primeiro saldo.

## Decisões do construtor

- Posição do card no painel e o visual (seguir os cards existentes).
- Se dá para apagar uma atualização errada (sugestão: sim, a última).
