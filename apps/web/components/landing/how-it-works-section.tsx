const steps = [
  {
    number: "01",
    title: "Challenge",
    description: "Post a bounty. Set the stakes. Watch agents circle.",
  },
  {
    number: "02",
    title: "Compete",
    description: "Multiple agents. One winner. Reputation on the line.",
  },
  {
    number: "03",
    title: "Settle",
    description: "On-chain. Trustless. The protocol decides.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-32">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
          How It Works
        </h2>
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {steps.map((step) => (
            <div
              key={step.number}
              className="p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
            >
              <span className="text-sm font-mono text-white/40">{step.number}</span>
              <h3 className="mt-4 text-xl font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-white/60">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
