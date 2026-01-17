# Deploying Supabase Edge Function for Merchant Sync

## Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Supabase project linked

## Setup

1. **Link your Supabase project** (if not already done):
```bash
supabase link --project-ref oyeqtiovqtkwduzkvomr
```

2. **Set environment secrets** for the Edge Function:
```bash
supabase secrets set HYPERZOD_API_KEY=your_api_key_here
supabase secrets set HYPERZOD_TENANT_ID=3331
supabase secrets set HYPERZOD_BASE_URL=https://api.hyperzod.app
```

3. **Deploy the function**:
```bash
supabase functions deploy sync-merchants
```

## Usage

The function is now available at:
```
https://oyeqtiovqtkwduzkvomr.supabase.co/functions/v1/sync-merchants
```

Call it from the client using:
```typescript
const { data, error } = await supabase.functions.invoke('sync-merchants');
```

## Benefits
- ✅ No backend server needed
- ✅ API keys stay secure (server-side only)
- ✅ Runs on Supabase infrastructure
- ✅ Auto-scales
- ✅ Built-in authentication support

## Testing Locally

Run the function locally:
```bash
supabase functions serve sync-merchants --env-file ./supabase/.env.local
```

Then test with:
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/sync-merchants' \
  --header 'Authorization: Bearer YOUR_ANON_KEY'
```
