import { Link } from "react-router";

export default function NotFound() {
  return (
    <section className="py-12 text-center">
      <h2 className="font-inter-tight text-foreground mb-2 text-lg font-semibold">Page not found</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        That page doesn't exist - it may have moved or never been here at all.
      </p>
      <Link
        className="text-primary focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-offset-2"
        to="/"
      >
        Back home
      </Link>
    </section>
  );
}
