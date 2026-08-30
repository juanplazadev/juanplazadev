export default function Footer() {
  const socials = [
    {
      label: "GitHub",
      href: "https://github.com/jplaza88",
      external: true,
      icon: (
        <svg className="fill-current" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
          <path d="M7.95 0C3.578 0 0 3.578 0 7.95c0 3.479 2.286 6.46 5.466 7.553.397.1.497-.199.497-.397v-1.392c-2.187.497-2.683-.994-2.683-.994-.398-.894-.895-1.192-.895-1.192-.696-.497.1-.497.1-.497.795.1 1.192.795 1.192.795.696 1.292 1.888.894 2.286.696.1-.497.298-.895.497-1.093-1.79-.2-3.578-.895-3.578-3.976 0-.894.298-1.59.795-2.087-.1-.198-.397-.993.1-2.086 0 0 .695-.2 2.186.795a6.408 6.408 0 0 1 1.987-.299c.696 0 1.392.1 1.988.299 1.49-.994 2.186-.796 2.186-.796.398 1.094.199 1.889.1 2.087.496.597.795 1.292.795 2.087 0 3.081-1.889 3.677-3.677 3.876.298.398.596.895.596 1.59v2.187c0 .198.1.496.596.397C13.714 14.41 16 11.43 16 7.95 15.9 3.578 12.323 0 7.95 0Z" />
        </svg>
      ),
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/juan-plaza-59a6a9296",
      external: true,
      icon: (
        <svg className="fill-current" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
          <path d="M3.6 5.9H.9V15h2.7V5.9ZM2.25 1a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2ZM15 9.8c0-2.4-1.3-3.9-3.4-3.9-1.1 0-1.9.5-2.4 1.2h-.05V5.9H6.5V15h2.7v-4.6c0-1.2.3-2.2 1.6-2.2 1.3 0 1.4 1.1 1.4 2.3V15H15V9.8Z" />
        </svg>
      ),
    },
    {
      label: "Email",
      href: "mailto:admin@juanplaza.dev",
      external: false,
      icon: (
        <svg
          className="stroke-current"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="1.75" y="3.25" width="12.5" height="9.5" rx="2" />
          <path d="m2.5 5 5.5 3.75L13.5 5" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="space-y-12 pb-16 text-center">
      {/* Initials monogram */}
      <div>
        <span className="font-inter-tight text-foreground text-4xl font-bold tracking-tight">
          J<span className="text-primary">P</span>
        </span>
      </div>
      <div className="space-y-6">
        {/* Social icons */}
        <ul className="inline-flex gap-4">
          {socials.map((social, index) => (
            <li key={index}>
              <a
                className="border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary focus-visible:ring-ring focus-visible:ring-offset-background flex h-8 w-8 items-center justify-center rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                href={social.href}
                aria-label={social.label}
                {...(social.external ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {social.icon}
              </a>
            </li>
          ))}
        </ul>
        {/* Copyright notes */}
        <div className="text-muted-foreground/70 space-y-1 text-sm">
          <p>&copy; 2026 Juan Plaza. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
