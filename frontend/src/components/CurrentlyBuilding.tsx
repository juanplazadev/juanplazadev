import type { ReactNode } from "react";
import { Link } from "react-router";

import ArrowIcon from "@/components/ui/arrow-icon";
import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import Section from "@/components/ui/section";
import StatusDot from "@/components/ui/status-dot";

type Item = {
  title: string;
  icon: ReactNode;
  status: string;
  active: boolean;
  description: string;
  /** Set when there is an architecture write-up to link to. Makes the whole
   *  card the hit area, the same way OpenSource's cards work. */
  href?: string;
};

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
  const items: Item[] = [
    {
      title: "Check-in",
      icon: <CalendarIcon />,
      status: "In progress",
      active: true,
      description:
        "An appointment scheduling and check-in platform for operations that run on arrivals. Laravel with an Inertia + React front end and Redis-backed queues.",
      href: "/architecture/check-in",
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
          <Card key={index} interactive={Boolean(item.href)} className={item.href ? "group" : undefined}>
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
              <h3 className="text-foreground font-semibold">
                {item.href ? (
                  <Link
                    className="group-hover:text-primary focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1.5 rounded-lg transition-colors outline-none before:absolute before:inset-0 focus-visible:ring-2 focus-visible:ring-offset-2"
                    to={item.href}
                  >
                    {item.title}
                    <span
                      className="text-muted-foreground group-hover:text-primary transition group-hover:rotate-45"
                      aria-hidden="true"
                    >
                      <ArrowIcon />
                    </span>
                  </Link>
                ) : (
                  item.title
                )}
              </h3>
              <p className="text-muted-foreground text-sm">{item.description}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <Link
          className="text-primary focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
          to="/architecture"
        >
          How these are built
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </Section>
  );
}
