import { supabase } from '../../../lib/supabase';

/**
 * Get unique cities from delivery addresses
 */
export async function getCities(): Promise<string[]> {
    const { data } = await supabase
        .from('delivery_addresses')
        .select('city')
        .not('city', 'is', null)
        .order('city');

    if (!data) return [];

    // Get unique cities
    const uniqueCities = [...new Set(data.map(d => d.city).filter(Boolean))];
    return uniqueCities.sort();
}

/**
 * Get unique cities from merchants
 */
export async function getMerchantCities(): Promise<string[]> {
    const { data } = await supabase
        .from('merchants')
        .select('city')
        .not('city', 'is', null)
        .order('city');

    if (!data) return [];

    const uniqueCities = [...new Set(data.map(d => d.city).filter(Boolean))];
    return uniqueCities.sort();
}
