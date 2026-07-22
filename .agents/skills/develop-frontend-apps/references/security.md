# Segurança frontend

## Segredos e configuração

- Considerar todo código, source map e variável pública do bundle acessível ao usuário.
- Manter chaves privadas, credenciais de serviço e operações privilegiadas exclusivamente no backend.
- Não usar “ofuscação” como proteção de segredo.
- Validar URLs configuráveis e restringir protocolos e destinos esperados.

## XSS e conteúdo externo

- Renderizar texto como texto. Evitar HTML bruto; quando indispensável, sanitizar com biblioteca mantida e política restritiva.
- Não inserir entrada não confiável em `href`, `src`, CSS, HTML, scripts ou redirecionamentos sem validação contextual.
- Bloquear `javascript:` e protocolos inesperados. Para links externos, aplicar comportamento seguro quando abrirem nova aba.
- Evitar `eval`, `new Function` e construção dinâmica de código.
- Usar CSP compatível com a aplicação e nonces/hashes quando scripts inline forem inevitáveis.

## Autenticação e autorização

- Não tratar rota protegida, guard, menu oculto ou role no cliente como autorização; o backend deve validar cada operação.
- Evitar tokens em query strings, logs, analytics, mensagens ou armazenamento desnecessário.
- Em logout, invalidar a sessão no servidor quando suportado e limpar estado/cache sensível no cliente.
- Prevenir redirecionamento aberto aceitando apenas caminhos internos ou destinos allowlisted.

## Entrada, arquivos e privacidade

- Limitar tipo, extensão, tamanho e quantidade de arquivos no cliente para UX; repetir validação no servidor.
- Não confiar em MIME e nome fornecidos pelo navegador.
- Minimizar dados pessoais na memória, stores persistidos, telemetria e mensagens de erro.
- Mascarar campos sensíveis e impedir que ferramentas de observabilidade capturem conteúdo privado.

## Dependências

- Preferir pacotes maduros, mantidos e com escopo mínimo.
- Inspecionar auditorias no contexto da versão realmente alcançável e do ambiente afetado.
- Não aplicar atualização principal ou `audit fix --force` sem revisar breaking changes, diff do lockfile e testes.

