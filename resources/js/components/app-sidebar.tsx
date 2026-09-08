import { Link } from '@inertiajs/react';
import {
    ChartLine,
    FolderGit2,
    Gauge,
    House,
    Layers,
    MailCheck,
    Network,
    PenLine,
    Rocket,
    TriangleAlert,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavConsole } from '@/components/nav-console';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import ArchitectureController from '@/actions/App/Http/Controllers/Admin/ArchitectureController';
import PostController from '@/actions/App/Http/Controllers/Admin/PostController';
import { home } from '@/routes';
import {
    analytics,
    dashboard,
    deliveries,
    deployments,
    errors,
    queue,
} from '@/routes/admin';
import type { NavItem } from '@/types';

/*
  Two groups, because the panel answers two different kinds of question.
  Monitoring is what the site is doing without you; Content is what you do to
  it. The hrefs are mixed on purpose: the monitoring pages are plain GETs and
  come from the named-route helpers, while the CRUD pages come from their
  controller actions so the form verbs travel with them.
*/
const monitoringNavItems: NavItem[] = [
    {
        title: 'Overview',
        href: dashboard(),
        icon: Gauge,
    },
    {
        title: 'Traffic',
        href: analytics(),
        icon: ChartLine,
    },
    {
        title: 'Errors',
        href: errors(),
        icon: TriangleAlert,
    },
    {
        title: 'Deployments',
        href: deployments(),
        icon: Rocket,
    },
    {
        title: 'Deliveries',
        href: deliveries(),
        icon: MailCheck,
    },
    {
        title: 'Queue',
        href: queue(),
        icon: Layers,
    },
];

const contentNavItems: NavItem[] = [
    {
        title: 'Posts',
        href: PostController.index(),
        icon: PenLine,
    },
    {
        title: 'Architecture',
        href: ArchitectureController.index(),
        icon: Network,
    },
];

/*
  NavFooter renders every item as a plain anchor with target="_blank" and has no
  internal-link branch, which is what "View site" wants: looking at the public
  page you just edited should not navigate the panel out from under you. The
  starter kit's laravel.com/docs entry is gone - it was boilerplate, not
  something this panel ever needed.
*/
const footerNavItems: NavItem[] = [
    {
        title: 'View site',
        href: home(),
        icon: House,
    },
    {
        title: 'Repository',
        href: 'https://github.com/juanplazadev',
        icon: FolderGit2,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain label="Monitoring" items={monitoringNavItems} />
                <NavMain label="Content" items={contentNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavConsole />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
