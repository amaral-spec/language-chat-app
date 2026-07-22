import { Check } from 'lucide-react'
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
    <fieldset className="space-y-2">
      <legend className="mb-1 block text-sm font-medium text-ink-700">Qual idioma você quer praticar?</legend>
      <div className="grid grid-cols-2 gap-2">
        {SUPPORTED_LANGUAGES.map((language) => {
          const isSelected = value === language.code

          return (
            <label
              key={language.code}
              className={`relative flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out-strong active:scale-[0.97] ${
                isSelected
                  ? 'border-brand-400 bg-brand-50 text-brand-800 ring-1 ring-brand-400'
                  : 'border-ink-200 text-ink-700 hover:border-ink-300 hover:bg-ink-50'
              }`}
            >
              <input
                type="radio"
                name="learning-language"
                value={language.code}
                checked={isSelected}
                onChange={() => onChange(language.code)}
                className="sr-only"
              />
              <span aria-hidden="true" className="text-base leading-none">
                {language.flag}
              </span>
              <span className="flex-1 truncate font-medium">{language.name}</span>
              {isSelected && <Check aria-hidden="true" size={15} className="shrink-0 animate-scale-in text-brand-600" />}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default LanguageSelector
