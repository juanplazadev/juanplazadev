import type { Auth } from '@/types/auth';
import type { Palette } from '@/types/content';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            palette: string;
            palettes: Palette[];
            /** Availability signalling on the landing page - see config/site.php. */
            hiring: boolean;
            [key: string]: unknown;
        };
    }
}
