# specs/NNN-nome-da-feature.md

**Modelo para criar novas specs. Copie este arquivo para `NNN-nome.md` e preencha as seções.**

---

## O que é

Descrição breve da feature em 2-3 linhas. Responda: qual é o objetivo principal?

## Por que

Por que essa feature é importante? Qual é o valor para o usuário? Qual é o ganho?

## Casos de Uso

Lista de cenários reais de uso:

1. **Caso 1**: [Descrição do cenário]
2. **Caso 2**: [Descrição do cenário]
3. **Caso 3**: [Descrição do cenário]

## Regras de Negócio

Lista de regras que SEMPRE valem:

- Regra 1: [Descrição]
- Regra 2: [Descrição]
- Regra 3: [Descrição]

Exemplo: "Mensagens nunca podem ser deletadas, apenas marcadas como deletadas", "Correções só aparecem 3+ segundos após envio" ou "Validar se realmente é uma frase e não spam do usuário".

## Decisões de Design

Tabela com decisões arquiteturais (trade-offs):

| Decisão | Opção Escolhida | Alternativa | Por quê |
|---------|-----------------|-------------|--------|
| [O quê] | [Escolha] | [Outra opção] | [Motivo] |
| Exemplo: Onde armazenar correções | Tabela `corrections` separada | Campo JSON em `messages` | Auditoria e histórico |

## Fatias Implementáveis

A feature é quebrada em **fatias pequenas, cada uma com teste e integração completa**. Não tente implementar a feature inteira de uma vez.

### Fatia 1: [Nome descritivo]
- **O que faz**: [Descrição breve]
- **Artefatos**: Quais arquivos/tabelas são criadas ou modificadas
- **Teste**: Como saber que funcionou
- **Bloqueadores**: Alguma outra fatia que precisa vir antes?

### Fatia 2: [Nome descritivo]
- **O que faz**: [Descrição breve]
- **Artefatos**: [Lista de arquivos]
- **Teste**: [Como validar]
- **Bloqueadores**: [Dependências]

### Fatia 3: [Nome descritivo]
- **O que faz**: [Descrição breve]
- **Artefatos**: [Lista de arquivos]
- **Teste**: [Como validar]
- **Bloqueadores**: [Dependências]

## Checklist de Integração

Antes de fazer commit:

- [ ] `npm test` passa (testes da spec escrevem primeiro)
- [ ] `npm run lint` sem erros
- [ ] Código segue AGENTS.md
- [ ] Banco de dados: migração aplicada no Supabase
- [ ] Git commit com mensagem clara em português
- [ ] Ambas as fatias/user stories foram testadas manualmente

## Notas

Espaço livre para:
- Dúvidas pendentes
- Discussões abertas
- Links úteis
- Esclarecimentos

---

**Lembre-se**: Esta spec é um documento vivo. Ela evolui junto com a feature. Se descobrir algo novo durante implementação, atualize a spec.
