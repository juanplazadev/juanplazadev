import type { ReactNode } from 'react';

import Footer from './footer';

type SiteFrameProps = {
    /** The hero on the home page, the compact bar everywhere else. */
    header: ReactNode;
    children: ReactNode;
};

// The card shell every page sits in. Was inlined in RootLayout, which meant a
// second layout could not exist without duplicating five nested divs whose only
// job is the centred, bordered sheet.
export default function SiteFrame({ header, children }: SiteFrameProps) {
    return (
        <div className="overflow-hidden supports-[overflow:clip]:overflow-clip">
            <div className="mx-auto max-w-[728px]">
                <div className="border-border bg-background box-content min-h-screen w-full sm:rounded-b-2xl sm:border-x sm:shadow-sm">
                    <div className="px-3 md:px-16">
                        <div className="flex min-h-screen flex-col">
                            {header}

                            <main className="grow space-y-12 py-12">
                                {children}
                            </main>

                            <Footer />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
