import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
  describe('Rendering', () => {
    it('renders checkbox input', () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Checkbox label="Accept terms" />);
      expect(screen.getByText('Accept terms')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders without label', () => {
      render(<Checkbox />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.queryByRole('label')).not.toBeInTheDocument();
    });

    it('generates unique id when not provided', () => {
      render(<Checkbox label="Test" />);
      const checkbox = screen.getByRole('checkbox');
      const id = checkbox.getAttribute('id');
      expect(id).toBeTruthy();
    });

    it('uses custom id when provided', () => {
      render(<Checkbox id="custom-checkbox" label="Custom" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('id', 'custom-checkbox');
    });

    it('forwards ref correctly', () => {
      const ref = { current: null } as React.RefObject<HTMLInputElement>;
      render(<Checkbox ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('Label Association', () => {
    it('associates label with checkbox via htmlFor', () => {
      render(<Checkbox label="Click me" />);
      const checkbox = screen.getByRole('checkbox');
      const label = screen.getByText('Click me');
      expect(label).toHaveAttribute('for', checkbox.id);
    });

    it('toggles checkbox when label is clicked', async () => {
      const { user } = render(<Checkbox label="Click label" />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      const label = screen.getByText('Click label');

      expect(checkbox.checked).toBe(false);
      await user.click(label);
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('Styling', () => {
    it('applies base styling classes to checkbox', () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('h-4');
      expect(checkbox).toHaveClass('w-4');
      expect(checkbox).toHaveClass('rounded');
      expect(checkbox).toHaveClass('border');
    });

    it('has checked styles', () => {
      render(<Checkbox defaultChecked />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('checked:bg-primary');
      expect(checkbox).toHaveClass('checked:border-primary');
    });

    it('has focus styles', () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('focus-visible:outline-none');
      expect(checkbox).toHaveClass('focus-visible:ring-2');
    });

    it('has disabled styles', () => {
      render(<Checkbox disabled />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('disabled:cursor-not-allowed');
      expect(checkbox).toHaveClass('disabled:opacity-50');
    });

    it('merges custom className', () => {
      render(<Checkbox className="custom-checkbox" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('custom-checkbox');
      expect(checkbox).toHaveClass('h-4');
    });
  });

  describe('Check Icon', () => {
    it('renders check icon', () => {
      const { container } = render(<Checkbox />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('check icon is hidden when unchecked', () => {
      const { container } = render(<Checkbox />);
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('opacity-0');
    });

    it('check icon is visible when checked', () => {
      const { container } = render(<Checkbox defaultChecked />);
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('peer-checked:opacity-100');
    });
  });

  describe('States', () => {
    it('is unchecked by default', () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('can be checked by default', () => {
      render(<Checkbox defaultChecked />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('handles controlled checked state', () => {
      const { rerender } = render(<Checkbox checked={false} onChange={() => {}} />);
      let checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      rerender(<Checkbox checked={true} onChange={() => {}} />);
      checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('handles disabled state', () => {
      render(<Checkbox disabled />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('is enabled by default', () => {
      render(<Checkbox />);
      expect(screen.getByRole('checkbox')).toBeEnabled();
    });

    it('label has disabled styles when checkbox is disabled', () => {
      render(<Checkbox label="Disabled" disabled />);
      const label = screen.getByText('Disabled');
      expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
      expect(label).toHaveClass('peer-disabled:opacity-70');
    });
  });

  describe('Interactions', () => {
    it('toggles checked state when clicked', async () => {
      const { user } = render(<Checkbox />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;

      expect(checkbox.checked).toBe(false);
      await user.click(checkbox);
      expect(checkbox.checked).toBe(true);
      await user.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it('calls onChange when clicked', async () => {
      const handleChange = vi.fn();
      const { user } = render(<Checkbox onChange={handleChange} />);
      const checkbox = screen.getByRole('checkbox');

      await user.click(checkbox);
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ checked: true }),
        })
      );
    });

    it('calls onCheckedChange with boolean value', async () => {
      const handleCheckedChange = vi.fn();
      const { user } = render(<Checkbox onCheckedChange={handleCheckedChange} />);
      const checkbox = screen.getByRole('checkbox');

      await user.click(checkbox);
      expect(handleCheckedChange).toHaveBeenCalledWith(true);

      await user.click(checkbox);
      expect(handleCheckedChange).toHaveBeenCalledWith(false);
    });

    it('calls both onChange and onCheckedChange', async () => {
      const handleChange = vi.fn();
      const handleCheckedChange = vi.fn();
      const { user } = render(
        <Checkbox onChange={handleChange} onCheckedChange={handleCheckedChange} />
      );
      const checkbox = screen.getByRole('checkbox');

      await user.click(checkbox);
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleCheckedChange).toHaveBeenCalledWith(true);
    });

    it('does not call onChange when disabled', async () => {
      const handleChange = vi.fn();
      const { user } = render(<Checkbox disabled onChange={handleChange} />);
      const checkbox = screen.getByRole('checkbox');

      await user.click(checkbox);
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('can be toggled with keyboard (Space)', async () => {
      const { user } = render(<Checkbox />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;

      checkbox.focus();
      expect(checkbox.checked).toBe(false);

      await user.keyboard(' ');
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('HTML Attributes', () => {
    it('supports name attribute', () => {
      render(<Checkbox name="terms" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('name', 'terms');
    });

    it('supports value attribute', () => {
      render(<Checkbox value="accepted" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('value', 'accepted');
    });

    it('supports required attribute', () => {
      render(<Checkbox required />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeRequired();
    });

    it('supports data attributes', () => {
      render(<Checkbox data-testid="test-checkbox" data-form="signup" />);
      const checkbox = screen.getByTestId('test-checkbox');
      expect(checkbox).toHaveAttribute('data-form', 'signup');
    });
  });

  describe('Accessibility', () => {
    it('has checkbox role', () => {
      render(<Checkbox />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('supports aria-label', () => {
      render(<Checkbox aria-label="Accept terms and conditions" />);
      const checkbox = screen.getByLabelText('Accept terms and conditions');
      expect(checkbox).toBeInTheDocument();
    });

    it('supports aria-describedby', () => {
      render(
        <div>
          <Checkbox aria-describedby="terms-description" />
          <span id="terms-description">You must accept to continue</span>
        </div>
      );
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-describedby', 'terms-description');
    });

    it('label text is accessible', () => {
      render(<Checkbox label="Subscribe to newsletter" />);
      expect(screen.getByLabelText('Subscribe to newsletter')).toBeInTheDocument();
    });

    it('has cursor pointer on label', () => {
      render(<Checkbox label="Clickable" />);
      const label = screen.getByText('Clickable');
      expect(label).toHaveClass('cursor-pointer');
    });

    it('label has cursor not-allowed when disabled', () => {
      render(<Checkbox label="Disabled" disabled />);
      const label = screen.getByText('Disabled');
      expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
    });
  });

  describe('Form Integration', () => {
    it('works in a form', () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      render(
        <form onSubmit={handleSubmit}>
          <Checkbox name="terms" label="I agree" />
          <button type="submit">Submit</button>
        </form>
      );

      const checkbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button');

      submitButton.click();
      expect(handleSubmit).toHaveBeenCalled();
      expect(checkbox).toBeInTheDocument();
    });

    it('includes value in form data when checked', async () => {
      const handleSubmit = vi.fn((e) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        return formData;
      });

      const { user } = render(
        <form onSubmit={handleSubmit}>
          <Checkbox name="newsletter" value="yes" />
          <button type="submit">Submit</button>
        </form>
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      const submitButton = screen.getByRole('button');
      submitButton.click();

      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid clicks', async () => {
      const handleChange = vi.fn();
      const { user } = render(<Checkbox onChange={handleChange} />);
      const checkbox = screen.getByRole('checkbox');

      await user.click(checkbox);
      await user.click(checkbox);
      await user.click(checkbox);

      expect(handleChange).toHaveBeenCalledTimes(3);
    });

    it('works with long label text', () => {
      const longLabel =
        'This is a very long label text that might wrap to multiple lines in the UI';
      render(<Checkbox label={longLabel} />);
      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it('renders multiple checkboxes independently', async () => {
      const { user } = render(
        <div>
          <Checkbox label="Option 1" />
          <Checkbox label="Option 2" />
          <Checkbox label="Option 3" />
        </div>
      );

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      expect(checkboxes).toHaveLength(3);

      await user.click(checkboxes[0]);
      expect(checkboxes[0].checked).toBe(true);
      expect(checkboxes[1].checked).toBe(false);
      expect(checkboxes[2].checked).toBe(false);
    });
  });
});
