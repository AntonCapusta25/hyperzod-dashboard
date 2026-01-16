// =====================================================
// MARKETING MODULE TYPES
// =====================================================
// TypeScript interfaces for the email campaign system
// Mapped from Hyperzod API and Supabase schema
// =====================================================

// =====================================================
// CLIENT TYPES (from Hyperzod API)
// =====================================================

export interface Client {
    id: string;
    hyperzod_id: number;
    tenant_id?: number;
    first_name?: string;
    last_name?: string;
    mobile?: string;
    mobile_verified_at?: string;
    email?: string;
    email_verified_at?: string;
    country_code?: string;
    is_new_user: boolean;
    status: number;
    tenants_limit?: number;
    utm_data?: Record<string, any>;
    referer?: string;
    import_id?: number;
    meta?: Record<string, any>;

    // Computed fields
    full_name?: string;
    status_name?: string;
    is_email_verified: boolean;
    is_mobile_verified: boolean;

    // Engagement tracking
    last_email_opened_at?: string;
    last_email_clicked_at?: string;
    email_bounce_count: number;
    email_unsubscribed: boolean;
    email_unsubscribed_at?: string;

    // Order analytics
    total_orders: number;
    total_spent: number;
    last_order_date?: string;
    average_order_value: number;

    // Timestamps
    synced_at: string;
    hyperzod_created_at?: string;
    hyperzod_updated_at?: string;
    hyperzod_deleted_at?: string;
    created_at: string;
    updated_at: string;
}

export interface ClientTag {
    id: string;
    name: string;
    color: string;
    description?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface ClientTagAssignment {
    id: string;
    client_id: string;
    tag_id: string;
    assigned_by?: string;
    assigned_at: string;
}

// =====================================================
// SEGMENT TYPES
// =====================================================

export type SegmentType = 'static' | 'dynamic';

export interface SegmentRule {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
    value?: any;
}

export interface SegmentFilterRules {
    operator: 'AND' | 'OR';
    rules: SegmentRule[];
}

export interface Segment {
    id: string;
    name: string;
    description?: string;
    type: SegmentType;
    filter_rules: SegmentFilterRules;
    client_count: number;
    last_calculated_at?: string;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface SegmentMember {
    id: string;
    segment_id: string;
    client_id: string;
    added_by?: string;
    added_at: string;
}

// =====================================================
// EMAIL TEMPLATE TYPES
// =====================================================

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    html_content: string;
    text_content?: string;
    variables: string[];
    thumbnail_url?: string;
    created_by?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// =====================================================
// CAMPAIGN TYPES
// =====================================================

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';

export interface Campaign {
    id: string;
    name: string;
    subject: string;
    template_id?: string;
    segment_id?: string;
    status: CampaignStatus;
    scheduled_at?: string;
    sent_at?: string;
    from_name: string;
    from_email: string;
    reply_to?: string;
    attachments?: { name: string; url: string; type: string }[];

    // Stats
    total_recipients: number;
    emails_sent: number;
    emails_delivered: number;
    emails_opened: number;
    emails_clicked: number;
    emails_bounced: number;
    emails_unsubscribed: number;

    created_by?: string;
    created_at: string;
    updated_at: string;

    // Relations (populated via joins)
    template?: EmailTemplate;
    segment?: Segment;
}

export type EmailEventType = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'spam' | 'unsubscribed';

export interface CampaignEvent {
    id: string;
    campaign_id: string;
    client_id: string;
    event_type: EmailEventType;
    link_url?: string;
    user_agent?: string;
    ip_address?: string;
    sendgrid_event_id?: string;
    sendgrid_message_id?: string;
    metadata?: Record<string, any>;
    created_at: string;
}

// =====================================================
// WEBHOOK TYPES
// =====================================================

export interface WebhookSyncLog {
    id: string;
    source: 'hyperzod' | 'sendgrid';
    event_type: string;
    payload: Record<string, any>;
    processed: boolean;
    error_message?: string;
    created_at: string;
    processed_at?: string;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
}

export interface HyperzodApiResponse<T> {
    success: boolean;
    data: {
        current_page: number;
        data: T[];
        first_page_url: string;
        from: number;
        last_page: number;
        last_page_url: string;
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
        next_page_url: string | null;
        path: string;
        per_page: number;
        prev_page_url: string | null;
        to: number;
        total: number;
    };
    service: string;
    status_code: number;
}

// =====================================================
// FILTER TYPES
// =====================================================

export interface ClientFilters {
    search?: string;
    status?: number;
    tags?: string[];
    email_verified?: boolean;
    mobile_verified?: boolean;
    email_unsubscribed?: boolean;
    min_total_spent?: number;
    max_total_spent?: number;
    min_total_orders?: number;
    max_total_orders?: number;
    last_order_after?: string;
    last_order_before?: string;
}

export interface CampaignFilters {
    status?: CampaignStatus[];
    created_by?: string;
    scheduled_after?: string;
    scheduled_before?: string;
}
