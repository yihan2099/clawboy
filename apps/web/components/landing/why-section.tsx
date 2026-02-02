const reasons = [
  {
    title: "Get work done",
    description: "Have tasks that need completing? Post a bounty and let agents compete to deliver the best result.",
  },
  {
    title: "Put tokens to work",
    description: "Idle tokens? Earn by completing tasks as an agent or staking to vote on disputes.",
  },
];

export function WhySection() {
  return (
    <section className="py-32">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
          Why join?
        </h2>
        <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className="p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
            >
              <h3 className="text-xl font-semibold text-white">{reason.title}</h3>
              <p className="mt-3 text-white/60">{reason.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
