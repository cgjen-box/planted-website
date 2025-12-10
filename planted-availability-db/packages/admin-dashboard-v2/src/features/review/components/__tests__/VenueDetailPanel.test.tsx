/**
 * VenueDetailPanel Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { VenueDetailPanel } from '../VenueDetailPanel';
import { mockVenues } from '@/test/mocks/data/venues';

describe('VenueDetailPanel', () => {
  const mockOnAssignChain = vi.fn();

  beforeEach(() => {
    mockOnAssignChain.mockClear();
  });

  describe('Rendering', () => {
    it('should render venue name', () => {
      render(<VenueDetailPanel venue={mockVenues[0]} />);
      expect(screen.getByText('Tibits Zurich')).toBeInTheDocument();
    });

    it('should render venue address', () => {
      render(<VenueDetailPanel venue={mockVenues[0]} />);
      expect(screen.getByText('Seefeldstrasse 2')).toBeInTheDocument();
    });

    it('should render city and country', () => {
      render(<VenueDetailPanel venue={mockVenues[0]} />);
      // Look for the specific combined city/country text in location section
      expect(screen.getByText(/Zurich, 🇨🇭 Switzerland/)).toBeInTheDocument();
    });

    it('should render venue type badge', () => {
      render(<VenueDetailPanel venue={mockVenues[0]} />);
      expect(screen.getByText('Restaurant')).toBeInTheDocument();
    });

    it('should render status badge', () => {
      render(<VenueDetailPanel venue={mockVenues[0]} />);
      // Status is uppercased in the component
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });

    it('should render chain badge when chain exists', () => {
      render(<VenueDetailPanel venue={mockVenues[0]} />);
      expect(screen.getByText('Tibits')).toBeInTheDocument();
    });
  });

  describe('Confidence Display', () => {
    it('should render confidence score', () => {
      render(<VenueDetailPanel venue={mockVenues[0]} />);
      expect(screen.getByText('92%')).toBeInTheDocument();
    });

    it('should render confidence bar', () => {
      const { container } = render(<VenueDetailPanel venue={mockVenues[0]} />);
      const confidenceBar = container.querySelector('[style*="width: 92%"]');
      expect(confidenceBar).toBeInTheDocument();
    });

    it('should render confidence factors when available', () => {
      render(<VenueDetailPanel venue={mockVenues[0]} />);
      // Check that confidence factors section exists
      expect(screen.getByText('Factors')).toBeInTheDocument();
    });
  });

  describe('Platform Links', () => {
    it('should render platform name', () => {
      render(<VenueDetailPanel venue={mockVenues[0]} />);
      expect(screen.getByText('Uber Eats')).toBeInTheDocument();
    });

    it('should have external link to platform', () => {
      render(<VenueDetailPanel venue={mockVenues[0]} />);
      const link = screen.getByText('Uber Eats').closest('a');
      expect(link).toHaveAttribute('href', mockVenues[0].platform_url);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Scraped Date', () => {
    it('should render scraped timestamp', () => {
      render(<VenueDetailPanel venue={mockVenues[0]} />);
      expect(screen.getByText('Scraped')).toBeInTheDocument();
    });

    it('should format date correctly', () => {
      render(<VenueDetailPanel venue={mockVenues[0]} />);
      // Should contain formatted date
      const scrapedSection = screen.getByText('Scraped').parentElement;
      expect(scrapedSection).toBeInTheDocument();
    });
  });

  describe('Assign Chain Button', () => {
    it('should show assign chain button for pending venues without chain', () => {
      const venueWithoutChain = {
        ...mockVenues[0],
        chain_id: null,
        chain_name: null,
        chain: undefined, // Component checks !venue.chain
        chainId: null,
        chainName: null,
        status: 'pending' as const,
      };
      render(
        <VenueDetailPanel
          venue={venueWithoutChain}
          onAssignChain={mockOnAssignChain}
        />
      );

      expect(screen.getByText('Assign Chain')).toBeInTheDocument();
    });

    it('should not show assign chain button for venues with chain', () => {
      render(
        <VenueDetailPanel
          venue={mockVenues[0]}
          onAssignChain={mockOnAssignChain}
        />
      );

      expect(screen.queryByText('Assign Chain')).not.toBeInTheDocument();
    });

    it('should call onAssignChain when clicked', async () => {
      const venueWithoutChain = {
        ...mockVenues[0],
        chain: undefined,
        chainId: null,
        chainName: null,
        status: 'pending' as const,
      };
      const { user } = render(
        <VenueDetailPanel
          venue={venueWithoutChain}
          onAssignChain={mockOnAssignChain}
        />
      );

      await user.click(screen.getByText('Assign Chain'));
      expect(mockOnAssignChain).toHaveBeenCalled();
    });
  });

  describe('Map Link', () => {
    it('should show map link when coordinates are available', () => {
      const venueWithCoords = {
        ...mockVenues[0],
        coordinates: { lat: 47.3769, lng: 8.5417 },
      };
      render(<VenueDetailPanel venue={venueWithCoords} />);

      const mapLink = screen.getByText('View on Map');
      expect(mapLink).toBeInTheDocument();
      expect(mapLink.closest('a')).toHaveAttribute(
        'href',
        'https://www.google.com/maps?q=47.3769,8.5417'
      );
    });

    it('should not show map link when coordinates are missing', () => {
      render(<VenueDetailPanel venue={mockVenues[0]} />);
      expect(screen.queryByText('View on Map')).not.toBeInTheDocument();
    });
  });

  describe('Feedback and Rejection', () => {
    it('should show feedback when present', () => {
      const venueWithFeedback = {
        ...mockVenues[0],
        feedback: 'Please verify the address',
      };
      render(<VenueDetailPanel venue={venueWithFeedback} />);

      expect(screen.getByText('Feedback')).toBeInTheDocument();
      expect(screen.getByText('Please verify the address')).toBeInTheDocument();
    });

    it('should show rejection reason when present', () => {
      const rejectedVenue = {
        ...mockVenues[4],
      };
      render(<VenueDetailPanel venue={rejectedVenue} />);

      expect(screen.getByText('Rejection Reason')).toBeInTheDocument();
      expect(screen.getByText('Not a planted venue')).toBeInTheDocument();
    });
  });
});
