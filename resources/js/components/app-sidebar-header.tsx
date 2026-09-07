import { Breadcrumbs } from '@/components/breadcrumbs';
import PalettePicker from '@/components/palette-picker';
import ThemeToggle from '@/components/theme-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            {/*
              The same two controls the public site's header carries, so the
              panel is not the one place in the app where the palette cannot be
              changed - every admin token resolves through --accent-*, so the
              sidebar and charts re-tint with it.

              The picker is hidden below sm: six dots plus a breadcrumb trail
              does not fit a phone, and the theme toggle is the half worth
              keeping at every width.
            */}
            <div className="ml-auto flex items-center gap-2">
                <PalettePicker className="hidden sm:flex" />
                <ThemeToggle />
            </div>
        </header>
    );
}
