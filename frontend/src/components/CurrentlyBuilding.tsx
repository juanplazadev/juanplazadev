import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import Section from "@/components/ui/section";
import StatusDot from "@/components/ui/status-dot";

const CalendarIcon = () => (
  <svg
    className="stroke-primary"
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    fill="none"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2.5" y="4" width="15" height="13.5" rx="2.5" />
    <path d="M2.5 8.25h15M6.5 2.5V5.5M13.5 2.5V5.5M6.75 12.25l1.75 1.75 3.75-3.75" />
  </svg>
);

const DumbbellIcon = () => (
  <svg
    className="stroke-primary"
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    fill="none"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="1.75" y="6.75" width="3.5" height="6.5" rx="1.25" />
    <rect x="14.75" y="6.75" width="3.5" height="6.5" rx="1.25" />
    <path d="M5.25 10h9.5" />
  </svg>
);

export default function CurrentlyBuilding() {
  const items = [
    {
      title: "Check-in",
      icon: <CalendarIcon />,
      status: "In progress",
      active: true,
      description:
        "An appointment scheduling and check-in platform for operations that run on arrivals. Laravel with an Inertia + React front end and Redis-backed queues.",
    },
    {
      title: "Gym management system",
      icon: <DumbbellIcon />,
      status: "Next up",
      active: false,
      description:
        "Member registration, payments, and building access in one system, with an app that shows members their own attendance history.",
    },
  ];

  return (
    <Section title="Currently Building">
      <div className="grid gap-4 min-[580px]:grid-cols-2">
        {items.map((item, index) => (
          <Card key={index}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="border-border bg-muted flex h-11 w-11 items-center justify-center rounded-full border">
                {item.icon}
              </div>
              <Badge variant={item.active ? "accent" : "outline"} className="px-2 py-0.5 text-[11px]">
                {item.active && <StatusDot />}
                {item.status}
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-foreground font-semibold">{item.title}</h3>
              <p className="text-muted-foreground text-sm">{item.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}
