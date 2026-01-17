-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  summary TEXT,
  skills TEXT[] DEFAULT '{}',
  experience JSONB DEFAULT '[]',
  education JSONB DEFAULT '[]',
  certifications TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create CV templates table
CREATE TABLE IF NOT EXISTS public.cv_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  preview_url TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cv_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view templates" ON public.cv_templates;
CREATE POLICY "Anyone can view templates" ON public.cv_templates FOR SELECT USING (true);

-- Insert default CV templates
INSERT INTO public.cv_templates (name, description, template_data) VALUES
('Professional', 'Clean and professional layout ideal for corporate roles', '{"style": "professional", "colors": {"primary": "#1a1a1a", "accent": "#3b82f6"}, "sections": ["summary", "experience", "education", "skills"]}'),
('Modern', 'Contemporary design with bold typography', '{"style": "modern", "colors": {"primary": "#0f172a", "accent": "#8b5cf6"}, "sections": ["summary", "skills", "experience", "education"]}'),
('Minimal', 'Simple and elegant with focus on content', '{"style": "minimal", "colors": {"primary": "#374151", "accent": "#10b981"}, "sections": ["summary", "experience", "skills", "education"]}'),
('Creative', 'Unique layout for creative professionals', '{"style": "creative", "colors": {"primary": "#1e1e1e", "accent": "#f59e0b"}, "sections": ["summary", "skills", "experience", "projects"]}')
ON CONFLICT DO NOTHING;

-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  company TEXT,
  employment_details TEXT[] DEFAULT '{}',
  payment_method TEXT,
  amount TEXT,
  starting_date TEXT,
  skills_needed TEXT[] DEFAULT '{}',
  requirements TEXT[] DEFAULT '{}',
  deadline TEXT,
  application_url TEXT,
  site_url TEXT,
  relevance_score INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view jobs" ON public.jobs;
CREATE POLICY "Anyone can view jobs" ON public.jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage jobs" ON public.jobs;
CREATE POLICY "Service role can manage jobs" ON public.jobs FOR ALL USING (true);

-- Create workflow_runs table to track scraping progress
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'searching', 'crawling', 'scraping', 'sorting', 'completed', 'failed')),
  query TEXT,
  location TEXT,
  search_results JSONB DEFAULT '[]',
  crawled_pages JSONB DEFAULT '[]',
  extracted_jobs JSONB DEFAULT '[]',
  sorted_jobs JSONB DEFAULT '[]',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own runs" ON public.workflow_runs;
CREATE POLICY "Users can view own runs" ON public.workflow_runs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create runs" ON public.workflow_runs;
CREATE POLICY "Users can create runs" ON public.workflow_runs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own runs" ON public.workflow_runs;
CREATE POLICY "Users can update own runs" ON public.workflow_runs FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Create user_cvs table for generated CVs
CREATE TABLE IF NOT EXISTS public.user_cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.cv_templates(id),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_cvs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own CVs" ON public.user_cvs;
CREATE POLICY "Users can view own CVs" ON public.user_cvs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own CVs" ON public.user_cvs;
CREATE POLICY "Users can create own CVs" ON public.user_cvs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own CVs" ON public.user_cvs;
CREATE POLICY "Users can update own CVs" ON public.user_cvs FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own CVs" ON public.user_cvs;
CREATE POLICY "Users can delete own CVs" ON public.user_cvs FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_user_cvs_updated_at ON public.user_cvs;
CREATE TRIGGER update_user_cvs_updated_at BEFORE UPDATE ON public.user_cvs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for CVs
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload CVs" ON storage.objects;
CREATE POLICY "Users can upload CVs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can view own CVs" ON storage.objects;
CREATE POLICY "Users can view own CVs" ON storage.objects FOR SELECT USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can delete own CVs" ON storage.objects;
CREATE POLICY "Users can delete own CVs" ON storage.objects FOR DELETE USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Public CV access" ON storage.objects;
CREATE POLICY "Public CV access" ON storage.objects FOR SELECT USING (bucket_id = 'cvs');