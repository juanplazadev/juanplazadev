import { cn } from "@/components/ui/cn";
import Section from "@/components/ui/section";
import LogoMartori from "@/images/logo-martori.png";
import LogoRbc from "@/images/logo-rbc.png";
import LogoSknv from "@/images/logo-sknv.png";

/*
  How a logo should sit in its circle. The three files are not the same kind of
  artwork - Martori is square art that already fills its own frame, RBC and SKNV
  are wide wordmarks (2.7:1 and 3.7:1) trimmed tight to the ink. One uniform
  square inset cannot serve both: it rendered the wordmarks about nine pixels
  tall in the middle of an otherwise empty disc.
*/
type Fit = "bleed" | "wordmark";

/*
  blurb is the employer - what the business does, so a reader knows what the
  systems below were for. highlights are mine: what I built and owned there.
  Three to six per role, ordered by what a recruiter scans for first.

  Two rules these bullets are held to, both learned the hard way from reading
  the page next to the resume:

  1. A number needs its mechanism. "Cut spoilage 50%" reads as a claim; "cut
     spoilage 50% because loaded trucks stopped idling on a dock in Arizona
     heat" reads as something that happened. The clause is also just the answer
     to the first follow-up question in an interview, so it costs nothing.
  2. The site and the resume describe the same four jobs, and a reader has both.
     Where they disagreed, this file is the canonical version.
*/
const items: {
  title: string;
  logo: string;
  fit: Fit;
  date: string;
  location: string;
  blurb: string;
  highlights: string[];
  current: boolean;
}[] = [
  {
    title: "Application Developer at RBC Bearings",
    logo: LogoRbc,
    fit: "wordmark",
    date: "Mar 2025 - Present",
    location: "Oxford, CT",
    blurb: "Precision bearings and engineered components for defense, aerospace, and industrial markets.",
    highlights: [
      "Modernizing the internal application landscape - replacing aging legacy tooling with React + TypeScript front ends over Java / Spring Boot and Laravel REST services, without disrupting the plants that run on them daily.",
      "Introduced version control and automated delivery to a team that had neither: Git branching and review workflows, and GitHub Actions pipelines that run static analysis at PHPStan level 8, the test suite, and the deploy on every push. Manual releases became a repeatable, auditable process.",
      "Building against contract-driven security requirements for defense, aerospace, and government programs: least-privilege access, hardened authentication, and auditability designed in rather than retrofitted.",
      "Delivering changes under SOX IT general controls at a publicly traded company - documented change management, segregation of duties, and access reviews that stand up to external audit.",
      "Integrating new applications with IBM Db2 for i as the system of record, so modern interfaces ship without a risky data migration underneath them.",
    ],
    current: true,
  },
  {
    title: "Full-Stack Developer at Martori Farms",
    logo: LogoMartori,
    fit: "bleed",
    date: "Mar 2024 - Dec 2024",
    location: "Pompano Beach, FL · Remote · Contract",
    blurb: "Produce distribution - melon sourcing, inbound receiving, and nationwide fulfillment.",
    highlights: [
      "Brought back to scale the check-in platform I had built here in 2018. Three years in production and the operation had outgrown it; smoothing truck arrivals at peak harvest cut produce spoilage 50%, because loaded melons stopped idling on a dock waiting for a free bay.",
      "Led the upgrade of the core distribution platform from Laravel 5 to 11 and PHP 7.4 to 8.3, driving the refactor across six major versions with Rector. Response times improved 27% and every high and critical severity advisory cleared.",
      "Moved queue processing onto Redis with Horizon and handled booking contention with row-level locking, then deployed on Octane + FrankenPHP behind Caddy for persistent-worker performance under concurrent load.",
      "Ran a security hardening pass over the stack - dependency remediation, authentication and session handling, and validation at the request boundary.",
    ],
    current: false,
  },
  {
    title: "Software Developer at SKNV",
    logo: LogoSknv,
    fit: "wordmark",
    date: "Mar 2021 - Mar 2024",
    location: "Pompano Beach, FL · Remote",
    blurb: "HIPAA-regulated compounding pharmacy producing customized dermatology and skincare prescriptions.",
    highlights: [
      "Owned the prescription lifecycle end to end - intake, verification, compounding, fulfillment, and shipment - in a HIPAA-regulated pharmacy where every state transition has to be auditable.",
      "Migrated the legacy Phalcon applications to Laravel with React + TypeScript front ends on AWS, holding HIPAA compliance through the cutover and coordinating product, pharmacy, sales, and support through each release.",
      "Rebuilt encrypted EMR / e-prescription ingestion with schema validation, error queues, and replay handling. A prescription that failed to parse could be corrected and replayed instead of disappearing, which took lost records to zero.",
      "Corrected total quantity and day-supply calculations across the prescription engine. The old arithmetic ended a course early, so patients hit a refill wall while still in treatment; fixing it raised refills 74%.",
      'Built a RESTful webhook API for SMS delivery receipts and patient messaging. Paying from the text they already had improved collection 50%, and syncing fulfillment and shipment status on a schedule cut inbound support calls 67% - most of those calls were "where is my order".',
      "Built the sales consultant portal and the physician prescribing portal - two audiences with separate access boundaries over the same PHI, feeding one prescription pipeline.",
    ],
    current: false,
  },
  {
    title: "Full-Stack Developer at Martori Farms",
    logo: LogoMartori,
    fit: "bleed",
    date: "Mar 2018 - Mar 2021",
    location: "Pompano Beach, FL · Remote",
    blurb: "Produce distribution - melon sourcing, inbound receiving, and nationwide fulfillment.",
    highlights: [
      "Led a team of five building the company's internal web applications in PHP / Laravel, and ran weekly design-thinking workshops with executives to decide what got built next.",
      "Built the driver check-in platform in Laravel - geofenced arrival detection, automated SMS dispatch, and live arrival status for dispatchers coordinating inbound loads. It runs nine distribution centers across all four continental U.S. time zones, so every slot, reminder, and daylight-saving shift resolves in the site's local time rather than the server's.",
      "Converted RTSP camera feeds to WebRTC so operations could watch the yard live in the browser - no plugin, no client install.",
      "Built a printer management web app that polls device state, toner levels, and error conditions across the fleet, so a jammed or empty printer surfaces on a dashboard instead of at the machine.",
    ],
    current: false,
  },
];

