import Section from "@/components/ui/section";

export default function About() {
  return (
    <Section title="About">
      <div className="text-muted-foreground space-y-4 text-sm">
        <p>
          Software engineer with 8+ years building and modernizing production web applications across defense
          manufacturing, regulated healthcare, and high-volume logistics.
        </p>
        <p>
          Six years fully remote. I own systems end to end - data model, REST APIs, queues, integrations, and deployment
          - with a track record of turning brittle legacy code into maintainable, well-tested platforms.
        </p>
        <p>
          Every environment I've worked in has been one where getting security wrong is expensive - HIPAA-regulated
          healthcare, then defense and government contracts inside a SOX-audited public company - and it shaped how I
          build: least privilege, auditable by default, hardened before it ships.
        </p>
      </div>
    </Section>
  );
}
