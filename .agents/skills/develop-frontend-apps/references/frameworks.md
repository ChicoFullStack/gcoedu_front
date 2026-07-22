# React, Vite e Next.js

## React e TypeScript

- Manter renderização pura; executar efeitos apenas para sincronização com sistemas externos.
- Evitar estado derivado armazenado e efeitos usados para calcular valores de renderização.
- Extrair hooks quando encapsularem uma responsabilidade reutilizável, não apenas para reduzir linhas.
- Usar `unknown` nas fronteiras inseguras e estreitar o tipo. Modelar estados mutuamente exclusivos com uniões discriminadas.
- Preferir tipos gerados do contrato OpenAPI/GraphQL quando disponíveis.
- Usar `key` estável oriunda da identidade do dado, nunca índice quando a coleção pode mudar.
- Controlar formulários simples diretamente; para formulários complexos, considerar React Hook Form e schemas como Zod se já adotados ou justificados.

## Vite

- Tratar apenas variáveis `VITE_*` como disponíveis no cliente e, portanto, públicas.
- Usar aliases coerentes com `tsconfig`; evitar configurações divergentes entre TypeScript, Vite, testes e lint.
- Configurar proxy apenas para desenvolvimento. Não confundi-lo com CORS ou arquitetura de produção.
- Usar importação dinâmica e divisão de bundle em fronteiras significativas; inspecionar o bundle antes de criar chunks manuais.
- Manter configuração de ambiente validada e falhar cedo quando valores obrigatórios estiverem ausentes.

## Next.js

- Detectar App Router ou Pages Router e não misturar padrões sem necessidade.
- No App Router, preferir Server Components. Adicionar `"use client"` somente na menor subárvore que exige estado, eventos ou APIs do navegador.
- Fazer leitura de dados no servidor quando isso melhorar segurança, SEO ou reduzir cascatas; usar Route Handlers/BFF apenas quando houver responsabilidade real.
- Escolher cache e revalidação explicitamente conforme a volatilidade do dado. Não depender de defaults lembrados de outra versão.
- Implementar `loading`, `error`, `not-found` e limites de Suspense onde melhorarem o fluxo.
- Usar mecanismos do framework para metadados, imagens, fontes e scripts de terceiros.
- Evitar importar módulos exclusivos do servidor para componentes do cliente. Nunca vazar variáveis sem prefixo público.
- Considerar hidratação, runtime Node/Edge, cookies, headers e invalidadores conforme a versão instalada.

## Seleção de estado

- Estado de componente: `useState`/`useReducer`.
- Estado navegável: URL e parâmetros de busca.
- Estado remoto: solução de consulta/cache já usada no projeto; considerar TanStack Query quando o cliente gerencia cache complexo.
- Estado global do cliente: Context para baixa frequência e escopo limitado; Zustand ou Redux Toolkit somente quando a complexidade justificar.
- Estado de formulário: biblioteca dedicada apenas para validação, arrays, etapas ou desempenho que excedam formulários simples.

