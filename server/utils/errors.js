/**
 * Erro com código HTTP, para que as rotas possam sinalizar a falha correta
 * sem cada uma inventar o seu formato de resposta.
 *
 * As mensagens são escritas em português e destinam-se a ser mostradas ao
 * utilizador. Detalhe técnico (SQL, stack traces) nunca entra aqui — vai para
 * os registos do servidor.
 */
export class ApiError extends Error {
    constructor(status, message, code = undefined) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

export const badRequest = (message, code) => new ApiError(400, message, code);
export const unauthorized = (message = 'Sessão inválida ou expirada.', code) => new ApiError(401, message, code);
export const forbidden = (message = 'Não tem permissão para esta operação.', code) => new ApiError(403, message, code);
export const notFound = (message = 'Registo não encontrado.', code) => new ApiError(404, message, code);
export const conflict = (message, code) => new ApiError(409, message, code);
export const tooManyRequests = (message = 'Demasiados pedidos. Tente novamente dentro de momentos.', code) =>
    new ApiError(429, message, code);

/**
 * Envolve um handler assíncrono para que uma promessa rejeitada chegue ao
 * middleware de erros. Sem isto, o Express deixa o pedido pendurado até
 * expirar em vez de responder.
 */
export function asyncHandler(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}
