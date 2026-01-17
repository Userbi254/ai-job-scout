import { Check, Loader2, X, Circle, ArrowDown, Search, Globe, FileText, ListOrdered, FileUser } from 'lucide-react';
import { WorkflowStep } from '@/types/job';
import { cn } from '@/lib/utils';

interface WorkflowProgressProps {
  steps: WorkflowStep[];
  onStepClick?: (stepId: string) => void;
}

const stepIcons: Record<string, React.ElementType> = {
  search: Search,
  crawl: Globe,
  scrape: FileText,
  sort: ListOrdered,
  cv: FileUser,
};

export function WorkflowProgress({ steps, onStepClick }: WorkflowProgressProps) {
  const getStatusIndicator = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
            <Check className="w-4 h-4 text-success-foreground" />
          </div>
        );
      case 'in_progress':
        return (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-pulse">
            <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
          </div>
        );
      case 'error':
        return (
          <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center">
            <X className="w-4 h-4 text-destructive-foreground" />
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <Circle className="w-3 h-3 text-muted-foreground" />
          </div>
        );
    }
  };

  const getConnectorColor = (currentStatus: WorkflowStep['status'], nextStatus: WorkflowStep['status']) => {
    if (currentStatus === 'completed' && nextStatus !== 'pending') {
      return 'bg-success';
    }
    if (currentStatus === 'completed') {
      return 'bg-gradient-to-b from-success to-muted';
    }
    if (currentStatus === 'in_progress') {
      return 'bg-gradient-to-b from-primary to-muted';
    }
    if (currentStatus === 'error') {
      return 'bg-gradient-to-b from-destructive to-muted';
    }
    return 'bg-muted';
  };

  return (
    <div className="glass-panel p-6">
      <h3 className="text-lg font-semibold mb-6">Workflow</h3>
      
      <div className="flex flex-col items-center">
        {steps.map((step, index) => {
          const StepIcon = stepIcons[step.id] || Circle;
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="w-full">
              {/* Step Node */}
              <button
                onClick={() => onStepClick?.(step.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                  "hover:bg-accent/50 cursor-pointer",
                  step.status === 'in_progress' && "bg-accent/30 ring-1 ring-primary/30"
                )}
              >
                {/* Icon Box */}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all",
                  step.status === 'completed' && "bg-success/10",
                  step.status === 'in_progress' && "bg-primary/10",
                  step.status === 'error' && "bg-destructive/10",
                  step.status === 'pending' && "bg-muted/50"
                )}>
                  <StepIcon className={cn(
                    "w-6 h-6",
                    step.status === 'completed' && "text-success",
                    step.status === 'in_progress' && "text-primary",
                    step.status === 'error' && "text-destructive",
                    step.status === 'pending' && "text-muted-foreground"
                  )} />
                </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium text-sm",
                      step.status === 'pending' && "text-muted-foreground"
                    )}>
                      {step.name}
                    </span>
                    {step.count !== undefined && step.status !== 'pending' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {step.count}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                {getStatusIndicator(step.status)}
              </button>

              {/* Connector Arrow */}
              {!isLast && (
                <div className="flex justify-center py-1">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-0.5 h-4",
                      getConnectorColor(step.status, steps[index + 1]?.status)
                    )} />
                    <ArrowDown className={cn(
                      "w-4 h-4 -mt-1",
                      step.status === 'completed' ? "text-success" : 
                      step.status === 'in_progress' ? "text-primary" :
                      step.status === 'error' ? "text-destructive" : "text-muted-foreground"
                    )} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
