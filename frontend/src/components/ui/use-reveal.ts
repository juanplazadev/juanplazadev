import { useEffect, useRef } from "react";

// Adds data-revealed once the element scrolls into view; motion.css does the
// rest. Under prefers-reduced-motion the attribute is set immediately and no
// observer is created, so content can never be left stranded at opacity 0.
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.setAttribute("data-revealed", "");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute("data-revealed", "");
        // One-shot: sections do not re-hide on scroll back up.
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return ref;
}
