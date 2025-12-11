/**
 * VenueApprovalButtons Component
 *
 * Displays approval action buttons for a venue:
 * - Fully Approved (green) - Approve venue and all pending dishes
 * - Approved with Fixes (yellow) - Approve with feedback for manual fixes
 * - Reject (red) - Reject the venue
 */

import { Check, AlertTriangle, X, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/lib/utils';

interface VenueApprovalButtonsProps {
  onFullyApprove: () => void;
  onApproveWithFixes: () => void;
  onReject: () => void;
  isLoading?: boolean;
  className?: string;
}

export function VenueApprovalButtons({
  onFullyApprove,
  onApproveWithFixes,
  onReject,
  isLoading,
  className,
}: VenueApprovalButtonsProps) {
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {/* Fully Approved Button */}
      <Button
        onClick={onFullyApprove}
        disabled={isLoading}
        className="bg-green-600 hover:bg-green-700 text-white flex-1 min-w-[160px]"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Check className="h-4 w-4 mr-2" />
        )}
        Fully Approved
      </Button>

      {/* Approved with Fixes Button */}
      <Button
        onClick={onApproveWithFixes}
        disabled={isLoading}
        variant="outline"
        className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 flex-1 min-w-[160px]"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <AlertTriangle className="h-4 w-4 mr-2" />
        )}
        Approved with Fixes
      </Button>

      {/* Reject Button */}
      <Button
        onClick={onReject}
        disabled={isLoading}
        variant="outline"
        className="border-red-500 text-red-600 hover:bg-red-50 flex-1 min-w-[160px]"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <X className="h-4 w-4 mr-2" />
        )}
        Reject
      </Button>
    </div>
  );
}
