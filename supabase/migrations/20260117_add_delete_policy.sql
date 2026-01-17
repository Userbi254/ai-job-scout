-- Add DELETE policy for workflow_runs
DROP POLICY IF EXISTS "Users can delete own runs" ON public.workflow_runs;
CREATE POLICY "Users can delete own runs" ON public.workflow_runs 
  FOR DELETE 
  USING (auth.uid() = user_id OR user_id IS NULL);
