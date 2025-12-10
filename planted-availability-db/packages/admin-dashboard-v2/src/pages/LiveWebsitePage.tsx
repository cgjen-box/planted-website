/**
 * Live Website Page
 *
 * Tab 2 of the minimal admin dashboard.
 * Shows published venues and pending sync with one-click sync button.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { LoadingState } from '@/shared/components/LoadingState';
import { ErrorState } from '@/shared/components/ErrorState';
import { useSyncPreview, useSyncStats } from '@/features/sync/hooks/useSyncPreview';
import { useSync } from '@/features/sync/hooks/useSync';
import { cn } from '@/lib/utils';
import {
  Upload,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

/**
 * Live Website Page Component
 */
export function LiveWebsitePage() {
  const [syncing, setSyncing] = useState(false);
  const { data: preview, isLoading: previewLoading, error: previewError, refetch: refetchPreview } = useSyncPreview();
  const { data: stats, isLoading: statsLoading } = useSyncStats();
  const { executeSync } = useSync();

  const handleSyncAll = async () => {
    if (!preview) return;

    const allItemIds = [
      ...preview.additions.map(i => i.id),
      ...preview.updates.map(i => i.id),
      ...preview.removals.map(i => i.id),
    ];

    if (allItemIds.length === 0) {
      alert('No changes to sync');
      return;
    }

    if (!confirm(`Are you sure you want to sync ${allItemIds.length} changes to the website?`)) {
      return;
    }

    setSyncing(true);
    try {
      const result = await executeSync({ itemIds: allItemIds });
      if (result.success) {
        alert(`Sync completed successfully! ${result.itemsSucceeded} items synced.`);
        refetchPreview();
      } else {
        alert(`Sync completed with ${result.itemsFailed} failures.`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const totalPending = preview
    ? preview.additions.length + preview.updates.length + preview.removals.length
    : 0;

  if (previewLoading || statsLoading) {
    return <LoadingState message="Loading sync data..." />;
  }

  if (previewError) {
    return <ErrorState error={previewError} onRetry={refetchPreview} />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Website</h1>
          <p className="text-muted-foreground">
            Manage what's published on the website
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchPreview()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Button
            onClick={handleSyncAll}
            disabled={totalPending === 0 || syncing}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {syncing ? 'Syncing...' : `Sync All (${totalPending})`}
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Sync</p>
                <p className="text-2xl font-bold">{totalPending}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Additions</p>
                <p className="text-2xl font-bold text-green-600">
                  +{preview?.additions.length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Updates</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {preview?.updates.length || 0}
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Removals</p>
                <p className="text-2xl font-bold text-red-600">
                  -{preview?.removals.length || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Sync Info */}
      {stats?.lastSync && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last synced:</span>
              <span className="font-medium">
                {new Date(stats.lastSync).toLocaleString()}
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">
                Success rate: {stats.successRate}%
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">
                Total syncs: {stats.totalSyncs}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Changes */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Changes</CardTitle>
          <CardDescription>
            Changes ready to be pushed to the live website
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalPending === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">All synced!</p>
              <p className="text-sm">No pending changes to push.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Additions */}
              {preview && preview.additions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Badge variant="success">+{preview.additions.length}</Badge>
                    New Venues
                  </h3>
                  <div className="space-y-2">
                    {preview.additions.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-md border bg-green-50 dark:bg-green-950/20"
                      >
                        <div>
                          <span className="font-medium">{item.venueName}</span>
                          {item.dishCount !== undefined && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({item.dishCount} dishes)
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-green-600">
                          New
                        </Badge>
                      </div>
                    ))}
                    {preview.additions.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        +{preview.additions.length - 10} more additions
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Updates */}
              {preview && preview.updates.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Badge variant="warning">{preview.updates.length}</Badge>
                    Updates
                  </h3>
                  <div className="space-y-2">
                    {preview.updates.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-md border bg-yellow-50 dark:bg-yellow-950/20"
                      >
                        <div>
                          <span className="font-medium">{item.venueName}</span>
                          {item.diff && item.diff.length > 0 && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({item.diff.length} fields changed)
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-yellow-600">
                          Update
                        </Badge>
                      </div>
                    ))}
                    {preview.updates.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        +{preview.updates.length - 10} more updates
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Removals */}
              {preview && preview.removals.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Badge variant="destructive">-{preview.removals.length}</Badge>
                    Removals
                  </h3>
                  <div className="space-y-2">
                    {preview.removals.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-md border bg-red-50 dark:bg-red-950/20"
                      >
                        <span className="font-medium">{item.venueName}</span>
                        <Badge variant="outline" className="text-red-600">
                          Remove
                        </Badge>
                      </div>
                    ))}
                    {preview.removals.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        +{preview.removals.length - 10} more removals
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link to Live Website */}
      <Card>
        <CardContent className="py-4">
          <a
            href="https://planted.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View Live Website
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
