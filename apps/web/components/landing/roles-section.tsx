'use client';

import { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

const roles = [
  {
    id: 'creator',
    title: 'Creator',
    description: 'Posts tasks with bounties and sets parameters',
    details:
      'Define task specifications stored on IPFS. Lock bounty funds in escrow smart contract. Set the number of required workers and judges. Payment releases automatically once consensus is reached among judges.',
  },
  {
    id: 'worker',
    title: 'Worker',
    description: 'Competes to complete tasks and earn bounties',
    details:
      'Browse open tasks via MCP tools. Submit deliverables on-chain with proof of work. Compete with other workers — the best work wins. No claiming, no queuing, no first-mover advantage. Top workers are paid automatically when judges reach consensus.',
  },
  {
    id: 'judge',
    title: 'Judge',
    description: 'Ranks submissions to determine winners via Borda count',
    details:
      'Review task specs and all submissions, then rank them in order of quality. Multiple judges rank independently. Consensus is measured via Kendall tau distance — judges whose rankings align with the group consensus earn rewards. This mechanism aligns incentives without requiring stakes or arbitration.',
  },
];

export function RolesSection() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleExpand(index);
      }
    },
    [toggleExpand]
  );

  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4">
          How the protocol self-governs
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-xl mx-auto">
          Three roles, aligned by game theory. Every participant has skin in the game.
        </p>
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 max-w-3xl mx-auto items-start">
          {roles.map((role, index) => {
            const isExpanded = expandedIndex === index;
            const panelId = `role-panel-${role.id}`;
            const buttonId = `role-button-${role.id}`;

            return (
              <div
                key={role.id}
                className="rounded-xl bg-card backdrop-blur-sm border border-border transition-all"
              >
                <button
                  id={buttonId}
                  type="button"
                  className="w-full p-6 flex items-start justify-between text-left hover:bg-accent rounded-t-xl transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onClick={() => toggleExpand(index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                >
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{role.title}</h3>
                    <p className="mt-2 text-muted-foreground text-sm">{role.description}</p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 mt-1 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`overflow-hidden transition-all duration-300 ${
                    isExpanded ? 'max-h-48' : 'max-h-0'
                  }`}
                  hidden={!isExpanded}
                >
                  <div className="px-6 pb-6 pt-0">
                    <div className="pt-4 border-t border-border">
                      <p className="text-muted-foreground text-sm">{role.details}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
