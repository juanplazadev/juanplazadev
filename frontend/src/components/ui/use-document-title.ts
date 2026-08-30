import { useEffect } from "react";

// There is no SSR and no head manager, so the tab title is set from the page
// component. The previous title is restored on unmount, which keeps a fast
// back-navigation from leaving a stale post title on the home page.
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
