import { useEffect } from "react";
import { useLocation } from "react-router";

// BrowserRouter keeps the scroll offset across navigations, so following a link
// from halfway down the home page lands you halfway down the post. React
// Router's <ScrollRestoration> is data-router only, hence doing it by hand.
export function useScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // "instant" so it does not fight the reveal animations on the way in, and
    // so reduced-motion users are not scrolled smoothly against their setting.
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
}
