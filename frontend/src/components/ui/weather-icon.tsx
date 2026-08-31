import type { ReactElement } from "react";

import type { WeatherIconKey } from "@/lib/weather";

// The project ships no icon library - every icon is a hand-written SVG next to
// the thing that uses it. Eight of them would bury the header markup, so the
// weather set lives here instead, drawn on the same 16-box grid at the same
// 1.5 stroke as PinIcon and DownloadIcon.

const box = {
  className: "stroke-current",
  xmlns: "http://www.w3.org/2000/svg",
  width: "13",
  height: "13",
  viewBox: "0 0 16 16",
  fill: "none",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
} as const;

const Sun = () => (
  <svg {...box}>
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1.5v1.2M8 13.3v1.2M14.5 8h-1.2M2.7 8H1.5M12.6 3.4l-.85.85M4.25 11.75l-.85.85M12.6 12.6l-.85-.85M4.25 4.25l-.85-.85" />
  </svg>
);

const Moon = () => (
  <svg {...box}>
    <path d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1Z" />
  </svg>
);

// The cloud outline every precipitation icon sits under, so they read as one
// family rather than eight unrelated drawings.
const cloudPath = "M4.6 12.5a3 3 0 0 1 .3-6 4 4 0 0 1 7.5 1.1 2.5 2.5 0 0 1-.4 4.9H4.6Z";

const CloudSun = () => (
  <svg {...box}>
    <circle cx="10.6" cy="4.6" r="2" />
    <path d="M10.6 1.1v.7M14.1 4.6h-.7M13.1 2.1l-.5.5" />
    <path d={cloudPath} />
  </svg>
);

const Cloud = () => (
  <svg {...box}>
    <path d={cloudPath} />
  </svg>
);

const Fog = () => (
  <svg {...box}>
    <path d="M4.4 9.5a2.8 2.8 0 0 1 .3-5.6 3.8 3.8 0 0 1 7.1 1 2.4 2.4 0 0 1-.4 4.6H4.4Z" />
    <path d="M3 12h10M4.5 14.3h7" />
  </svg>
);

const Drizzle = () => (
  <svg {...box}>
    <path d="M4.4 9.5a2.8 2.8 0 0 1 .3-5.6 3.8 3.8 0 0 1 7.1 1 2.4 2.4 0 0 1-.4 4.6H4.4Z" />
    <path d="M6 11.8v1M9.7 11.8v1" />
  </svg>
);

const Rain = () => (
  <svg {...box}>
    <path d="M4.4 9.5a2.8 2.8 0 0 1 .3-5.6 3.8 3.8 0 0 1 7.1 1 2.4 2.4 0 0 1-.4 4.6H4.4Z" />
    <path d="M5.6 11.6 4.9 14M8.2 11.6 7.5 14M10.8 11.6 10.1 14" />
  </svg>
);

const Snow = () => (
  <svg {...box}>
    <path d="M4.4 9.5a2.8 2.8 0 0 1 .3-5.6 3.8 3.8 0 0 1 7.1 1 2.4 2.4 0 0 1-.4 4.6H4.4Z" />
    <path d="M5.4 12.2h1.2M6 11.6v1.2M9.4 13.4h1.2M10 12.8V14" />
  </svg>
);

const Thunder = () => (
  <svg {...box}>
    <path d="M4.4 9.5a2.8 2.8 0 0 1 .3-5.6 3.8 3.8 0 0 1 7.1 1 2.4 2.4 0 0 1-.4 4.6H4.4Z" />
    <path d="M8.6 11.2 6.7 13.4h2.2L7.4 15.4" />
  </svg>
);

const icons: Record<WeatherIconKey, () => ReactElement> = {
  sun: Sun,
  moon: Moon,
  "cloud-sun": CloudSun,
  cloud: Cloud,
  fog: Fog,
  drizzle: Drizzle,
  rain: Rain,
  snow: Snow,
  thunder: Thunder,
};

export default function WeatherIcon({ icon }: { icon: WeatherIconKey }) {
  const Icon = icons[icon];
  return <Icon />;
}
