-- Add applied_at column to track when job status was set to "applied"
ALTER TABLE user_job 
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE;

-- Add last_heard_at column to track when status changes to interview/offer/rejected
ALTER TABLE user_job
ADD COLUMN IF NOT EXISTS last_heard_at TIMESTAMP WITH TIME ZONE;

-- Create index on applied_at for faster sorting/filtering
CREATE INDEX IF NOT EXISTS idx_user_job_applied_at ON user_job(applied_at DESC NULLS LAST);

-- Create index on last_heard_at for faster sorting/filtering
CREATE INDEX IF NOT EXISTS idx_user_job_last_heard_at ON user_job(last_heard_at DESC NULLS LAST);

