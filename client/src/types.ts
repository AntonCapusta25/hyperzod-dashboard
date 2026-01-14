export interface MerchantStats {
    total: number;
    published: number;
    unpublished: number;
    online: number;
}

export interface Merchant {
    id: string;
    name: string;
    status: 'published' | 'unpublished';
    isOnline: boolean;
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
