import { useState } from 'react';
import { Job } from '@/types/job';
import { ExternalLink, MapPin, Clock, DollarSign, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface RecentJobsTableProps {
  jobs: Job[];
  onSelectJob?: (job: Job) => void;
}

export function RecentJobsTable({ jobs, onSelectJob }: RecentJobsTableProps) {
  const [expandedJob, setExpandedJob] = useState<string>('');

  return (
    <div className="glass-panel overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <h3 className="text-lg font-semibold">Recent Jobs Found</h3>
        <p className="text-sm text-muted-foreground">AI training positions sorted by relevance</p>
      </div>

      <Accordion type="single" collapsible value={expandedJob} onValueChange={setExpandedJob}>
        {jobs.map((job) => (
          <AccordionItem key={job.id} value={job.id} className="border-b border-border/50">
            <AccordionTrigger className="px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between w-full pr-4">
                {/* Job Title & Company */}
                <div className="flex-1 text-left">
                  <p className="font-medium">{job.job_name}</p>
                  <p className="text-sm text-muted-foreground">{job.company || 'Unknown'}</p>
                </div>

                {/* Score Badge */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full"
                        style={{ width: `${job.relevance_score || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium min-w-[3rem] text-right">
                      {job.relevance_score || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4 pt-2">
                {/* Employment Details */}
                {job.employment_details && job.employment_details.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {job.employment_details.map((detail, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {detail}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Job Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {job.deadline && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Deadline: {job.deadline}</span>
                    </div>
                  )}
                  {job.starting_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>Start: {job.starting_date}</span>
                    </div>
                  )}
                  {job.amount && (
                    <div className="flex items-center gap-2 text-success font-medium">
                      <DollarSign className="w-4 h-4" />
                      <span>{job.amount}</span>
                    </div>
                  )}
                </div>

                {/* Skills */}
                {job.skills_needed && job.skills_needed.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {job.skills_needed.slice(0, 8).map((skill, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {job.skills_needed.length > 8 && (
                        <Badge variant="outline" className="text-xs">
                          +{job.skills_needed.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                {job.requirements && job.requirements.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Requirements</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {job.requirements.slice(0, 3).map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                      {job.requirements.length > 3 && (
                        <li className="text-xs">+{job.requirements.length - 3} more requirements</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onSelectJob?.(job)}
                  >
                    Generate CV
                  </Button>
                  {job.application_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={job.application_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Apply
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
