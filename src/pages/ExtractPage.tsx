import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    FileText,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    Building,
    MapPin,
    Clock,
    DollarSign,
    ChevronRight,
    Loader2,
    Play,
    FileUser,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Job } from '@/types/job';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Local scraper URL
const SCRAPER_URL = 'http://localhost:3001';

export default function ExtractPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [content, setContent] = useState('');
    const [pageUrl, setPageUrl] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [expandedJob, setExpandedJob] = useState<string>('');
    const [autoExtractComplete, setAutoExtractComplete] = useState(false);
    const [recentExtractions, setRecentExtractions] = useState<any[]>([]);
    const [showRecent, setShowRecent] = useState(true);

    useEffect(() => {
        fetchRecentExtractions();
    }, []);

    const fetchRecentExtractions = async () => {
        try {
            const { data } = await supabase
                .from('workflow_runs')
                .select('*')
                .not('extracted_jobs', 'is', null)
                .or('is_trashed.is.null,is_trashed.eq.false')
                .order('started_at', { ascending: false })
                .limit(10);

            if (data) {
                setRecentExtractions(data);
            }
        } catch (error) {
            console.error('Failed to fetch recent extractions:', error);
        }
    };

    useEffect(() => {
        // Handle crawl results from CrawlScrapePage
        if (location.state?.crawlResults && Array.isArray(location.state.crawlResults)) {
            const crawlResults = location.state.crawlResults;

            if (!autoExtractComplete) {
                toast.info(`Auto-extracting jobs from ${crawlResults.length} pages...`);
                extractFromMultiplePages(crawlResults);
            }
        } else if (location.state?.content) {
            setContent(location.state.content);
        }

        if (location.state?.url) {
            setPageUrl(location.state.url);
        }
    }, [location.state, autoExtractComplete]);

    const extractFromMultiplePages = async (crawlResults: any[]) => {
        setIsExtracting(true);
        const allJobs: Job[] = [];
        let lastProvider = 'Gemini';

        for (let i = 0; i < crawlResults.length; i++) {
            const result = crawlResults[i];
            console.log(`[Extract] 🔍 Processing page ${i + 1}/${crawlResults.length}: ${result.url}`);
            console.log(`[Extract] Content length: ${result.text?.length || 0} chars`);
            toast.loading(`Extracting from page ${i + 1}/${crawlResults.length}...`);

            try {
                const response = await fetch(`${SCRAPER_URL}/extract-jobs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pageContent: result.text,
                        pageUrl: result.url
                    })
                });
                const data = await response.json();
                const error = !response.ok ? data.error : null;

                console.log(`[Extract] Response from ${result.url}:`, {
                    success: data.success,
                    provider: data.provider,
                    jobsFound: data.data?.length || 0,
                    logs: data.logs,
                    error: error
                });

                if (!error && data.success && data.data) {
                    console.log(`[Extract] ✅ Found ${data.data.length} jobs via ${data.provider}`);
                    allJobs.push(...data.data);
                    if (data.provider) lastProvider = data.provider;
                } else {
                    console.log(`[Extract] ❌ No jobs found, error: ${error || 'none'}`);
                }
            } catch (err) {
                console.error(`[Extract] ❌ Failed to extract from ${result.url}:`, err);
            }
        }

        // Ensure all jobs have unique IDs for accordion
        const jobsWithIds = allJobs.map((job: any, index: number) => ({
            ...job,
            id: job.id || `job-${Date.now()}-${index}`
        }));

        setJobs(jobsWithIds);
        setIsExtracting(false);
        setAutoExtractComplete(true);

        // Save extracted jobs to database
        if (jobsWithIds.length > 0) {
            try {
                await supabase.from('workflow_runs').insert({
                    status: 'completed',
                    started_at: new Date().toISOString(),
                    extracted_jobs: jobsWithIds
                });
                fetchRecentExtractions(); // Refresh the list
            } catch (err) {
                console.error('Failed to save extracted jobs:', err);
            }
        }

        toast.success(`Extracted ${jobsWithIds.length} jobs using ${lastProvider}`);
    };

    const handleExtract = async () => {
        if (!content.trim()) {
            toast.error("Please enter content to extract jobs from");
            return;
        }

        setIsExtracting(true);
        try {
            const response = await fetch(`${SCRAPER_URL}/extract-jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageContent: content,
                    pageUrl: pageUrl || 'manual-input'
                })
            });
            const data = await response.json();
            const error = !response.ok ? data.error : null;

            if (error) throw error;

            if (data.success) {
                const jobsWithIds = data.data.map((job: any, index: number) => ({
                    ...job,
                    id: job.id || `job-${Date.now()}-${index}`
                }));
                setJobs(jobsWithIds);
                toast.success(`Extracted ${jobsWithIds.length} jobs using ${data.provider || 'Gemini'}`);
            } else {
                toast.error(data.error || "Failed to extract jobs");
            }
        } catch (error) {
            console.error('Extraction error:', error);
            toast.error("An error occurred while extracting jobs");
        } finally {
            setIsExtracting(false);
        }
    };

    const getCompleteness = (job: Job) => {
        const fields = [
            'job_name', 'company', 'employment_details', 'payment_method',
            'amount', 'skills_needed', 'requirements', 'deadline', 'application_url'
        ];
        const complete = fields.filter(f => {
            const value = job[f as keyof Job];
            return value !== null && value !== undefined && value !== '' &&
                (!Array.isArray(value) || value.length > 0);
        }).length;
        return Math.round((complete / fields.length) * 100);
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-fade-in">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Extract Jobs</h1>
                    <p className="text-muted-foreground mt-1">
                        Extract job details from crawled content using Gemini AI
                    </p>
                </div>

                {/* Input Area */}
                <div className="glass-panel p-6 space-y-4">
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Paste webpage content or job description here..."
                        className="min-h-[200px] font-mono text-sm"
                    />
                    <div className="flex justify-end">
                        <Button
                            size="lg"
                            onClick={handleExtract}
                            disabled={isExtracting}
                        >
                            {isExtracting ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <Play className="w-5 h-5 mr-2" />
                            )}
                            {isExtracting ? 'Extracting...' : 'Extract Jobs'}
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-panel p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{jobs.length}</div>
                            <div className="text-sm text-muted-foreground">Jobs Extracted</div>
                        </div>
                    </div>
                    <div className="glass-panel p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-success" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">
                                {jobs.filter(j => getCompleteness(j) >= 80).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Complete Records</div>
                        </div>
                    </div>
                    <div className="glass-panel p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-warning" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">
                                {jobs.filter(j => getCompleteness(j) < 80).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Missing Fields</div>
                        </div>
                    </div>
                </div>

                {/* Job Cards */}
                <div className="glass-panel overflow-hidden">
                    {jobs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No jobs extracted yet. Paste content above to start.</p>
                        </div>
                    ) : (
                        <Accordion type="single" collapsible value={expandedJob} onValueChange={setExpandedJob}>
                            {jobs.map((job) => {
                                const completeness = getCompleteness(job);

                                return (
                                    <AccordionItem key={job.id} value={job.id} className="border-b border-border/50">
                                        <AccordionTrigger className="px-4 py-3 hover:bg-accent/30 transition-colors">
                                            <div className="flex items-center justify-between w-full pr-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                                                        <Building className="w-6 h-6 text-muted-foreground" />
                                                    </div>
                                                    <div className="text-left">
                                                        <h3 className="font-semibold">{job.job_name}</h3>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <span>{job.company || 'Unknown Company'}</span>
                                                            {job.employment_details.length > 0 && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>{job.employment_details.join(', ')}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 min-w-[120px] justify-end">
                                                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full",
                                                                completeness >= 80 ? "bg-success" : completeness >= 50 ? "bg-warning" : "bg-destructive"
                                                            )}
                                                            style={{ width: `${completeness}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-mono">{completeness}%</span>
                                                </div>
                                            </div>
                                        </AccordionTrigger>

                                        <AccordionContent className="px-4 pb-4">
                                            <div className="space-y-4 pt-2">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="p-3 bg-muted/30 rounded-lg">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                                            <DollarSign className="w-4 h-4" />
                                                            Pay
                                                        </div>
                                                        <div className={cn(
                                                            "font-medium",
                                                            job.amount ? "text-success" : "text-muted-foreground"
                                                        )}>
                                                            {job.amount || 'Not listed'}
                                                        </div>
                                                    </div>

                                                    <div className="p-3 bg-muted/30 rounded-lg">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                                            <Clock className="w-4 h-4" />
                                                            Deadline
                                                        </div>
                                                        <div className="font-medium">
                                                            {job.deadline || 'Open'}
                                                        </div>
                                                    </div>

                                                    <div className="p-3 bg-muted/30 rounded-lg">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                                            <MapPin className="w-4 h-4" />
                                                            Start Date
                                                        </div>
                                                        <div className="font-medium">
                                                            {job.starting_date || 'TBD'}
                                                        </div>
                                                    </div>

                                                    <div className="p-3 bg-muted/30 rounded-lg">
                                                        <div className="text-sm text-muted-foreground mb-1">Payment</div>
                                                        <div className="font-medium">
                                                            {job.payment_method || 'Not specified'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Skills Required</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {job.skills_needed.length > 0 ? (
                                                            job.skills_needed.map((skill, i) => (
                                                                <Badge key={i} variant="secondary">{skill}</Badge>
                                                            ))
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground">No skills listed</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Requirements</h4>
                                                    {job.requirements.length > 0 ? (
                                                        <ul className="list-disc list-inside space-y-1 text-sm">
                                                            {job.requirements.map((req, i) => (
                                                                <li key={i}>{req}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">No requirements listed</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 pt-2">
                                                    <Button onClick={() => navigate('/cv', { state: { selectedJob: job } })}>
                                                        <FileUser className="w-4 h-4 mr-2" />
                                                        Generate CV
                                                    </Button>
                                                    {job.application_url && (
                                                        <Button size="sm" variant="outline" asChild>
                                                            <a href={job.application_url} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                                Apply Now
                                                            </a>
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="secondary" asChild>
                                                        <a href={job.site_url} target="_blank" rel="noopener noreferrer">
                                                            View Source
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    )}
                </div>

                {/* Proceed to Sort Button */}
                {jobs.length > 0 && (
                    <div className="glass-panel p-4 bg-accent/20">
                        <Button
                            onClick={async () => {
                                toast.loading("Sorting jobs by relevance...");
                                try {
                                    const { data, error } = await supabase.functions.invoke('sort-jobs', {
                                        body: { jobs }
                                    });

                                    if (!error && data.success) {
                                        navigate('/sort', { state: { jobs: data.data } });
                                        toast.success(`Sorted ${data.data.length} jobs by relevance`);
                                    } else {
                                        toast.error("Sorting failed, proceeding with unsorted jobs");
                                        navigate('/sort', { state: { jobs } });
                                    }
                                } catch (err) {
                                    console.error("Sort error:", err);
                                    toast.error("Sorting failed, proceeding with unsorted jobs");
                                    navigate('/sort', { state: { jobs } });
                                }
                            }}
                            className="w-full"
                            size="lg"
                        >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Proceed to Sort ({jobs.length} jobs)
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>
                )}

                {/* Recent Extractions */}
                <div className="glass-panel overflow-hidden">
                    <button
                        onClick={() => setShowRecent(!showRecent)}
                        className="w-full p-4 border-b border-border/50 flex items-center justify-between hover:bg-accent/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn("transition-transform", showRecent ? "rotate-90" : "")}>
                                <ChevronRight className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-semibold">Recent Extractions & Sorted Jobs</h3>
                                <p className="text-sm text-muted-foreground">
                                    {recentExtractions.length} sessions with job details
                                </p>
                            </div>
                        </div>
                        <Badge variant="secondary">
                            {recentExtractions.reduce((acc, e) => acc + (Array.isArray(e.extracted_jobs) ? e.extracted_jobs.length : 0), 0)} jobs
                        </Badge>
                    </button>
                    {showRecent && (
                        <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                            {recentExtractions.map((extraction) => (
                                <div key={extraction.id} className="p-4 bg-accent/20 rounded-lg space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-semibold">{extraction.query || 'Job Extraction'}</span>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(extraction.started_at).toLocaleString()} • Status: {extraction.status}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">
                                                {Array.isArray(extraction.extracted_jobs) ? extraction.extracted_jobs.length : 0} jobs
                                            </Badge>
                                            {Array.isArray(extraction.extracted_jobs) && extraction.extracted_jobs.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        // Load extracted jobs into the main view
                                                        const loadedJobs = extraction.extracted_jobs.map((job: any, idx: number) => ({
                                                            ...job,
                                                            id: job.id || `loaded-${Date.now()}-${idx}`
                                                        }));
                                                        setJobs(loadedJobs);
                                                        toast.success(`Loaded ${loadedJobs.length} jobs from extraction`);
                                                    }}
                                                >
                                                    <FileUser className="w-3 h-3 mr-1" />
                                                    View Jobs
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => {
                                                    const deleteItem = async () => {
                                                        try {
                                                            const { error } = await supabase
                                                                .from('workflow_runs')
                                                                .update({
                                                                    is_trashed: true,
                                                                    deleted_at: new Date().toISOString(),
                                                                    deleted_from: 'extract'
                                                                })
                                                                .eq('id', extraction.id);

                                                            if (error) {
                                                                if (error.message?.includes('AbortError') || error.code === 'PGRST116') {
                                                                    return;
                                                                }
                                                                throw error;
                                                            }

                                                            toast.success("Extraction history moved to trash");
                                                            fetchRecentExtractions();
                                                        } catch (err: unknown) {
                                                            const error = err as { message?: string };
                                                            if (error?.message?.includes('AbortError') || error?.message?.includes('aborted')) {
                                                                fetchRecentExtractions();
                                                                return;
                                                            }
                                                            console.error('Failed to move to trash:', error);
                                                            toast.error("Failed to move to trash");
                                                        }
                                                    };
                                                    deleteItem();
                                                }}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Show actual jobs */}
                                    {Array.isArray(extraction.extracted_jobs) && extraction.extracted_jobs.length > 0 && (
                                        <div className="space-y-2 pt-2 border-t border-border/30">
                                            {extraction.extracted_jobs.slice(0, 5).map((job: any, idx: number) => (
                                                <div key={idx} className="p-2 bg-background/50 rounded text-sm">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="font-medium">{job.job_name || 'Unknown Position'}</span>
                                                            <p className="text-xs text-muted-foreground">{job.company || 'Unknown Company'}</p>
                                                        </div>
                                                        {job.amount && (
                                                            <Badge variant="secondary" className="text-xs shrink-0">
                                                                {job.amount}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {job.skills_needed && job.skills_needed.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {job.skills_needed.slice(0, 3).map((skill: string, i: number) => (
                                                                <span key={i} className="text-xs px-1.5 py-0.5 bg-primary/10 rounded">{skill}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {extraction.extracted_jobs.length > 5 && (
                                                <p className="text-xs text-muted-foreground text-center">
                                                    +{extraction.extracted_jobs.length - 5} more jobs
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {recentExtractions.length === 0 && (
                                <p className="text-muted-foreground text-sm text-center py-4">No recent extractions</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
