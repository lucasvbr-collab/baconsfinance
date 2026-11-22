# Fatura do cartão de crédito: aviso e importação

Data: 2026-11-22 · Status: aprovado pelo Lucas em 2026-11-22

## Por quê

O pagamento do cartão sai da conta corrente como um débito único (ex.: $331,43).
Sem detalhe, esse valor vira uma despesa sem categoria e esconde para onde o
dinheiro foi (Uber, assinaturas, delivery…). O Lucas quer que o app **avise**
quando aparecer um pagamento de cartão, para ele mandar a fatura completa, e que
o app **quebre a fatura nas categorias de sempre**.

## Objetivos

1. Ao importar o extrato da conta, detectar pagamentos de cartão e marcá-los como
   "não conta" (evita contar o mesmo gasto duas vezes).
2. Mostrar no painel um aviso por pagamento sem fatura correspondente:
   "Pagamento do cartão de $331,43 em 24/11. Importe a fatura para separar as compras."
3. Importar o PDF da fatura do RBC Cash Back Mastercard: cada compra vira uma
   transação, passando pelas regras → IA → "Extra" (pipeline existente).
4. O aviso some quando entra a fatura correspondente (ou quando o Lucas dispensa).

## Fora do escopo

- Faturas de outros bancos / outros layouts (o leitor é específico do RBC).
- Leitura por IA do PDF (caminho B, descartado).
- Juros, cash back e parcelamentos como categorias próprias (entram como linhas
  comuns se aparecerem; ver "Decisões do construtor").

## Anti-objetivos (seria falha mesmo "funcionando")

- Gravar uma fatura lida pela metade. Se a soma das compras não bater com o
  resumo da fatura, a importação é recusada inteira, com mensagem clara.
- Contar em dobro: o pagamento do cartão nunca entra nos totais.
- Duplicar compras ao subir a mesma fatura duas vezes.

## Abordagens consideradas

| | Como | Prós | Contras |
|---|---|---|---|
| **A (escolhida)** | Ler o PDF no servidor com regras fixas para o layout RBC | Usa o arquivo que ele já tem; determinístico; sem custo | Quebra se o RBC mudar o layout |
| B | Mandar o PDF para a IA extrair | Qualquer banco | Custo por fatura; pode errar valores |
| C | CSV do cartão no RBC Online Banking | Quase sem código novo | Período não segue o ciclo da fatura; casa pior com o pagamento |

O Lucas escolheu **A**. O CSV do cartão (C) é aceito de graça pelo importador
atual se o arquivo tiver `Account Type` de cartão; não é foco.

## Como funciona

### 1. Detectar o pagamento na conta corrente
- Na importação do extrato (`importTransactions`), descrição que case
  `/MASTERCARD|MASTER CARD|VISA|CREDIT CARD|CARTE DE CR/i`, **não** contenha
  `VISA DEBIT` (compras no débito do RBC aparecem como "VISA DEBIT PURCHASE") **e**
  seja despesa → `exclude_from_totals = true`, `card_payment = true`.
  - Ainda não vimos esse texto no extrato real (o primeiro débito automático é em
    24/11). O padrão é amplo de propósito e será ajustado quando o extrato de
    dezembro chegar.
- Na própria fatura, linhas "PAYMENT - THANK YOU / PAIEMENT - MERCI" são
  ignoradas (o dinheiro já saiu da conta corrente).

### 2. Ligar pagamento ↔ fatura
- Nova tabela `card_statements_baconsfinance`: lar, cartão (últimos 4 dígitos),
  período (início/fim), saldo novo (new balance), total de compras, data de
  vencimento, data de importação.
- Um pagamento de cartão está "resolvido" quando existe fatura do lar com
  `new_balance` igual ao valor (±$0,01) — é o caso do débito automático. Se não
  houver match exato (pagamento manual/parcial), considera resolvido se houver
  fatura cujo período terminou até 40 dias antes do pagamento.
