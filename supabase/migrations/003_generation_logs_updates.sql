-- Add missing columns to generation_logs table
ALTER TABLE generation_logs 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS credits_used DECIMAL(10,2) DEFAULT 0.10;

-- Update existing rows
UPDATE generation_logs SET status = 'completed' WHERE status IS NULL;
UPDATE generation_logs SET credits_used = 0.10 WHERE credits_used IS NULL;
