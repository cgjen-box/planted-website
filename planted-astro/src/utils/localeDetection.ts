/**
 * Locale Auto-Detection Utility
 *
 * Detects user's preferred locale based on:
 * 1. Previously saved preference (localStorage)
 * 2. Browser language (navigator.language)
 * 3. IP-based geolocation (country detection)
 *
 * Maps detected country + language to the best available locale.
 */

import type { LocaleCode, CountryCode, LanguageCode } from '../i18n/config';

// Storage key for persisted locale preference
export const LOCALE_STORAGE_KEY = 'planted_locale_preference';
export const LOCALE_DETECTED_KEY = 'planted_locale_detected';

// Supported countries with their ISO 3166-1 alpha-2 codes
const COUNTRY_CODE_MAP: Record<string, CountryCode> = {
    'CH': 'ch',
    'DE': 'de',
    'AT': 'at',
    'FR': 'fr',
    'IT': 'it',
    'NL': 'nl',
    'GB': 'uk',
    'UK': 'uk',
    'ES': 'es',
};

// Browser language to our language code mapping
const BROWSER_LANG_MAP: Record<string, LanguageCode> = {
    'de': 'de',
    'de-DE': 'de',
    'de-AT': 'de',
    'de-CH': 'de',
    'fr': 'fr',
    'fr-FR': 'fr',
    'fr-CH': 'fr',
    'fr-BE': 'fr',
    'it': 'it',
    'it-IT': 'it',
    'it-CH': 'it',
    'nl': 'nl',
    'nl-NL': 'nl',
    'nl-BE': 'nl',
    'en': 'en',
    'en-US': 'en',
    'en-GB': 'en',
    'en-AU': 'en',
    'es': 'es',
    'es-ES': 'es',
    'es-MX': 'es',
    'es-AR': 'es',
};

// Country to locale mapping with language preference order
const COUNTRY_LOCALE_MAP: Record<CountryCode, Record<LanguageCode, LocaleCode>> = {
    'ch': {
        'de': 'ch-de',
        'fr': 'ch-fr',
        'it': 'ch-it',
        'en': 'ch-en',
        'nl': 'ch-de', // fallback to German for Dutch speakers in CH
        'es': 'ch-en', // fallback to English for Spanish speakers in CH
    },
    'de': {
        'de': 'de',
        'en': 'de-en',
        'fr': 'de-en',
        'it': 'de-en',
        'nl': 'de',
        'es': 'de-en',
    },
    'at': {
        'de': 'at',
        'en': 'at-en',
        'fr': 'at-en',
        'it': 'at-en',
        'nl': 'at',
        'es': 'at-en',
    },
    'fr': {
        'fr': 'fr',
        'en': 'fr-en',
        'de': 'fr-en',
        'it': 'fr-en',
        'nl': 'fr-en',
        'es': 'fr-en',
    },
    'it': {
        'it': 'it',
        'en': 'it-en',
        'de': 'it-en',
        'fr': 'it-en',
        'nl': 'it-en',
        'es': 'it-en',
    },
    'nl': {
        'nl': 'nl',
        'en': 'nl-en',
        'de': 'nl',
        'fr': 'nl-en',
        'it': 'nl-en',
        'es': 'nl-en',
    },
    'uk': {
        'en': 'uk',
        'de': 'uk',
        'fr': 'uk',
        'it': 'uk',
        'nl': 'uk',
        'es': 'uk',
    },
    'es': {
        'es': 'es',
        'en': 'es-en',
        'de': 'es-en',
        'fr': 'es-en',
        'it': 'es-en',
        'nl': 'es-en',
    },
    'global': {
        'en': 'global',
        'de': 'ch-de', // German speakers default to Swiss German
        'fr': 'fr',
        'it': 'it',
        'nl': 'nl',
        'es': 'es',
    },
};

// Default locale fallbacks by language when country is unknown
const LANGUAGE_DEFAULT_LOCALE: Record<LanguageCode, LocaleCode> = {
    'de': 'de',
    'fr': 'fr',
    'it': 'it',
    'nl': 'nl',
    'en': 'global',
    'es': 'es',
};

/**
 * Get saved locale preference from localStorage
 */
export function getSavedLocalePreference(): LocaleCode | null {
    if (typeof window === 'undefined') return null;
    try {
        const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (saved && isValidLocale(saved)) {
            return saved as LocaleCode;
        }
    } catch {
        // localStorage not available
    }
    return null;
}

/**
 * Save locale preference to localStorage
 */
export function saveLocalePreference(locale: LocaleCode): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
        // localStorage not available
    }
}

/**
 * Check if detection has already been performed this session
 */
export function hasDetectedLocale(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return sessionStorage.getItem(LOCALE_DETECTED_KEY) === 'true';
    } catch {
        return false;
    }
}

/**
 * Mark that detection has been performed
 */
export function markLocaleDetected(): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(LOCALE_DETECTED_KEY, 'true');
    } catch {
        // sessionStorage not available
    }
}

