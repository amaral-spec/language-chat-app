import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

beforeEach(() => {
  // Correções (LanguageTool) chamam `fetch` diretamente do frontend a
  // cada envio de mensagem. Sem este stub global, qualquer teste que
  // renderiza o chat faria uma chamada de rede real — este default
  // "sem erros encontrados" é seguro para testes que não se importam com
  // correções; quem precisa de um match específico sobrescreve com
  // `vi.stubGlobal('fetch', ...)` no próprio teste.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ matches: [] }) })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
