import { cn } from "@/components/ui/cn";
import Section from "@/components/ui/section";
import LogoMartori from "@/images/logo-martori.png";
import LogoRbc from "@/images/logo-rbc.png";
import LogoSknv from "@/images/logo-sknv.png";

/*
  How a logo should sit in its circle. The three files are not the same kind of
  artwork — Martori is square art that already fills its own frame, RBC and SKNV
  are wide wordmarks (2.7:1 and 3.7:1) trimmed tight to the ink. One uniform
  square inset cannot serve both: it rendered the wordmarks about nine pixels
  tall in the middle of an otherwise empty disc.
*/
type Fit = "bleed" | "wordmark";

const items: {
  title: string;
  logo: string;
  fit: Fit;
  date: string;
  location: string;
  blurb: string;
  current: boolean;
}[] = [
  {
    title: "Application Developer at RBC Bearings",
    logo: LogoRbc,
    fit: "wordmark",
    date: "Mar 2025 - Present",
    location: "Oxford, CT",
    blurb: "Precision bearings and engineered components for defense, aerospace, and industrial markets.",
    current: true,
  },
  {
    title: "Full-Stack Developer at Martori Farms",
    logo: LogoMartori,
    fit: "bleed",
    date: "Mar 2024 - Dec 2024",
    location: "Pompano Beach, FL · Remote",
    blurb: "Produce distribution — melon sourcing, inbound receiving, and nationwide fulfillment.",
    current: false,
  },
  {
    title: "Software Developer at SKNV",
    logo: LogoSknv,
    fit: "wordmark",
    date: "Mar 2021 - Mar 2024",
    location: "Pompano Beach, FL · Remote",
    blurb: "HIPAA-regulated compounding pharmacy producing customized dermatology and skincare prescriptions.",
    current: false,
  },
  {
    title: "Full-Stack Developer at Martori Farms",
    logo: LogoMartori,
    fit: "bleed",
    date: "Mar 2018 - Mar 2021",
    location: "Pompano Beach, FL · Remote",
    blurb: "Produce distribution and nationwide fulfillment.",
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
          closer to the edge than a square inset allows — 78% of the diameter
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
      <ol className="before:from-border before:via-border relative space-y-8 before:absolute before:top-2 before:bottom-2 before:left-[27.5px] before:w-px before:bg-linear-to-b before:to-transparent">
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
              <p className="text-muted-foreground text-sm">{item.blurb}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
