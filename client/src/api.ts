import type { MerchantsResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function fetchMerchants(): Promise<MerchantsResponse> {
    const response = await fetch(`${API_BASE_URL}/api/merchants`);

    if (!response.ok) {
        throw new Error(`Failed to fetch merchants: ${response.statusText}`);
    }

    return response.json();
}
