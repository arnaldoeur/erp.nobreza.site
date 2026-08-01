/**
 * Cliente HTTP da aplicação.
 *
 * Substitui o cliente do Supabase. É o único ponto por onde o browser fala
 * com o exterior: não há mais nenhuma chamada de rede a partir do frontend,
 * e por isso também não há mais nenhuma chave de serviço dentro do bundle.
 *
 * A sessão viaja em cookies httpOnly, que o JavaScript desta página não
 * consegue ler. `credentials: 'same-origin'` é o que os faz acompanhar cada
 * pedido.
 */

export class ApiError extends Error {
    status: number;
    code?: string;

    constructor(status: number, message: string, code?: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

const BASE_URL = '/api';

/**
 * Renovação de sessão.
 *
 * Quando o token de acesso expira (15 minutos), o servidor responde 401 com
 * o código TOKEN_EXPIRED. Renovamos em silêncio e repetimos o pedido — o
 * utilizador não é atirado para o ecrã de login a meio de uma venda.
 *
 * A promessa é partilhada para que vários pedidos em paralelo a expirar ao
 * mesmo tempo façam uma única renovação, em vez de uma cada.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
    if (!refreshInFlight) {
        refreshInFlight = fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'same-origin',
        })
            .then((response) => response.ok)
            .catch(() => false)
            .finally(() => { refreshInFlight = null; });
    }
    return refreshInFlight;
}

/** Emitido quando a sessão termina em definitivo, para o App reagir. */
export const SESSION_EXPIRED_EVENT = 'nobreza-session-expired';

interface RequestOptions {
    method?: string;
    body?: unknown;
    /** Envia FormData sem cabeçalho JSON, para o carregamento de ficheiros. */
    formData?: FormData;
    signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
    const { method = 'GET', body, formData, signal } = options;

    const init: RequestInit = {
        method,
        credentials: 'same-origin',
        signal,
        headers: {},
    };

    if (formData) {
        init.body = formData;
    } else if (body !== undefined) {
        init.headers = { 'Content-Type': 'application/json' };
        init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
        response = await fetch(`${BASE_URL}${path}`, init);
    } catch {
        // Falha de rede, não de aplicação — o servidor nem chegou a responder.
        throw new ApiError(0, 'Sem ligação ao servidor. Verifique a sua Internet.');
    }

    if (response.status === 401 && !isRetry) {
        const payload = await response.json().catch(() => ({}));
        if (payload?.code === 'TOKEN_EXPIRED' && await refreshSession()) {
            return request<T>(path, options, true);
        }
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
        throw new ApiError(401, payload?.error || 'Sessão expirada. Inicie sessão novamente.', payload?.code);
    }

    if (response.status === 204) return undefined as T;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        if (!response.ok) throw new ApiError(response.status, `Erro do servidor (${response.status}).`);
        return undefined as T;
    }

    const payload = await response.json();
    if (!response.ok) {
        throw new ApiError(response.status, payload?.error || `Erro do servidor (${response.status}).`, payload?.code);
    }

    return payload as T;
}

export const api = {
    get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
    put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
    upload: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', formData }),
};

/** Converte um erro qualquer numa mensagem apresentável ao utilizador. */
export function errorMessage(error: unknown): string {
    if (error instanceof ApiError) return error.message;
    if (error instanceof Error) return error.message;
    return 'Ocorreu um erro inesperado.';
}
