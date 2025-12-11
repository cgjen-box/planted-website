/**
 * Detect country from URL based on platform domain patterns
 * Returns null if country cannot be determined from URL
 */
import type { SupportedCountry } from '@pad/core';

export function getCountryFromUrl(url: string): SupportedCountry | null {
  const lowerUrl = url.toLowerCase();

  // German platforms
  if (lowerUrl.includes('lieferando.de') || lowerUrl.includes('wolt.com/de') || lowerUrl.includes('ubereats.com/de')) return 'DE';

  // Austrian platforms
  if (lowerUrl.includes('lieferando.at') || lowerUrl.includes('wolt.com/at') || lowerUrl.includes('ubereats.com/at')) return 'AT';

  // Swiss platforms
  if (lowerUrl.includes('just-eat.ch') || lowerUrl.includes('smood.ch') || lowerUrl.includes('ubereats.com/ch')) return 'CH';

  // Italian platforms
  if (lowerUrl.includes('justeat.it') || lowerUrl.includes('deliveroo.it') || lowerUrl.includes('ubereats.com/it') || lowerUrl.includes('glovoapp.com/it')) return 'IT';

  // Spanish platforms
  if (lowerUrl.includes('just-eat.es') || lowerUrl.includes('deliveroo.es') || lowerUrl.includes('ubereats.com/es') || lowerUrl.includes('glovoapp.com/es')) return 'ES';

  // French platforms
  if (lowerUrl.includes('just-eat.fr') || lowerUrl.includes('deliveroo.fr') || lowerUrl.includes('ubereats.com/fr')) return 'FR';

  // UK platforms
  if (lowerUrl.includes('just-eat.co.uk') || lowerUrl.includes('deliveroo.co.uk') || lowerUrl.includes('ubereats.com/gb')) return 'UK';

  // Netherlands platforms
  if (lowerUrl.includes('thuisbezorgd.nl') || lowerUrl.includes('deliveroo.nl') || lowerUrl.includes('ubereats.com/nl')) return 'NL';

  // Belgium platforms
  if (lowerUrl.includes('takeaway.com/be') || lowerUrl.includes('deliveroo.be') || lowerUrl.includes('ubereats.com/be')) return 'BE';

  // Poland platforms
  if (lowerUrl.includes('pyszne.pl') || lowerUrl.includes('wolt.com/pl') || lowerUrl.includes('ubereats.com/pl') || lowerUrl.includes('glovoapp.com/pl')) return 'PL';

  return null;
}
