-- Add structured flags parsed from SimplifyJobs listing emojis (🛂 / 🇺🇸 / 🎓)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS no_sponsorship BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS requires_us_citizenship BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS requires_advanced_degree BOOLEAN DEFAULT false NOT NULL;
