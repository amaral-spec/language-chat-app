# specs/005-error-analytics.md

## O que é

Dashboard que mostra análise dos erros cometidos durante as conversas: erros mais frequentes, taxa de acurácia, progresso ao longo do tempo e quem cometeu mais erros.

## Por que

Usuários aprendem melhor quando veem seu progresso. Analytics motivam e ajudam a focar nos erros recorrentes. É a "cara" educacional do app.

## Casos de Uso

1. **Após conversa**: Usuário clica "Ver estatísticas" e vê análise da conversa
2. **Dashboard pessoal**: Página `/stats` mostra progresso geral (todas as conversas)
3. **Erros frequentes**: Vê top 5 erros mais cometidos
4. **Taxa de acurácia**: Sabe que acertou 85% das mensagens
5. **Progresso temporal**: Gráfico mostrando melhora ao longo dos dias
6. **Comparação com amigo**: Vê quem cometeu mais erros na conversa (gamificação)

## Regras de Negócio

- Acurácia = (mensagens sem erro / total de mensagens) * 100
- Mensagens com múltiplos erros contam como 1 erro (não somam)
- Erro frequente = contagem de vezes que aparece
- Top 5 erros são aqueles com MAIS ocorrências
- Estatísticas por conversa mostram dados daquela conversa apenas
- Estatísticas globais agregam TODAS as conversas do usuário
- Progresso temporal é calculado por dia (não por hora)
- Comparação mostra: "Você: 8 erros | Amigo: 5 erros"
- Dados aparecem em real-time (conforme erros são aceitos/rejeitados)

## Decisões de Design

| Decisão | Opção Escolhida | Alternativa | Por quê |
|---------|-----------------|-------------|--------|
| Granularidade de progresso | Por dia | Por semana/mês | Feedback rápido, motivação diária |
| Agregar erros | Por tipo (grammar, spelling) | Por regra exata | Menos granular, mais actionable |
| Dados históricos | Contar do dia que começou | Resetar semanalmente | Histórico completo |
| Visualização | Gráfico de linha (Chart.js/Recharts) | Tabela | Mais visual, impactante |
| Comparação com amigo | Mostrar lado a lado | Ranking | Colaborativo, não competitivo |

## Fatias Implementáveis

### Fatia 1: Tipos + Schema para Analytics

**O que faz**:
- Define tipos TypeScript para erro, estatística
- Adiciona colunas em `corrections` table (se não tiver): error_type, error_category
- Cria views/queries para calcular estatísticas

**Artefatos**:
- `src/types/index.ts` — adiciona tipos `ErrorStats`, `ConversationStats`, `UserStats`
- `database/migrations/006_add_error_type_to_corrections.sql` — adiciona coluna `error_type` ('grammar', 'spelling')
- `src/services/analyticsService.ts` — funções para calcular estatísticas

**Teste**:
```bash
# Manual com dados fake no Supabase:
✓ 10 mensagens, 2 com erro → 80% acurácia
✓ Erros agrupados por tipo (5 grammar, 2 spelling)
✓ Top 1 erro: "verb_tense" (5 vezes)
```

**Bloqueadores**: Fatia 4 da spec 003 (Correções com accept/dismiss)

---

### Fatia 2: Analytics por Conversa

**O que faz**:
- Página `/chat/:conversationId/stats` mostra análise daquela conversa
- Mostra:
  - Total de mensagens
  - Acurácia (%)
  - Top 3 erros mais comuns
  - Quem cometeu mais erros (você vs amigo)

**Artefatos**:
- `src/pages/ConversationStats.tsx` — página de stats
- `src/components/AccuracyCard.tsx` — card de acurácia
- `src/components/ErrorsList.tsx` — lista de top 3 erros
- `src/components/ComparisonCard.tsx` — comparação você vs amigo
- `src/services/analyticsService.ts` — função `getConversationStats(conversationId)`

**Teste**:
```bash
npm test error-analytics.spec.ts

✓ Abre /chat/conv-123/stats
✓ Mostra: "Acurácia: 85%" (17 de 20 mensagens)
✓ Mostra top 3:
  - verb_tense (5x)
  - spelling_weather (2x)
  - article_usage (2x)
✓ Mostra: "Você: 3 erros | Amigo: 2 erros"
✓ Dados atualizam em real-time
```

**Bloqueadores**: Fatia 1 (Schema + tipos)

---

### Fatia 3: Dashboard Pessoal de Progresso

**O que faz**:
- Página `/stats` mostra análise GERAL (todas as conversas)
- Mostra:
  - Total de mensagens (todas as conversas)
  - Acurácia geral (%)
  - Erros mais frequentes (top 5, agregados)
  - Gráfico de progresso por dia (últimos 30 dias)
  - Idiomas praticados

**Artefatos**:
- `src/pages/Dashboard.tsx` ou `/stats` — dashboard pessoal
- `src/components/OverallAccuracyCard.tsx` — card de acurácia geral
- `src/components/ProgressChart.tsx` — gráfico de linha (Recharts)
- `src/components/TopErrorsList.tsx` — top 5 erros agregados
- `src/components/LanguagesCard.tsx` — idiomas praticados
- `src/services/analyticsService.ts` — função `getUserStats(userId)`

**Teste**:
```bash
npm test error-analytics.spec.ts

✓ Abre /stats
✓ Mostra: "Acurácia geral: 82%" (100 de 122 mensagens)
✓ Top 5 erros aparecem (agregados de 3 conversas)
✓ Gráfico mostra progresso (últimos 30 dias)
✓ Mostra: "Idiomas: English, Portuguese"
✓ Cada card é interativo (click → filtra por idioma)
```

**Bloqueadores**: Fatia 2 (Stats por conversa)

---

### Fatia 4: Gráfico de Progresso Temporal

**O que faz**:
- Gráfico de linha mostrando acurácia diária
- Eixo X: data
- Eixo Y: acurácia (0-100%)
- Últimos 30 dias (customizável depois)
- Mostra tooltip ao hover

**Artefatos**:
- `src/components/ProgressChart.tsx` — componente Recharts
- `src/services/analyticsService.ts` — função `getProgressByDay(userId, days=30)`
- Query que agrupa correções por dia e calcula acurácia diária

**Teste**:
```bash
# Com dados de 30 dias:
✓ Gráfico carrega
✓ Dia 1: 70% → Dia 30: 90% (progresso visível)
✓ Hover em ponto → tooltip "15/20 acertos"
✓ Sem dados em dia → ponto não aparece
```

**Bloqueadores**: Fatia 3 (Dashboard pessoal)

---

## Checklist de Integração

- [ ] `npm test` passa — testes de analytics
- [ ] `npm run lint` — sem erros
- [ ] Schema migrado (error_type em corrections)
- [ ] `/chat/:conversationId/stats` funciona
- [ ] Acurácia calculada corretamente
- [ ] Top 3 erros aparecem corretamente
- [ ] Comparação você vs amigo funciona
- [ ] `/stats` (dashboard pessoal) funciona
- [ ] Gráfico de progresso (últimos 30 dias) carrega
- [ ] Dados atualizam em real-time (Realtime)
- [ ] Commit com mensagem: "feat: implementar dashboard de analytics (fatias 1-4)"

## Notas

- Primeiros 7 dias vão ter poucos dados (normal)
- Depois de 1-2 semanas, padrão de progresso fica claro
- Gamificação (badges, streak) é spec 007 (futura)
- Exportar dados (CSV) é spec 008 (futura)
- Análise de padrões de erro (qual tipo de erro mais erra) é spec 009 (futura)