/**
 * Validate if a locale code is valid
 */
function isValidLocale(locale: string): boolean {
    const validLocales: LocaleCode[] = [
        'global', 'ch-de', 'ch-fr', 'ch-it', 'ch-en',
        'de', 'de-en', 'at', 'at-en', 'it', 'it-en',
        'fr', 'fr-en', 'nl', 'nl-en', 'uk', 'es', 'es-en'
    ];
    return validLocales.includes(locale as LocaleCode);
}

/**
 * Parse browser language to our language code
 */
export function parseBrowserLanguage(browserLang: string): LanguageCode {
    // Try exact match first
    if (BROWSER_LANG_MAP[browserLang]) {
        return BROWSER_LANG_MAP[browserLang];
    }
    // Try base language code (e.g., 'de' from 'de-CH')
    const baseLang = browserLang.split('-')[0].toLowerCase();
    if (BROWSER_LANG_MAP[baseLang]) {
        return BROWSER_LANG_MAP[baseLang];
    }
    // Default to English
    return 'en';
}

/**
 * Get browser's preferred language
 */
export function getBrowserLanguage(): LanguageCode {
    if (typeof navigator === 'undefined') return 'en';

    // Try navigator.language first
    const primaryLang = navigator.language;
    if (primaryLang) {
        return parseBrowserLanguage(primaryLang);
    }

    // Fallback to first language in navigator.languages
    if (navigator.languages?.length) {
        return parseBrowserLanguage(navigator.languages[0]);
    }

    return 'en';
}

/**
 * Detect country from IP using free geolocation API
 * Uses ip-api.com (free, no API key required, 45 requests/minute limit)
 */
export async function detectCountryFromIP(): Promise<CountryCode | null> {
    try {
        // Use ip-api.com - free service, no API key needed
        const response = await fetch('https://ip-api.com/json/?fields=countryCode', {
            signal: AbortSignal.timeout(3000) // 3 second timeout
        });

        if (!response.ok) return null;

        const data = await response.json();
        const countryCode = data.countryCode;

        if (countryCode && COUNTRY_CODE_MAP[countryCode]) {
            return COUNTRY_CODE_MAP[countryCode];
        }

        return null;
    } catch {
        // Geolocation failed or timed out
        return null;
    }
}

/**
 * Infer country from browser language locale (fallback method)
 * E.g., 'de-CH' suggests Switzerland
 */
export function inferCountryFromBrowserLocale(browserLang: string): CountryCode | null {
    const parts = browserLang.split('-');
    if (parts.length > 1) {
        const regionCode = parts[1].toUpperCase();
        if (COUNTRY_CODE_MAP[regionCode]) {
            return COUNTRY_CODE_MAP[regionCode];
        }
    }
    return null;
}

/**
 * Get the best locale for a country + language combination
 */
export function getBestLocale(country: CountryCode | null, language: LanguageCode): LocaleCode {
    // If we have a country, use country-specific mapping
    if (country && COUNTRY_LOCALE_MAP[country]) {
        const countryMap = COUNTRY_LOCALE_MAP[country];
        if (countryMap[language]) {
            return countryMap[language];
        }
        // Fallback to English variant for the country if available
        if (countryMap['en']) {
            return countryMap['en'];
        }
    }

    // No country or country not supported - use language default
    return LANGUAGE_DEFAULT_LOCALE[language] || 'global';
}

/**
 * Main detection function - detects and returns the best locale
 * This runs client-side only
 */
export async function detectBestLocale(): Promise<LocaleCode> {
    // 1. Check for saved preference first
    const saved = getSavedLocalePreference();
    if (saved) {
        return saved;
    }

    // 2. Get browser language
    const browserLang = getBrowserLanguage();
    const rawBrowserLang = typeof navigator !== 'undefined' ? navigator.language : '';

    // 3. Try to infer country from browser locale (fast, no network)
    let country = inferCountryFromBrowserLocale(rawBrowserLang);

    // 4. If we couldn't infer country from locale, try IP geolocation
    if (!country) {
        country = await detectCountryFromIP();
    }

    // 5. Get best locale based on country + language
    const bestLocale = getBestLocale(country, browserLang);

    return bestLocale;
}

/**
 * Get current locale from URL path
 */
export function getCurrentLocaleFromPath(): LocaleCode | null {
    if (typeof window === 'undefined') return null;

    const path = window.location.pathname;
    const base = (import.meta.env?.BASE_URL || '/planted-website').replace(/\/$/, '');
    const pathWithoutBase = path.replace(base, '').replace(/^\//, '');
    const firstSegment = pathWithoutBase.split('/')[0];

    if (firstSegment && isValidLocale(firstSegment)) {
        return firstSegment as LocaleCode;
    }

    return null;
}

/**
 * Build URL for a locale
 */
export function buildLocaleUrl(locale: LocaleCode): string {
    const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL)
        ? import.meta.env.BASE_URL.replace(/\/$/, '')
        : '/planted-website';
    return `${base}/${locale}/`;
}