- Botão "Dispensar" no aviso (`card_payment_dismissed = true`) para casos que o
  Lucas não quer detalhar.

### 3. Ler o PDF
- Upload em "Importar extrato" (mesma tela do CSV, aceita `.pdf`).
- Extrair texto no servidor (biblioteca de PDF compatível com Vercel; escolha do
  construtor) e interpretar:
  - cabeçalho: `STATEMENT FROM OCT 06 TO NOV 3, 2026` → período e ano;
  - resumo: `Purchases & debits`, `Payments & credits`, `NEW BALANCE`,
    `Payment due date`, últimos 4 dígitos do cartão;
  - linhas: `MMM DD MMM DD DESCRIÇÃO $valor` (data da transação, data de
    lançamento, descrição, valor; negativo = crédito). Ignorar a linha seguinte
    de referência numérica e a linha "Foreign Currency …".
  - ano de cada linha: o do fim do período, menos 1 se o mês for maior que o mês
    final (fatura que atravessa o ano novo).
- **Conferência obrigatória:** soma das linhas positivas = `Purchases & debits` +
  `Cash advances` + `Interest` + `Fees`; soma das linhas negativas (pagamentos +
  estornos) = `Payments & credits`; e saldo anterior + as duas somas = `NEW BALANCE`.
  Diferença > $0,01 → recusar com "Li $X em compras, mas a fatura diz $Y. Nada foi
  importado."
- Cada compra vira transação: data = data da transação (fuso Toronto, como o CSV),
  `source = 'card_statement'`, `import_hash = card|data|valor|descrição`,
  categorização pela pipeline existente.
- Mês: cada compra entra no mês da sua data (a fatura atravessa meses).

### 4. Aviso no painel
- Faixa acima do cartão do mês, uma por pagamento pendente:
  "Pagamento do cartão de $331,43 em 24/11 ainda sem fatura. [Importar fatura] [Dispensar]".
- A mensagem da importação do extrato também diz: "1 pagamento de cartão
  encontrado. Importe a fatura para separar as compras."

## Mudanças de dados (migração)

- `transactions`: `card_payment boolean default false`,
  `card_payment_dismissed boolean default false`; ampliar o check de `source`
  com `'card_statement'`; coluna opcional `statement_id` → fatura de origem.
- Nova tabela `card_statements_baconsfinance` com RLS por lar (mesmo padrão das
  outras tabelas) e índice único (lar, cartão, fim do período) para não duplicar.

## Verificação

- Teste unitário do leitor com o texto desta fatura (out/nov 2026):
  20 compras, soma $513,00, 2 pagamentos ignorados, período 2026-10-06 a
  2026-11-03, new balance $331,43, 4 compras em moeda estrangeira com o valor em CAD.
- Teste da conferência: remover uma linha → importação recusada.
- Teste da ligação pagamento ↔ fatura (valor exato; fallback por período).
- Teste da detecção de pagamento no extrato (inclui não confundir com
  "VISA DEBIT PURCHASE", "E-TRANSFER" e contas comuns).
- Manual: importar a fatura no app e conferir os totais por mês.

## Decisões do construtor (calls minhas, revisáveis)

- **Estornos na fatura** (crédito que não é pagamento): gravados como entrada
  ("income") na categoria fallback, marcados para revisão.
- **Juros / anuidade**, se aparecerem: compra comum → regra "INTEREST"/"FEE" → Extra.
- **Biblioteca de PDF:** a que rodar no runtime Node da Vercel sem binários.
- Dados pessoais da fatura (nome, endereço, número do cartão) não vão para o
  banco; só os últimos 4 dígitos.

## Decidido pelo Lucas

- Corridas de **Uber** vão para uma categoria nova **"Transporte"** (despesa).
  Regras: `UBER` → Transporte; `UBER EATS` → Lazer (padrão mais longo vence).
