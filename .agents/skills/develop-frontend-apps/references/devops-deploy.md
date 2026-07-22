# DevOps e deploy

## Limite de autorização

- Distinguir claramente preparar configuração, criar pipeline, executar deploy de preview/staging e promover para produção.
- Tratar cada mudança externa como ação separada. Obter autorização específica para criar recursos, gerar custos, alterar domínio/DNS, publicar imagem, aplicar migração, promover release, reiniciar serviço ou executar rollback.
- Antes de qualquer escrita externa, resolver o identificador exato de conta, organização, projeto, serviço, cluster, região e ambiente.
- Mostrar o plano, impacto esperado, verificações e rollback antes de uma alteração de produção.

## Descoberta e desenho

1. Mapear frontend, backend/BFF, banco, filas, storage, serviços externos, domínio, certificados e observabilidade.
2. Identificar o modelo de entrega existente: plataforma gerenciada, site estático, Node.js, container, VM ou orquestrador.
3. Confirmar runtimes, portas, comandos de build/start, diretório de saída, health checks e requisitos de memória/CPU.
4. Definir ambientes isolados, origem do artefato, promoção, aprovação e retenção.
5. Definir RTO/RPO, tolerância a indisponibilidade e rollback proporcional à criticidade.

## Pipeline seguro

- Executar instalação reproduzível pelo lockfile, verificação de tipos, lint, testes, build e análise de dependências.
- Produzir artefato imutável uma vez e promovê-lo entre ambientes; evitar recompilar código diferente para produção.
- Fixar actions, imagens e ferramentas em versões confiáveis. Revisar breaking changes antes de atualizar.
- Proteger branches/ambientes, exigir revisões adequadas e limitar permissões do token do CI.
- Impedir impressão de segredos e sanitizar logs e artefatos. Usar OIDC ou credenciais temporárias quando o provedor suportar.
- Definir concorrência para impedir deploys sobrepostos e cancelar execuções obsoletas quando seguro.
- Guardar metadados de release: commit, versão, artefato, horário, autor/aprovador e resultado.

## Build e runtime

- Para Vite estático, publicar somente o diretório de saída, configurar fallback de SPA quando necessário e aplicar cache longo apenas em assets com hash.
- Para Next.js, confirmar modo server, static export ou adapter suportado; alinhar runtime Node/Edge, cache, imagens e variáveis de build/runtime.
- Em Docker, usar multi-stage quando útil, base mínima suportada, usuário não root, `.dockerignore`, sinalização correta e health check significativo.
- Não embutir segredos em camadas da imagem ou argumentos de build. Verificar se variáveis públicas foram intencionalmente expostas.
- Configurar compressão, MIME, headers de segurança, limites de payload e proxy confiável no CDN/reverse proxy.

## Dados e dependências

- Tratar migração de banco como etapa independente, compatível com a versão anterior durante rollout quando possível.
- Fazer backup e testar restauração quando a mudança de dados for relevante. Nunca presumir que rollback de código desfaz migração.
- Coordenar CORS, cookies, CSP, callbacks OAuth, webhooks e allowlists entre frontend, backend e domínio final.
- Confirmar conectividade e readiness sem expor credenciais ou detalhes internos em health endpoints públicos.

## Estratégia de lançamento

- Preferir preview/staging para validar integração real.
- Escolher rolling, blue-green ou canary conforme suporte, custo e risco; não adicionar complexidade sem benefício.
- Executar smoke tests automatizados para página principal, assets, autenticação e pelo menos um fluxo crítico seguro.
- Promover somente o artefato validado. Registrar qualquer diferença inevitável de configuração entre ambientes.

## Pós-deploy e rollback

- Verificar status, logs, métricas, erros do cliente, latência, disponibilidade, certificados e comportamento de cache.
- Manter alertas acionáveis com responsáveis e limiares; evitar alertas sem resposta possível.
- Confirmar ausência de regressão antes de declarar conclusão.
- Acionar rollback quando os critérios definidos forem violados. Usar o último artefato comprovadamente saudável e verificar novamente após reverter.
- Entregar URL/versão publicada, evidências dos checks, mudanças de infraestrutura, observações de custo e procedimento de rollback.
