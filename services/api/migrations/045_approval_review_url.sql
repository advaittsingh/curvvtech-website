-- Optional URL for clients to preview a specific change (staging site, Figma, etc.)
ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS review_url TEXT;
