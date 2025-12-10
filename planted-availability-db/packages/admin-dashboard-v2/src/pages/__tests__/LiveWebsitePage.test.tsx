/**
 * LiveWebsitePage Tests
 *
 * Tests for the live website sync page including:
 * - Sync preview display
 * - Sync execution
 * - Loading and error states
 * - Stats display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, createMockAuthProvider } from '@/test/test-utils';
import { LiveWebsitePage } from '../LiveWebsitePage';
import userEvent from '@testing-library/user-event';

// Mock AuthProvider
vi.mock('@/app/providers/AuthProvider', () => createMockAuthProvider());

// Mock hooks
vi.mock('@/features/sync/hooks/useSyncPreview');
vi.mock('@/features/sync/hooks/useSync');

import * as useSyncPreviewModule from '@/features/sync/hooks/useSyncPreview';
import * as useSyncModule from '@/features/sync/hooks/useSync';

// Mock window.confirm and window.alert
global.confirm = vi.fn();
global.alert = vi.fn();

describe('LiveWebsitePage', () => {
  const mockSyncPreview = {
    additions: [
      {
        id: 'add-1',
        venueName: 'New Restaurant',
        dishCount: 5,
      },
      {
        id: 'add-2',
        venueName: 'Another New Place',
        dishCount: 3,
      },
    ],
    updates: [
      {
        id: 'update-1',
        venueName: 'Updated Restaurant',
        diff: ['name', 'address'],
      },
    ],
    removals: [
      {
        id: 'remove-1',
        venueName: 'Closed Restaurant',
      },
    ],
  };

  const mockStats = {
    lastSync: '2024-12-10T10:00:00Z',
    successRate: 98,
    totalSyncs: 150,
  };

  const mockExecuteSync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.confirm).mockReturnValue(true);
    vi.mocked(global.alert).mockReturnValue(undefined);

    // Mock useSyncPreview
    vi.mocked(useSyncPreviewModule.useSyncPreview).mockReturnValue({
      data: mockSyncPreview,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    // Mock useSyncStats
    vi.mocked(useSyncPreviewModule.useSyncStats).mockReturnValue({
      data: mockStats,
      isLoading: false,
    } as any);

    // Mock useSync
    vi.mocked(useSyncModule.useSync).mockReturnValue({
      executeSync: mockExecuteSync,
    } as any);
  });

  describe('Loading State', () => {
    it('should show loading state when fetching preview', () => {
      vi.mocked(useSyncPreviewModule.useSyncPreview).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<LiveWebsitePage />);

      expect(screen.getByText('Loading sync data...')).toBeInTheDocument();
    });

    it('should show loading state when fetching stats', () => {
      vi.mocked(useSyncPreviewModule.useSyncStats).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      render(<LiveWebsitePage />);

      expect(screen.getByText('Loading sync data...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error state when preview fetch fails', () => {
      const mockError = new Error('Failed to load sync preview');
      vi.mocked(useSyncPreviewModule.useSyncPreview).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: vi.fn(),
      } as any);

      render(<LiveWebsitePage />);

      // ErrorState should render with the error
      expect(screen.getByText('Failed to load sync preview')).toBeInTheDocument();
    });

    it('should allow retry on error', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();
      vi.mocked(useSyncPreviewModule.useSyncPreview).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      } as any);

      render(<LiveWebsitePage />);

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Sync Preview Display', () => {
    it('should display pending changes count', () => {
      render(<LiveWebsitePage />);

      // Total: 2 additions + 1 update + 1 removal = 4
      expect(screen.getByText(/sync all \(4\)/i)).toBeInTheDocument();
    });

    it('should display additions count', () => {
      render(<LiveWebsitePage />);

      // Look for the additions count in the stats card
      const additionsCount = screen.getAllByText('+2');
      expect(additionsCount.length).toBeGreaterThan(0);
    });

    it('should display updates count', () => {
      render(<LiveWebsitePage />);

      // Look for updates count - there may be multiple "1"s on the page
      const updatesCounts = screen.getAllByText('1');
      expect(updatesCounts.length).toBeGreaterThan(0);
    });

    it('should display removals count', () => {
      render(<LiveWebsitePage />);

      // Look for removals count
      const removalsCounts = screen.getAllByText('-1');
      expect(removalsCounts.length).toBeGreaterThan(0);
    });

    it('should display individual additions', () => {
      render(<LiveWebsitePage />);

      expect(screen.getByText('New Restaurant')).toBeInTheDocument();
      expect(screen.getByText('(5 dishes)')).toBeInTheDocument();
      expect(screen.getByText('Another New Place')).toBeInTheDocument();
      expect(screen.getByText('(3 dishes)')).toBeInTheDocument();
    });

    it('should display individual updates', () => {
      render(<LiveWebsitePage />);

      expect(screen.getByText('Updated Restaurant')).toBeInTheDocument();
      expect(screen.getByText('(2 fields changed)')).toBeInTheDocument();
    });

    it('should display individual removals', () => {
      render(<LiveWebsitePage />);

      expect(screen.getByText('Closed Restaurant')).toBeInTheDocument();
    });

    it('should show "New" badge for additions', () => {
      render(<LiveWebsitePage />);

      const newBadges = screen.getAllByText('New');
      expect(newBadges.length).toBeGreaterThan(0);
    });

    it('should show "Update" badge for updates', () => {
      render(<LiveWebsitePage />);

      expect(screen.getByText('Update')).toBeInTheDocument();
    });

    it('should show "Remove" badge for removals', () => {
      render(<LiveWebsitePage />);

      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('should limit displayed items to 10 per category', () => {
      const manyAdditions = Array.from({ length: 15 }, (_, i) => ({
        id: `add-${i}`,
        venueName: `Restaurant ${i}`,
        dishCount: 5,
      }));

      vi.mocked(useSyncPreviewModule.useSyncPreview).mockReturnValue({
        data: {
          additions: manyAdditions,
          updates: [],
          removals: [],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<LiveWebsitePage />);

      expect(screen.getByText('+5 more additions')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show "all synced" message when no pending changes', () => {
      vi.mocked(useSyncPreviewModule.useSyncPreview).mockReturnValue({
        data: {
          additions: [],
          updates: [],
          removals: [],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<LiveWebsitePage />);

      expect(screen.getByText('All synced!')).toBeInTheDocument();
      expect(screen.getByText('No pending changes to push.')).toBeInTheDocument();
    });

    it('should disable sync button when no pending changes', () => {
      vi.mocked(useSyncPreviewModule.useSyncPreview).mockReturnValue({
        data: {
          additions: [],
          updates: [],
          removals: [],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<LiveWebsitePage />);

      const syncButton = screen.getByRole('button', { name: /sync all/i });
      expect(syncButton).toBeDisabled();
    });
  });

  describe('Stats Display', () => {
    it('should display last sync time', () => {
      render(<LiveWebsitePage />);

      expect(screen.getByText(/last synced:/i)).toBeInTheDocument();
      // Date format will depend on locale, so just check it's there
      const dateText = new Date('2024-12-10T10:00:00Z').toLocaleString();
      expect(screen.getByText(dateText)).toBeInTheDocument();
    });

    it('should display success rate', () => {
      render(<LiveWebsitePage />);

      expect(screen.getByText(/success rate: 98%/i)).toBeInTheDocument();
    });

    it('should display total syncs count', () => {
      render(<LiveWebsitePage />);

      expect(screen.getByText(/total syncs: 150/i)).toBeInTheDocument();
    });

    it('should not show stats if no last sync data', () => {
      vi.mocked(useSyncPreviewModule.useSyncStats).mockReturnValue({
        data: null,
        isLoading: false,
      } as any);

      render(<LiveWebsitePage />);

      expect(screen.queryByText(/last synced:/i)).not.toBeInTheDocument();
    });
  });

  describe('Sync Execution', () => {
    it('should show confirmation dialog before syncing', async () => {
      const user = userEvent.setup();
      render(<LiveWebsitePage />);

      const syncButton = screen.getByRole('button', { name: /sync all \(4\)/i });
      await user.click(syncButton);

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to sync 4 changes to the website?'
      );
    });

    it('should not execute sync if user cancels confirmation', async () => {
      const user = userEvent.setup();
      vi.mocked(global.confirm).mockReturnValue(false);

      render(<LiveWebsitePage />);

      const syncButton = screen.getByRole('button', { name: /sync all \(4\)/i });
      await user.click(syncButton);

      expect(mockExecuteSync).not.toHaveBeenCalled();
    });

    it('should execute sync with all item IDs when confirmed', async () => {
      const user = userEvent.setup();
      mockExecuteSync.mockResolvedValue({
        success: true,
        itemsSucceeded: 4,
        itemsFailed: 0,
      });

      render(<LiveWebsitePage />);

      const syncButton = screen.getByRole('button', { name: /sync all \(4\)/i });
      await user.click(syncButton);

      expect(mockExecuteSync).toHaveBeenCalledWith({
        itemIds: ['add-1', 'add-2', 'update-1', 'remove-1'],
      });
    });

    it('should show success message after successful sync', async () => {
      const user = userEvent.setup();
      mockExecuteSync.mockResolvedValue({
        success: true,
        itemsSucceeded: 4,
        itemsFailed: 0,
      });

      render(<LiveWebsitePage />);

      const syncButton = screen.getByRole('button', { name: /sync all \(4\)/i });
      await user.click(syncButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          'Sync completed successfully! 4 items synced.'
        );
      });
    });

    it('should refetch preview after successful sync', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();
      mockExecuteSync.mockResolvedValue({
        success: true,
        itemsSucceeded: 4,
        itemsFailed: 0,
      });

      vi.mocked(useSyncPreviewModule.useSyncPreview).mockReturnValue({
        data: mockSyncPreview,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(<LiveWebsitePage />);

      const syncButton = screen.getByRole('button', { name: /sync all \(4\)/i });
      await user.click(syncButton);

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('should show failure message when sync partially fails', async () => {
      const user = userEvent.setup();
      mockExecuteSync.mockResolvedValue({
        success: false,
        itemsSucceeded: 3,
        itemsFailed: 1,
      });

      render(<LiveWebsitePage />);

      const syncButton = screen.getByRole('button', { name: /sync all \(4\)/i });
      await user.click(syncButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Sync completed with 1 failures.');
      });
    });

    it('should show error message on sync exception', async () => {
      const user = userEvent.setup();
      mockExecuteSync.mockRejectedValue(new Error('Network error'));

      render(<LiveWebsitePage />);

      const syncButton = screen.getByRole('button', { name: /sync all \(4\)/i });
      await user.click(syncButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Sync failed. Please try again.');
      });
    });

    it('should disable sync button while syncing', async () => {
      const user = userEvent.setup();
      mockExecuteSync.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<LiveWebsitePage />);

      const syncButton = screen.getByRole('button', { name: /sync all \(4\)/i });
      await user.click(syncButton);

      expect(syncButton).toBeDisabled();
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });

    it('should not sync if no changes available', async () => {
      const user = userEvent.setup();
      vi.mocked(useSyncPreviewModule.useSyncPreview).mockReturnValue({
        data: {
          additions: [],
          updates: [],
          removals: [],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<LiveWebsitePage />);

      const syncButton = screen.getByRole('button', { name: /sync all \(0\)/i });
      expect(syncButton).toBeDisabled();

      await user.click(syncButton);

      expect(mockExecuteSync).not.toHaveBeenCalled();
    });
  });

  describe('Refresh', () => {
    it('should refetch preview when refresh button clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();
      vi.mocked(useSyncPreviewModule.useSyncPreview).mockReturnValue({
        data: mockSyncPreview,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      render(<LiveWebsitePage />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('External Link', () => {
    it('should display link to live website', () => {
      render(<LiveWebsitePage />);

      const link = screen.getByRole('link', { name: /view live website/i });
      expect(link).toHaveAttribute('href', 'https://planted.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<LiveWebsitePage />);

      const mainHeading = screen.getByRole('heading', { name: /live website/i, level: 1 });
      expect(mainHeading).toBeInTheDocument();
    });

    it('should have descriptive text', () => {
      render(<LiveWebsitePage />);

      expect(screen.getByText('Manage what\'s published on the website')).toBeInTheDocument();
    });
  });
});
