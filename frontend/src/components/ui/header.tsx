import type { CSSProperties } from "react";

import UserImg from "@/images/user-image.jpg";

import Badge from "./badge";
import Button from "./button";
import PalettePicker from "./palette-picker";
import StatusDot from "./status-dot";
import ThemeToggle from "./theme-toggle";
import WeatherInline from "./weather-inline";

const PinIcon = () => (
  <svg
    className="stroke-current"
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 14.5s5-4.14 5-7.5a5 5 0 0 0-10 0c0 3.36 5 7.5 5 7.5Z" />
    <circle cx="8" cy="7" r="1.75" />
  </svg>
);

const DownloadIcon = () => (
  <svg
    className="stroke-current"
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 2v8m0 0L5 7m3 3 3-3M2.5 12.5v.5a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-.5" />
  </svg>
);

// Custom properties are not part of CSSProperties, so the cast is what lets an
// element declare its own stagger offset inline instead of needing a class per
// delay.
const delay = (ms: number) => ({ "--hero-delay": `${ms}ms` }) as CSSProperties;

// The numbers are the same claims the About and Experience sections make, said
// once at a glance rather than read out of a paragraph.
const stats = [
  { value: "8+", label: "Years building" },
  { value: "6", label: "Years remote" },
  { value: "3", label: "Industries" },
];

export default function Header() {
  return (
    <header className="relative pt-6 text-center">
      {/*
        Ambient backdrop. The negative inset cancels the layout's px-3 / md:px-16
        so the grid and the glow run the full width of the card, and the outer
        overflow-clip in RootLayout keeps them from touching page scroll. No
        negative z-index: that would paint it behind the card's own background.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-3 -top-6 h-[420px] overflow-hidden md:-inset-x-16"
      >
        <div className="hero-grid absolute inset-0" />
        <div className="hero-glow absolute inset-0" />
      </div>

      <div className="relative">
        {/* Wordmark and the appearance controls share the top rail so they read
            as part of a bar rather than floating over the avatar. */}
        <div className="hero-in mb-8 flex items-center justify-between">
          <span className="font-inter-tight text-foreground text-sm font-semibold tracking-tight">
            juanplaza<span className="text-primary">.dev</span>
          </span>
          <div className="flex items-center gap-2">
            <PalettePicker />
            <ThemeToggle />
          </div>
        </div>

        <div className="hero-in relative mb-5 inline-flex" style={delay(60)}>
          <div className="from-primary/40 rounded-full bg-linear-to-b to-transparent p-px">
            <img
              className="ring-background block rounded-full ring-4"
              src={UserImg}
              width={88}
              height={88}
              alt="Juan Plaza"
              fetchPriority="high"
            />
          </div>
          {/* Availability marker on the avatar itself, so the pill below is not
              the only thing carrying it. */}
          <span className="border-border bg-card absolute right-0.5 bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full border shadow-xs">
            <StatusDot />
          </span>
        </div>

        <div className="hero-in mb-5 flex flex-wrap items-center justify-center gap-2" style={delay(120)}>
          <Badge variant="accent">
            <StatusDot />
            Open to conversations
          </Badge>
          <Badge variant="outline">
            <PinIcon />
            Shelton, CT
            <WeatherInline />
          </Badge>
        </div>

        <h1
          className="font-inter-tight hero-in from-foreground via-primary to-foreground relative mb-3 inline-block animate-[shimmer_3s_ease-in-out_infinite] bg-linear-to-r bg-[length:200%_100%] bg-clip-text text-4xl font-bold tracking-tighter text-transparent sm:text-5xl"
          style={delay(170)}
        >
          <span className="relative">
            Juan Plaza
            {/* subtle ambient glow */}
            <span
              aria-hidden="true"
              className="bg-primary/30 pointer-events-none absolute inset-0 -z-10 animate-[nameGlow_4s_ease-in-out_infinite] blur-xl"
            />
          </span>
        </h1>

        <p className="text-muted-foreground hero-in mx-auto mb-7 max-w-md text-[15px] text-balance" style={delay(230)}>
          Full-stack engineer building production web apps with{" "}
          <span className="text-foreground font-medium">Laravel</span>,{" "}
          <span className="text-foreground font-medium">Spring Boot</span>, and{" "}
          <span className="text-foreground font-medium">React + TypeScript</span>.
        </p>

        <div className="hero-in mb-10 flex flex-wrap items-center justify-center gap-3" style={delay(290)}>
          <Button variant="shimmer" href="mailto:admin@juanplaza.dev">
            Get In Touch
          </Button>
          <Button variant="outline" href="/juan-plaza-resume.pdf" target="_blank" rel="noreferrer">
            <DownloadIcon />
            Résumé
          </Button>
        </div>

        {/* Replaces the template's three stock photos, which said nothing about
            the work. */}
        <dl className="divide-border border-border grid grid-cols-3 divide-x border-t pt-6 pb-2">
          {stats.map((stat, index) => (
            // dt has to precede dd in the markup, so the visual order (number
            // first) comes from flex ordering rather than the source order.
            <div key={stat.label} className="hero-in flex flex-col px-2" style={delay(350 + index * 60)}>
              <dt className="text-muted-foreground order-2 text-[12px] tracking-wide uppercase">{stat.label}</dt>
              <dd className="font-inter-tight text-foreground order-1 mb-0.5 text-2xl font-bold tabular-nums">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
