// Solid dot plus a pinging ring. animate-ping ships with Tailwind, so the only
// thing this needs from motion.css is the reduced-motion collapse.
export default function StatusDot({ active = true }: { active?: boolean }) {
  return (
    <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
      {active && <span className="bg-primary/75 absolute inline-flex h-full w-full animate-ping rounded-full" />}
      <span className="bg-primary relative inline-flex h-1.5 w-1.5 rounded-full" />
    </span>
  );
}
