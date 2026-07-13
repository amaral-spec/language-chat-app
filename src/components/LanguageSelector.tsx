import { SUPPORTED_LANGUAGES } from '../constants/languages'
import type { LanguageCode } from '../types'

interface LanguageSelectorProps {
  value: LanguageCode
  onChange: (code: LanguageCode) => void
}

/**
 * Seleção de idioma de aprendizado ao criar uma conversa — imutável
 * depois (ver spec 004), por isso só aparece aqui, nunca dentro do chat.
 */
function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <fieldset className="space-y-1">
      <legend className="mb-1 block text-sm font-medium text-gray-700">Qual idioma você quer praticar?</legend>
      <div className="grid grid-cols-2 gap-2">
        {SUPPORTED_LANGUAGES.map((language) => (
          <label
            key={language.code}
            className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm ${
              value === language.code ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="learning-language"
              value={language.code}
              checked={value === language.code}
              onChange={() => onChange(language.code)}
              className="sr-only"
            />
            <span aria-hidden="true">{language.flag}</span>
            <span>{language.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default LanguageSelector
