import { supabase } from './supabase';

const CAMPAIGN_ASSETS_BUCKET = 'campaign-assets';
const CAMPAIGN_ATTACHMENTS_BUCKET = 'campaign-attachments';

/**
 * Upload usage for campaign images (pasted/inserted in editor)
 */
export async function uploadCampaignImage(file: File): Promise<string> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `images/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(CAMPAIGN_ASSETS_BUCKET)
            .upload(filePath, file);

        if (uploadError) {
            // Attempt to create bucket if it doesn't exist (only works if policy allows, otherwise manual creation needed)
            // Ideally buckets should be pre-created.
            throw uploadError;
        }

        const { data } = supabase.storage
            .from(CAMPAIGN_ASSETS_BUCKET)
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

/**
 * Upload attachment for campaign
 */
export async function uploadCampaignAttachment(file: File): Promise<{ url: string; name: string; type: string }> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = `attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(CAMPAIGN_ATTACHMENTS_BUCKET)
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from(CAMPAIGN_ATTACHMENTS_BUCKET)
            .getPublicUrl(filePath);

        return {
            url: data.publicUrl,
            name: file.name,
            type: fileExt || 'unknown'
        };
    } catch (error) {
        console.error('Error uploading attachment:', error);
        throw error;
    }
}
