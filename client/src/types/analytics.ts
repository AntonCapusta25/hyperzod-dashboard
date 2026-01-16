export interface WeeklyAnalytics {
    // Metrics we can calculate
    new_customers: number; // First-time buyers this week
    activation_rate: number; // % of signups that ordered within 7 days
    completed_orders: number; // Delivered orders
    completed_orders_amsterdam: number; // Delivered orders in Amsterdam
    repeat_rate_30d: number; // % of customers who ordered again within 30 days
    active_chefs: number; // Active merchants accepting orders
    active_chefs_amsterdam: number; // Active merchants in Amsterdam

    // Metrics requiring configuration
    cac_per_customer?: number; // Customer Acquisition Cost (needs marketing spend)
    contribution_margin_per_order?: number; // Margin per order (needs COGS, commission)
}

// Generic analytics (same as WeeklyAnalytics but for any date range)
export type Analytics = WeeklyAnalytics;

export interface AnalyticsConfig {
    weekly_marketing_spend?: number; // Marketing spend for the week
    default_cogs_percentage?: number; // Default COGS as % of order amount
    default_commission_percentage?: number; // Default commission as % of order amount
}

export interface AnalyticsFilters {
    week_start?: string; // ISO date string
    week_end?: string; // ISO date string
    date_from?: string; // ISO date string (generic)
    date_to?: string; // ISO date string (generic)
    city?: string; // Filter by city (e.g., "Amsterdam")
}

/**
 * Date range preset options
 */
export type DateRangePreset = 'this_week' | 'last_week' | 'last_month' | 'last_3_months' | 'custom';

/**
 * Date range selection
 */
export interface DateRange {
    from: Date;
    to: Date;
    preset?: DateRangePreset;
}
