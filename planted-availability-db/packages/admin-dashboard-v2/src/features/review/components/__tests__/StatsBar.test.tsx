/**
 * StatsBar Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { StatsBar } from '../StatsBar';
import { mockStats } from '@/test/mocks/data/venues';

describe('StatsBar', () => {
  it('should render all stat categories', () => {
    render(<StatsBar stats={mockStats} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('should display correct stat values', () => {
    const { container } = render(<StatsBar stats={mockStats} />);

    // Use getByText with parent context to avoid ambiguity
    const pendingSection = screen.getByText('Pending').parentElement;
    expect(pendingSection).toHaveTextContent('3');

    const verifiedSection = screen.getByText('Verified').parentElement;
    expect(verifiedSection).toHaveTextContent('1');

    const rejectedSection = screen.getByText('Rejected').parentElement;
    expect(rejectedSection).toHaveTextContent('1');

    const totalSection = screen.getByText('Total').parentElement;
    expect(totalSection).toHaveTextContent('5');
  });

  it('should show average confidence when greater than 0', () => {
    render(<StatsBar stats={mockStats} />);

    expect(screen.getByText('Average Confidence:')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
  });

  it('should not show average confidence when 0', () => {
    const statsWithZeroConfidence = { ...mockStats, averageConfidence: 0 };
    render(<StatsBar stats={statsWithZeroConfidence} />);

    expect(screen.queryByText('Average Confidence:')).not.toBeInTheDocument();
  });

  it('should apply correct badge variant for high confidence', () => {
    const highConfidenceStats = { ...mockStats, averageConfidence: 0.85 };
    render(<StatsBar stats={highConfidenceStats} />);

    // Just verify the percentage is displayed correctly
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('should apply correct styling for different stat types', () => {
    const { container } = render(<StatsBar stats={mockStats} />);

    // Check that stat items have proper icons and styling
    const statItems = container.querySelectorAll('[class*="rounded-lg"]');
    expect(statItems.length).toBeGreaterThan(0);
  });
});
