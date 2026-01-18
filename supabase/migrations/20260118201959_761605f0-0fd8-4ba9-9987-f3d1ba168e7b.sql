-- Add trash functionality columns to workflow_runs
ALTER TABLE public.workflow_runs 
ADD COLUMN IF NOT EXISTS is_trashed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_from text;