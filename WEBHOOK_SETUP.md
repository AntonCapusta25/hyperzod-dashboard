# Merchant Sync - Supabase Edge Function

## What it does
- Fetches latest merchant data from Hyperzod API (first 3 pages = ~90 merchants)
- Updates Supabase database with current status (online/offline, accepting orders, etc.)
- Runs entirely on Supabase - no backend server needed!

## Deployment

### 1. Set Hyperzod API credentials as secrets:
```bash
supabase secrets set HYPERZOD_API_KEY=your_api_key_here
supabase secrets set HYPERZOD_TENANT_ID=3331
supabase secrets set HYPERZOD_BASE_URL=https://api.hyperzod.app
```

### 2. Deploy the function:
```bash
supabase login
supabase functions deploy sync-merchants
```

## Usage

The function is available at:
```
https://oyeqtiovqtkwduzkvomr.supabase.co/functions/v1/sync-merchants
```

Call it from your dashboard:
```typescript
const { data } = await supabase.functions.invoke('sync-merchants');
console.log(`Synced ${data.count} merchants, ${data.online} online`);
```

## Efficiency
- Only fetches first 3 pages (configurable via MAX_PAGES constant)
- Batches database updates (100 merchants per batch)
- Typically completes in 2-3 seconds
- Perfect for manual refresh or scheduled cron jobs

