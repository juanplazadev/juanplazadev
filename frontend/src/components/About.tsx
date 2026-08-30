import Section from "@/components/ui/section";

export default function About() {
  return (
    <Section title="About">
      <div className="text-muted-foreground space-y-4 text-sm">
        <p>
          Full-stack engineer with 8+ years building and modernizing production web applications across defense
          manufacturing, regulated healthcare, and high-volume logistics.
        </p>
        <p>
          I own systems end to end — data model, REST APIs, queues, integrations, and deployment — with a track record
          of turning brittle legacy code into maintainable, well-tested platforms. Six years fully remote.
        </p>
      </div>
    </Section>
  );
}
