// =====================================================
// ORDERS MODULE - TYPESCRIPT TYPES
// =====================================================

export interface Order {
    id: string;
    order_id: number;
    order_uuid: string;
    tenant_id: number;
    user_id: number | null;
    merchant_id: string;
    order_status: number;
    order_type: string;
    order_amount: number;
    currency_code: string;
    payment_mode_id: number | null;
    payment_mode_name: string | null;
    online_payment_status: string | null;
    online_payment_label: string | null;
    is_scheduled: boolean;
    is_user_first_order: boolean;
    delivery_timestamp: number | null;
    created_timestamp: number;
    hyperzod_updated_at: string | null;
    synced_at: string;
    locale: string;
    timezone: string | null;
    device: string | null;
    ip: string | null;
    meta: any;
    order_note: string | null;
    delivery_address_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface OrderItem {
    id: string;
    order_id: number;
    merchant_id: string;
    product_id: string;
    product_name: string;
    item_image_url: string | null;
    quantity: number;
    product_price: number;
    sub_total_amount: number;
    tax_percent: number;
    discount_percent: number;
    tax: number;
    taxable_amount: number | null;
    product_options: any;
    product_cost_price: number | null;
    sub_total_cost_amount: number | null;
    created_at: string;
}

export interface OrderStatusHistory {
    id: string;
    order_id: number;
    order_status: number;
    timestamp: string;
    local_timestamp: string | null;
    client_medium: number | null;
    referer: string | null;
    user_info: any;
    created_at: string;
}

export interface DeliveryAddress {
    id: string;
    hyperzod_address_id: string | null;
    user_id: number | null;
    tenant_id: number | null;
    address_type: string | null;
    address: string;
    building: string | null;
    area: string | null;
    landmark: string | null;
    city: string | null;
    region: string | null;
    zip_code: string | null;
    country: string | null;
    country_code: string;
    location_lat: number | null;
    location_lon: number | null;
    created_at: string;
    updated_at: string;
}

// Order with related data
export interface OrderWithDetails extends Order {
    items?: OrderItem[];
    status_history?: OrderStatusHistory[];
    delivery_address?: DeliveryAddress;
}

// Order filters
export interface OrderFilters {
    order_status?: number[];
    order_type?: string[];
    payment_mode?: string[];
    date_from?: string;
    date_to?: string;
    min_amount?: number;
    max_amount?: number;
    search?: string; // Search by order_id or customer name
    user_id?: number;
    merchant_id?: string;
}

// Order statistics
export interface OrderStats {
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    orders_by_status: {
        pending: number;
        confirmed: number;
        preparing: number;
        ready: number;
        out_for_delivery: number;
        delivered: number;
        cancelled: number;
    };
    orders_by_type: {
        delivery: number;
        pickup: number;
        custom_1: number;
    };
    orders_by_payment: {
        [key: string]: number;
    };
}

// API response types
export interface OrdersResponse {
    data: Order[];
    count: number;
}

export interface OrderStatsResponse {
    data: OrderStats;
}

// Order status enum
export const OrderStatus = {
    PENDING: 0,
    CONFIRMED: 1,
    PREPARING: 2,
    READY: 3,
    OUT_FOR_DELIVERY: 4,
    DELIVERED: 5,
    CANCELLED: 6,
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

// Order status labels
export const ORDER_STATUS_LABELS = {
    [OrderStatus.PENDING]: 'Pending',
    [OrderStatus.CONFIRMED]: 'Confirmed',
    [OrderStatus.PREPARING]: 'Preparing',
    [OrderStatus.READY]: 'Ready',
    [OrderStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
    [OrderStatus.DELIVERED]: 'Delivered',
    [OrderStatus.CANCELLED]: 'Cancelled',
} as const;

// Order status colors for badges
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
    [OrderStatus.CONFIRMED]: 'bg-blue-100 text-blue-800',
    [OrderStatus.PREPARING]: 'bg-purple-100 text-purple-800',
    [OrderStatus.READY]: 'bg-indigo-100 text-indigo-800',
    [OrderStatus.OUT_FOR_DELIVERY]: 'bg-orange-100 text-orange-800',
    [OrderStatus.DELIVERED]: 'bg-green-100 text-green-800',
    [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800',
} as const;
