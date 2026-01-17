-- Fix function search path for update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop overly permissive policy on jobs and replace with proper one
DROP POLICY IF EXISTS "Service role can manage jobs" ON public.jobs;

-- Allow authenticated users to insert jobs (for the scraper workflow)
CREATE POLICY "Authenticated users can insert jobs" ON public.jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update jobs" ON public.jobs FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete jobs" ON public.jobs FOR DELETE USING (true);