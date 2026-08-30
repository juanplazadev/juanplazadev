import Badge from "@/components/ui/badge";
import Section from "@/components/ui/section";

export default function Skills() {
  const groups = [
    {
      label: "Languages",
      items: ["Java", "PHP 7.x / 8.x", "JavaScript (ES6+)", "TypeScript", "SQL", "HTML5", "CSS", "Bash"],
    },
    {
      label: "Frameworks & Front End",
      items: [
        "Laravel",
        "Spring Boot",
        "Symfony",
        "Phalcon",
        "React",
        "Inertia",
        "TailwindCSS",
        "Vite",
        "jQuery",
        "Bootstrap",
        "REST API design",
      ],
    },
    {
      label: "Data",
      items: [
        "MySQL",
        "PostgreSQL",
        "IBM Db2",
        "SQLite",
        "Redis",
        "Schema design",
        "Query optimization",
        "Indexing",
        "Migrations",
        "Job queues",
      ],
    },
    {
      label: "Auth & Security",
      items: [
        "JWT",
        "MFA",
        "OTP / TOTP",
        "Passkeys (WebAuthn)",
        "Laravel Fortify",
        "Session & token auth",
        "Role-based access control",
      ],
    },
    {
      label: "Cloud & DevOps",
      items: [
        "AWS",
        "Cloudflare",
        "Docker",
        "Laravel Sail",
        "Linux",
        "nginx",
        "Apache",
        "Caddy",
        "Let's Encrypt / ACME",
        "Automated TLS renewal",
        "GitHub Actions",
        "CI/CD",
        "Git",
        "Bitbucket",
        "Datadog",
        "LogDNA",
      ],
    },
    {
      label: "Testing & Code Quality",
      items: [
        "Pest",
        "PHPUnit",
        "JUnit",
        "Playwright",
        "Cypress",
        "Selenium",
        "Laravel Pint / PHP-CS-Fixer",
        "Larastan / PHPStan",
        "Rector",
      ],
    },
    {
      label: "Tools",
      items: [
        "PHPStorm",
        "IntelliJ IDEA",
        "DataGrip",
        "Sublime Text",
        "Ghostty",
        "Claude Code",
        "Composer",
        "npm",
        "Maven",
        "Jira",
      ],
    },
    {
      label: "Domain & Practice",
      items: ["HIPAA compliance", "EMR / e-prescription integration", "PCI-aware payment flows", "Agile / Scrum"],
    },
  ];

  return (
    <Section title="Skills">
      {/*
        Columns rather than a grid: the groups are wildly different heights, and
        `grid-cols-2` would align every row to its tallest cell and leave ragged
        gaps under the short ones. CSS columns flow them instead, so the section
        stays roughly half as tall and absorbs new groups without getting longer.
      */}
      <div className="gap-x-8 sm:columns-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-5 break-inside-avoid">
            <h3 className="text-primary mb-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase">{group.label}</h3>
            <ul className="flex flex-wrap gap-1.5">
              {group.items.map((item) => (
                <li key={item}>
                  <Badge>{item}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
