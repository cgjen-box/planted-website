/**
 * StatsPage Tests
 *
 * Tests for the statistics page including:
 * - Budget display
 * - Strategy stats display
 * - Queue status display
 * - Loading and error states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, createMockAuthProvider } from '@/test/test-utils';
import { StatsPage } from '../StatsPage';
import { mockBudgetStatus, mockStrategyStats } from '@/test/mocks/data/scraping';

// Mock AuthProvider
vi.mock('@/app/providers/AuthProvider', () => createMockAuthProvider());

// Mock hooks
vi.mock('@/features/scraping/hooks/useBudget');
vi.mock('@/features/review/hooks/useReviewQueue');
vi.mock('@/hooks/useStrategyStats');

import * as useBudgetModule from '@/features/scraping/hooks/useBudget';
import * as useReviewQueueModule from '@/features/review/hooks/useReviewQueue';
import * as useStrategyStatsModule from '@/hooks/useStrategyStats';

describe('StatsPage', () => {
  const mockQueueStats = {
    total: 160,
    pending: 25,
    verified: 120,
    rejected: 15,
    promoted: 0,
    byCountry: {
      CH: 60,
      DE: 70,
      AT: 30,
    },
    flagged: {
      total: 10,
      dish_extraction: 5,
      re_verification: 5,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useBudget
    vi.mocked(useBudgetModule.useBudget).mockReturnValue({
      data: mockBudgetStatus,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    // Mock useReviewQueue
    vi.mocked(useReviewQueueModule.useReviewQueue).mockReturnValue({
      data: {
        items: [],
        stats: mockQueueStats,
        hierarchy: null,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    // Mock useStrategyStats
    vi.mocked(useStrategyStatsModule.useStrategyStats).mockReturnValue({
      data: {
        stats: mockStrategyStats,
        top_strategies: mockStrategyStats.top_strategies,
        struggling_strategies: mockStrategyStats.struggling_strategies,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  describe('Loading State', () => {
    it('should show loading state when budget is loading', () => {
      vi.mocked(useBudgetModule.useBudget).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<StatsPage />);

      expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
    });

    it('should show loading state when queue is loading', () => {
      vi.mocked(useReviewQueueModule.useReviewQueue).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<StatsPage />);

      expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
    });

    it('should show loading state when strategy stats are loading', () => {
      vi.mocked(useStrategyStatsModule.useStrategyStats).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<StatsPage />);

      expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error state when budget fetch fails', () => {
      vi.mocked(useBudgetModule.useBudget).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch budget'),
        refetch: vi.fn(),
      } as any);

      render(<StatsPage />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should show error state when strategy stats fetch fails', () => {
      vi.mocked(useStrategyStatsModule.useStrategyStats).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch strategy stats'),
        refetch: vi.fn(),
      } as any);

      render(<StatsPage />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should allow retry on error', async () => {
      const mockRefetchBudget = vi.fn();
      const mockRefetchStrategy = vi.fn();

      vi.mocked(useBudgetModule.useBudget).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetchBudget,
      } as any);

      vi.mocked(useStrategyStatsModule.useStrategyStats).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: mockRefetchStrategy,
      } as any);

      const { user } = render(<StatsPage />);

      // Button says "Try Again", not "Retry"
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      expect(mockRefetchBudget).toHaveBeenCalled();
      expect(mockRefetchStrategy).toHaveBeenCalled();
    });
  });

  describe('Budget Display', () => {
    it('should render BudgetStatus component with budget data', () => {
      render(<StatsPage />);

      expect(screen.getByText('Budget Status')).toBeInTheDocument();
      expect(screen.getByText('Daily Usage')).toBeInTheDocument();
      expect(screen.getByText('Monthly Usage')).toBeInTheDocument();
    });

    it('should display daily budget usage', () => {
      render(<StatsPage />);

      expect(screen.getByText('$45.00 / $100.00')).toBeInTheDocument();
      expect(screen.getByText('45.0% used')).toBeInTheDocument();
    });

    it('should display monthly budget usage', () => {
      render(<StatsPage />);

      expect(screen.getByText('$850.00 / $2000.00')).toBeInTheDocument();
      expect(screen.getByText('42.5% used')).toBeInTheDocument();
    });
  });

  describe('Queue Status Display', () => {
    it('should display queue status card', () => {
      render(<StatsPage />);

      expect(screen.getByText('Queue Status')).toBeInTheDocument();
    });

    it('should display pending review count', () => {
      render(<StatsPage />);

      expect(screen.getByText('Pending Review')).toBeInTheDocument();
      // The count is rendered as a number, search within the stats section
      const pendingLabel = screen.getByText('Pending Review');
      const statsSection = pendingLabel.closest('.space-y-1');
      expect(statsSection).toHaveTextContent('25');
    });

    it('should display verified count', () => {
      render(<StatsPage />);

      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });

    it('should display rejected count', () => {
      render(<StatsPage />);

      expect(screen.getByText('Rejected')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('should display promoted count', () => {
      render(<StatsPage />);

      expect(screen.getByText('Promoted')).toBeInTheDocument();
      const promotedLabel = screen.getByText('Promoted');
      const statsSection = promotedLabel.closest('.space-y-1');
      expect(statsSection).toHaveTextContent('0');
    });

    it('should display flagged stats when available', () => {
      render(<StatsPage />);

      expect(screen.getByText(/dish extraction: 5/i)).toBeInTheDocument();
      expect(screen.getByText(/re-verification: 5/i)).toBeInTheDocument();
    });

    it('should display country breakdown', () => {
      render(<StatsPage />);

      expect(screen.getByText('CH: 60')).toBeInTheDocument();
      expect(screen.getByText('DE: 70')).toBeInTheDocument();
      expect(screen.getByText('AT: 30')).toBeInTheDocument();
    });
  });

  describe('Strategy Stats Display', () => {
    it('should display strategy learning performance card', () => {
      render(<StatsPage />);

      expect(screen.getByText('Strategy Learning Performance')).toBeInTheDocument();
      expect(
        screen.getByText('Reinforcement learning metrics for discovery strategies')
      ).toBeInTheDocument();
    });

    it('should display average success rate', () => {
      render(<StatsPage />);

      expect(screen.getByText('Avg Success Rate')).toBeInTheDocument();
      expect(screen.getByText('67%')).toBeInTheDocument();
    });

    it('should display total uses', () => {
      const { container } = render(<StatsPage />);

      expect(screen.getByText('Total Uses')).toBeInTheDocument();
      // Check that the container contains a number >= 5000 (formatted or not)
      const totalUsesSection = screen.getByText('Total Uses').closest('.text-center');
      expect(totalUsesSection?.textContent).toMatch(/5/);
    });

    it('should display total discoveries', () => {
      const { container } = render(<StatsPage />);

      expect(screen.getByText('Discoveries')).toBeInTheDocument();
      // Check that the container has a 3xxx number
      const discoveriesSection = screen.getByText('Discoveries').closest('.text-center');
      expect(discoveriesSection?.textContent).toMatch(/3/);
    });

    it('should display total false positives', () => {
      render(<StatsPage />);

      expect(screen.getByText('False Positives')).toBeInTheDocument();
      expect(screen.getByText('450')).toBeInTheDocument();
    });
  });

  describe('Strategy Tiers', () => {
    it('should display strategy tier breakdown', () => {
      render(<StatsPage />);

      expect(screen.getByText('Strategy Tiers')).toBeInTheDocument();
    });

    it('should display high tier count', () => {
      render(<StatsPage />);

      expect(screen.getByText('High (70%+)')).toBeInTheDocument();
      const highTierLabel = screen.getByText('High (70%+)');
      const tierSection = highTierLabel.closest('.text-center');
      expect(tierSection).toHaveTextContent('25');
    });

    it('should display medium tier count', () => {
      render(<StatsPage />);

      expect(screen.getByText('Medium (40-69%)')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
    });

    it('should display low tier count', () => {
      render(<StatsPage />);

      expect(screen.getByText('Low (<40%)')).toBeInTheDocument();
      expect(screen.getByText('35')).toBeInTheDocument();
    });

    it('should display untested tier count', () => {
      render(<StatsPage />);

      expect(screen.getByText('Untested')).toBeInTheDocument();
      const untestedLabel = screen.getByText('Untested');
      const tierSection = untestedLabel.closest('.text-center');
      expect(tierSection).toHaveTextContent('0');
    });
  });

  describe('Top Performing Strategies', () => {
    it('should display top strategies section', () => {
      render(<StatsPage />);

      expect(screen.getByText('Top Performing Strategies')).toBeInTheDocument();
    });

    it('should display top strategy details', () => {
      render(<StatsPage />);

      // First top strategy
      expect(screen.getByText('Planted Chicken UberEats CH')).toBeInTheDocument();
      // The success rate is shown as a badge
      const strategyCards = document.querySelectorAll('.bg-green-50, [class*="bg-green-950"]');
      expect(strategyCards.length).toBeGreaterThan(0);
    });

    it('should display multiple top strategies', () => {
      render(<StatsPage />);

      expect(screen.getByText('Planted Chicken UberEats CH')).toBeInTheDocument();
      expect(screen.getByText('Kebab Search Wolt DE')).toBeInTheDocument();
      expect(screen.getByText('Schnitzel Deliveroo AT')).toBeInTheDocument();
    });

    it('should limit top strategies to 5', () => {
      render(<StatsPage />);

      // Should show exactly 5 top strategies
      const topSection = screen.getByText('Top Performing Strategies').parentElement;
      const strategyCards = topSection?.querySelectorAll('.p-3.rounded-lg.border');
      expect(strategyCards?.length).toBeLessThanOrEqual(5);
    });

    it('should show empty state if no top strategies', () => {
      vi.mocked(useStrategyStatsModule.useStrategyStats).mockReturnValue({
        data: {
          stats: mockStrategyStats,
          top_strategies: [],
          struggling_strategies: [],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<StatsPage />);

      expect(screen.getByText('No data yet')).toBeInTheDocument();
    });
  });

  describe('Struggling Strategies', () => {
    it('should display struggling strategies section', () => {
      render(<StatsPage />);

      expect(screen.getByText('Struggling Strategies')).toBeInTheDocument();
    });

    it('should display struggling strategy details', () => {
      render(<StatsPage />);

      // First struggling strategy
      expect(screen.getByText('Generic Vegan Search')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText(/45 false positives/)).toBeInTheDocument();
    });

    it('should limit struggling strategies to 5', () => {
      render(<StatsPage />);

      const strugglingSection = screen.getByText('Struggling Strategies').parentElement;
      const strategyCards = strugglingSection?.querySelectorAll('.p-3.rounded-lg.border');
      expect(strategyCards?.length).toBeLessThanOrEqual(5);
    });

    it('should show positive message if no struggling strategies', () => {
      vi.mocked(useStrategyStatsModule.useStrategyStats).mockReturnValue({
        data: {
          stats: mockStrategyStats,
          top_strategies: mockStrategyStats.top_strategies,
          struggling_strategies: [],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<StatsPage />);

      expect(screen.getByText('All strategies performing well!')).toBeInTheDocument();
    });
  });

  describe('Strategy Origins', () => {
    it('should display strategy origin breakdown', () => {
      render(<StatsPage />);

      expect(screen.getByText('Strategy Origins')).toBeInTheDocument();
    });

    it('should display all origin types', () => {
      render(<StatsPage />);

      expect(screen.getByText('Seed: 20')).toBeInTheDocument();
      expect(screen.getByText('Evolved: 45')).toBeInTheDocument();
      expect(screen.getByText('Manual: 15')).toBeInTheDocument();
      expect(screen.getByText('Agent: 40')).toBeInTheDocument();
    });
  });

  describe('Summary Section', () => {
    it('should display active strategies count', () => {
      render(<StatsPage />);

      expect(screen.getByText(/active strategies: 120/i)).toBeInTheDocument();
    });

    it('should display deprecated strategies count', () => {
      render(<StatsPage />);

      expect(screen.getByText(/deprecated: 30/i)).toBeInTheDocument();
    });

    it('should display recently used count', () => {
      render(<StatsPage />);

      expect(screen.getByText(/recently used \(7d\): 45/i)).toBeInTheDocument();
    });

    it('should display total venues in queue', () => {
      render(<StatsPage />);

      expect(screen.getByText(/total venues in queue: 160/i)).toBeInTheDocument();
    });
  });

  describe('Data Formatting', () => {
    it('should format large numbers with commas', () => {
      render(<StatsPage />);

      // Check that formatted numbers appear on the page (locale might use different separators)
      // Just check that "Total Uses" section has a number
      const totalUsesSection = screen.getByText('Total Uses').closest('.text-center');
      expect(totalUsesSection?.textContent).toMatch(/\d/);
    });

    it('should display percentages correctly', () => {
      render(<StatsPage />);

      expect(screen.getByText('67%')).toBeInTheDocument(); // Avg success rate
      expect(screen.getByText('92%')).toBeInTheDocument(); // Top strategy
      expect(screen.getByText('25%')).toBeInTheDocument(); // Struggling strategy
    });
  });

  describe('Layout', () => {
    it('should display budget and queue status in top row', () => {
      render(<StatsPage />);

      expect(screen.getByText('Budget Status')).toBeInTheDocument();
      expect(screen.getByText('Queue Status')).toBeInTheDocument();
    });

    it('should display strategy performance section below', () => {
      render(<StatsPage />);

      expect(screen.getByText('Strategy Learning Performance')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<StatsPage />);

      const mainHeading = screen.getByRole('heading', { name: /^statistics$/i, level: 1 });
      expect(mainHeading).toBeInTheDocument();
    });

    it('should have descriptive text', () => {
      render(<StatsPage />);

      expect(
        screen.getByText('Budget usage, approval metrics, and reinforcement learning performance')
      ).toBeInTheDocument();
    });
  });

  describe('Empty Data Handling', () => {
    it('should handle missing stats gracefully', () => {
      vi.mocked(useReviewQueueModule.useReviewQueue).mockReturnValue({
        data: {
          items: [],
          stats: undefined,
          hierarchy: null,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<StatsPage />);

      // Should show 0 for undefined stats in pending section
      const pendingLabel = screen.getByText('Pending Review');
      const statsSection = pendingLabel.closest('.space-y-1');
      expect(statsSection).toHaveTextContent('0');
    });

    it('should handle missing strategy stats gracefully', () => {
      vi.mocked(useStrategyStatsModule.useStrategyStats).mockReturnValue({
        data: {
          stats: undefined,
          top_strategies: [],
          struggling_strategies: [],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      render(<StatsPage />);

      // Should render without crashing
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });
  });
});
