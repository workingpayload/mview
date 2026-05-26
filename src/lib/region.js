// Detect the user's ISO 3166-1 alpha-2 country code from their IANA timezone.
// TMDB's /watch/providers responses are keyed by these codes.
//
// Resolution order:
//   1. Intl.DateTimeFormat().resolvedOptions().timeZone → TZ_TO_COUNTRY map
//   2. navigator.language / navigator.languages[0] region suffix (e.g. "en-GB" → "GB")
//   3. Fallback to 'US'

const TZ_TO_COUNTRY = {
  // North America
  'America/New_York': 'US',
  'America/Detroit': 'US',
  'America/Indiana/Indianapolis': 'US',
  'America/Kentucky/Louisville': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Boise': 'US',
  'America/Phoenix': 'US',
  'America/Los_Angeles': 'US',
  'America/Anchorage': 'US',
  'America/Juneau': 'US',
  'Pacific/Honolulu': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Halifax': 'CA',
  'America/St_Johns': 'CA',
  'America/Mexico_City': 'MX',
  'America/Monterrey': 'MX',
  'America/Cancun': 'MX',
  'America/Tijuana': 'MX',
  // Europe
  'Europe/London': 'GB',
  'Europe/Belfast': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT',
  'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Budapest': 'HU',
  'Europe/Lisbon': 'PT',
  'Europe/Athens': 'GR',
  'Europe/Bucharest': 'RO',
  'Europe/Sofia': 'BG',
  'Europe/Kiev': 'UA',
  'Europe/Kyiv': 'UA',
  'Europe/Istanbul': 'TR',
  'Europe/Moscow': 'RU',
  'Europe/Tallinn': 'EE',
  'Europe/Riga': 'LV',
  'Europe/Vilnius': 'LT',
  // Asia
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN',
  'Asia/Chongqing': 'CN',
  'Asia/Urumqi': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Asia/Macau': 'MO',
  'Asia/Taipei': 'TW',
  'Asia/Singapore': 'SG',
  'Asia/Bangkok': 'TH',
  'Asia/Jakarta': 'ID',
  'Asia/Makassar': 'ID',
  'Asia/Manila': 'PH',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Karachi': 'PK',
  'Asia/Dhaka': 'BD',
  'Asia/Colombo': 'LK',
  'Asia/Kathmandu': 'NP',
  'Asia/Yangon': 'MM',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Saigon': 'VN',
  'Asia/Phnom_Penh': 'KH',
  'Asia/Vientiane': 'LA',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Jerusalem': 'IL',
  'Asia/Tel_Aviv': 'IL',
  'Asia/Beirut': 'LB',
  'Asia/Amman': 'JO',
  'Asia/Tehran': 'IR',
  'Asia/Baghdad': 'IQ',
  'Asia/Almaty': 'KZ',
  'Asia/Tashkent': 'UZ',
  // Oceania
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU',
  'Australia/Hobart': 'AU',
  'Australia/Darwin': 'AU',
  'Pacific/Auckland': 'NZ',
  'Pacific/Fiji': 'FJ',
  // South America
  'America/Sao_Paulo': 'BR',
  'America/Recife': 'BR',
  'America/Manaus': 'BR',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Buenos_Aires': 'AR',
  'America/Santiago': 'CL',
  'America/Bogota': 'CO',
  'America/Lima': 'PE',
  'America/Caracas': 'VE',
  'America/Montevideo': 'UY',
  'America/Asuncion': 'PY',
  'America/La_Paz': 'BO',
  // Africa
  'Africa/Cairo': 'EG',
  'Africa/Lagos': 'NG',
  'Africa/Johannesburg': 'ZA',
  'Africa/Nairobi': 'KE',
  'Africa/Casablanca': 'MA',
  'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN',
  'Africa/Accra': 'GH',
  'Africa/Addis_Ababa': 'ET',
  'Africa/Khartoum': 'SD',
}

function fromTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz && TZ_TO_COUNTRY[tz]) return TZ_TO_COUNTRY[tz]
  } catch {}
  return null
}

function fromLanguage() {
  try {
    const lang =
      (typeof navigator !== 'undefined' &&
        (navigator.language || navigator.languages?.[0])) ||
      ''
    if (lang.includes('-')) {
      const region = lang.split('-')[1].toUpperCase()
      if (/^[A-Z]{2}$/.test(region)) return region
    }
  } catch {}
  return null
}

let _cached = null
export function detectRegion() {
  if (_cached) return _cached
  _cached = fromTimezone() ?? fromLanguage() ?? 'US'
  return _cached
}

export function detectedSource() {
  if (fromTimezone()) return 'timezone'
  if (fromLanguage()) return 'language'
  return 'fallback'
}

export function currentTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

// Curated list of major TMDB watch-provider markets. Code is ISO 3166-1 alpha-2.
export const REGION_OPTIONS = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
]

const REGION_BY_CODE = new Map(REGION_OPTIONS.map((r) => [r.code, r]))

export function regionLabel(code) {
  return REGION_BY_CODE.get(code)?.name ?? code
}

export function regionFlag(code) {
  return REGION_BY_CODE.get(code)?.flag ?? '🌐'
}

// When the region's primary cinema language is something other than English,
// we use it to augment recommendations with popular local-language content.
// 'any' = don't augment (let TMDB's default ranking stand).
const REGION_TO_LANGUAGE = {
  IN: 'hi', PK: 'ur', BD: 'bn', LK: 'si', NP: 'ne',
  KR: 'ko', JP: 'ja',
  CN: 'zh', HK: 'zh', TW: 'zh', MO: 'zh',
  TH: 'th', VN: 'vi', ID: 'id', MY: 'ms', PH: 'tl',
  DE: 'de', AT: 'de', CH: 'de',
  FR: 'fr', BE: 'fr',
  ES: 'es', MX: 'es', AR: 'es', CL: 'es', CO: 'es', PE: 'es', UY: 'es', PY: 'es', BO: 'es', VE: 'es',
  IT: 'it',
  PT: 'pt', BR: 'pt',
  NL: 'nl',
  SE: 'sv', NO: 'no', DK: 'da', FI: 'fi',
  PL: 'pl', CZ: 'cs', HU: 'hu', GR: 'el', RO: 'ro', BG: 'bg',
  RU: 'ru', UA: 'uk',
  TR: 'tr',
  IL: 'he',
  AE: 'ar', SA: 'ar', EG: 'ar', QA: 'ar', KW: 'ar', BH: 'ar', OM: 'ar', JO: 'ar', LB: 'ar',
  MA: 'ar', DZ: 'ar', TN: 'ar',
}

export function defaultLanguageForRegion(code) {
  return REGION_TO_LANGUAGE[code] ?? 'any'
}

// Always returns a list that contains the detected region (added if absent)
// and sorts alphabetically by name. Detected is also exposed separately so the
// UI can highlight it.
export function getRegionChoices() {
  const detected = detectRegion()
  const list = [...REGION_OPTIONS]
  if (!REGION_BY_CODE.has(detected)) {
    list.push({ code: detected, name: detected, flag: '🌐' })
  }
  list.sort((a, b) => a.name.localeCompare(b.name))
  return { detected, options: list }
}
