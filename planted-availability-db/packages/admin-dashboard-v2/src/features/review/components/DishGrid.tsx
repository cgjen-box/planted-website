/**
 * DishGrid Component
 *
 * Grid of dish cards with images, prices, status badges, and individual approve/reject actions.
 */

import { Check, X, ImageOff, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { cn } from '@/lib/utils';
import { ReviewDish, PRODUCT_LABELS, DishStatus } from '../types';

interface DishGridProps {
  dishes: ReviewDish[];
  onApproveDish?: (dishId: string) => void;
  onRejectDish?: (dishId: string) => void;
  loadingDishId?: string; // ID of dish currently being updated
  className?: string;
}

/**
 * Get badge variant and text for dish status
 */
function getDishStatusBadge(status: DishStatus): { variant: 'warning' | 'success' | 'destructive'; text: string } {
  switch (status) {
    case 'approved':
      return { variant: 'success', text: 'Approved' };
    case 'rejected':
      return { variant: 'destructive', text: 'Rejected' };
    case 'pending':
    default:
      return { variant: 'warning', text: 'Pending' };
  }
}

/**
 * DishCard Component
 */
function DishCard({
  dish,
  onApprove,
  onReject,
  isLoading,
}: {
  dish: ReviewDish;
  onApprove?: (dishId: string) => void;
  onReject?: (dishId: string) => void;
  isLoading?: boolean;
}) {
  const confidencePercentage = Math.round(dish.confidence * 100);
  const getConfidenceColor = () => {
    if (confidencePercentage >= 80) return 'text-green-600';
    if (confidencePercentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const statusBadge = getDishStatusBadge(dish.status);
  const isPending = dish.status === 'pending';

  return (
    <Card className={cn('overflow-hidden', {
      'opacity-60': dish.status === 'rejected',
      'ring-2 ring-green-200': dish.status === 'approved',
    })}>
      {/* Image */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {dish.imageUrl ? (
          <img
            src={dish.imageUrl}
            alt={dish.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {/* Status Badge Overlay */}
        <div className="absolute top-2 right-2">
          <Badge variant={statusBadge.variant} className="text-xs">
            {statusBadge.text}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Dish Name */}
        <div>
          <h4 className="font-semibold text-sm line-clamp-2">{dish.name}</h4>
          {dish.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {dish.description}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">
            {dish.currency} {dish.price.toFixed(2)}
          </span>
          <Badge variant="secondary" className="text-xs">
            {PRODUCT_LABELS[dish.productMatch] || dish.productMatch}
          </Badge>
        </div>

        {/* Confidence */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Confidence</span>
            <span className={cn('font-semibold', getConfidenceColor())}>
              {confidencePercentage}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all', {
                'bg-green-500': confidencePercentage >= 80,
                'bg-yellow-500': confidencePercentage >= 60 && confidencePercentage < 80,
                'bg-red-500': confidencePercentage < 60,
              })}
              style={{ width: `${confidencePercentage}%` }}
            />
          </div>
        </div>

        {/* Actions - only show for pending dishes */}
        {isPending && (onApprove || onReject) && (
          <div className="flex gap-2 pt-2">
            {onApprove && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => onApprove(dish.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Approve
              </Button>
            )}
            {onReject && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
                onClick={() => onReject(dish.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-1" />
                )}
                Reject
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * DishGrid Component
 */
export function DishGrid({ dishes, onApproveDish, onRejectDish, loadingDishId, className }: DishGridProps) {
  if (dishes.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        No dishes available
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {dishes.map((dish) => (
        <DishCard
          key={dish.id}
          dish={dish}
          onApprove={onApproveDish}
          onReject={onRejectDish}
          isLoading={loadingDishId === dish.id}
        />
      ))}
    </div>
  );
}
