import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import Section from "@/components/ui/section";

export default function OpenSource() {
  const items = [
    {
      title: "IBM DB2 for i adapter for Phinx",
      link: "https://github.com/jplaza88/phinx/tree/feature/db2-adapter",
      source: "github.com/jplaza88/phinx",
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
              <svg className="fill-current" xmlns="http://www.w3.org/2000/svg" width="10" height="10">
                <path d="M1.018 10 0 8.983l7.572-7.575H1.723L1.736 0H10v8.266H8.577l.013-5.841L1.018 10Z" />
              </svg>
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
    </Section>
  );
}
