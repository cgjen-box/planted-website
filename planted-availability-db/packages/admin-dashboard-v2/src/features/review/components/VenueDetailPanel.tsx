/**
 * VenueDetailPanel Component
 *
 * Displays detailed information about a selected venue including
 * confidence scores, location, and platform links.
 */

import { useState } from 'react';
import { ExternalLink, MapPin, Clock, Link2, Pencil, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/lib/utils';
import { ReviewVenue, PLATFORM_LABELS, VENUE_TYPE_LABELS, COUNTRY_EMOJIS } from '../types';

interface VenueDetailPanelProps {
  venue: ReviewVenue;
  className?: string;
  onAssignChain?: () => void;
  onUpdateCountry?: (venueId: string, country: string) => Promise<void>;
  isUpdatingCountry?: boolean;
  onUpdateAddress?: (venueId: string, address: { street?: string; city?: string }) => Promise<void>;
  isUpdatingAddress?: boolean;
}

/**
 * Country options for the selector
 */
const COUNTRY_OPTIONS = [
  { code: 'CH', name: 'Switzerland', emoji: '🇨🇭' },
  { code: 'DE', name: 'Germany', emoji: '🇩🇪' },
  { code: 'AT', name: 'Austria', emoji: '🇦🇹' },
  { code: 'UK', name: 'United Kingdom', emoji: '🇬🇧' },
  { code: 'FR', name: 'France', emoji: '🇫🇷' },
  { code: 'IT', name: 'Italy', emoji: '🇮🇹' },
  { code: 'ES', name: 'Spain', emoji: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', emoji: '🇳🇱' },
  { code: 'BE', name: 'Belgium', emoji: '🇧🇪' },
  { code: 'PL', name: 'Poland', emoji: '🇵🇱' },
] as const;

/**
 * ConfidenceBar Component
 */
function ConfidenceBar({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const getColor = () => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Confidence</span>
        <span className="font-semibold">{percentage}%</span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all', getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * VenueDetailPanel Component
 */
export function VenueDetailPanel({
  venue,
  className,
  onAssignChain,
  onUpdateCountry,
  isUpdatingCountry,
  onUpdateAddress,
  isUpdatingAddress,
}: VenueDetailPanelProps) {
  const [isEditingCountry, setIsEditingCountry] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(venue.countryCode);
  const [isEditingStreet, setIsEditingStreet] = useState(false);
  const [editedStreet, setEditedStreet] = useState(venue.address);
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [editedCity, setEditedCity] = useState(venue.city);

  const formattedDate = new Date(venue.scrapedAt).toLocaleString();
  const mapUrl = venue.coordinates
    ? `https://www.google.com/maps?q=${venue.coordinates.lat},${venue.coordinates.lng}`
    : null;

  const handleCountryChange = async () => {
    if (!onUpdateCountry || selectedCountry === venue.countryCode) {
      setIsEditingCountry(false);
      return;
    }
    await onUpdateCountry(venue.id, selectedCountry);
    setIsEditingCountry(false);
  };

  const handleCancelCountryEdit = () => {
    setSelectedCountry(venue.countryCode);
    setIsEditingCountry(false);
  };

  const handleStreetChange = async () => {
    if (!onUpdateAddress || editedStreet === venue.address) {
      setIsEditingStreet(false);
      return;
    }
    await onUpdateAddress(venue.id, { street: editedStreet });
    setIsEditingStreet(false);
  };

  const handleCancelStreetEdit = () => {
    setEditedStreet(venue.address);
    setIsEditingStreet(false);
  };

  const handleCityChange = async () => {
    if (!onUpdateAddress || editedCity === venue.city) {
      setIsEditingCity(false);
      return;
    }
    await onUpdateAddress(venue.id, { city: editedCity });
    setIsEditingCity(false);
  };

  const handleCancelCityEdit = () => {
    setEditedCity(venue.city);
    setIsEditingCity(false);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-2xl truncate">{venue.name}</CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {venue.chain && (
                <Badge variant="secondary" className="font-normal">
                  {venue.chain}
                </Badge>
              )}
              <Badge variant="outline" className="font-normal">
                {VENUE_TYPE_LABELS[venue.venueType]}
              </Badge>
              <Badge
                variant={
                  venue.status === 'verified'
                    ? 'success'
                    : venue.status === 'rejected'
                    ? 'destructive'
                    : 'warning'
                }
              >
                {venue.status.toUpperCase()}
              </Badge>
            </div>
            {/* Assign Chain Button - only show if venue has no chain */}
            {!venue.chain && venue.status === 'pending' && onAssignChain && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAssignChain}
                className="mt-2"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Assign Chain
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Location */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Location</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            {/* Street Address */}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              {isEditingStreet ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="text"
                    value={editedStreet}
                    onChange={(e) => setEditedStreet(e.target.value)}
                    className={cn(
                      'h-7 flex-1 rounded-md border border-input bg-background px-2 py-0.5 text-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                    disabled={isUpdatingAddress}
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleStreetChange}
                    disabled={isUpdatingAddress}
                  >
                    {isUpdatingAddress ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleCancelStreetEdit}
                    disabled={isUpdatingAddress}
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span>{venue.address || '(no street)'}</span>
                  {onUpdateAddress && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 ml-1"
                      onClick={() => setIsEditingStreet(true)}
                      title="Edit street address"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            {/* City */}
            <div className="flex items-center gap-2 ml-6">
              {isEditingCity ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editedCity}
                    onChange={(e) => setEditedCity(e.target.value)}
                    className={cn(
                      'h-7 w-40 rounded-md border border-input bg-background px-2 py-0.5 text-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                    disabled={isUpdatingAddress}
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleCityChange}
                    disabled={isUpdatingAddress}
                  >
                    {isUpdatingAddress ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleCancelCityEdit}
                    disabled={isUpdatingAddress}
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                  <span>,</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span>{venue.city || '(no city)'}</span>
                  {onUpdateAddress && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setIsEditingCity(true)}
                      title="Edit city"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                  <span>,</span>
                </div>
              )}
              {/* Country */}
              {isEditingCountry ? (
                <div className="flex items-center gap-1">
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className={cn(
                      'h-7 rounded-md border border-input bg-background px-2 py-0.5 text-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                    disabled={isUpdatingCountry}
                  >
                    {COUNTRY_OPTIONS.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.emoji} {country.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleCountryChange}
                    disabled={isUpdatingCountry}
                  >
                    {isUpdatingCountry ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleCancelCountryEdit}
                    disabled={isUpdatingCountry}
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span>
                    {COUNTRY_EMOJIS[venue.countryCode] || ''} {venue.country}
                  </span>
                  {onUpdateCountry && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 ml-1"
                      onClick={() => setIsEditingCountry(true)}
                      title="Change country"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            {venue.coordinates && mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline ml-6"
              >
                View on Map
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Confidence Score */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Confidence Score</h4>
          <ConfidenceBar confidence={venue.confidence} />

          {/* Confidence Factors */}
          {venue.confidenceFactors && venue.confidenceFactors.length > 0 && (
            <div className="space-y-2 mt-4">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase">
                Factors
              </h5>
              <div className="space-y-2">
                {venue.confidenceFactors.map((factor, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{factor.factor}</span>
                    <span className="font-medium">
                      {Math.round(factor.score * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Platform */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Platform</h4>
          <a
            href={venue.platformUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            {PLATFORM_LABELS[venue.platform]}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Scraped At */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Scraped</h4>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Feedback / Rejection Reason */}
        {venue.feedback && (
          <div className="space-y-2 p-3 bg-yellow-500/10 rounded-md border border-yellow-500/20">
            <h4 className="text-sm font-semibold text-yellow-700">Feedback</h4>
            <p className="text-sm text-muted-foreground">{venue.feedback}</p>
          </div>
        )}

        {venue.rejectionReason && (
          <div className="space-y-2 p-3 bg-destructive/10 rounded-md border border-destructive/20">
            <h4 className="text-sm font-semibold text-destructive">Rejection Reason</h4>
            <p className="text-sm text-muted-foreground">{venue.rejectionReason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
