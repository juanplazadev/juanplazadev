import ArrowIcon from "@/components/ui/arrow-icon";
import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import Section from "@/components/ui/section";

export default function OpenSource() {
  const items = [
    {
      title: "IBM DB2 for i adapter for Phinx",
      link: "https://github.com/juanplazadev/phinx/tree/feature/db2-adapter",
      source: "github.com/juanplazadev/phinx",
      status: "In production testing",
      description:
        "A DB2 for i (AS400/iSeries) migration adapter for cakephp/phinx, connecting through pdo_odbc. Running against a live Db2 workload before I propose it upstream.",
    },
  ];

  return (
    <Section title="Open Source">
      <div className="space-y-3">
        {items.map((item, index) => (
          <Card key={index} interactive className="group">
            <div
              className="text-muted-foreground group-hover:text-primary absolute top-5 right-5 transition group-hover:rotate-45"
              aria-hidden="true"
            >
              <ArrowIcon />
            </div>
            <div className="mb-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-[13px] font-medium">{item.source}</span>
                <Badge variant="accent" className="px-2 py-0.5 text-[11px]">
                  {item.status}
                </Badge>
              </div>
              <h3 className="text-foreground group-hover:text-primary pr-6 font-semibold transition-colors">
                {/* Stretches the link over the whole card. */}
                <a
                  className="focus-visible:ring-ring focus-visible:ring-offset-background rounded-lg outline-none before:absolute before:inset-0 focus-visible:ring-2 focus-visible:ring-offset-2"
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.title}
                </a>
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">{item.description}</p>
          </Card>
        ))}
      </div>

      {/* An exit to the rest of the public work, the same way Currently Building
          links out to the architecture write-ups. */}
      <div className="mt-4">
        <a
          className="text-primary focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
          href="https://github.com/juanplazadev"
          target="_blank"
          rel="noreferrer"
        >
          All repositories on GitHub
          <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </Section>
  );
}
