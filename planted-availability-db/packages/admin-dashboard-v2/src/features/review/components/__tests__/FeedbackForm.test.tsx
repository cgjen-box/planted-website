/**
 * FeedbackForm Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { FeedbackForm } from '../FeedbackForm';

describe('FeedbackForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  describe('Partial Approval Form', () => {
    it('should render partial approval title', () => {
      render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Partial Approval Feedback')).toBeInTheDocument();
    });

    it('should render partial approval tags', () => {
      render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Wrong Price')).toBeInTheDocument();
      expect(screen.getByText('Missing Dish')).toBeInTheDocument();
      expect(screen.getByText('Wrong Product')).toBeInTheDocument();
    });

    it('should have correct placeholder for partial approval', () => {
      render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByPlaceholderText('Provide detailed feedback about what needs to be corrected...')
      ).toBeInTheDocument();
    });
  });

  describe('Rejection Form', () => {
    it('should render rejection title', () => {
      render(
        <FeedbackForm
          type="reject"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Rejection Reason')).toBeInTheDocument();
    });

    it('should render rejection reason tags', () => {
      render(
        <FeedbackForm
          type="reject"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Not a planted venue')).toBeInTheDocument();
      expect(screen.getByText('Duplicate entry')).toBeInTheDocument();
    });

    it('should have correct placeholder for rejection', () => {
      render(
        <FeedbackForm
          type="reject"
          onSubmit="{mockOnSubmit}"
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByPlaceholderText('Explain why this venue is being rejected...')
      ).toBeInTheDocument();
    });
  });

  describe('Tag Selection', () => {
    it('should toggle tag when clicked', async () => {
      const { user } = render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const wrongPriceTag = screen.getByText('Wrong Price');
      // Initially should have outline variant (text-foreground, no bg-primary)
      expect(wrongPriceTag.className).toContain('text-foreground');
      expect(wrongPriceTag.className).not.toContain('bg-primary');

      await user.click(wrongPriceTag);

      // After click, tag should be selected (has bg-primary from default variant)
      expect(wrongPriceTag.className).toContain('bg-primary');
    });

    it('should allow multiple tag selection', async () => {
      const { user } = render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const wrongPriceTag = screen.getByText('Wrong Price');
      const missingDishTag = screen.getByText('Missing Dish');

      await user.click(wrongPriceTag);
      await user.click(missingDishTag);

      // Both tags should be selected (has bg-primary)
      expect(wrongPriceTag.className).toContain('bg-primary');
      expect(missingDishTag.className).toContain('bg-primary');
    });

    it('should deselect tag when clicked again', async () => {
      const { user } = render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const tag = screen.getByText('Wrong Price');
      await user.click(tag);
      await user.click(tag);

      // Tag should be deselected (have outline variant)
      expect(tag.className).toContain('outline');
    });
  });

  describe('Feedback Text', () => {
    it('should update character count as user types', async () => {
      const { user } = render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test feedback');

      expect(screen.getByText('13 characters')).toBeInTheDocument();
    });

    it('should require feedback text', () => {
      render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('required');
    });

    it('should disable textarea when loading', () => {
      render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with feedback and tags', async () => {
      const { user } = render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByText('Wrong Price'));
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Price is incorrect');
      await user.click(screen.getByText('Submit'));

      expect(mockOnSubmit).toHaveBeenCalledWith('Price is incorrect', ['Wrong Price']);
    });

    it('should not submit when feedback is empty', async () => {
      const { user } = render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByText('Submit');
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when loading', () => {
      render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByText('Submitting...')).toBeInTheDocument();
    });
  });

  describe('Form Cancellation', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const { user } = render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByText('Cancel'));
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should disable cancel button when loading', () => {
      render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByText('Cancel').closest('button')).toBeDisabled();
    });
  });

  describe('Validation', () => {
    it('should enable submit only when feedback is provided', async () => {
      const { user } = render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByText('Submit');
      expect(submitButton).toBeDisabled();

      await user.type(screen.getByRole('textbox'), 'Some feedback');
      expect(submitButton).not.toBeDisabled();
    });

    it('should disable submit when feedback is only whitespace', async () => {
      const { user } = render(
        <FeedbackForm
          type="partial"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByRole('textbox'), '   ');
      expect(screen.getByText('Submit')).toBeDisabled();
    });
  });
});
