import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CVGenerator } from '@/components/cv/CVGenerator';
import { CVPreview } from '@/components/cv/CVPreview';
import { CVUploader } from '@/components/cv/CVUploader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CVData, Job } from '@/types/job';
import { generatePDF } from '@/utils/pdfGenerator';
import { generateDirectPDF } from '@/utils/directPdfGenerator';
import { FileUser, Eye, FileText, Briefcase, Upload, Sparkles, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserProfile, useUserProfile } from '@/hooks/useUserProfile';

export default function CVPage() {
  const location = useLocation();
  const passedJob = location.state?.selectedJob as Job | undefined;

  const [selectedJob, setSelectedJob] = useState<Job | undefined>(passedJob);
  const [generatedCV, setGeneratedCV] = useState<CVData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('cascade');

  const { profile, saveProfile, hasProfile } = useUserProfile();

  // CV form data state
  const [cvData, setCVData] = useState<CVData>({
    fullName: '',
    email: '',
    phone: '',
    location: 'Nairobi, Kenya',
    summary: '',
    skills: [],
    experience: [{ title: '', company: '', duration: '', description: '' }],
    education: [{ degree: '', institution: '', year: '' }],
    selectedJob: undefined
  });

  useEffect(() => {
    fetchAvailableJobs();
  }, []);

  // Load profile when available
  useEffect(() => {
    if (hasProfile) {
      setCVData(prev => ({
        ...prev,
        fullName: profile.fullName || prev.fullName,
        email: profile.email || prev.email,
        phone: profile.phone || prev.phone,
        location: profile.location || prev.location,
        summary: profile.summary || prev.summary,
        skills: profile.skills.length > 0 ? profile.skills : prev.skills,
        experience: profile.experience.length > 0 ? profile.experience : prev.experience,
        education: profile.education.length > 0 ? profile.education : prev.education,
      }));
    }
  }, [hasProfile, profile]);

  // Update cvData when job changes
  useEffect(() => {
    if (selectedJob) {
      setCVData(prev => ({
        ...prev,
        skills: [...new Set([...prev.skills, ...(selectedJob.skills_needed || [])])],
        selectedJob
      }));
    }
  }, [selectedJob]);

  const fetchAvailableJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_runs')
        .select('extracted_jobs, sorted_jobs')
        .not('extracted_jobs', 'is', null)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching jobs:', error);
        return;
      }

      if (data) {
        const allJobs: Job[] = [];
        let jobCounter = 0;

        data.forEach(run => {
          if (run.sorted_jobs && Array.isArray(run.sorted_jobs) && run.sorted_jobs.length > 0) {
            allJobs.push(...run.sorted_jobs.map((job: any) => ({
              ...job,
              id: job.id || `sorted-${Date.now()}-${jobCounter++}`,
              skills_needed: job.skills_needed || [],
              requirements: job.requirements || [],
              employment_details: job.employment_details || []
            })));
          } else if (run.extracted_jobs && Array.isArray(run.extracted_jobs) && run.extracted_jobs.length > 0) {
            allJobs.push(...run.extracted_jobs.map((job: any) => ({
              ...job,
              id: job.id || `extracted-${Date.now()}-${jobCounter++}`,
              skills_needed: job.skills_needed || [],
              requirements: job.requirements || [],
              employment_details: job.employment_details || []
            })));
          }
        });

        setAvailableJobs(allJobs);

        if (!passedJob && allJobs.length > 0) {
          setSelectedJob(allJobs[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch available jobs:', error);
    }
  };

  const handleJobSelect = (jobId: string) => {
    const job = availableJobs.find(j => j.id === jobId);
    if (job) {
      setSelectedJob(job);
      setGeneratedCV(null);
    }
  };

  const handleProfileExtracted = (extracted: Partial<UserProfile>) => {
    const updatedData: CVData = {
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
    saveProfile(extracted);
    toast.success('CV uploaded and parsed! Moving to Generate tab...');

    // Move to generate tab after upload
    setTimeout(() => setActiveTab('generate'), 500);
  };

  const handleGenerate = async () => {
    if (!cvData.fullName || !cvData.email) {
      toast.error('Please upload your CV first or fill in your details');
      setActiveTab('upload');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-cv', {
        body: {
          userProfile: {
            full_name: cvData.fullName,
            email: cvData.email,
            phone: cvData.phone,
            location: cvData.location,
            skills: cvData.skills,
            experience: cvData.experience,
            education: cvData.education,
            summary: cvData.summary
          },
          job: selectedJob
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success && data?.data) {
        const generated = data.data;
        const newCV: CVData = {
          fullName: generated.contact?.name || cvData.fullName,
          email: generated.contact?.email || cvData.email,
          phone: generated.contact?.phone || cvData.phone,
          location: generated.contact?.location || cvData.location,
          summary: generated.summary || cvData.summary,
          skills: Array.isArray(generated.skills) ? generated.skills : cvData.skills,
          experience: Array.isArray(generated.experience) ? generated.experience.map((exp: any) => ({
            title: exp.title || '',
            company: exp.company || '',
            duration: exp.period || '',
            description: Array.isArray(exp.achievements) ? exp.achievements.join('\n') : (exp.description || '')
          })) : cvData.experience,
          education: Array.isArray(generated.education) ? generated.education.map((edu: any) => ({
            degree: edu.degree || '',
            institution: edu.institution || '',
            year: edu.year || ''
          })) : cvData.education,
          selectedJob
        };

        setGeneratedCV(newCV);
        setCVData(newCV);
        toast.success('CV optimized! Moving to Preview tab...');
        setTimeout(() => setActiveTab('preview'), 500);
      } else {
        toast.error(data?.error || 'Failed to generate CV');
      }
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate CV');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedCV) {
      try {
        generateDirectPDF(generatedCV, selectedTemplate);
        toast.success('CV downloaded successfully!');
      } catch (err) {
        console.error('Download error:', err);
        toast.error('Failed to download CV');
      }
    } else {
      toast.error('Please generate your CV first');
      setActiveTab('generate');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CV Generator</h1>
            <p className="text-muted-foreground mt-1">
              Create tailored resumes for AI training positions
            </p>
          </div>

          {/* Job Selection Dropdown */}
          <div className="w-full md:w-[300px]">
            <label className="text-sm font-medium mb-1.5 block text-muted-foreground">
              Target Job
            </label>
            <Select
              value={selectedJob?.id || ""}
              onValueChange={handleJobSelect}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select a job..." />
              </SelectTrigger>
              <SelectContent>
                {availableJobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    <div className="flex flex-col items-start text-left">
                      <span className="font-medium">{job.job_name}</span>
                      <span className="text-xs text-muted-foreground">{job.company || 'Unknown Company'}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Job Details */}
        {selectedJob && (
          <div className="glass-panel p-4 border-l-4 border-l-primary">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  {selectedJob.job_name}
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {selectedJob.company || 'Unknown Company'}
                  </Badge>
                  {selectedJob.amount && (
                    <Badge variant="outline" className="text-xs text-success border-success/30">
                      {selectedJob.amount}
                    </Badge>
                  )}
                  {selectedJob.relevance_score && (
                    <Badge variant="outline" className="text-xs">
                      {selectedJob.relevance_score}% Match
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4-Tab CV Workflow */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-panel p-1 grid grid-cols-4 w-full">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Generate</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2" disabled={!generatedCV}>
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </TabsTrigger>
            <TabsTrigger value="download" className="flex items-center gap-2" disabled={!generatedCV}>
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Upload */}
          <TabsContent value="upload" className="mt-0">
            <div className="glass-panel p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Upload Your CV</h2>
                <p className="text-muted-foreground text-sm">
                  Upload your existing CV to auto-fill your information, or paste the text below.
                </p>
              </div>
              <CVUploader onProfileExtracted={handleProfileExtracted} />

              {hasProfile && (
                <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                  <div className="flex items-center gap-2 text-success">
                    <FileUser className="w-5 h-5" />
                    <span className="font-medium">Profile loaded: {profile.fullName}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your saved profile has been loaded. Click Generate to create your CV.
                  </p>
                  <Button className="mt-3" onClick={() => setActiveTab('generate')}>
                    Continue to Generate
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 2: Generate */}
          <TabsContent value="generate" className="mt-0">
            <div className="glass-panel p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Generate Your CV</h2>
                  <p className="text-muted-foreground text-sm">
                    AI will optimize your CV for the selected job position.
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isGenerating || !cvData.fullName}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate CV
                    </>
                  )}
                </Button>
              </div>

              {/* Summary of what will be generated */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-medium mb-2">Your Information</h3>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p><strong>Name:</strong> {cvData.fullName || 'Not provided'}</p>
                    <p><strong>Email:</strong> {cvData.email || 'Not provided'}</p>
                    <p><strong>Skills:</strong> {cvData.skills.length > 0 ? cvData.skills.slice(0, 5).join(', ') + (cvData.skills.length > 5 ? '...' : '') : 'Not provided'}</p>
                    <p><strong>Experience:</strong> {cvData.experience.filter(e => e.title).length} entries</p>
                    <p><strong>Education:</strong> {cvData.education.filter(e => e.degree).length} entries</p>
                  </div>
                </div>

                {selectedJob && (
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                    <h3 className="font-medium mb-2 text-primary">Target Job</h3>
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p><strong>Position:</strong> {selectedJob.job_name}</p>
                      <p><strong>Company:</strong> {selectedJob.company || 'Unknown'}</p>
                      <p><strong>Required Skills:</strong> {selectedJob.skills_needed?.slice(0, 5).join(', ') || 'Not specified'}</p>
                    </div>
                  </div>
                )}
              </div>

              {!cvData.fullName && (
                <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-warning text-sm">
                    Please upload your CV first to continue.
                  </p>
                  <Button variant="outline" className="mt-2" onClick={() => setActiveTab('upload')}>
                    Go to Upload
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 3: Preview */}
          <TabsContent value="preview" className="mt-0">
            {generatedCV ? (
              <CVPreview
                cvData={generatedCV}
                onDownload={() => setActiveTab('download')}
              />
            ) : (
              <div className="glass-panel p-12 text-center">
                <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No CV Generated Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Generate your CV first to see the preview.
                </p>
                <Button onClick={() => setActiveTab('generate')}>
                  Go to Generate
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Tab 4: Download */}
          <TabsContent value="download" className="mt-0">
            <div className="glass-panel p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Download Your CV</h2>
                <p className="text-muted-foreground text-sm">
                  Choose a template and download your optimized CV as a PDF.
                </p>
              </div>

              {/* Template Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Select Template</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'cascade', name: 'Cascade', emoji: '📘' },
                    { id: 'professional', name: 'Professional', emoji: '📋' },
                    { id: 'modern', name: 'Modern', emoji: '✨' },
                    { id: 'minimal', name: 'Minimal', emoji: '📄' },
                    { id: 'elegant', name: 'Elegant', emoji: '💎' },
                    { id: 'corporate', name: 'Corporate', emoji: '🏢' },
                    { id: 'creative', name: 'Creative', emoji: '🎨' },
                    { id: 'ats-friendly', name: 'ATS Friendly', emoji: '✅' },
                  ].map(template => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedTemplate === template.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-2xl">{template.emoji}</span>
                      <p className="text-sm font-medium mt-1">{template.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Download Button */}
              <div className="flex flex-col items-center gap-4 pt-4">
                <Button
                  size="lg"
                  onClick={handleDownload}
                  disabled={!generatedCV}
                  className="gap-2 w-full md:w-auto"
                >
                  <Download className="w-5 h-5" />
                  Download PDF
                </Button>

                {!generatedCV && (
                  <p className="text-sm text-muted-foreground">
                    Please generate your CV first before downloading.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Tips */}
        <div className="glass-panel p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            CV Tips for AI Training Jobs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-1">Highlight Attention to Detail</h4>
              <p className="text-muted-foreground">
                AI training requires precision. Show examples of careful, accurate work.
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-1">Emphasize Language Skills</h4>
              <p className="text-muted-foreground">
                Strong English fluency is crucial for most AI training positions.
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-1">Include Tech Comfort</h4>
              <p className="text-muted-foreground">
                Mention experience with annotation tools, browsers, and online platforms.
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-1">Show Consistency</h4>
              <p className="text-muted-foreground">
                Reliable availability and consistent quality are highly valued.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
