import Wordmark from '@/components/wordmark';

// The collapsed sidebar clips everything after the first child (ui/sidebar.tsx
// forces the menu button to size-8 under `group-data-[collapsible=icon]`), so
// the monogram tile has to lead and carry the mark on its own.
//
// The tile is deliberately not `bg-sidebar-primary`: that token resolves to the
// same accent as `--primary`, which would paint the mark's accented half onto
// its own colour and hide it.
export default function AppLogo() {
    return (
        <>
            <div className="bg-sidebar-accent border-sidebar-border flex aspect-square size-8 items-center justify-center rounded-md border">
                <Wordmark variant="monogram" className="text-sm" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <Wordmark className="mb-0.5 truncate leading-tight" />
            </div>
        </>
    );
}
