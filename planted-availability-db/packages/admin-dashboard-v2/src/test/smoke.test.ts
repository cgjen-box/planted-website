import { describe, it, expect } from 'vitest';

describe('Test Infrastructure Smoke Test', () => {
  it('should run vitest correctly', () => {
    expect(true).toBe(true);
  });

  it('should have access to testing-library matchers', () => {
    const element = document.createElement('div');
    element.textContent = 'Hello';
    document.body.appendChild(element);

    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Hello');

    document.body.removeChild(element);
  });

  it('should have mock data available', async () => {
    const { mockVenues } = await import('./mocks/data/venues');
    expect(mockVenues).toBeDefined();
    expect(mockVenues.length).toBeGreaterThan(0);
    expect(mockVenues[0].name).toBe('Tibits Zurich');
  });
});
