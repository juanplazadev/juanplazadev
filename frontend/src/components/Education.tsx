import Card from "@/components/ui/card";
import Section from "@/components/ui/section";

export default function Education() {
  const items = [
    {
      title: "Associate in Science, Computer Information Systems",
      school: "Housatonic Community College",
      date: "May 2017",
      location: "Bridgeport, CT",
    },
  ];

  return (
    <Section title="Education">
      <div className="space-y-3">
        {items.map((item, index) => (
          <Card key={index}>
            <div className="space-y-1.5">
              <div className="text-primary text-[13px] font-medium">{item.date}</div>
              <h3 className="text-foreground font-semibold">{item.title}</h3>
              <div className="text-muted-foreground text-[13px]">
                {item.school} · {item.location}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}
