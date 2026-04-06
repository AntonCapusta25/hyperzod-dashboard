import { supabase } from '../../../lib/supabase';

export interface PublicChef {
    merchant_id: string;
    name: string;
    city: string;
    cuisine: string[];
    logo_url: string | null;
    cover_url: string | null;
    rating: number;
    message?: string;
}

/**
 * Fetches all published merchants for the public showcase page
 */
export async function getPublicChefs(): Promise<PublicChef[]> {
    const { data: merchants, error } = await supabase
        .from('merchants')
        .select('merchant_id, name, city, merchant_categories, logo_image_url, cover_image_url, average_rating, storefront_message')
        .eq('status', true);

    if (error) {
        console.error('Error fetching public chefs:', error);
        return [];
    }

    if (!merchants) return [];

    return merchants.map(m => {
        // Extract cuisine names from merchant_categories JSONB
        const categories = m.merchant_categories as any[] || [];
        const cuisines = categories
            .map((cat: any) => cat.name)
            .filter((name: string) => name && !['New Chefs', 'Beverages'].includes(name));

        return {
            merchant_id: m.merchant_id,
            name: m.name,
            city: m.city || 'Unknown',
            cuisine: cuisines.length > 0 ? cuisines : ['Home Cooked'],
            logo_url: m.logo_image_url,
            cover_url: m.cover_image_url,
            rating: Number(m.average_rating || 0),
            message: m.storefront_message
        };
    });
}
