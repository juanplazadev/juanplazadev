import { usePage } from '@inertiajs/react';
import {
    Bug,
    Cloud,
    Inbox,
    Send,
    SquareArrowOutUpRight,
    type LucideIcon,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

/*
  Keyed by the enum case, not indexed by position, so reordering or removing a
  console server side cannot silently repaint the rest with the wrong glyphs.

  Deliberately NOT MailCheck for Mailgun: that one is Deliveries' sidebar icon,
  and .ai/rules/components-admin.md binds it to the overview card that links
  there. Two rows in the same sidebar carrying it would make the pairing mean
  nothing.
*/
const consoleIcons: Record<string, LucideIcon> = {
    sentry: Bug,
    cloudflare: Cloud,
    mailgun: Send,
    mailpit: Inbox,
};

/*
  One footer row rather than four. The consoles are a place you go occasionally,
  and listing them flat would put more rows between the nav and the user menu
  than the panel's own sections have - collapsing them keeps the footer at three
  and survives the icon-width sidebar, where a dropdown still has somewhere to
  open.

  The list itself is a shared prop: App\Enums\Console drops any service this
  environment has no credentials for, so Mailpit appears locally and never in
  production without this component knowing what an environment is.
*/
export function NavConsole() {
    const { consoles } = usePage().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    if (consoles.length === 0) {
        return null;
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
                            tooltip="Consoles"
                            data-test="consoles-menu"
                        >
                            <SquareArrowOutUpRight className="h-5 w-5" />
                            <span>Consoles</span>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="min-w-44 rounded-lg"
                        align="start"
                        side={
                            isMobile
                                ? 'bottom'
                                : state === 'collapsed'
                                  ? 'right'
                                  : 'top'
                        }
                    >
                        {consoles.map((console) => {
                            const Icon = consoleIcons[console.id];

                            return (
                                <DropdownMenuItem key={console.id} asChild>
                                    <a
                                        className="block w-full cursor-pointer"
                                        href={console.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {Icon && (
                                            <Icon
                                                className="mr-2"
                                                aria-hidden="true"
                                            />
                                        )}
                                        {console.label}
                                    </a>
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
