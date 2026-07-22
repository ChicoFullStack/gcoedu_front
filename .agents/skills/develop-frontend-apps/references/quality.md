# Qualidade, acessibilidade e desempenho

## Testes

- Testar comportamento observável, não detalhes internos.
- Usar a pilha existente. Quando apropriado: Vitest/Jest para unidades, React Testing Library para componentes, MSW para fronteiras HTTP e Playwright/Cypress para fluxos críticos.
- Priorizar autenticação, permissões, formulários, falhas de rede, estados vazios, concorrência e regressões do problema corrigido.
- Selecionar elementos por papel e nome acessível; evitar seletores frágeis.
- Não substituir teste real por snapshot amplo. Usar snapshots pequenos e estáveis quando agregarem valor.

## Acessibilidade

- Usar elemento nativo correto antes de ARIA. Não transformar `div` em botão sem necessidade.
- Garantir teclado, ordem de foco, foco após navegação/modal, escape e retorno de foco.
- Associar `label`, descrição e erro aos campos; anunciar atualizações assíncronas relevantes sem excesso.
- Não depender somente de cor, hover ou placeholder para transmitir informação.
- Respeitar zoom, preferência de movimento reduzido e tamanhos de alvo adequados.
- Validar com ferramentas automáticas e uma passagem manual por teclado; automação não cobre tudo.

## Desempenho

- Medir Core Web Vitals, profiler e bundle antes de otimizar.
- Reduzir JavaScript enviado, dependências pesadas, renderizações desnecessárias e trabalho na thread principal.
- Carregar imagens responsivas com dimensões conhecidas; priorizar apenas recursos realmente críticos.
- Evitar cascatas de dados; buscar em paralelo quando independente e mover leitura para o servidor quando apropriado.
- Virtualizar listas somente quando volume e medição justificarem.
- Usar debounce/throttle conforme a interação, preservando cancelamento e acessibilidade.

## Observabilidade e resiliência

- Adicionar error boundaries nas fronteiras onde existe recuperação útil.
- Registrar contexto técnico seguro, versão/release e correlation ID sem segredos ou PII.
- Exibir mensagens acionáveis e oferecer repetição quando segura.
- Diferenciar erro esperado de validação, indisponibilidade temporária e defeito inesperado.
- Considerar modo offline apenas quando houver estratégia clara de consistência e reconciliação.

## Revisão final

- Confirmar ausência de erros no console, avisos de hidratação e requisições duplicadas.
- Verificar viewport estreita e larga, teclado, loading, vazio, erro e permissão negada.
- Executar tipos, lint, testes relevantes e build conforme o risco.
- Revisar o diff para alterações incidentais, segredos, logs temporários e dependências não utilizadas.
