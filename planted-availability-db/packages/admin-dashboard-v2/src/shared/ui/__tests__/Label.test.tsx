import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Label } from '../Label';

describe('Label', () => {
  describe('Rendering', () => {
    it('renders label text', () => {
      render(<Label>Email Address</Label>);
      expect(screen.getByText('Email Address')).toBeInTheDocument();
    });

    it('renders as label element', () => {
      const { container } = render(<Label>Label</Label>);
      const label = container.querySelector('label');
      expect(label).toBeInTheDocument();
    });

    it('renders with children', () => {
      render(
        <Label>
          Username <span className="text-red-500">*</span>
        </Label>
      );
      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('forwards ref correctly', () => {
      const ref = { current: null } as React.RefObject<HTMLLabelElement>;
      render(<Label ref={ref}>Label</Label>);
      expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    });
  });

  describe('Styling', () => {
    it('applies base styling classes', () => {
      render(<Label>Styled Label</Label>);
      const label = screen.getByText('Styled Label');
      expect(label).toHaveClass('text-sm');
      expect(label).toHaveClass('font-medium');
      expect(label).toHaveClass('leading-none');
    });

    it('has peer-disabled styles', () => {
      render(<Label>Disabled Label</Label>);
      const label = screen.getByText('Disabled Label');
      expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
      expect(label).toHaveClass('peer-disabled:opacity-70');
    });

    it('merges custom className', () => {
      render(<Label className="custom-label">Label</Label>);
      const label = screen.getByText('Label');
      expect(label).toHaveClass('custom-label');
      expect(label).toHaveClass('text-sm');
    });

    it('allows className to override default styles', () => {
      render(<Label className="text-lg font-bold">Large Label</Label>);
      const label = screen.getByText('Large Label');
      expect(label).toHaveClass('text-lg');
      expect(label).toHaveClass('font-bold');
    });
  });

  describe('HTML Attributes', () => {
    it('supports htmlFor attribute', () => {
      render(<Label htmlFor="email-input">Email</Label>);
      const label = screen.getByText('Email');
      expect(label).toHaveAttribute('for', 'email-input');
    });

    it('supports id attribute', () => {
      render(<Label id="email-label">Email</Label>);
      const label = screen.getByText('Email');
      expect(label).toHaveAttribute('id', 'email-label');
    });

    it('supports data attributes', () => {
      render(
        <Label data-testid="test-label" data-field="username">
          Username
        </Label>
      );
      const label = screen.getByTestId('test-label');
      expect(label).toHaveAttribute('data-field', 'username');
    });

    it('supports onClick handler', () => {
      const handleClick = vi.fn();
      render(<Label onClick={handleClick}>Click me</Label>);
      const label = screen.getByText('Click me');
      label.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Association', () => {
    it('associates with input via htmlFor', () => {
      render(
        <div>
          <Label htmlFor="username">Username</Label>
          <input id="username" type="text" />
        </div>
      );
      const label = screen.getByText('Username');
      const input = document.getElementById('username');
      expect(label).toHaveAttribute('for', 'username');
      expect(input).toHaveAttribute('id', 'username');
    });

    it('can wrap input element', () => {
      render(
        <Label>
          Email
          <input type="email" />
        </Label>
      );
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('triggers input focus when clicked (via htmlFor)', async () => {
      const { user } = render(
        <div>
          <Label htmlFor="test-input">Test</Label>
          <input id="test-input" type="text" />
        </div>
      );
      const label = screen.getByText('Test');
      const input = document.getElementById('test-input') as HTMLInputElement;

      await user.click(label);
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Accessibility', () => {
    it('is accessible as a label', () => {
      render(
        <div>
          <Label htmlFor="name-input">Name</Label>
          <input id="name-input" type="text" />
        </div>
      );
      const input = screen.getByLabelText('Name');
      expect(input).toBeInTheDocument();
    });

    it('supports required indicator', () => {
      render(
        <Label>
          Email <span aria-label="required">*</span>
        </Label>
      );
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('required')).toBeInTheDocument();
    });

    it('works with aria-labelledby', () => {
      render(
        <div>
          <Label id="email-label">Email Address</Label>
          <input type="email" aria-labelledby="email-label" />
        </div>
      );
      const label = screen.getByText('Email Address');
      expect(label).toHaveAttribute('id', 'email-label');
    });
  });

  describe('Use Cases', () => {
    it('works as form field label', () => {
      render(
        <div>
          <Label htmlFor="email">Email</Label>
          <input id="email" type="email" name="email" />
        </div>
      );
      expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    });

    it('works with checkbox', () => {
      render(
        <div>
          <input type="checkbox" id="terms" />
          <Label htmlFor="terms">I agree to the terms</Label>
        </div>
      );
      const checkbox = screen.getByLabelText('I agree to the terms');
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });

    it('works with radio button', () => {
      render(
        <div>
          <input type="radio" id="option1" name="choice" />
          <Label htmlFor="option1">Option 1</Label>
        </div>
      );
      const radio = screen.getByLabelText('Option 1');
      expect(radio).toHaveAttribute('type', 'radio');
    });

    it('works with select element', () => {
      render(
        <div>
          <Label htmlFor="country">Country</Label>
          <select id="country">
            <option>USA</option>
          </select>
        </div>
      );
      const select = screen.getByLabelText('Country');
      expect(select.tagName).toBe('SELECT');
    });

    it('works with textarea', () => {
      render(
        <div>
          <Label htmlFor="message">Message</Label>
          <textarea id="message" />
        </div>
      );
      const textarea = screen.getByLabelText('Message');
      expect(textarea.tagName).toBe('TEXTAREA');
    });
  });

  describe('Disabled State', () => {
    it('applies peer-disabled styles when used with disabled input', () => {
      render(
        <div className="flex items-center gap-2">
          <input type="checkbox" disabled className="peer" id="disabled-input" />
          <Label htmlFor="disabled-input">Disabled Option</Label>
        </div>
      );
      const label = screen.getByText('Disabled Option');
      expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
      expect(label).toHaveClass('peer-disabled:opacity-70');
    });
  });

  describe('Complex Content', () => {
    it('renders with complex children', () => {
      render(
        <Label>
          <span className="font-bold">Important:</span> Required Field{' '}
          <span className="text-red-500">*</span>
        </Label>
      );
      expect(screen.getByText('Important:')).toBeInTheDocument();
      expect(screen.getByText('Required Field', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders with icons', () => {
      render(
        <Label>
          <svg data-testid="icon" />
          Email Address
        </Label>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Email Address')).toBeInTheDocument();
    });

    it('renders with tooltip or help text', () => {
      render(
        <Label>
          Username
          <span className="ml-2 text-muted-foreground" title="Help text">
            ?
          </span>
        </Label>
      );
      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByTitle('Help text')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children', () => {
      const { container } = render(<Label />);
      const label = container.querySelector('label');
      expect(label).toBeInTheDocument();
    });

    it('handles very long label text', () => {
      const longText =
        'This is a very long label text that might need to wrap to multiple lines in the user interface';
      render(<Label>{longText}</Label>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('renders multiple labels independently', () => {
      render(
        <div>
          <Label htmlFor="input1">Label 1</Label>
          <Label htmlFor="input2">Label 2</Label>
          <Label htmlFor="input3">Label 3</Label>
        </div>
      );
      expect(screen.getByText('Label 1')).toBeInTheDocument();
      expect(screen.getByText('Label 2')).toBeInTheDocument();
      expect(screen.getByText('Label 3')).toBeInTheDocument();
    });

    it('works without htmlFor attribute', () => {
      render(<Label>Standalone Label</Label>);
      const label = screen.getByText('Standalone Label');
      expect(label).not.toHaveAttribute('for');
    });
  });

  describe('Styling Combinations', () => {
    it('combines multiple custom classes', () => {
      render(
        <Label className="text-lg font-bold text-blue-500 uppercase">
          Styled Label
        </Label>
      );
      const label = screen.getByText('Styled Label');
      expect(label).toHaveClass('text-lg');
      expect(label).toHaveClass('font-bold');
      expect(label).toHaveClass('text-blue-500');
      expect(label).toHaveClass('uppercase');
    });
  });
});
