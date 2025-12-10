/**
 * Review API Client
 *
 * Typed API functions for the Review Queue feature.
 */

import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  ReviewQueueResponse,
  ReviewQueueFilters,
  ReviewVenue,
  FeedbackRequest,
} from '../types';

/**
 * Build query string from filters
 */
function buildQueryString(filters: ReviewQueueFilters): string {
  const params = new URLSearchParams();

  if (filters.country) params.append('country', filters.country);
  if (filters.status) params.append('status', filters.status);
  if (filters.venueType) params.append('venueType', filters.venueType);
  if (filters.platform) params.append('platform', filters.platform);
  if (filters.minConfidence !== undefined) params.append('minConfidence', filters.minConfidence.toString());
  if (filters.maxConfidence !== undefined) params.append('maxConfidence', filters.maxConfidence.toString());
  if (filters.search) params.append('search', filters.search);
  if (filters.page !== undefined) params.append('page', filters.page.toString());
  if (filters.pageSize !== undefined) params.append('pageSize', filters.pageSize.toString());

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Get Review Queue
 */
export async function getReviewQueue(filters: ReviewQueueFilters = {}): Promise<ReviewQueueResponse> {
  const queryString = buildQueryString(filters);
  return apiClient.get<ReviewQueueResponse>(`${API_ENDPOINTS.REVIEW_QUEUE}${queryString}`);
}

/**
 * Approve Venue (Full)
 */
export async function approveVenue(venueId: string): Promise<ReviewVenue> {
  return apiClient.post<ReviewVenue>(API_ENDPOINTS.APPROVE_VENUE, { venueId });
}

/**
 * Partial Approve Venue (with feedback)
 */
export async function partialApproveVenue(
  venueId: string,
  feedback: string,
  dishIds?: string[]
): Promise<ReviewVenue> {
  return apiClient.post<ReviewVenue>(API_ENDPOINTS.PARTIAL_APPROVE_VENUE, {
    venueId,
    feedback,
    dishIds,
  });
}

/**
 * Reject Venue
 */
export async function rejectVenue(venueId: string, reason: string): Promise<ReviewVenue> {
  return apiClient.post<ReviewVenue>(API_ENDPOINTS.REJECT_VENUE, {
    venueId,
    reason,
  });
}

/**
 * Bulk Approve Venues
 */
export async function bulkApproveVenues(venueIds: string[]): Promise<{ success: number; failed: number }> {
  return apiClient.post<{ success: number; failed: number }>(API_ENDPOINTS.BULK_APPROVE, {
    venueIds,
  });
}

/**
 * Bulk Reject Venues
 */
export async function bulkRejectVenues(
  venueIds: string[],
  reason: string
): Promise<{ success: number; failed: number }> {
  return apiClient.post<{ success: number; failed: number }>(API_ENDPOINTS.BULK_REJECT, {
    venueIds,
    reason,
  });
}

/**
 * Submit AI Feedback
 */
export async function submitFeedback(request: FeedbackRequest): Promise<void> {
  return apiClient.post<void>(API_ENDPOINTS.FEEDBACK_SUBMIT, request);
}

/**
 * Get Venue by ID
 * Note: This uses the review queue endpoint with a filter
 */
export async function getVenueById(venueId: string): Promise<ReviewVenue> {
  const response = await apiClient.get<ReviewQueueResponse>(
    `${API_ENDPOINTS.REVIEW_QUEUE}?venueId=${encodeURIComponent(venueId)}`
  );
  if (response.items && response.items.length > 0) {
    return response.items[0];
  }
  throw new Error('Venue not found');
}
