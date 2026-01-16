import type { DateRange, DateRangePreset } from '../../../types/analytics';

/**
 * Get date range for a preset option
 */
export function getDateRangeForPreset(preset: DateRangePreset): DateRange {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
        case 'this_week': {
            // Sunday to Saturday
            const dayOfWeek = today.getDay();
            const from = new Date(today);
            from.setDate(today.getDate() - dayOfWeek);
            const to = new Date(from);
            to.setDate(from.getDate() + 6);
            to.setHours(23, 59, 59, 999);
            return { from, to, preset };
        }

        case 'last_week': {
            const dayOfWeek = today.getDay();
            const from = new Date(today);
            from.setDate(today.getDate() - dayOfWeek - 7);
            const to = new Date(from);
            to.setDate(from.getDate() + 6);
            to.setHours(23, 59, 59, 999);
            return { from, to, preset };
        }

        case 'last_month': {
            const from = new Date(today);
            from.setDate(today.getDate() - 30);
            const to = new Date(today);
            to.setHours(23, 59, 59, 999);
            return { from, to, preset };
        }

        case 'last_3_months': {
            const from = new Date(today);
            from.setMonth(today.getMonth() - 3);
            const to = new Date(today);
            to.setHours(23, 59, 59, 999);
            return { from, to, preset };
        }

        case 'custom':
        default:
            return { from: today, to: today, preset: 'custom' };
    }
}

/**
 * Format date range for display
 */
export function formatDateRange(range: DateRange): string {
    const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: range.from.getFullYear() !== range.to.getFullYear() ? 'numeric' : undefined
    };

    const fromStr = range.from.toLocaleDateString('en-US', options);
    const toStr = range.to.toLocaleDateString('en-US', options);

    return `${fromStr} - ${toStr}`;
}

/**
 * Get preset label
 */
export function getPresetLabel(preset: DateRangePreset): string {
    switch (preset) {
        case 'this_week': return 'This Week';
        case 'last_week': return 'Last Week';
        case 'last_month': return 'Last 30 Days';
        case 'last_3_months': return 'Last 3 Months';
        case 'custom': return 'Custom Range';
        default: return preset;
    }
}
