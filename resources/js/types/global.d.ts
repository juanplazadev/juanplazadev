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
            [key: string]: unknown;
        };
    }
}
