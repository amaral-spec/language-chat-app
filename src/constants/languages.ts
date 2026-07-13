import type { Language, LanguageCode } from '../types'

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'pt-PT', name: 'Português (Portugal)', flag: '🇵🇹' },
  { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
]

export const DEFAULT_LANGUAGE_CODE: LanguageCode = 'en-US'

export function getLanguageByCode(code: LanguageCode): Language {
  return SUPPORTED_LANGUAGES.find((language) => language.code === code) ?? SUPPORTED_LANGUAGES[0]
}
