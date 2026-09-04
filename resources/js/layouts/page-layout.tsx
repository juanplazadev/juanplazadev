import type { ReactNode } from 'react';

import PageHeader from '@/components/site/page-header';
import SiteFrame from '@/components/site/site-frame';

// Everything that is not the landing page. The hero is a first impression, not
// chrome - repeating it above every blog post would push the post itself below
// the fold.
//
// The scroll reset the react-router version needed here is gone: Inertia
// returns to the top of the page on a visit by default.
export default function PageLayout({ children }: { children: ReactNode }) {
    return <SiteFrame header={<PageHeader />}>{children}</SiteFrame>;
}
