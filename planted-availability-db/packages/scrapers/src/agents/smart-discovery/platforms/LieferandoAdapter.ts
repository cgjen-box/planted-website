/**
 * Lieferando Platform Adapter
 *
 * Handles data extraction from Lieferando (Germany & Austria).
 * URL format: https://www.lieferando.de/speisekarte/{restaurant-slug}
 *            https://www.lieferando.at/speisekarte/{restaurant-slug}
 */

import type { SupportedCountry } from '@pad/core';
import {
  BasePlatformAdapter,
  type VenuePageData,
  type MenuItem,
  type PlatformSearchResult,
} from './BasePlatformAdapter.js';

export class LieferandoAdapter extends BasePlatformAdapter {
  platform = 'lieferando' as const;
  supportedCountries: SupportedCountry[] = ['DE', 'AT'];
  baseUrl = 'https://www.lieferando.de';

  private getBaseUrlForCountry(country: SupportedCountry): string {
    switch (country) {
      case 'AT':
        return 'https://www.lieferando.at';
      case 'DE':
      default:
        return 'https://www.lieferando.de';
    }
  }

  override getSearchDomain(country: SupportedCountry): string {
    return country === 'AT' ? 'lieferando.at' : 'lieferando.de';
  }

  buildSearchUrl(query: string, country: SupportedCountry, city?: string): string {
    const domain = country === 'AT' ? 'lieferando.at' : 'lieferando.de';
    const encodedQuery = encodeURIComponent(query);
    if (city) {
      return `site:${domain} ${encodedQuery} ${city}`;
    }
    return `site:${domain} ${encodedQuery}`;
  }

  buildVenueUrl(venueIdOrSlug: string, country: SupportedCountry): string {
    const baseUrl = this.getBaseUrlForCountry(country);
    if (venueIdOrSlug.startsWith('/')) {
      return `${baseUrl}${venueIdOrSlug}`;
    }
    return `${baseUrl}/speisekarte/${venueIdOrSlug}`;
  }

  extractVenueId(url: string): string | null {
    // Extract from: https://www.lieferando.de/speisekarte/restaurant-slug
    // or: https://www.lieferando.de/en/menu/restaurant-slug
    const match = url.match(/lieferando\.(?:de|at)\/(?:en\/)?(?:speisekarte|menu)\/([^/?]+)/);
    return match ? match[1] : null;
  }

