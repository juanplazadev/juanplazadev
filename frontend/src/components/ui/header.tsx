import type { CSSProperties } from "react";

import UserImg from "@/images/user-image.jpg";

import Badge from "./badge";
import Button from "./button";
import GitHubIcon from "./github-icon";
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

// Seniority, scale, stakes - one cell each, and nothing that measures the resume
// rather than the work. Every figure is a claim the About and Experience sections
// substantiate below, said once at a glance rather than read out of a paragraph.
// That constraint is the whole point of the row, so a figure that no bullet below
// backs does not belong here however good it looks: the nine sites are the ones
// the check-in platform runs, named in the 2018-2021 entry.
// label is the noun, detail the qualifier, so all three cells share a shape.
const stats = [
  { value: "8+", label: "Years", detail: "In production" },
  { value: "9", label: "Sites", detail: "Four US time zones" },
  { value: "100%", label: "Regulated", detail: "HIPAA · SOX · Defense" },
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
            Open to remote roles
          </Badge>
          <Badge variant="outline">
            <PinIcon />
            Shelton, CT
            <WeatherInline />
          </Badge>
        </div>

        {/*
          The glow and the entrance live on this wrapper, not on the h1. WebKit
          will not paint a background-clip:text background onto a *positioned*
          descendant, so the moment the name sat inside a `relative` span - which
          is what the glow needed to anchor to - the text rendered at its own
          transparent colour and vanished on iOS while Chrome drew it fine. The
          h1 now contains nothing but the text.

          `isolate` makes this wrapper the stacking context the -z-10 glow
          resolves against. Without it the glow escapes to the root context and
          paints behind the card's opaque background, which is where it was.
        */}
        <div className="hero-in relative isolate mb-3 inline-block" style={delay(170)}>
          <span
            aria-hidden="true"
            className="bg-primary/30 pointer-events-none absolute inset-0 -z-10 animate-[nameGlow_8s_ease-in-out_infinite] blur-xl"
          />
          <h1 className="font-inter-tight from-foreground via-primary to-foreground animate-[name-shimmer_6s_ease-in-out_infinite] bg-linear-to-r bg-[length:200%_100%] bg-clip-text text-4xl font-bold tracking-tighter text-transparent sm:text-5xl">
            Juan Plaza
          </h1>
        </div>

        <p className="text-muted-foreground hero-in mx-auto mb-7 max-w-md text-[15px] text-balance" style={delay(230)}>
          Software engineer who owns production systems end to end - data model to deploy. Built with{" "}
          <span className="text-foreground font-medium">Laravel</span>,{" "}
          <span className="text-foreground font-medium">Spring Boot</span>, and{" "}
          <span className="text-foreground font-medium">React + TypeScript</span>.
        </p>

        <div className="hero-in mb-10 flex flex-wrap items-center justify-center gap-3" style={delay(290)}>
          <Button variant="shimmer" href="mailto:juan@juanplaza.dev">
            Get In Touch
          </Button>
          <Button variant="outline" href="#">
            <DownloadIcon />
            Résumé
          </Button>
          <Button variant="outline" href="https://github.com/juanplazadev" target="_blank" rel="noreferrer">
            <GitHubIcon />
            GitHub
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
              {/* The qualifier carries what will not fit in the label without
                  turning it into a long uppercase run. Sentence case, so it
                  reads as a caption rather than a second label. */}
              <dd className="text-muted-foreground/70 order-3 mt-0.5 text-[11px] leading-tight text-balance">
                {stat.detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
