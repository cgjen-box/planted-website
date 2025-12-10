/**
 * ApprovalButtons Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ApprovalButtons } from '../ApprovalButtons';

describe('ApprovalButtons', () => {
  const mockOnApprove = vi.fn();
  const mockOnPartialApprove = vi.fn();
  const mockOnReject = vi.fn();
  const mockOnFlag = vi.fn();

  beforeEach(() => {
    mockOnApprove.mockClear();
    mockOnPartialApprove.mockClear();
    mockOnReject.mockClear();
    mockOnFlag.mockClear();
  });

  describe('Rendering', () => {
    it('should render all main buttons', () => {
      render(
        <ApprovalButtons
          onApprove={mockOnApprove}
          onPartialApprove={mockOnPartialApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('Approve All')).toBeInTheDocument();
      expect(screen.getByText('Partial Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('should render flag button when onFlag is provided', () => {
      render(
        <ApprovalButtons
          onApprove={mockOnApprove}
          onPartialApprove={mockOnPartialApprove}
          onReject={mockOnReject}
          onFlag={mockOnFlag}
        />
      );

      expect(screen.getByText('Flag')).toBeInTheDocument();
    });

    it('should not render flag button when onFlag is not provided', () => {
      render(
        <ApprovalButtons
          onApprove={mockOnApprove}
          onPartialApprove={mockOnPartialApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.queryByText('Flag')).not.toBeInTheDocument();
    });
  });

  describe('Button Actions', () => {
    it('should call onApprove when approve button is clicked', async () => {
      const { user } = render(
        <ApprovalButtons
          onApprove={mockOnApprove}
          onPartialApprove={mockOnPartialApprove}
          onReject={mockOnReject}
        />
      );

      await user.click(screen.getByText('Approve All'));
      expect(mockOnApprove).toHaveBeenCalled();
    });

    it('should call onPartialApprove when partial approve button is clicked', async () => {
      const { user } = render(
        <ApprovalButtons
          onApprove={mockOnApprove}
          onPartialApprove={mockOnPartialApprove}
          onReject={mockOnReject}
        />
      );

      await user.click(screen.getByText('Partial Approve'));
      expect(mockOnPartialApprove).toHaveBeenCalled();
    });

    it('should call onReject when reject button is clicked', async () => {
      const { user } = render(
        <ApprovalButtons
          onApprove={mockOnApprove}
          onPartialApprove={mockOnPartialApprove}
          onReject={mockOnReject}
        />
      );

      await user.click(screen.getByText('Reject'));
      expect(mockOnReject).toHaveBeenCalled();
    });

    it('should call onFlag when flag button is clicked', async () => {
      const { user } = render(
        <ApprovalButtons
          onApprove={mockOnApprove}
          onPartialApprove={mockOnPartialApprove}
          onReject={mockOnReject}
          onFlag={mockOnFlag}
        />
      );

      await user.click(screen.getByText('Flag'));
      expect(mockOnFlag).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should disable all buttons when loading', () => {
      render(
        <ApprovalButtons
          onApprove={mockOnApprove}
          onPartialApprove={mockOnPartialApprove}
          onReject={mockOnReject}
          isLoading={true}
        />
      );

      expect(screen.getByText('Approve All').closest('button')).toBeDisabled();
      expect(screen.getByText('Partial Approve').closest('button')).toBeDisabled();
      expect(screen.getByText('Reject').closest('button')).toBeDisabled();
    });
  });

  describe('Disabled State', () => {
    it('should disable all buttons when disabled prop is true', () => {
      render(
        <ApprovalButtons
          onApprove={mockOnApprove}
          onPartialApprove={mockOnPartialApprove}
          onReject={mockOnReject}
          disabled={true}
        />
      );

      expect(screen.getByText('Approve All').closest('button')).toBeDisabled();
      expect(screen.getByText('Partial Approve').closest('button')).toBeDisabled();
      expect(screen.getByText('Reject').closest('button')).toBeDisabled();
    });
  });

  describe('Button Styling', () => {
    it('should have green styling for approve button', () => {
      render(
        <ApprovalButtons
          onApprove={mockOnApprove}
          onPartialApprove={mockOnPartialApprove}
          onReject={mockOnReject}
        />
      );

      const approveButton = screen.getByText('Approve All').closest('button')!;
      expect(approveButton.className).toContain('bg-green-600');
    });

    it('should have yellow styling for partial approve button', () => {
      render(
        <ApprovalButtons
          onApprove={mockOnApprove}
          onPartialApprove={mockOnPartialApprove}
          onReject={mockOnReject}
        />
      );

      const partialButton = screen.getByText('Partial Approve').closest('button')!;
      expect(partialButton.className).toContain('border-yellow-500');
    });

    it('should have destructive styling for reject button', () => {
      render(
        <ApprovalButtons
          onApprove={mockOnApprove}
          onPartialApprove={mockOnPartialApprove}
          onReject={mockOnReject}
        />
      );

      const rejectButton = screen.getByText('Reject').closest('button')!;
      expect(rejectButton.className).toContain('destructive');
    });
  });
});
