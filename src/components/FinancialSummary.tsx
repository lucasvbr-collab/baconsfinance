type SummaryCard = {
  title: string;
  value: string;
  subtitle: string;
  subtitleClassName?: string;
  valueClassName?: string;
};

export function FinancialSummary({ cards }: { cards: SummaryCard[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card-elevated/80 p-6 shadow-card backdrop-blur-sm">
      <h2 className="font-display text-xs font-medium uppercase tracking-[0.2em] text-foreground/50">
        Resumo financeiro
      </h2>
      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {cards.map((c) => (
          <div
            key={c.title}
            className="rounded-xl border border-border/80 bg-card/60 px-4 py-5 lg:border-0 lg:bg-transparent lg:px-3 lg:py-0"
          >
            <p className="text-xs font-medium text-foreground/55">{c.title}</p>
            <p
              className={`mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl ${c.valueClassName ?? "text-foreground"}`}
            >
              {c.value}
            </p>
            <p
              className={`mt-1.5 text-xs leading-relaxed ${c.subtitleClassName ?? "text-foreground/50"}`}
            >
              {c.subtitle}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
