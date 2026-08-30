import { Outlet } from "react-router";

import PageHeader from "@/components/ui/page-header";
import SiteFrame from "@/components/ui/site-frame";
import { useScrollToTop } from "@/components/ui/use-scroll-to-top";

// Everything that is not the landing page. The hero is a first impression, not
// chrome — repeating it above every blog post would push the post itself below
// the fold.
export default function PageLayout() {
  useScrollToTop();

  return (
    <SiteFrame header={<PageHeader />}>
      <Outlet />
    </SiteFrame>
  );
}
