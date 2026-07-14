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
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-500">Languages</p>
      {practicedLanguages.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">No languages practiced yet</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelectLanguage(null)}
            aria-pressed={selectedLanguage === null}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              selectedLanguage === null ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                selectedLanguage === language.code
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {language.flag} {language.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguagesCard
