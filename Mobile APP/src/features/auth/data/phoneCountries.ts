export type PhoneCountry = { name: string; dial: string; flag: string };

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { name: 'Pakistan', dial: '+92', flag: '🇵🇰' }, { name: 'United States', dial: '+1', flag: '🇺🇸' }, { name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { name: 'United Kingdom', dial: '+44', flag: '🇬🇧' }, { name: 'India', dial: '+91', flag: '🇮🇳' }, { name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' }, { name: 'Australia', dial: '+61', flag: '🇦🇺' }, { name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { name: 'Bangladesh', dial: '+880', flag: '🇧🇩' }, { name: 'Turkey', dial: '+90', flag: '🇹🇷' }, { name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { name: 'France', dial: '+33', flag: '🇫🇷' }, { name: 'Italy', dial: '+39', flag: '🇮🇹' }, { name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { name: 'Netherlands', dial: '+31', flag: '🇳🇱' }, { name: 'Qatar', dial: '+974', flag: '🇶🇦' }, { name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
  { name: 'Oman', dial: '+968', flag: '🇴🇲' }, { name: 'South Africa', dial: '+27', flag: '🇿🇦' }, { name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { name: 'China', dial: '+86', flag: '🇨🇳' }, { name: 'Japan', dial: '+81', flag: '🇯🇵' }, { name: 'Singapore', dial: '+65', flag: '🇸🇬' },
];

export function splitPhone(value?: string | null): { country: PhoneCountry; number: string } {
  const digits = (value ?? '').replace(/\D/g, '');
  const country = [...PHONE_COUNTRIES]
    .sort((left, right) => right.dial.length - left.dial.length)
    .find((item) => digits.startsWith(item.dial.slice(1))) ?? PHONE_COUNTRIES[0];
  const number = digits.startsWith(country.dial.slice(1)) ? digits.slice(country.dial.length - 1) : digits;
  return { country, number: number.slice(0, 15) };
}
