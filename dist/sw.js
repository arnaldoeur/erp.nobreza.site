/**
 * Service worker do Nobreza ERP.
 *
 * A versão anterior era cache-first para *todos* os pedidos. Isso tinha duas
 * consequências graves: depois de um deploy os utilizadores continuavam a
 * receber a versão antiga da aplicação para sempre, porque nada invalidava a
 * cache; e com o servidor em baixo a aplicação parecia funcionar, escondendo
 * a avaria até alguém tentar autenticar-se.
 *
 * A estratégia agora depende do tipo de pedido:
 *
 *   /api/**          nunca intercetado — dados nunca vêm de cache
 *   navegação        rede primeiro, cache só se estiver offline
 *   /assets/**       cache primeiro (os nomes têm hash, o conteúdo é imutável)
 */

const CACHE_NAME = 'nobreza-erp-v2';

// Mínimo para mostrar alguma coisa sem rede. O index.html é revalidado
// sempre que há rede, por isso não fixa uma versão da aplicação.
const SHELL = [
    '/',
    '/index.html',
    '/favicon.png',
    '/nobreza_erp_logo_white_horizontal.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            // Um recurso em falta não pode impedir a instalação — o addAll é
            // atómico e falharia por inteiro.
            .then((cache) => Promise.allSettled(SHELL.map((asset) => cache.add(asset))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(
                names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Só GET é cacheável. POST, PUT e DELETE seguem sempre para a rede.
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Pedidos a outras origens não nos dizem respeito.
    if (url.origin !== self.location.origin) return;

    // A API nunca é servida de cache. Devolver stock ou vendas guardados seria
    // pior do que devolver um erro.
    if (url.pathname.startsWith('/api/')) return;

    // Navegação: rede primeiro. Assim um deploy novo chega de imediato, e uma
    // avaria do servidor aparece como avaria em vez de página fantasma.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
                    return response;
                })
                .catch(() => caches.match('/index.html').then((cached) => cached || Response.error()))
        );
        return;
    }

    // Ficheiros com hash no nome: o conteúdo nunca muda, logo a cache serve
    // sem risco de servir versão errada.
    if (url.pathname.startsWith('/assets/')) {
        event.respondWith(
            caches.match(request).then((cached) => cached || fetch(request).then((response) => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return response;
            }))
        );
        return;
    }

    // Restantes recursos: rede, com a cache como rede de segurança.
    event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached || Response.error())));
});
