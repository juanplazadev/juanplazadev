import Badge from '@/components/site/badge';
import Section from '@/components/site/section';

export default function Skills() {
    /*
    Ordered by what a recruiter is scanning for, not by what is most fun to talk
    about. Domain leads because it is the hardest line to fake and the easiest to
    match against a requisition; the stack follows; supporting disciplines after.

    The bar for inclusion is "would I defend this in a deep-dive interview" - so
    no IDEs, no package managers, no HTML/CSS/Bash, and nothing kept only because
    it was once on a resume. Build tooling that follows from a listed choice
    (Vite from React) is left out; the architecture write-ups cover the specifics.

    A corollary the Auth group failed for a while: the bar is not "have I read
    about it", so a badge with no bullet under Experience and no code in a linked
    repo has to go. JWT, MFA / TOTP and Passkeys (WebAuthn) came out on those
    grounds - check-in authenticates with Fortify sessions and authorizes with
    Spatie Permission, and nothing shipped uses the other three. What replaced
    them is what the Experience bullets actually describe.
  */
    const groups = [
        {
            label: 'Domain Expertise',
            items: [
                'HIPAA compliance',
                'EMR / e-prescription integration',
                'PCI-aware payment flows',
                'IBM Db2 for i',
            ],
        },
        {
            label: 'Stack',
            items: [
                'PHP / Laravel',
                'Java / Spring Boot',
                'TypeScript / React',
                'Inertia',
                'TailwindCSS',
                'PostgreSQL',
                'MySQL',
                'Redis',
            ],
        },
        {
            label: 'Platform & Delivery',
            items: [
                'Docker',
                'Linux',
                'AWS',
                'nginx / Caddy',
                'GitHub Actions',
                'Sentry',
            ],
        },
        {
            label: 'Auth & Security',
            items: [
                'Role-based access control',
                'Per-site authorization scoping',
                'Least-privilege access design',
                'Encrypted PHI handling',
            ],
        },
        {
            label: 'Testing & Quality',
            items: [
                'Pest / PHPUnit',
                'JUnit',
                'Playwright',
                'Larastan / PHPStan',
                'Rector',
            ],
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
                        <h3 className="text-primary mb-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase">
                            {group.label}
                        </h3>
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
