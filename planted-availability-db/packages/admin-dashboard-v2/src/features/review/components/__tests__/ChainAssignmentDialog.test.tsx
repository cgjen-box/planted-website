/**
 * ChainAssignmentDialog Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { ChainAssignmentDialog } from '../ChainAssignmentDialog';
import { mockChains } from '@/test/mocks/data/venues';

describe('ChainAssignmentDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockOnSuccess.mockClear();
  });

  it('should not render when closed', () => {
    render(
      <ChainAssignmentDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        venueIds={['venue-1']}
      />
    );

    expect(screen.queryByText('Assign Chain')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <ChainAssignmentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        venueIds={['venue-1']}
      />
    );

    expect(screen.getByText('Assign Chain')).toBeInTheDocument();
  });

  it('should show venue count in description', () => {
    render(
      <ChainAssignmentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        venueIds={['venue-1', 'venue-2', 'venue-3']}
      />
    );

    expect(screen.getByText('Assign 3 venues to a chain')).toBeInTheDocument();
  });

  it('should show singular form for single venue', () => {
    render(
      <ChainAssignmentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        venueIds={['venue-1']}
      />
    );

    expect(screen.getByText('Assign 1 venue to a chain')).toBeInTheDocument();
  });

  it('should have mode selection radio buttons', () => {
    render(
      <ChainAssignmentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        venueIds={['venue-1']}
      />
    );

    expect(screen.getByText('Select Existing Chain')).toBeInTheDocument();
    expect(screen.getByText('Create New Chain')).toBeInTheDocument();
  });

  it('should show chain selector in existing mode', async () => {
    render(
      <ChainAssignmentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        venueIds={['venue-1']}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Select a chain...')).toBeInTheDocument();
    });
  });

  it('should show new chain input in new mode', async () => {
    const { user } = render(
      <ChainAssignmentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        venueIds={['venue-1']}
      />
    );

    const newChainRadio = screen.getByLabelText('Create New Chain');
    await user.click(newChainRadio);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter chain name...')).toBeInTheDocument();
    });
  });

  it('should disable submit when no chain is selected in existing mode', async () => {
    render(
      <ChainAssignmentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        venueIds={['venue-1']}
      />
    );

    await waitFor(() => {
      const assignButton = screen.getByText('Assign');
      expect(assignButton).toBeDisabled();
    });
  });

  it('should disable submit when chain name is empty in new mode', async () => {
    const { user } = render(
      <ChainAssignmentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        venueIds={['venue-1']}
      />
    );

    const newChainRadio = screen.getByLabelText('Create New Chain');
    await user.click(newChainRadio);

    await waitFor(() => {
      const assignButton = screen.getByText('Assign');
      expect(assignButton).toBeDisabled();
    });
  });

  it('should enable submit when chain is selected', async () => {
    const { user } = render(
      <ChainAssignmentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        venueIds={['venue-1']}
      />
    );

    // Test the new chain mode
    // Click "Create New Chain" radio
    const newChainRadio = screen.getByLabelText(/create new chain/i);
    await user.click(newChainRadio);

    // Wait for the name input to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/chain name/i)).toBeInTheDocument();
    });

    // Enter a chain name
    const nameInput = screen.getByLabelText(/chain name/i);
    await user.type(nameInput, 'Test Chain');

    // Wait for the state to update
    await waitFor(() => {
      // The canSubmit should be truthy when newChainName.trim() is not empty
      const assignButton = screen.getByRole('button', { name: /^assign$/i });
      expect(assignButton).not.toBeDisabled();
    });
  });

  it('should call onOpenChange when cancel is clicked', async () => {
    const { user } = render(
      <ChainAssignmentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        venueIds={['venue-1']}
      />
    );

    await user.click(screen.getByText('Cancel'));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should reset form when dialog opens', async () => {
    const { rerender, user } = render(
      <ChainAssignmentDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        venueIds={['venue-1']}
      />
    );

    rerender(
      <ChainAssignmentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        venueIds={['venue-1']}
      />
    );

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect((select as HTMLSelectElement).value).toBe('');
    });
  });
});
