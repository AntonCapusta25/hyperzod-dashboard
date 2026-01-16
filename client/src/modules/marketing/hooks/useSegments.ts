import { useState, useEffect } from 'react';
import { fetchSegments, createSegment, updateSegment, deleteSegment, previewSegmentCount } from '../api/segments';
import type { Segment } from '../../../types/marketing';

export function useSegments() {
    const [segments, setSegments] = useState<Segment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadSegments = async () => {
        try {
            setLoading(true);
            const response = await fetchSegments(1, 100);
            setSegments(response.data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load segments'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSegments();
    }, []);

    const addSegment = async (segment: Partial<Segment>) => {
        try {
            const newSegment = await createSegment(segment);
            setSegments([newSegment, ...segments]);
            return newSegment;
        } catch (err) {
            throw err instanceof Error ? err : new Error('Failed to create segment');
        }
    };

    const editSegment = async (id: string, updates: Partial<Segment>) => {
        try {
            const updated = await updateSegment(id, updates);
            setSegments(segments.map(s => s.id === id ? updated : s));
            return updated;
        } catch (err) {
            throw err instanceof Error ? err : new Error('Failed to update segment');
        }
    };

    const removeSegment = async (id: string) => {
        try {
            await deleteSegment(id);
            setSegments(segments.filter(s => s.id !== id));
        } catch (err) {
            throw err instanceof Error ? err : new Error('Failed to delete segment');
        }
    };

    const getPreviewCount = async (rules: any) => {
        return await previewSegmentCount(rules);
    };

    return {
        segments,
        loading,
        error,
        refresh: loadSegments,
        addSegment,
        editSegment,
        removeSegment,
        getPreviewCount
    };
}
