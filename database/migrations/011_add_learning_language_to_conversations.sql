-- Uma conversa tem UM e apenas UM idioma de aprendizado, escolhido na
-- criação e imutável depois (ver Decisões de Design da spec). Default
-- 'en-US' cobre tanto conversas já existentes quanto a regra de negócio
-- "padrão é English se não selecionado".

alter table public.conversations
  add column if not exists learning_language text not null default 'en-US'
  check (learning_language in ('en-US', 'pt-BR', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE', 'it-IT'));

-- Sem mudanças de RLS: as policies existentes de conversations já
-- protegem a linha inteira (incluindo esta nova coluna) por participante.