  parseSearchResults(html: string): PlatformSearchResult[] {
    const results: PlatformSearchResult[] = [];

    // Lieferando restaurant card patterns
    const restaurantPatterns = [
      /<a[^>]*href="(\/(?:en\/)?(?:speisekarte|menu)\/[^"]+)"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/gi,
      /<a[^>]*data-restaurant-slug="([^"]+)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)/gi,
    ];

    for (const pattern of restaurantPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const isSlug = match[1].startsWith('/');
        const url = isSlug
          ? `${this.baseUrl}${match[1]}`
          : `${this.baseUrl}/speisekarte/${match[1]}`;
        const name = this.cleanText(match[2]);
        const venueId = this.extractVenueId(url) || match[1];

        if (venueId && !results.some((r) => r.venueId === venueId)) {
          results.push({
            name,
            url,
            venueId,
          });
        }
      }
    }

    return results;
  }

  parseVenuePage(html: string): VenuePageData {
    const data: VenuePageData = {
      name: '',
      menuItems: [],
      rawHtml: html,
    };

    // Lieferando embeds data in JavaScript
    // Look for __NEXT_DATA__ or similar
    const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const pageProps = nextData.props?.pageProps;

        // Method 1: Legacy format - pageProps.restaurant.address
        if (pageProps?.restaurant) {
          const restaurant = pageProps.restaurant;
          data.name = restaurant.name;

          if (restaurant.address?.street) {
            data.address = {
              street: restaurant.address.street,
              city: restaurant.address.city,
              postal_code: restaurant.address.postalCode,
              country: restaurant.address.country || this.getCountryFromUrl(html) || 'DE',
            };
          }

          if (restaurant.location?.lat && restaurant.location?.lng) {
            data.coordinates = {
              latitude: restaurant.location.lat,
              longitude: restaurant.location.lng,
              accuracy: 'exact',
            };
          }

          if (restaurant.rating) {
            data.rating = restaurant.rating.score;
            data.reviewCount = restaurant.rating.votes;
          }

          // Extract menu from pageProps
          if (pageProps.menu?.categories) {
            for (const category of pageProps.menu.categories) {
              for (const item of category.products || []) {
                data.menuItems.push({
                  name: item.name,
                  description: item.description,
                  price: (item.price / 100).toFixed(2), // Price in cents
                  currency: 'EUR',
                  category: category.name,
                });
              }
            }
          }
        }

        // Method 2: New format - colophon.data (contains restaurant business info)
        if (!data.address?.street) {
          const colophonData = this.findNestedProperty(nextData, 'colophon')?.data;
          if (colophonData?.streetName) {
            data.address = {
              street: colophonData.streetName,
              city: colophonData.city || data.address?.city || '',
              postal_code: colophonData.postalCode || data.address?.postal_code || '',
              country: this.getCountryFromUrl(html) || 'DE',
            };
            if (colophonData.restaurantName && !data.name) {
              data.name = colophonData.restaurantName;
            }
          }
        }

        // Method 3: location object (contains address + coordinates)
        if (!data.address?.street || !data.coordinates) {
          // Look for location objects with actual address data
          const locationData = this.findLocationWithAddress(nextData);
          if (locationData) {
            if (!data.address?.street && locationData.street) {
              data.address = {
                street: locationData.street || locationData.streetAddress || '',
                city: locationData.city || data.address?.city || '',
                postal_code: locationData.postalCode || data.address?.postal_code || '',
                country: locationData.countryCode || locationData.country || this.getCountryFromUrl(html) || 'DE',
              };
            }
            if (!data.coordinates && locationData.lat && locationData.lng) {
              data.coordinates = {
                latitude: locationData.lat,
                longitude: locationData.lng,
                accuracy: 'exact',
              };
            }
          }
        }
      } catch {
        // Fall through to HTML parsing
      }
    }

    // HTML fallback for name
    if (!data.name) {
      const namePatterns = [
        /<h1[^>]*class="[^"]*restaurant-name[^"]*"[^>]*>([^<]+)<\/h1>/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
        /"name"\s*:\s*"([^"]+)"/,
      ];

      for (const pattern of namePatterns) {
        const match = html.match(pattern);
        if (match) {
          data.name = this.cleanText(match[1]);
          break;
        }
      }
    }

    // Extract menu items from HTML if not found in JSON
    if (data.menuItems.length === 0) {
      data.menuItems = this.extractMenuItemsFromHtml(html);
    }

    return data;
  }

  private extractMenuItemsFromHtml(html: string): MenuItem[] {
    const items: MenuItem[] = [];

    // Lieferando menu item patterns
    const patterns = [
      // Modern layout
      /<article[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?(?:<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]*)<\/p>)?[\s\S]*?(?:<span[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)<\/span>)?/gi,
      // Legacy layout
      /<div[^>]*class="[^"]*meal[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*meal-name[^"]*"[^>]*>([^<]+)<\/span>[\s\S]*?(?:<span[^>]*class="[^"]*meal-description[^"]*"[^>]*>([^<]*)<\/span>)?[\s\S]*?(?:<span[^>]*class="[^"]*meal-price[^"]*"[^>]*>([^<]+)<\/span>)?/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const name = this.cleanText(match[1]);
        const description = match[2] ? this.cleanText(match[2]) : undefined;
        const priceText = match[3] ? this.cleanText(match[3]) : undefined;

        const priceInfo = priceText ? this.extractPrice(priceText) : null;

        items.push({
          name,
          description,
          price: priceInfo?.price,
          currency: priceInfo?.currency || 'EUR',
        });
      }

      if (items.length > 0) break;
    }

    // Fallback: search for planted mentions
    if (items.length === 0) {
      const plantedPattern = /(?:>|\s)([^<>]{0,50}planted[^<>]{0,50})(?:<|€|\d)/gi;
      let match;
      while ((match = plantedPattern.exec(html)) !== null) {
        const text = this.cleanText(match[1]);
        if (text.length > 5 && text.length < 150) {
          items.push({
            name: text,
            description: 'Contains Planted product',
          });
        }
      }
    }

    return items;
  }

  /**
   * Recursively search for a property in a nested object
   */
  private findNestedProperty(obj: unknown, propertyName: string): unknown {
    if (!obj || typeof obj !== 'object') return null;

    const objRecord = obj as Record<string, unknown>;
    if (propertyName in objRecord) {
      return objRecord[propertyName];
    }

    for (const key of Object.keys(objRecord)) {
      const result = this.findNestedProperty(objRecord[key], propertyName);
      if (result) return result;
    }

    return null;
  }

  /**
   * Find a location object that has actual address data (not empty)
   */
  private findLocationWithAddress(obj: unknown): {
    street?: string;
    streetAddress?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    countryCode?: string;
    lat?: number;
    lng?: number;
  } | null {
    if (!obj || typeof obj !== 'object') return null;

    const objRecord = obj as Record<string, unknown>;

    // Check if this is a location object with actual address data
    if ('street' in objRecord || 'streetAddress' in objRecord) {
      const street = (objRecord.street || objRecord.streetAddress) as string | undefined;
      if (street && street.trim() !== '') {
        return {
          street: objRecord.street as string | undefined,
          streetAddress: objRecord.streetAddress as string | undefined,
          city: objRecord.city as string | undefined,
          postalCode: objRecord.postalCode as string | undefined,
          country: objRecord.country as string | undefined,
          countryCode: objRecord.countryCode as string | undefined,
          lat: typeof objRecord.lat === 'number' ? objRecord.lat : undefined,
          lng: typeof objRecord.lng === 'number' ? objRecord.lng : undefined,
        };
      }
    }

    // Recursively search in child objects
    for (const key of Object.keys(objRecord)) {
      const result = this.findLocationWithAddress(objRecord[key]);
      if (result && result.street) return result;
    }

    return null;
  }
}
