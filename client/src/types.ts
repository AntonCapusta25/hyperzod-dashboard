export interface MerchantStats {
    total: number;
    published: number;
    unpublished: number;
    online: number;
}

export interface Merchant {
    id: string;
    name: string;
    status: boolean;  // true = published, false = unpublished
    is_accepting_orders: boolean;
    is_open: boolean;  // Online = is_accepting_orders === true AND is_open === true
    city: string;
    address: string;
    phone: string;
    category: string;
    rating: number;
    createdAt: string | null;
}

export interface MerchantsResponse {
    success: boolean;
    stats: MerchantStats;
    merchants: Merchant[];
}
