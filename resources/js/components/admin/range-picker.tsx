import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AnalyticsRangeOption } from '@/types/analytics';

type RangePickerProps = {
    value: string;
    options: AnalyticsRangeOption[];
    onSelect: (value: string) => void;
};

/**
 * The window switch shared by the traffic and errors pages.
 *
 * `aria-pressed` rather than a radio group: these are buttons that trigger a
 * partial reload, not a form control with a value to submit.
 *
 * Not every section has one. The deployments page shows a list Sentry returns
 * without a statsPeriod, so a picker there would be a control that changed
 * nothing.
 */
export default function RangePicker({
    value,
    options,
    onSelect,
}: RangePickerProps) {
    return (
        <div className="border-border flex rounded-lg border p-0.5">
            {options.map((option) => (
                <Button
                    key={option.value}
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={option.value === value}
                    className={cn(
                        'h-7 px-3 text-xs',
                        option.value === value &&
                            'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                    )}
                    onClick={() => onSelect(option.value)}
                >
                    {option.label}
                </Button>
            ))}
        </div>
    );
}
