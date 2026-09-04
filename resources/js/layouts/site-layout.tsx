import type { ReactNode } from 'react';

import Header from '@/components/site/header';
import SiteFrame from '@/components/site/site-frame';

// The landing page: full hero with the avatar, name and stats.
export default function SiteLayout({ children }: { children: ReactNode }) {
    return <SiteFrame header={<Header />}>{children}</SiteFrame>;
}
