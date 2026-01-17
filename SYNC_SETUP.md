# Daily Order Sync Setup

## Manual Sync
A "Sync Orders" button has been added to the KPIs page. Click it to manually sync orders from Hyperzod.

## Automatic Daily Sync

### Option 1: Using cron (Linux/Mac)
1. Open crontab:
   ```bash
   crontab -e
   ```

2. Add this line to run daily at 2 AM:
   ```
   0 2 * * * cd /Users/alexandrfilippov/Desktop/hyperzod-dashboard && node scripts/sync-orders.js >> logs/sync.log 2>&1
   ```

3. Create logs directory:
   ```bash
   mkdir -p /Users/alexandrfilippov/Desktop/hyperzod-dashboard/logs
   ```

### Option 2: Using node-cron (Recommended)
1. Install node-cron:
   ```bash
   cd server
   npm install node-cron
   ```

2. Add to `server/index.js`:
   ```javascript
   import cron from 'node-cron';
   
   // Run daily at 2 AM
   cron.schedule('0 2 * * *', async () => {
       console.log('🕐 Running scheduled order sync...');
       try {
           await execAsync('node scripts/sync-orders.js');
           console.log('✅ Scheduled sync completed');
       } catch (error) {
           console.error('❌ Scheduled sync failed:', error);
       }
   });
   ```

### Option 3: Supabase Edge Function (Cloud)
Create a Supabase Edge Function that runs on a schedule using pg_cron.

## Testing
Run manual sync:
```bash
node scripts/sync-orders.js
```

Run dry-run to test without writing:
```bash
node scripts/sync-orders.js --dry-run
```
