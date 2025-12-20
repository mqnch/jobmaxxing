-- Add date_posted column
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS date_posted TIMESTAMP WITH TIME ZONE;

-- Add is_trending column  
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT false NOT NULL;

-- Create index on date_posted for faster sorting
CREATE INDEX IF NOT EXISTS idx_jobs_date_posted ON jobs(date_posted DESC NULLS LAST);

-- Create index on is_trending for faster filtering
CREATE INDEX IF NOT EXISTS idx_jobs_is_trending ON jobs(is_trending) WHERE is_trending = true;

