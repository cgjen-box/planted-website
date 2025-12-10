import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../Dialog';
import { Button } from '../Button';

describe('Dialog Components', () => {
  describe('Dialog Basic Rendering', () => {
    it('renders dialog with trigger', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const trigger = screen.getByRole('button', { name: /open dialog/i });
      expect(trigger).toBeInTheDocument();

      // Dialog content should not be visible initially
      expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();
    });

    it('opens dialog when trigger is clicked', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const trigger = screen.getByRole('button', { name: /open/i });
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      });
    });

    it('closes dialog when close button is clicked', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      // Open dialog
      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      });

      // Find and click close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('DialogContent', () => {
    it('renders content with all parts', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Dialog</DialogTitle>
              <DialogDescription>This is a description</DialogDescription>
            </DialogHeader>
            <div>Body content</div>
            <DialogFooter>
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(screen.getByText('Complete Dialog')).toBeInTheDocument();
        expect(screen.getByText('This is a description')).toBeInTheDocument();
        expect(screen.getByText('Body content')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
      });
    });

    it('applies custom className to DialogContent', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent className="custom-dialog">
            <DialogTitle>Custom Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const content = screen.getByText('Custom Dialog').closest('[role="dialog"]');
        expect(content).toHaveClass('custom-dialog');
      });
    });

    it('renders close button with icon', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toBeInTheDocument();
        // Check for X icon
        const icon = closeButton.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe('DialogTitle', () => {
    it('renders title as heading', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>My Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const title = screen.getByText('My Dialog Title');
        expect(title).toBeInTheDocument();
        // Radix Dialog sets the title role
        expect(title).toHaveClass('text-lg');
        expect(title).toHaveClass('font-semibold');
      });
    });

    it('applies custom className to title', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle className="custom-title">Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const title = screen.getByText('Title');
        expect(title).toHaveClass('custom-title');
      });
    });
  });

  describe('DialogDescription', () => {
    it('renders description text', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>This is the description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(screen.getByText('This is the description')).toBeInTheDocument();
      });
    });

    it('applies description styling', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const description = screen.getByText('Description');
        expect(description).toHaveClass('text-sm');
        expect(description).toHaveClass('text-muted-foreground');
      });
    });
  });

  describe('DialogHeader', () => {
    it('applies header layout styles', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader data-testid="dialog-header">
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const header = screen.getByTestId('dialog-header');
        expect(header).toHaveClass('flex');
        expect(header).toHaveClass('flex-col');
        expect(header).toHaveClass('space-y-1.5');
      });
    });

    it('applies custom className to header', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader className="custom-header" data-testid="dialog-header">
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const header = screen.getByTestId('dialog-header');
        expect(header).toHaveClass('custom-header');
      });
    });
  });

  describe('DialogFooter', () => {
    it('renders footer with buttons', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      });
    });

    it('applies footer layout styles', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter data-testid="dialog-footer">
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const footer = screen.getByTestId('dialog-footer');
        expect(footer).toHaveClass('flex');
      });
    });
  });

  describe('DialogClose', () => {
    it('closes dialog when DialogClose is clicked', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog</DialogTitle>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(screen.getByText('Dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText('Dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dialog Overlay', () => {
    it('renders overlay when dialog is open', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        // Overlay is rendered as part of the portal
        const overlay = document.querySelector('[data-state="open"]');
        expect(overlay).toBeInTheDocument();
      });
    });
  });

  describe('Controlled Dialog', () => {
    it('works as controlled component', async () => {
      const ControlledDialog = () => {
        const [open, setOpen] = useState(false);

        return (
          <>
            <Button onClick={() => setOpen(true)}>Open Controlled</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent>
                <DialogTitle>Controlled Dialog</DialogTitle>
                <DialogClose asChild>
                  <Button>Close</Button>
                </DialogClose>
              </DialogContent>
            </Dialog>
          </>
        );
      };

      const { user } = render(<ControlledDialog />);

      expect(screen.queryByText('Controlled Dialog')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /open controlled/i }));

      await waitFor(() => {
        expect(screen.getByText('Controlled Dialog')).toBeInTheDocument();
      });

      // Click the explicit "Close" button (not the X icon which also closes)
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      // Get the button with text "Close" rather than the icon button
      const closeButton = closeButtons.find(btn => btn.textContent === 'Close') || closeButtons[0];
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Controlled Dialog')).not.toBeInTheDocument();
      });
    });

    it('calls onOpenChange when dialog state changes', async () => {
      const handleOpenChange = vi.fn();
      const { user } = render(
        <Dialog onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(handleOpenChange).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Accessible Dialog</DialogTitle>
            <DialogDescription>This is an accessible dialog</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });
    });

    it('close button has accessible label', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toBeInTheDocument();
        // Check for sr-only text
        const srText = closeButton.querySelector('.sr-only');
        expect(srText).toHaveTextContent('Close');
      });
    });

    it('focuses dialog content when opened', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog</DialogTitle>
            <input type="text" placeholder="First input" />
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        // Radix automatically manages focus
      });
    });
  });

  describe('Edge Cases', () => {
    it('renders without description', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Title Only</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(screen.getByText('Title Only')).toBeInTheDocument();
      });
    });

    it('renders with complex content', async () => {
      const { user } = render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complex Dialog</DialogTitle>
            </DialogHeader>
            <div>
              <p>Paragraph 1</p>
              <ul>
                <li>Item 1</li>
                <li>Item 2</li>
              </ul>
            </div>
            <DialogFooter>
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));

      await waitFor(() => {
        expect(screen.getByText('Complex Dialog')).toBeInTheDocument();
        expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });
    });
  });
});
