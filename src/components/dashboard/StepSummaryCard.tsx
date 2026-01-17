import { WorkflowStep } from '@/types/job';
import { Check, Loader2, X, Circle, Search, Globe, FileText, ListOrdered, FileUser } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepSummaryCardProps {
  step: WorkflowStep;
  detail?: string;
  onClick?: () => void;
}

const stepIcons: Record<string, React.ElementType> = {
  search: Search,
  crawl: Globe,
  scrape: FileText,
  sort: ListOrdered,
  cv: FileUser,
};

export function StepSummaryCard({ step, detail, onClick }: StepSummaryCardProps) {
  const StepIcon = stepIcons[step.id] || Circle;

  const getStatusBadge = () => {
    switch (step.status) {
      case 'completed':
        return (
          <div className="flex items-center gap-1 text-xs text-success">
            <Check className="w-3 h-3" />
            <span>Done</span>
          </div>
        );
      case 'in_progress':
        return (
          <div className="flex items-center gap-1 text-xs text-primary">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Running</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <X className="w-3 h-3" />
            <span>Failed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Circle className="w-3 h-3" />
            <span>Pending</span>
          </div>
        );
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl text-left transition-all hover:bg-accent/50",
        "border border-border/50",
        step.status === 'completed' && "bg-success/5 border-success/20",
        step.status === 'in_progress' && "bg-primary/5 border-primary/20",
        step.status === 'error' && "bg-destructive/5 border-destructive/20",
        step.status === 'pending' && "bg-muted/30"
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          step.status === 'completed' && "bg-success/10",
          step.status === 'in_progress' && "bg-primary/10",
          step.status === 'error' && "bg-destructive/10",
          step.status === 'pending' && "bg-muted/50"
        )}>
          <StepIcon className={cn(
            "w-5 h-5",
            step.status === 'completed' && "text-success",
            step.status === 'in_progress' && "text-primary",
            step.status === 'error' && "text-destructive",
            step.status === 'pending' && "text-muted-foreground"
          )} />
        </div>
        {getStatusBadge()}
      </div>

      <div className="mt-3">
        <div className="font-medium">{step.name}</div>
        {step.count !== undefined && step.status !== 'pending' && (
          <div className="text-2xl font-bold mt-1">{step.count}</div>
        )}
        {detail && (
          <div className="text-xs text-muted-foreground mt-1">{detail}</div>
        )}
      </div>

      {step.status === 'in_progress' && (
        <div className="progress-bar mt-3">
          <div 
            className="progress-bar-fill"
            style={{ width: `${step.progress}%` }}
          />
        </div>
      )}
    </button>
  );
}
