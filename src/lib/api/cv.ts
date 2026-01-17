import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface UserProfile {
  id?: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  summary: string | null;
  skills: string[];
  experience: Experience[];
  education: Education[];
  certifications: string[];
}

export interface Experience {
  title: string;
  company: string;
  period: string;
  description?: string;
  achievements?: string[];
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
}

export interface CVTemplate {
  id: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  template_data: {
    style: string;
    colors: { primary: string; accent: string };
    sections: string[];
  };
  is_active: boolean;
}

export interface GeneratedCV {
  summary: string;
  skills: string[];
  experience: {
    title: string;
    company: string;
    period: string;
    achievements: string[];
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
  certifications: string[];
  contact: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    portfolio: string;
  };
}

export const cvApi = {
  // Parse uploaded CV
  async parseCV(cvText: string): Promise<{ success: boolean; data?: Partial<UserProfile>; error?: string }> {
    const { data, error } = await supabase.functions.invoke('parse-cv', {
      body: { cvText },
    });
    
    if (error) {
      console.error('Parse CV error:', error);
      return { success: false, error: error.message };
    }
    
    return data;
  },
  
  // Generate CV content
  async generateCV(
    userProfile: UserProfile,
    job?: unknown,
    template?: CVTemplate
  ): Promise<{ success: boolean; data?: GeneratedCV; error?: string }> {
    const { data, error } = await supabase.functions.invoke('generate-cv', {
      body: { userProfile, job, template },
    });
    
    if (error) {
      console.error('Generate CV error:', error);
      return { success: false, error: error.message };
    }
    
    return data;
  },
  
  // Get user profile
  async getProfile(): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Get profile error:', error);
      return { success: false, error: error.message };
    }
    
    if (!data) {
      return { success: true, data: undefined };
    }
    
    return { 
      success: true, 
      data: {
        ...data,
        experience: (data.experience || []) as unknown as Experience[],
        education: (data.education || []) as unknown as Education[],
      } as UserProfile
    };
  },
  
  // Update user profile
  async updateProfile(profile: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: profile.full_name ?? null,
        email: profile.email ?? null,
        phone: profile.phone ?? null,
        location: profile.location ?? null,
        linkedin_url: profile.linkedin_url ?? null,
        portfolio_url: profile.portfolio_url ?? null,
        summary: profile.summary ?? null,
        skills: profile.skills ?? [],
        experience: (profile.experience ?? []) as unknown as Json,
        education: (profile.education ?? []) as unknown as Json,
        certifications: profile.certifications ?? [],
      });
    
    if (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  },
  
  // Get CV templates
  async getTemplates(): Promise<{ success: boolean; data?: CVTemplate[]; error?: string }> {
    const { data, error } = await supabase
      .from('cv_templates')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.error('Get templates error:', error);
      return { success: false, error: error.message };
    }
    
    return { 
      success: true, 
      data: data.map(t => ({
        ...t,
        template_data: t.template_data as unknown as CVTemplate['template_data'],
      })) as CVTemplate[]
    };
  },
  
  // Save generated CV
  async saveCV(
    title: string,
    content: GeneratedCV,
    templateId?: string,
    jobId?: string
  ): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const { data, error } = await supabase
      .from('user_cvs')
      .insert({
        user_id: user.id,
        title,
        content: content as unknown as Json,
        template_id: templateId || null,
        job_id: jobId || null,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Save CV error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: { id: data.id } };
  },
  
  // Get user's saved CVs
  async getSavedCVs(): Promise<{ success: boolean; data?: unknown[]; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const { data, error } = await supabase
      .from('user_cvs')
      .select(`
        *,
        cv_templates(name),
        jobs(job_name, company)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Get saved CVs error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  },
};
