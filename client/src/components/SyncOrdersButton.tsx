import { useState } from 'react';

export default function SyncOrdersButton() {
    const [syncing, setSyncing] = useState(false);

    const handleSync = async () => {
        if (!confirm('Sync orders from Hyperzod? This may take a few minutes.')) return;

        setSyncing(true);
        try {
            const response = await fetch('http://localhost:3001/api/sync-orders', {
                method: 'POST'
            });
            const result = await response.json();

            if (result.success) {
                alert('✅ Orders synced successfully!');
                window.location.reload();
            } else {
                alert('❌ Sync failed: ' + result.error);
            }
        } catch (error) {
            alert('❌ Sync failed: ' + (error as Error).message);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
            {syncing ? '⏳ Syncing...' : '🔄 Sync Orders'}
        </button>
    );
}
