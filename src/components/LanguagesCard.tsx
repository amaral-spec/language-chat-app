import Card from './ui/Card'
import { SUPPORTED_LANGUAGES } from '../constants/languages'
import type { LanguageCode } from '../types'

interface LanguagesCardProps {
  languages: LanguageCode[]
  selectedLanguage: LanguageCode | null
  onSelectLanguage: (language: LanguageCode | null) => void
}

/** Card interativo: clicar num idioma filtra os outros cards do dashboard por ele (spec 005, Fatia 3). */
function LanguagesCard({ languages, selectedLanguage, onSelectLanguage }: LanguagesCardProps) {
  const practicedLanguages = SUPPORTED_LANGUAGES.filter((language) => languages.includes(language.code))

  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Languages</p>
      {practicedLanguages.length === 0 ? (
        <p className="mt-2 text-sm text-ink-400">No languages practiced yet</p>
      ) : (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelectLanguage(null)}
            aria-pressed={selectedLanguage === null}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              selectedLanguage === null
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/25'
                : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}
          >
            All
          </button>
          {practicedLanguages.map((language) => (
            <button
              key={language.code}
              type="button"
              onClick={() => onSelectLanguage(language.code)}
              aria-pressed={selectedLanguage === language.code}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedLanguage === language.code
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/25'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              }`}
            >
              {language.flag} {language.name}
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

export default LanguagesCard
