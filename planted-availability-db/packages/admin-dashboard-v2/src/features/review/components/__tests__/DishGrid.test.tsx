/**
 * DishGrid Component Tests
 *
 * Tests for dish rendering, image fallback, confidence bar, and approve/reject actions
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@/test/test-utils';
import { DishGrid } from '../DishGrid';
import { createMockDish } from '@/test/mocks/data/venues';
import type { ReviewDish } from '../../types';

describe('DishGrid', () => {
  const mockOnApproveDish = vi.fn();
  const mockOnRejectDish = vi.fn();

  const defaultDishes: ReviewDish[] = [
    {
      id: 'dish-1',
      name: 'Planted Chicken Bowl',
      description: 'Delicious plant-based chicken',
      price: 18.9,
      currency: 'CHF',
      imageUrl: 'https://example.com/dish1.jpg',
      productMatch: 'planted.chicken',
      confidence: 0.95,
    },
    {
      id: 'dish-2',
      name: 'Planted Kebab Wrap',
      description: 'Traditional wrap with planted kebab',
      price: 15.5,
      currency: 'CHF',
      imageUrl: 'https://example.com/dish2.jpg',
      productMatch: 'planted.kebab',
      confidence: 0.88,
    },
  ];

  beforeEach(() => {
    mockOnApproveDish.mockClear();
    mockOnRejectDish.mockClear();
  });

  describe('Rendering', () => {
    it('should render dish grid', () => {
      const { container } = render(
        <DishGrid dishes={defaultDishes} />
      );
      expect(container).toBeInTheDocument();
    });

    it('should render all dishes', () => {
      render(<DishGrid dishes={defaultDishes} />);
      expect(screen.getByText('Planted Chicken Bowl')).toBeInTheDocument();
      expect(screen.getByText('Planted Kebab Wrap')).toBeInTheDocument();
    });

    it('should display dish names', () => {
      render(<DishGrid dishes={defaultDishes} />);
      expect(screen.getByText('Planted Chicken Bowl')).toBeInTheDocument();
    });

    it('should display dish descriptions', () => {
      render(<DishGrid dishes={defaultDishes} />);
      expect(screen.getByText('Delicious plant-based chicken')).toBeInTheDocument();
      expect(screen.getByText('Traditional wrap with planted kebab')).toBeInTheDocument();
    });

    it('should display dish prices', () => {
      render(<DishGrid dishes={defaultDishes} />);
      expect(screen.getByText(/18\.90/)).toBeInTheDocument();
      expect(screen.getByText(/15\.50/)).toBeInTheDocument();
    });

    it('should display currency', () => {
      render(<DishGrid dishes={defaultDishes} />);
      const prices = screen.getAllByText(/CHF/);
      expect(prices.length).toBe(2);
    });

    it('should show empty state when no dishes', () => {
      render(<DishGrid dishes={[]} />);
      expect(screen.getByText('No dishes available')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <DishGrid dishes={defaultDishes} className="custom-class" />
      );
      const gridContainer = container.querySelector('.custom-class');
      expect(gridContainer).toBeInTheDocument();
    });

    it('should use grid layout', () => {
      const { container } = render(
        <DishGrid dishes={defaultDishes} />
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain('grid');
    });
  });

  describe('Dish Images', () => {
    it('should render dish images when imageUrl is provided', () => {
      render(<DishGrid dishes={defaultDishes} />);
      const images = screen.getAllByRole('img');
      expect(images.length).toBe(2);
      expect(images[0]).toHaveAttribute('src', 'https://example.com/dish1.jpg');
      expect(images[0]).toHaveAttribute('alt', 'Planted Chicken Bowl');
    });

    it('should show placeholder when imageUrl is missing', () => {
      const dishWithoutImage = createMockDish({
        id: 'dish-no-img',
        name: 'No Image Dish',
        imageUrl: undefined,
      });
      const { container } = render(<DishGrid dishes={[dishWithoutImage]} />);

      // Should show ImageOff icon for placeholder
      const placeholder = container.querySelector('.aspect-video .flex.items-center.justify-center');
      expect(placeholder).toBeInTheDocument();
    });

    it('should handle image load errors gracefully', () => {
      render(<DishGrid dishes={defaultDishes} />);
      const image = screen.getAllByRole('img')[0];

      // Simulate image error
      const errorEvent = new Event('error');
      image.dispatchEvent(errorEvent);

      // Image should still be in DOM but hidden
      expect(image).toBeInTheDocument();
    });
  });

  describe('Confidence Display', () => {
    it('should display confidence percentage', () => {
      render(<DishGrid dishes={defaultDishes} />);
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('88%')).toBeInTheDocument();
    });

    it('should show confidence label', () => {
      render(<DishGrid dishes={defaultDishes} />);
      const labels = screen.getAllByText('Confidence');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should display green confidence bar for high confidence (>= 80%)', () => {
      const highConfidenceDish = createMockDish({
        confidence: 0.85,
      });
      const { container } = render(<DishGrid dishes={[highConfidenceDish]} />);

      const confidenceBar = container.querySelector('.bg-green-500');
      expect(confidenceBar).toBeInTheDocument();
    });

    it('should display yellow confidence bar for medium confidence (60-80%)', () => {
      const mediumConfidenceDish = createMockDish({
        confidence: 0.70,
      });
      const { container } = render(<DishGrid dishes={[mediumConfidenceDish]} />);

      const confidenceBar = container.querySelector('.bg-yellow-500');
      expect(confidenceBar).toBeInTheDocument();
    });

    it('should display red confidence bar for low confidence (< 60%)', () => {
      const lowConfidenceDish = createMockDish({
        confidence: 0.45,
      });
      const { container } = render(<DishGrid dishes={[lowConfidenceDish]} />);

      const confidenceBar = container.querySelector('.bg-red-500');
      expect(confidenceBar).toBeInTheDocument();
    });

    it('should set confidence bar width correctly', () => {
      const dish = createMockDish({
        confidence: 0.75,
      });
      const { container } = render(<DishGrid dishes={[dish]} />);

      const confidenceBar = container.querySelector('[style*="width"]');
      expect(confidenceBar).toHaveStyle({ width: '75%' });
    });
  });

  describe('Product Type Badge', () => {
    it('should display product type badge', () => {
      render(<DishGrid dishes={defaultDishes} />);
      expect(screen.getByText('Planted Chicken')).toBeInTheDocument();
      expect(screen.getByText('Planted Kebab')).toBeInTheDocument();
    });

    it('should handle different product types', () => {
      const dishes = [
        createMockDish({ productMatch: 'planted.chicken' }),
        createMockDish({ productMatch: 'planted.kebab' }),
        createMockDish({ productMatch: 'planted.schnitzel' }),
        createMockDish({ productMatch: 'planted.burger' }),
      ];
      render(<DishGrid dishes={dishes} />);

      expect(screen.getByText('Planted Chicken')).toBeInTheDocument();
      expect(screen.getByText('Planted Kebab')).toBeInTheDocument();
      expect(screen.getByText('Planted Schnitzel')).toBeInTheDocument();
      expect(screen.getByText('Planted Burger')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should show approve button when onApproveDish is provided', () => {
      render(
        <DishGrid
          dishes={defaultDishes}
          onApproveDish={mockOnApproveDish}
        />
      );
      const approveButtons = screen.getAllByText('Approve');
      expect(approveButtons.length).toBe(2);
    });

    it('should show reject button when onRejectDish is provided', () => {
      render(
        <DishGrid
          dishes={defaultDishes}
          onRejectDish={mockOnRejectDish}
        />
      );
      const rejectButtons = screen.getAllByText('Reject');
      expect(rejectButtons.length).toBe(2);
    });

    it('should not show buttons when handlers are not provided', () => {
      render(<DishGrid dishes={defaultDishes} />);
      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });

    it('should call onApproveDish with dish id when approve is clicked', async () => {
      const { user } = render(
        <DishGrid
          dishes={defaultDishes}
          onApproveDish={mockOnApproveDish}
        />
      );

      const approveButtons = screen.getAllByText('Approve');
      await user.click(approveButtons[0]);

      expect(mockOnApproveDish).toHaveBeenCalledWith('dish-1');
    });

    it('should call onRejectDish with dish id when reject is clicked', async () => {
      const { user } = render(
        <DishGrid
          dishes={defaultDishes}
          onRejectDish={mockOnRejectDish}
        />
      );

      const rejectButtons = screen.getAllByText('Reject');
      await user.click(rejectButtons[0]);

      expect(mockOnRejectDish).toHaveBeenCalledWith('dish-1');
    });

    it('should have green styling for approve button', () => {
      render(
        <DishGrid
          dishes={defaultDishes}
          onApproveDish={mockOnApproveDish}
        />
      );

      const approveButton = screen.getAllByText('Approve')[0].closest('button')!;
      expect(approveButton.className).toContain('border-green-500');
      expect(approveButton.className).toContain('text-green-600');
    });

    it('should have red styling for reject button', () => {
      render(
        <DishGrid
          dishes={defaultDishes}
          onRejectDish={mockOnRejectDish}
        />
      );

      const rejectButton = screen.getAllByText('Reject')[0].closest('button')!;
      expect(rejectButton.className).toContain('border-red-500');
      expect(rejectButton.className).toContain('text-red-600');
    });

    it('should show both buttons when both handlers are provided', () => {
      render(
        <DishGrid
          dishes={defaultDishes}
          onApproveDish={mockOnApproveDish}
          onRejectDish={mockOnRejectDish}
        />
      );

      expect(screen.getAllByText('Approve').length).toBe(2);
      expect(screen.getAllByText('Reject').length).toBe(2);
    });
  });

  describe('Card Layout', () => {
    it('should render dishes in cards', () => {
      const { container } = render(<DishGrid dishes={defaultDishes} />);
      // Cards have bg-card class from the Card component
      const cards = container.querySelectorAll('.bg-card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should have aspect-video container for images', () => {
      const { container } = render(<DishGrid dishes={defaultDishes} />);
      const aspectVideos = container.querySelectorAll('.aspect-video');
      expect(aspectVideos.length).toBe(2);
    });

    it('should truncate long dish names', () => {
      const longNameDish = createMockDish({
        name: 'Very Long Dish Name That Should Be Truncated Because It Is Too Long',
      });
      const { container } = render(<DishGrid dishes={[longNameDish]} />);

      const nameElement = screen.getByText(longNameDish.name).closest('h4');
      expect(nameElement?.className).toContain('line-clamp-2');
    });

    it('should truncate long descriptions', () => {
      const longDescDish = createMockDish({
        description: 'Very long description that should be truncated because it is way too long and would take up too much space in the card',
      });
      const { container } = render(<DishGrid dishes={[longDescDish]} />);

      const descElement = screen.getByText(longDescDish.description!).closest('p');
      expect(descElement?.className).toContain('line-clamp-2');
    });
  });

  describe('Accessibility', () => {
    it('should have alt text for images', () => {
      render(<DishGrid dishes={defaultDishes} />);
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });
    });

    it('should have accessible buttons', () => {
      render(
        <DishGrid
          dishes={defaultDishes}
          onApproveDish={mockOnApproveDish}
          onRejectDish={mockOnRejectDish}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeEnabled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle dishes without descriptions', () => {
      const dishNoDesc = createMockDish({
        description: undefined,
      });
      render(<DishGrid dishes={[dishNoDesc]} />);

      expect(screen.getByText(dishNoDesc.name)).toBeInTheDocument();
    });

    it('should handle zero price', () => {
      const freeDish = createMockDish({
        price: 0,
      });
      render(<DishGrid dishes={[freeDish]} />);

      expect(screen.getByText(/0\.00/)).toBeInTheDocument();
    });

    it('should format prices with 2 decimal places', () => {
      const dish = createMockDish({
        price: 12.5,
      });
      render(<DishGrid dishes={[dish]} />);

      expect(screen.getByText(/12\.50/)).toBeInTheDocument();
    });

    it('should handle single dish', () => {
      render(<DishGrid dishes={[defaultDishes[0]]} />);
      expect(screen.getByText('Planted Chicken Bowl')).toBeInTheDocument();
      expect(screen.queryByText('Planted Kebab Wrap')).not.toBeInTheDocument();
    });

    it('should handle many dishes', () => {
      const manyDishes = Array.from({ length: 10 }, (_, i) =>
        createMockDish({ id: `dish-${i}`, name: `Dish ${i}` })
      );
      render(<DishGrid dishes={manyDishes} />);

      manyDishes.forEach(dish => {
        expect(screen.getByText(dish.name)).toBeInTheDocument();
      });
    });
  });
});
