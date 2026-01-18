import React, { useState, useEffect } from 'react';
import { Job, CVData } from '@/types/job';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Download, Plus, X, Sparkles, FileUser, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CVUploader } from './CVUploader';
import { useUserProfile, UserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";

interface CVGeneratorProps {
  selectedJob?: Job;
  onGenerate: (cv: CVData) => void;
}

export function CVGenerator({ selectedJob, onGenerate }: CVGeneratorProps) {
  const { profile, saveProfile, hasProfile } = useUserProfile();
  const [isGenerating, setIsGenerating] = useState(false);

  const [cvData, setCVData] = useState<CVData>({
    fullName: '',
    email: '',
    phone: '',
    location: 'Nairobi, Kenya',
    summary: '',
    skills: selectedJob?.skills_needed || [],
    experience: [{ title: '', company: '', duration: '', description: '' }],
    education: [{ degree: '', institution: '', year: '' }],
    selectedJob
  });

  const [newSkill, setNewSkill] = useState('');

  const [hasOptimized, setHasOptimized] = useState<string | null>(null);
  const [optimizationReport, setOptimizationReport] = useState<any[]>([]);

  // Load saved profile on mount or when selectedJob changes
  useEffect(() => {
    if (hasProfile && hasOptimized !== selectedJob?.id) {
      const initialData = {
        ...cvData,
        fullName: profile.fullName || cvData.fullName,
        email: profile.email || cvData.email,
        phone: profile.phone || cvData.phone,
        location: profile.location || cvData.location,
        summary: profile.summary || cvData.summary,
        skills: profile.skills.length > 0 ? [...new Set([...profile.skills, ...(selectedJob?.skills_needed || [])])] : cvData.skills,
        experience: profile.experience.length > 0 ? profile.experience : cvData.experience,
        education: profile.education.length > 0 ? profile.education : cvData.education,
      };

      setCVData(initialData);

      // Auto-optimize if we have a job and a profile
      if (selectedJob && !isGenerating) {
        setHasOptimized(selectedJob.id);
        optimizeCV(initialData);
      }
    }
  }, [hasProfile, profile, selectedJob?.id, isGenerating, hasOptimized]);

  const handleProfileExtracted = (extracted: Partial<UserProfile>) => {
    const updatedData = {
      ...cvData,
      fullName: extracted.fullName || cvData.fullName,
      email: extracted.email || cvData.email,
      phone: extracted.phone || cvData.phone,
      location: extracted.location || cvData.location,
      summary: extracted.summary || cvData.summary,
      skills: extracted.skills ? [...new Set([...extracted.skills, ...(selectedJob?.skills_needed || [])])] : cvData.skills,
      experience: extracted.experience || cvData.experience,
      education: extracted.education || cvData.education,
    };

    setCVData(updatedData);

    // Save to profile for future use
    saveProfile(extracted);
    toast.success('Profile saved for future use');

    // Trigger optimization after extraction if job is present
    if (selectedJob && !isGenerating) {
      setTimeout(() => optimizeCV(updatedData), 500);
    }
  };

  const saveCurrentProfile = () => {
    saveProfile({
      fullName: cvData.fullName,
      email: cvData.email,
      phone: cvData.phone,
      location: cvData.location,
      summary: cvData.summary,
      skills: cvData.skills,
      experience: cvData.experience,
      education: cvData.education,
    });
    toast.success('Profile saved');
  };

  const addSkill = () => {
    if (newSkill.trim() && !cvData.skills.includes(newSkill.trim())) {
      setCVData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setCVData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const addExperience = () => {
    setCVData(prev => ({
      ...prev,
      experience: [...prev.experience, { title: '', company: '', duration: '', description: '' }]
    }));
  };

  const removeExperience = (index: number) => {
    setCVData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const updateExperience = (index: number, field: keyof CVData['experience'][0], value: string) => {
    setCVData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) =>
        i === index ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const addEducation = () => {
    setCVData(prev => ({
      ...prev,
      education: [...prev.education, { degree: '', institution: '', year: '' }]
    }));
  };

  const removeEducation = (index: number) => {
    setCVData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const updateEducation = (index: number, field: keyof CVData['education'][0], value: string) => {
    setCVData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) =>
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const optimizeCV = async (dataToUse?: CVData) => {
    if (!selectedJob) return;

    setIsGenerating(true);
    try {
      const currentData = dataToUse || cvData;

      // Use supabase.functions.invoke which automatically handles authentication
      const jobDescLen = selectedJob.description?.length || 0;
      toast.info(`DEBUG: Job: ${selectedJob.job_name}, DescLen: ${jobDescLen}`);

      console.log('Sending to generate-cv:', {
        jobTitle: selectedJob.job_name,
        jobCompany: selectedJob.company,
        jobDescLength: jobDescLen,
        jobRequirements: selectedJob.requirements?.length || 0
      });

      const { data, error } = await supabase.functions.invoke('generate-cv', {
        body: {
          userProfile: {
            full_name: currentData.fullName,
            email: currentData.email,
            phone: currentData.phone,
            location: currentData.location,
            skills: currentData.skills,
            experience: currentData.experience,
            education: currentData.education,
            summary: currentData.summary
          },
          job: selectedJob
        }
      });

      console.log('Received raw data:', data);
      if (data?.raw_content) {
        console.log('RAW AI CONTENT:', data.raw_content);
      }
      if (data?.data) {
        console.log('Generated Summary:', data.data.summary);
        console.log('Generated Experience Count:', data.data.experience?.length);
        console.log('First Experience Desc:', data.data.experience?.[0]?.achievements?.[0] || data.data.experience?.[0]?.description);
      }

      if (error) {
        throw new Error(`Function error: ${error.message}`);
      }

      if (data.success && data.data) {
        const generated = data.data;
        setCVData(prev => ({
          ...prev,
          summary: generated.summary || prev.summary,
          skills: Array.isArray(generated.skills) ? generated.skills : prev.skills,
          experience: Array.isArray(generated.experience) ? generated.experience.map((exp: any) => ({
            title: exp.title || '',
            company: exp.company || '',
            duration: exp.period || '',
            description: Array.isArray(exp.achievements) ? exp.achievements.join('\n') : (exp.description || '')
          })) : prev.experience,
          education: Array.isArray(generated.education) ? generated.education.map((edu: any) => ({
            degree: edu.degree || '',
            institution: edu.institution || '',
            year: edu.year || ''
          })) : prev.education
        }));

        if (generated.optimization_report && Array.isArray(generated.optimization_report)) {
          setOptimizationReport(generated.optimization_report);
        }

        toast.success("CV optimized for the job!");
      } else {
        toast.error(data.error || "Failed to optimize CV");
      }
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error(`An error occurred while optimizing CV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* CV Upload */}
      <CVUploader onProfileExtracted={handleProfileExtracted} />

      {/* Saved Profile Indicator */}
      {hasProfile && (
        <div className="glass-panel p-4 border-l-4 border-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileUser className="w-5 h-5 text-primary" />
              <span className="font-medium">Saved Profile Loaded</span>
            </div>
            <Button variant="ghost" size="sm" onClick={saveCurrentProfile}>
              <Save className="w-4 h-4 mr-2" />
              Update Profile
            </Button>
          </div>
        </div>
      )}

      {/* Job Context */}
      {selectedJob && (
        <div className="glass-panel p-6 border-l-4 border-success">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tailoring CV for:</p>
              <h3 className="text-xl font-semibold">{selectedJob.job_name}</h3>
              <p className="text-muted-foreground">{selectedJob.company}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="secondary" className="text-success border-success/30">
                {selectedJob.relevance_score}% Match
              </Badge>
              <Button
                size="sm"
                variant="default"
                onClick={optimizeCV}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isGenerating ? 'Optimizing...' : 'AI Optimize CV'}
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Required skills:</span>
            {selectedJob.skills_needed.map((skill, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Report */}
      {
        optimizationReport.length > 0 && (
          <div className="glass-panel p-6 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Optimization Report
            </h3>
            <div className="space-y-4">
              {optimizationReport.map((item, idx) => (
                <div key={idx} className="bg-muted/30 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-blue-600">{item.field}</span>
                    <span className="text-xs text-muted-foreground">{item.change}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )
      }

      {/* Personal Information */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileUser className="w-5 h-5" />
          Personal Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={cvData.fullName}
              onChange={e => setCVData(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="John Kamau"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={cvData.email}
              onChange={e => setCVData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={cvData.phone}
              onChange={e => setCVData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+254 700 000 000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={cvData.location}
              onChange={e => setCVData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Nairobi, Kenya"
            />
          </div>
        </div>
      </div>

      {/* Professional Summary */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Professional Summary</h3>
        </div>
        <Textarea
          value={cvData.summary}
          onChange={e => setCVData(prev => ({ ...prev, summary: e.target.value }))}
          placeholder="Write a brief professional summary..."
          className="min-h-[100px]"
        />
      </div>

      {/* Skills */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-4">Skills</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {cvData.skills.map((skill, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive/20 transition-colors"
              onClick={() => removeSkill(skill)}
            >
              {skill}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newSkill}
            onChange={e => setNewSkill(e.target.value)}
            placeholder="Add a skill..."
            onKeyDown={e => e.key === 'Enter' && addSkill()}
          />
          <Button onClick={addSkill}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Experience */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Work Experience</h3>
          <Button size="sm" variant="secondary" onClick={addExperience}>
            <Plus className="w-4 h-4 mr-2" />
            Add Experience
          </Button>
        </div>
        <div className="space-y-6">
          {cvData.experience.map((exp, index) => (
            <div key={index} className="p-4 bg-muted/30 rounded-lg space-y-3 relative">
              {cvData.experience.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  onClick={() => removeExperience(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input
                    value={exp.title}
                    onChange={e => updateExperience(index, 'title', e.target.value)}
                    placeholder="Data Annotation Specialist"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={exp.company}
                    onChange={e => updateExperience(index, 'company', e.target.value)}
                    placeholder="Sama"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input
                  value={exp.duration}
                  onChange={e => updateExperience(index, 'duration', e.target.value)}
                  placeholder="Jan 2024 - Present"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={exp.description}
                  onChange={e => updateExperience(index, 'description', e.target.value)}
                  placeholder="Describe your responsibilities..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Education */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Education</h3>
          <Button size="sm" variant="secondary" onClick={addEducation}>
            <Plus className="w-4 h-4 mr-2" />
            Add Education
          </Button>
        </div>
        <div className="space-y-4">
          {cvData.education.map((edu, index) => (
            <div key={index} className="p-4 bg-muted/30 rounded-lg relative">
              {cvData.education.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  onClick={() => removeEducation(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Degree</Label>
                  <Input
                    value={edu.degree}
                    onChange={e => updateEducation(index, 'degree', e.target.value)}
                    placeholder="Bachelor's in Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Institution</Label>
                  <Input
                    value={edu.institution}
                    onChange={e => updateEducation(index, 'institution', e.target.value)}
                    placeholder="University of Nairobi"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    value={edu.year}
                    onChange={e => updateEducation(index, 'year', e.target.value)}
                    placeholder="2020"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          size="lg"
          className="flex-1"
          onClick={() => onGenerate({ ...cvData, selectedJob })}
        >
          <Download className="w-5 h-5 mr-2" />
          Generate & Download CV
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={saveCurrentProfile}
        >
          <Save className="w-5 h-5 mr-2" />
          Save Profile
        </Button>
      </div>
    </div >
  );
}
