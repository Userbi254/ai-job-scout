import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CVGenerator } from '@/components/cv/CVGenerator';
import { CVPreview } from '@/components/cv/CVPreview';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CVData, Job } from '@/types/job';
import { generatePDF } from '@/utils/pdfGenerator';
import { FileUser, Eye, FileText, Building, ChevronRight, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CVPage() {
  const location = useLocation();
  const passedJob = location.state?.selectedJob as Job | undefined;

  const [selectedJob, setSelectedJob] = useState<Job | undefined>(passedJob);
  const [generatedCV, setGeneratedCV] = useState<CVData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('generate');
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);

  useEffect(() => {
    fetchAvailableJobs();
  }, []);

  const fetchAvailableJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_runs')
        .select('extracted_jobs, sorted_jobs')
        .not('extracted_jobs', 'is', null)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching jobs:', error);
        return;
      }

      if (data) {
        console.log('[CV] Fetched workflow runs:', data.length);

        // Flatten all extracted and sorted jobs
        const allJobs: Job[] = [];
        let jobCounter = 0;

        data.forEach(run => {
          // Add sorted jobs if available (they have relevance scores)
          if (run.sorted_jobs && Array.isArray(run.sorted_jobs)) {
            console.log('[CV] Found sorted_jobs:', run.sorted_jobs.length);
            allJobs.push(...run.sorted_jobs.map((job: any) => ({
              ...job,
              id: job.id || `sorted-${Date.now()}-${jobCounter++}`,
              skills_needed: job.skills_needed || [],
              requirements: job.requirements || [],
              employment_details: job.employment_details || []
            })));
          }
          // Also add extracted jobs
          else if (run.extracted_jobs && Array.isArray(run.extracted_jobs)) {
            console.log('[CV] Found extracted_jobs:', run.extracted_jobs.length);
            allJobs.push(...run.extracted_jobs.map((job: any) => ({
              ...job,
              id: job.id || `extracted-${Date.now()}-${jobCounter++}`,
              skills_needed: job.skills_needed || [],
              requirements: job.requirements || [],
              employment_details: job.employment_details || []
            })));
          }
        });

        console.log('[CV] Total jobs found:', allJobs.length);
        setAvailableJobs(allJobs);

        // If no job passed but we have jobs, select the first one
        if (!passedJob && allJobs.length > 0) {
          setSelectedJob(allJobs[0]);
          console.log('[CV] Auto-selected first job:', allJobs[0].job_name);
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
      // Reset generated CV when job changes to encourage regeneration
      setGeneratedCV(null);
      setActiveTab('generate');
    }
  };

  const handleGenerate = (cv: CVData) => {
    setGeneratedCV(cv);
    setActiveTab('preview');
  };

  const handleDownload = () => {
    if (generatedCV) {
      generatePDF(generatedCV);
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

        {/* Selected Job Details (Collapsible/Summary) */}
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

        {/* CV Generator/Preview Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-panel p-1">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <FileUser className="w-4 h-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="flex items-center gap-2"
              disabled={!generatedCV}
            >
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-0">
            <CVGenerator
              selectedJob={selectedJob}
              onGenerate={handleGenerate}
            />
          </TabsContent>

          <TabsContent value="preview" className="mt-0">
            {generatedCV && (
              <CVPreview
                cvData={generatedCV}
                onDownload={handleDownload}
              />
            )}
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
