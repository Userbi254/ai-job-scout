import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Trash2,
    RefreshCcw,
    X,
    AlertTriangle,
    Loader2
} from 'lucide-react';

export default function TrashPage() {
    const [trashedItems, setTrashedItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTrashedItems();
    }, []);

    const fetchTrashedItems = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('workflow_runs')
                .select('*')
                .eq('is_trashed', true)
                .order('deleted_at', { ascending: false });

            if (error) throw error;

            console.log('[Trash] Fetched items:', data?.length, 'items');
            console.log('[Trash] Error messages:', data?.map(d => ({ id: d.id.slice(0, 8), error_message: d.error_message })));

            if (data) {
                setTrashedItems(data);
            }
        } catch (error) {
            console.error('Failed to fetch trashed items:', error);
            toast.error('Failed to load trash');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (id: string) => {
        try {
            console.log('[Trash] Restoring item:', id);
            const { data, error } = await supabase
                .from('workflow_runs')
                .update({ is_trashed: false, deleted_at: null, deleted_from: null })
                .eq('id', id)
                .select();

            console.log('[Trash] Restore updated rows:', data?.length, 'data:', data);

            if (error) throw error;

            console.log('[Trash] Item restored successfully:', id);
            toast.success('Item restored');
            fetchTrashedItems();
        } catch (error) {
            console.error('Failed to restore item:', error);
            toast.error('Failed to restore item');
        }
    };

    const handlePermanentDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('workflow_runs')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Item permanently deleted');
            fetchTrashedItems();
        } catch (error) {
            console.error('Failed to delete item:', error);
            toast.error('Failed to delete item');
        }
    };

    const handleEmptyTrash = async () => {
        try {
            const { error } = await supabase
                .from('workflow_runs')
                .delete()
                .eq('is_trashed', true);

            if (error) throw error;

            toast.success('Trash emptied');
            fetchTrashedItems();
        } catch (error) {
            console.error('Failed to empty trash:', error);
            toast.error('Failed to empty trash');
        }
    };

    const getItemType = (item: any) => {
        // Determine type based on where it was deleted from
        if (item.error_message === 'TRASHED_FROM_SEARCH') return 'Search';
        if (item.error_message === 'TRASHED_FROM_CRAWL') return 'Crawl Session';
        if (item.error_message === 'TRASHED_FROM_EXTRACT') return 'Extraction';
        if (item.error_message === 'TRASHED_FROM_SORT') return 'Sort Session';

        // Fallback to field presence for legacy TRASHED items
        if (item.sorted_jobs) return 'Sort Session';
        if (item.extracted_jobs) return 'Extraction';
        if (item.crawled_pages) return 'Crawl Session';
        if (item.search_results) return 'Search';
        return 'Unknown Item';
    };

    const getItemCount = (item: any) => {
        // Show the most relevant count based on item type
        if (item.sorted_jobs && Array.isArray(item.sorted_jobs) && item.sorted_jobs.length > 0) {
            return `${item.sorted_jobs.length} sorted jobs`;
        }
        if (item.extracted_jobs && Array.isArray(item.extracted_jobs) && item.extracted_jobs.length > 0) {
            return `${item.extracted_jobs.length} extracted jobs`;
        }
        if (item.crawled_pages && Array.isArray(item.crawled_pages) && item.crawled_pages.length > 0) {
            return `${item.crawled_pages.length} pages`;
        }
        if (item.search_results && Array.isArray(item.search_results) && item.search_results.length > 0) {
            return `${item.search_results.length} results`;
        }
        // Show query or other identifying info if counts are empty
        if (item.query) return `Query: "${item.query.slice(0, 30)}${item.query.length > 30 ? '...' : ''}"`;
        return 'No data';
    };

    const getDeletedFrom = (item: any) => {
        return item.deleted_from || 'Unknown';
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Trash</h1>
                        <p className="text-muted-foreground mt-1">
                            Restore items or permanently delete them. Items are kept for 24 hours.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={fetchTrashedItems}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCcw className="w-4 h-4 mr-2" />
                            )}
                            Refresh
                        </Button>
                        {trashedItems.length > 0 && (
                            <Button
                                variant="destructive"
                                onClick={handleEmptyTrash}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Empty Trash
                            </Button>
                        )}
                    </div>
                </div>

                {/* List */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="glass-panel p-12 flex flex-col items-center justify-center text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                            <p>Loading trash...</p>
                        </div>
                    ) : trashedItems.length > 0 ? (
                        <>
                            {console.log('[Trash] Rendering', trashedItems.length, 'items')}
                            {trashedItems.map((item) => {
                                console.log('[Trash] Rendering item:', item.id.slice(0, 8), 'Type:', getItemType(item), 'Count:', getItemCount(item), 'From:', getDeletedFrom(item));
                                return (
                                    <div key={item.id} className="glass-panel p-4 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">{getItemType(item)}</h3>
                                                <Badge variant="outline">{getItemCount(item)}</Badge>
                                                <Badge variant="secondary" className="text-xs">
                                                    From: {getDeletedFrom(item)}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Deleted: {item.deleted_at ? new Date(item.deleted_at).toLocaleString() : new Date(item.started_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRestore(item.id)}
                                            >
                                                <RefreshCcw className="w-4 h-4 mr-2" />
                                                Restore
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                                onClick={() => handlePermanentDelete(item.id)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        <div className="glass-panel p-12 flex flex-col items-center justify-center text-muted-foreground">
                            <Trash2 className="w-12 h-12 mb-4 opacity-20" />
                            <p>Trash is empty</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