function CompanyMark({ logo, fit, current }: { logo: string; fit: Fit; current: boolean }) {
  return (
    <div
      className={cn(
        // Sits on the rail, so it needs to be opaque and above it.
        "bg-card relative z-10 grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full",
        "ring-1 transition duration-300 group-hover:-translate-y-0.5",
        // The live role anchors the top of the chronology; the rest stay quiet.
        current
          ? "ring-primary/35 shadow-primary/10 group-hover:ring-primary/55 shadow-md"
          : "ring-border group-hover:ring-primary/30 shadow-xs",
        // Both wordmarks are dark ink and would vanish on a dark card. Bleed art
        // brings its own ground and wants no plate behind it.
        fit === "wordmark" && "bg-white",
      )}
    >
      {fit === "bleed" ? (
        /*
          The file has ~8% white margin baked in around the artwork. Scaling past
          the circle lets the round crop do the framing, instead of a small
          square floating inside a larger white ring.
        */
        <img className="h-full w-full scale-[1.35] object-cover" src={logo} alt="" />
      ) : (
        /*
          A wide, short mark sits on the circle's widest chord, so it can run far
          closer to the edge than a square inset allows - 78% of the diameter
          still clears the curve at this height. max-h is a guard for a future
          near-square wordmark; object-contain letterboxes rather than squashing
          if it ever bites.
        */
        <img className="max-h-[60%] w-[78%] object-contain" src={logo} alt="" />
      )}
    </div>
  );
}

export default function Experience() {
  return (
    <Section title="Experience">
      {/* A single rail down the left with each role's logo sitting on it, so four
          separate cards read as one chronology. The rail fades out at the bottom
          rather than stopping dead under the last entry. Its offset is half the
          mark's width, so it runs through the centre of every circle. */}
      <ol className="before:from-border before:via-border relative space-y-10 before:absolute before:top-2 before:bottom-2 before:left-[27.5px] before:w-px before:bg-linear-to-b before:to-transparent">
        {items.map((item, index) => (
          <li key={index} className="group relative flex gap-5">
            <CompanyMark logo={item.logo} fit={item.fit} current={item.current} />
            <div className="space-y-1.5 pt-1.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-primary text-[13px] font-medium tabular-nums">{item.date}</span>
                {item.current && (
                  <span className="border-primary/25 bg-accent text-accent-foreground rounded-full border px-2 py-0.5 text-[11px] font-medium">
                    Current
                  </span>
                )}
              </div>
              <h3 className="text-foreground font-semibold">{item.title}</h3>
              <div className="text-muted-foreground text-[13px]">{item.location}</div>
              {/* The employer, held back a step so it reads as context for the
                  highlights rather than competing with them. */}
              <p className="text-muted-foreground/80 text-[13px]">{item.blurb}</p>
              {/* list-outside so a wrapped second line stays indented past its
                  marker instead of sliding back under the disc. */}
              <ul className="text-muted-foreground marker:text-primary/40 list-outside list-disc space-y-1.5 ps-4 pt-1 text-sm leading-relaxed">
                {item.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
