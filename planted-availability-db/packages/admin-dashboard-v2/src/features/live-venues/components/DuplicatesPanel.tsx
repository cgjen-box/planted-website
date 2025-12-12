/**
 * DuplicatesPanel Component
 *
 * Modal panel for viewing and managing duplicate venues.
 */

import { useState } from 'react';
import { Copy, Trash2, AlertTriangle, Loader2, MapPin, Utensils } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/Dialog';
import { Badge } from '@/shared/ui/Badge';
import { useDuplicates, useDeleteDuplicates } from '../hooks/useDuplicates';
import { COUNTRY_LABELS, STATUS_COLORS, STATUS_LABELS } from '../types';
import type { DuplicateGroup, DuplicateVenue } from '../types';

interface DuplicatesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DuplicatesPanel({ open, onOpenChange }: DuplicatesPanelProps) {
  const { data, isLoading, error } = useDuplicates(open);
  const deleteMutation = useDeleteDuplicates();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleToggleVenue = (venueId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(venueId)) {
        next.delete(venueId);
      } else {
        next.add(venueId);
      }
      return next;
    });
  };

  const handleSelectAllInGroup = (group: DuplicateGroup, keep: number) => {
    // Select all except the one to keep (by index)
    setSelectedIds((prev) => {
      const next = new Set(prev);
      group.venues.forEach((venue, index) => {
        if (index === keep) {
          next.delete(venue.id);
        } else {
          next.add(venue.id);
        }
      });
      return next;
    });
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      await deleteMutation.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
      setConfirmDelete(false);
    } catch {
      // Error handled by mutation
    }
  };

  const formatAddress = (venue: DuplicateVenue) => {
    const parts: string[] = [];
    if (venue.address.street) parts.push(venue.address.street);
    const cityPart = [venue.address.postalCode, venue.address.city].filter(Boolean).join(' ');
    if (cityPart) parts.push(cityPart);
    parts.push(COUNTRY_LABELS[venue.address.country] || venue.address.country);
    return parts.join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Venues
          </DialogTitle>
          <DialogDescription>
            Venues with the same address. Select duplicates to delete and keep one per location.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Finding duplicates...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12 text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>Failed to load duplicates: {error.message}</span>
            </div>
          )}

          {data && data.duplicateGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Copy className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">No Duplicates Found</p>
              <p className="text-sm">All venues have unique addresses.</p>
            </div>
          )}

          {data && data.duplicateGroups.length > 0 && (
            <div className="space-y-6">
              {/* Stats summary */}
              <div className="flex gap-4 p-3 bg-muted/50 rounded-lg text-sm">
                <span>
                  <strong>{data.totalDuplicateGroups}</strong> duplicate groups
                </span>
                <span>
                  <strong>{data.totalDuplicateVenues}</strong> total duplicate venues
                </span>
                <span className="ml-auto text-muted-foreground">
                  Scanned {data.stats.totalVenuesScanned.toLocaleString()} venues
                </span>
              </div>

              {/* Duplicate groups */}
              {data.duplicateGroups.map((group) => (
                <DuplicateGroupCard
                  key={group.addressKey}
                  group={group}
                  selectedIds={selectedIds}
                  onToggleVenue={handleToggleVenue}
                  onSelectAllExcept={(keepIndex) => handleSelectAllInGroup(group, keepIndex)}
                  formatAddress={formatAddress}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {selectedIds.size > 0 && !confirmDelete && (
            <div className="flex items-center gap-4 w-full">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} venue{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={() => setSelectedIds(new Set())}>
                  Clear Selection
                </Button>
                <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}

          {confirmDelete && (
            <div className="flex items-center gap-4 w-full">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-sm">
                Delete {selectedIds.size} venue{selectedIds.size !== 1 ? 's' : ''} and their dishes? This cannot be undone.
              </span>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleteMutation.isPending}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Confirm Delete'
                  )}
                </Button>
              </div>
            </div>
          )}

          {selectedIds.size === 0 && !confirmDelete && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  selectedIds: Set<string>;
  onToggleVenue: (id: string) => void;
  onSelectAllExcept: (keepIndex: number) => void;
  formatAddress: (venue: DuplicateVenue) => string;
}

function DuplicateGroupCard({
  group,
  selectedIds,
  onToggleVenue,
  onSelectAllExcept,
  formatAddress,
}: DuplicateGroupCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Group header */}
      <div className="p-3 bg-muted/30 border-b flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">{group.formattedAddress}</span>
        <Badge variant="secondary" className="ml-auto">
          {group.venues.length} venues
        </Badge>
      </div>

      {/* Venue list */}
      <div className="divide-y">
        {group.venues.map((venue, index) => (
          <div
            key={venue.id}
            className={`p-3 flex items-start gap-3 ${
              selectedIds.has(venue.id) ? 'bg-destructive/5' : ''
            }`}
          >
            <Checkbox
              checked={selectedIds.has(venue.id)}
              onCheckedChange={() => onToggleVenue(venue.id)}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{venue.name}</span>
                {venue.chainName && (
                  <Badge variant="outline" className="text-xs">
                    {venue.chainName}
                  </Badge>
                )}
                <Badge className={STATUS_COLORS[venue.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'}>
                  {STATUS_LABELS[venue.status as keyof typeof STATUS_LABELS] || venue.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span>{formatAddress(venue)}</span>
                <span className="flex items-center gap-1">
                  <Utensils className="h-3 w-3" />
                  {venue.dishCount} dishes
                </span>
                <span>
                  Created: {new Date(venue.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectAllExcept(index)}
              className="text-xs"
            >
              Keep this one
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
