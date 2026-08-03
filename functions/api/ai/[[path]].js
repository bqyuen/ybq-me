// Cloudflare Pages Function: same-origin proxy for the ybq.me AI services.
// Browser clients use /api/ai so mainland/proxy environments do not need
// to connect to a workers.dev hostname directly.

const MAIN_WORKER_ORIGIN = 'https://ybq-me-ai.garyyuen.workers.dev';
const SEARCH_WORKER_ORIGIN = 'https://ybq-ai-search.garyyuen.workers.dev';

function getTargetPath(params) {
  const raw = params && params.path;
  const parts = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  return parts.length ? '/' + parts.map((part) => encodeURIComponent(part)).join('/') : '';
}

export async function onRequest(context) {
  const { request, params } = context;
  const incomingUrl = new URL(request.url);
  const targetPath = getTargetPath(params);

  // The current assistant sends an explicit action to the main Worker.
  // Older article/search integrations omit action and are served by the
  // RAG search Worker for backwards compatibility.
  let workerOrigin = MAIN_WORKER_ORIGIN;
  if (request.method === 'POST' && targetPath === '') {
    const body = await request.clone().json().catch(() => null);
    if (!body || !body.action) workerOrigin = SEARCH_WORKER_ORIGIN;
  }

  const targetUrl = workerOrigin + targetPath + incomingUrl.search;
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const init = {
    method: request.method,
    headers,
    redirect: 'follow',
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = request.body;
  }

  try {
    const response = await fetch(targetUrl, init);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type');
    responseHeaders.set('Vary', 'Origin');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'AI 服务暂时不可用，请稍后重试。' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
