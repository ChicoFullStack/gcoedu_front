# Integração com backend e Axios

## Contrato e fronteira

- Confirmar método, URL, autenticação, headers, payload, resposta, códigos de status e formato de erro.
- Distinguir DTOs de entrada, saída e modelos de UI; não reutilizar um único tipo para formas diferentes.
- Validar respostas críticas em runtime e registrar falhas sem incluir dados sensíveis.
- Propagar um identificador de correlação quando o backend fornecer ou exigir.

## Cliente Axios

- Criar instância compartilhada por origem/responsabilidade, com `baseURL` validada e timeout finito.
- Usar interceptadores para preocupações transversais, não para regras específicas de tela.
- Ejetar interceptadores criados dentro de ciclos de vida; idealmente configurá-los uma vez fora da árvore React.
- Encaminhar `AbortSignal` para cancelar buscas obsoletas e evitar atualização após descarte.
- Não definir manualmente `Content-Type` de `FormData`; permitir que o runtime inclua o boundary.
- Para downloads, validar status/tipo, usar `blob`, extrair nome de arquivo com segurança e revogar object URLs.

## Sessão e refresh

- Preferir cookies seguros quando possível. Se o contrato exigir bearer token no cliente, minimizar exposição e nunca persistir refresh token sem análise explícita de risco.
- Ao receber expiração autenticável, executar apenas um refresh em andamento e enfileirar solicitações concorrentes.
- Marcar a solicitação repetida, limitar a uma repetição e excluir login/refresh do mecanismo para impedir loops.
- Se o refresh falhar, limpar a sessão uma vez, cancelar a fila e redirecionar sem ciclo. Preservar uma rota de retorno validada quando apropriado.
- Distinguir `401` (não autenticado), `403` (sem permissão), falha de rede, timeout, cancelamento e erro de validação.

## Dados remotos

- Construir chaves de cache com todos os filtros que alteram a resposta.
- Definir `staleTime`, repetição e invalidação conforme semântica, não por hábito.
- Cancelar ou ignorar respostas fora de ordem em buscas incrementais.
- Usar optimistic update apenas quando houver rollback confiável e conflito compreendido.
- Evitar repetição automática de mutações não idempotentes.
- Debounce melhora volume de chamadas, mas não substitui cancelamento nem controle de concorrência.

## Integração operacional

- Manter CORS no servidor; o frontend não pode corrigi-lo com headers próprios.
- Usar credenciais cross-origin somente com origem explícita e configuração compatível no backend.
- Para cookies, avaliar `SameSite`, domínio, HTTPS e proteção CSRF como um conjunto.
- Nunca revelar detalhes internos do backend em mensagens ao usuário.

