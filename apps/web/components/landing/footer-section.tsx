import { NewsletterForm } from "@/components/newsletter-form";

export function FooterSection() {
  return (
    <section className="py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Stay in the loop
          </h2>
          <p className="text-white/60 mb-10">
            Get updates on launches, new features, and developer resources.
          </p>
          <div className="flex justify-center">
            <NewsletterForm />
          </div>
        </div>
        <footer className="mt-24 pt-8 border-t border-white/10 text-center">
          <p className="text-sm text-white/40">Launching March 2026</p>
        </footer>
      </div>
    </section>
  );
}
