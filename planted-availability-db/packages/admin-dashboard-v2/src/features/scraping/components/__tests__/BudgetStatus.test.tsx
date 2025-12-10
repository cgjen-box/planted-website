/**
 * BudgetStatus Component Tests
 *
 * Tests for the budget status display component including:
 * - Daily and monthly usage display
 * - Progress bars with color coding
 * - Throttle warnings
 * - Cost breakdown
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { BudgetStatus } from '../BudgetStatus';
import { BudgetStatus as BudgetStatusType } from '../../types';

describe('BudgetStatus Component', () => {
  const createMockBudget = (overrides: Partial<BudgetStatusType> = {}): BudgetStatusType => ({
    daily: {
      limit: 100,
      used: 45,
      percentage: 45,
    },
    monthly: {
      limit: 2000,
      used: 850,
      percentage: 42.5,
    },
    breakdown: {
      search: {
        free: {
          limit: 1000,
          used: 450,
        },
        paid: {
          cost: 12.5,
          count: 25,
        },
      },
      ai: {
        cost: 32.5,
        calls: 650,
      },
    },
    throttled: false,
    ...overrides,
  });

  describe('Daily Usage', () => {
    it('should display daily usage with correct values', () => {
      const budget = createMockBudget();
      render(<BudgetStatus budget={budget} />);

      expect(screen.getByText('Daily Usage')).toBeInTheDocument();
      expect(screen.getByText('$45.00 / $100.00')).toBeInTheDocument();
      expect(screen.getByText('45.0% used')).toBeInTheDocument();
    });

    it('should show correct progress bar width for daily usage', () => {
      const budget = createMockBudget({ daily: { limit: 100, used: 75, percentage: 75 } });
      const { container } = render(<BudgetStatus budget={budget} />);

      const progressBars = container.querySelectorAll('[style*="width"]');
      const dailyProgressBar = progressBars[0] as HTMLElement;
      expect(dailyProgressBar.style.width).toBe('75%');
    });

    it('should show green color for daily usage under 80%', () => {
      const budget = createMockBudget({ daily: { limit: 100, used: 50, percentage: 50 } });
      const { container } = render(<BudgetStatus budget={budget} />);

      // The progress bar is inside a bg-muted container, find the inner colored div
      const progressBars = container.querySelectorAll('.bg-muted > div');
      expect(progressBars[0]).toHaveClass('bg-primary');
    });

    it('should show yellow color for daily usage 80-89%', () => {
      const budget = createMockBudget({ daily: { limit: 100, used: 85, percentage: 85 } });
      const { container } = render(<BudgetStatus budget={budget} />);

      const progressBars = container.querySelectorAll('.bg-muted > div');
      expect(progressBars[0]).toHaveClass('bg-yellow-500');
    });

    it('should show red color for daily usage 90%+', () => {
      const budget = createMockBudget({ daily: { limit: 100, used: 95, percentage: 95 } });
      const { container } = render(<BudgetStatus budget={budget} />);

      const progressBars = container.querySelectorAll('.bg-muted > div');
      expect(progressBars[0]).toHaveClass('bg-destructive');
    });

    it('should show warning badge at 80% daily usage', () => {
      const budget = createMockBudget({ daily: { limit: 100, used: 85, percentage: 85 } });
      render(<BudgetStatus budget={budget} />);

      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should show critical badge at 90% daily usage', () => {
      const budget = createMockBudget({ daily: { limit: 100, used: 95, percentage: 95 } });
      render(<BudgetStatus budget={budget} />);

      expect(screen.getByText('Critical')).toBeInTheDocument();
    });
  });

  describe('Monthly Usage', () => {
    it('should display monthly usage with correct values', () => {
      const budget = createMockBudget();
      render(<BudgetStatus budget={budget} />);

      expect(screen.getByText('Monthly Usage')).toBeInTheDocument();
      expect(screen.getByText('$850.00 / $2000.00')).toBeInTheDocument();
      expect(screen.getByText('42.5% used')).toBeInTheDocument();
    });

    it('should show correct progress bar width for monthly usage', () => {
      const budget = createMockBudget({ monthly: { limit: 2000, used: 1200, percentage: 60 } });
      const { container } = render(<BudgetStatus budget={budget} />);

      const progressBars = container.querySelectorAll('[style*="width"]');
      const monthlyProgressBar = progressBars[1] as HTMLElement;
      expect(monthlyProgressBar.style.width).toBe('60%');
    });

    it('should show warning badge at 80% monthly usage', () => {
      const budget = createMockBudget({ monthly: { limit: 2000, used: 1700, percentage: 85 } });
      render(<BudgetStatus budget={budget} />);

      const warnings = screen.getAllByText('Warning');
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Throttle Warnings', () => {
    it('should display throttle warning when throttled', () => {
      const budget = createMockBudget({
        throttled: true,
        throttleReason: 'Rate limit exceeded',
      });
      render(<BudgetStatus budget={budget} />);

      expect(screen.getByText('Throttled')).toBeInTheDocument();
      expect(screen.getByText('API Throttled')).toBeInTheDocument();
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    });

    it('should display default throttle message when no reason provided', () => {
      const budget = createMockBudget({ throttled: true });
      render(<BudgetStatus budget={budget} />);

      expect(screen.getByText('Rate limit reached')).toBeInTheDocument();
    });

    it('should not display throttle warning when not throttled', () => {
      const budget = createMockBudget({ throttled: false });
      render(<BudgetStatus budget={budget} />);

      expect(screen.queryByText('API Throttled')).not.toBeInTheDocument();
    });
  });

  describe('Cost Breakdown', () => {
    it('should display search cost breakdown', () => {
      const budget = createMockBudget();
      render(<BudgetStatus budget={budget} />);

      expect(screen.getByText('Search Queries')).toBeInTheDocument();
      expect(screen.getByText('450 / 1000')).toBeInTheDocument();
      expect(screen.getByText('$12.50 (25 queries)')).toBeInTheDocument();
    });

    it('should display AI cost breakdown', () => {
      const budget = createMockBudget();
      render(<BudgetStatus budget={budget} />);

      expect(screen.getByText('AI Calls')).toBeInTheDocument();
      expect(screen.getByText('$32.50')).toBeInTheDocument();
      expect(screen.getByText('650')).toBeInTheDocument();
    });

    it('should display total daily cost', () => {
      const budget = createMockBudget({ daily: { limit: 100, used: 45, percentage: 45 } });
      render(<BudgetStatus budget={budget} />);

      expect(screen.getByText('Total Today')).toBeInTheDocument();
      expect(screen.getByText('$45.00')).toBeInTheDocument();
    });
  });

  describe('Warning Messages', () => {
    it('should show budget warning when daily usage is 80%+ and not throttled', () => {
      const budget = createMockBudget({
        daily: { limit: 100, used: 85, percentage: 85 },
        throttled: false,
      });
      render(<BudgetStatus budget={budget} />);

      expect(
        screen.getByText('Warning: Approaching budget limit. Consider pausing operations.')
      ).toBeInTheDocument();
    });

    it('should show budget warning when monthly usage is 80%+ and not throttled', () => {
      const budget = createMockBudget({
        monthly: { limit: 2000, used: 1700, percentage: 85 },
        throttled: false,
      });
      render(<BudgetStatus budget={budget} />);

      expect(
        screen.getByText('Warning: Approaching budget limit. Consider pausing operations.')
      ).toBeInTheDocument();
    });

    it('should not show budget warning when throttled', () => {
      const budget = createMockBudget({
        daily: { limit: 100, used: 85, percentage: 85 },
        throttled: true,
      });
      render(<BudgetStatus budget={budget} />);

      expect(
        screen.queryByText('Warning: Approaching budget limit. Consider pausing operations.')
      ).not.toBeInTheDocument();
    });

    it('should not show budget warning when usage is below 80%', () => {
      const budget = createMockBudget({
        daily: { limit: 100, used: 70, percentage: 70 },
        monthly: { limit: 2000, used: 1400, percentage: 70 },
        throttled: false,
      });
      render(<BudgetStatus budget={budget} />);

      expect(
        screen.queryByText('Warning: Approaching budget limit. Consider pausing operations.')
      ).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0% usage correctly', () => {
      const budget = createMockBudget({
        daily: { limit: 100, used: 0, percentage: 0 },
      });
      const { container } = render(<BudgetStatus budget={budget} />);

      expect(screen.getByText('0.0% used')).toBeInTheDocument();
      const progressBars = container.querySelectorAll('[style*="width"]');
      const dailyProgressBar = progressBars[0] as HTMLElement;
      expect(dailyProgressBar.style.width).toBe('0%');
    });

    it('should handle 100% usage correctly', () => {
      const budget = createMockBudget({
        daily: { limit: 100, used: 100, percentage: 100 },
      });
      const { container } = render(<BudgetStatus budget={budget} />);

      expect(screen.getByText('100.0% used')).toBeInTheDocument();
      const progressBars = container.querySelectorAll('[style*="width"]');
      const dailyProgressBar = progressBars[0] as HTMLElement;
      expect(dailyProgressBar.style.width).toBe('100%');
    });

    it('should cap progress bar at 100% for over-budget usage', () => {
      const budget = createMockBudget({
        daily: { limit: 100, used: 120, percentage: 120 },
      });
      const { container } = render(<BudgetStatus budget={budget} />);

      const progressBars = container.querySelectorAll('[style*="width"]');
      const dailyProgressBar = progressBars[0] as HTMLElement;
      expect(dailyProgressBar.style.width).toBe('100%');
    });

    it('should apply custom className when provided', () => {
      const budget = createMockBudget();
      const { container } = render(<BudgetStatus budget={budget} className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
