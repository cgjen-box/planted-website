/**
 * FilterBar Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { FilterBar } from '../FilterBar';
import type { ReviewQueueFilters } from '../../types';

describe('FilterBar', () => {
  const mockOnChange = vi.fn();
  const mockOnReset = vi.fn();

  const defaultFilters: ReviewQueueFilters = {};

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnReset.mockClear();
  });

  describe('Search Input', () => {
    it('should render search input', () => {
      render(
        <FilterBar
          filters={defaultFilters}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );
      expect(screen.getByPlaceholderText('Search venues...')).toBeInTheDocument();
    });

    it('should call onChange when search value changes', async () => {
      const { user } = render(
        <FilterBar
          filters={defaultFilters}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search venues...');
      await user.type(searchInput, 'Tibits');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should display current search value', () => {
      render(
        <FilterBar
          filters={{ search: 'Tibits' }}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search venues...') as HTMLInputElement;
      expect(searchInput.value).toBe('Tibits');
    });
  });

  describe('Country Filter', () => {
    it('should render country select', () => {
      render(
        <FilterBar
          filters={defaultFilters}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText('All Countries')).toBeInTheDocument();
    });

    it('should have country options', () => {
      const { container } = render(
        <FilterBar
          filters={defaultFilters}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      // Get the first select (country filter)
      const selects = container.querySelectorAll('select');
      const countrySelect = selects[0];
      const options = countrySelect?.querySelectorAll('option');
      expect(options!.length).toBeGreaterThan(1);
    });

    it('should call onChange when country is selected', async () => {
      const { user, container } = render(
        <FilterBar
          filters={defaultFilters}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const select = container.querySelectorAll('select')[0];
      await user.selectOptions(select, 'CH');

      expect(mockOnChange).toHaveBeenCalledWith({ country: 'CH' });
    });
  });

  describe('Status Filter', () => {
    it('should render status select', () => {
      render(
        <FilterBar
          filters={defaultFilters}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText('All Statuses')).toBeInTheDocument();
    });

    it('should have status options', () => {
      render(
        <FilterBar
          filters={defaultFilters}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  describe('Confidence Filter', () => {
    it('should render confidence select', () => {
      render(
        <FilterBar
          filters={defaultFilters}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText('All Confidence')).toBeInTheDocument();
    });

    it('should set high confidence range correctly', async () => {
      const { user, container } = render(
        <FilterBar
          filters={defaultFilters}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const confidenceSelect = container.querySelectorAll('select')[4]; // 5th select
      await user.selectOptions(confidenceSelect, '0.8');

      expect(mockOnChange).toHaveBeenCalledWith({
        minConfidence: 0.8,
        maxConfidence: undefined,
      });
    });
  });

  describe('Reset Button', () => {
    it('should not show reset button when no filters are active', () => {
      render(
        <FilterBar
          filters={defaultFilters}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });

    it('should show reset button when filters are active', () => {
      render(
        <FilterBar
          filters={{ country: 'CH' }}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('should call onReset when clicked', async () => {
      const { user } = render(
        <FilterBar
          filters={{ country: 'CH' }}
          onChange={mockOnChange}
          onReset={mockOnReset}
        />
      );

      const resetButton = screen.getByText('Reset');
      await user.click(resetButton);

      expect(mockOnReset).toHaveBeenCalled();
    });
  });
});
