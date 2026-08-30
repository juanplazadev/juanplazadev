import { Outlet } from "react-router";

import Header from "@/components/ui/header";
import SiteFrame from "@/components/ui/site-frame";

// The landing page: full hero with the avatar, name and stats.
export default function RootLayout() {
  return (
    <SiteFrame header={<Header />}>
      <Outlet />
    </SiteFrame>
  );
}
