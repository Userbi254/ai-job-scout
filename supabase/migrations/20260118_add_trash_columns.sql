-- Add proper trash state columns to workflow_runs
ALTER TABLE public.workflow_runs
  ADD COLUMN IF NOT EXISTS is_trashed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_from TEXT;

-- Create index for trash queries
CREATE INDEX IF NOT EXISTS idx_workflow_runs_is_trashed ON public.workflow_runs(is_trashed) WHERE is_trashed = true;

-- Migrate existing TRASHED items to new columns
UPDATE public.workflow_runs
SET 
  is_trashed = true,
  deleted_at = started_at,
  deleted_from = CASE 
    WHEN error_message = 'TRASHED_FROM_SEARCH' THEN 'search'
    WHEN error_message = 'TRASHED_FROM_CRAWL' THEN 'crawl'
    WHEN error_message = 'TRASHED_FROM_EXTRACT' THEN 'extract'
    WHEN error_message = 'TRASHED_FROM_SORT' THEN 'sort'
    WHEN error_message = 'TRASHED' THEN 'unknown'
    ELSE NULL
  END
WHERE error_message IN ('TRASHED', 'TRASHED_FROM_SEARCH', 'TRASHED_FROM_CRAWL', 'TRASHED_FROM_EXTRACT', 'TRASHED_FROM_SORT');

-- Comment explaining the new columns
COMMENT ON COLUMN public.workflow_runs.is_trashed IS 'Indicates if this item is in trash';
COMMENT ON COLUMN public.workflow_runs.deleted_at IS 'Timestamp when item was moved to trash';
COMMENT ON COLUMN public.workflow_runs.deleted_from IS 'Page from which item was deleted: search, crawl, extract, or sort';
