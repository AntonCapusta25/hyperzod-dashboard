-- Manual Revenue Entries Table
-- For tracking catering orders and Revolut sales outside the main platform

CREATE TABLE IF NOT EXISTS manual_revenue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date DATE NOT NULL,
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN ('catering', 'revolut')),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_manual_revenue_date ON manual_revenue_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_manual_revenue_type ON manual_revenue_entries(entry_type);

-- Enable RLS
ALTER TABLE manual_revenue_entries ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (adjust based on your auth setup)
CREATE POLICY "Allow all operations on manual_revenue_entries" ON manual_revenue_entries
    FOR ALL USING (true) WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_manual_revenue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp
DROP TRIGGER IF EXISTS update_manual_revenue_entries_timestamp ON manual_revenue_entries;
CREATE TRIGGER update_manual_revenue_entries_timestamp
    BEFORE UPDATE ON manual_revenue_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_manual_revenue_timestamp();

-- Sample data (optional)
-- INSERT INTO manual_revenue_entries (entry_date, entry_type, amount, description) VALUES
-- ('2024-01-15', 'catering', 5000.00, 'Corporate event catering'),
-- ('2024-01-16', 'revolut', 1200.00, 'Revolut sales for January 16');
