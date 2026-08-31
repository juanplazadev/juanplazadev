import ArchitectureCard from "@/components/ui/architecture-card";
import { useDocumentTitle } from "@/components/ui/use-document-title";
import { getArchitectures } from "@/content/architectures";

export default function Architecture() {
  const architectures = getArchitectures();

  useDocumentTitle("Architecture - Juan Plaza");

  return (
    <section>
      <div className="mb-8">
        <h1 className="font-inter-tight text-foreground mb-2 text-2xl font-bold tracking-tight">Architecture</h1>
        <p className="text-muted-foreground text-[15px] text-balance">
          How the things I build are actually put together - the containers, the queues, the deploy path, and the
          decisions that took a second pass to get right.
        </p>
      </div>

      <div className="space-y-3">
        {architectures.map((item) => (
          <ArchitectureCard key={item.slug} item={item} />
        ))}
      </div>
    </section>
  );
}
