/**
 * BulkActionsBar Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { BulkActionsBar } from '../BulkActionsBar';

describe('BulkActionsBar', () => {
  const mockOnBulkApprove = vi.fn();
  const mockOnBulkReject = vi.fn();
  const mockOnClearSelection = vi.fn();

  beforeEach(() => {
    mockOnBulkApprove.mockClear();
    mockOnBulkReject.mockClear();
    mockOnClearSelection.mockClear();
  });

  it('should not render when selectedCount is 0', () => {
    const { container } = render(
        <BulkActionsBar
          selectedCount={0}
          onBulkApprove={mockOnBulkApprove}
          onBulkReject={mockOnBulkReject}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when items are selected', () => {
      render(
        <BulkActionsBar
          selectedCount={3}
          onBulkApprove={mockOnBulkApprove}
          onBulkReject={mockOnBulkReject}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('items selected')).toBeInTheDocument();
    });

    it('should show singular "item" for count of 1', () => {
      render(
        <BulkActionsBar
          selectedCount={1}
          onBulkApprove={mockOnBulkApprove}
          onBulkReject={mockOnBulkReject}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(screen.getByText('item selected')).toBeInTheDocument();
    });

    it('should show all action buttons', () => {
      render(
        <BulkActionsBar
          selectedCount={3}
          onBulkApprove={mockOnBulkApprove}
          onBulkReject={mockOnBulkReject}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(screen.getByText('Approve All')).toBeInTheDocument();
      expect(screen.getByText('Reject All')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should call onBulkApprove when approve button is clicked', async () => {
      const { user } = render(
        <BulkActionsBar
          selectedCount={3}
          onBulkApprove={mockOnBulkApprove}
          onBulkReject={mockOnBulkReject}
          onClearSelection={mockOnClearSelection}
        />
      );

      await user.click(screen.getByText('Approve All'));
      expect(mockOnBulkApprove).toHaveBeenCalled();
    });

    it('should call onBulkReject when reject button is clicked', async () => {
      const { user } = render(
        <BulkActionsBar
          selectedCount={3}
          onBulkApprove={mockOnBulkApprove}
          onBulkReject={mockOnBulkReject}
          onClearSelection={mockOnClearSelection}
        />
      );

      await user.click(screen.getByText('Reject All'));
      expect(mockOnBulkReject).toHaveBeenCalled();
    });

    it('should call onClearSelection when clear button is clicked', async () => {
      const { user } = render(
        <BulkActionsBar
          selectedCount={3}
          onBulkApprove={mockOnBulkApprove}
          onBulkReject={mockOnBulkReject}
          onClearSelection={mockOnClearSelection}
        />
      );

      await user.click(screen.getByText('Clear'));
      expect(mockOnClearSelection).toHaveBeenCalled();
    });

    it('should disable buttons when loading', () => {
      render(
        <BulkActionsBar
          selectedCount={3}
          onBulkApprove={mockOnBulkApprove}
          onBulkReject={mockOnBulkReject}
          onClearSelection={mockOnClearSelection}
          isLoading={true}
        />
      );

      expect(screen.getByText('Approve All').closest('button')).toBeDisabled();
      expect(screen.getByText('Reject All').closest('button')).toBeDisabled();
      expect(screen.getByText('Clear').closest('button')).toBeDisabled();
    });
});
