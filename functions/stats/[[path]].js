// Cloudflare Pages Function: 反代 /stats/* 到 ybq-ai-search Worker
// 让 ybq.me/stats/ 看起来跟主站同域名
// 2026-07-19 加

const WORKER_URL = 'https://ybq-ai-search.garyyuen.workers.dev';

export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);

  // 拼接目标 URL（保留 query string 和 sub-path）
  const subPath = Array.isArray(params.path) && params.path.length > 0
    ? '/' + params.path.join('/')
    : '';
  const targetUrl = WORKER_URL + '/stats' + subPath + url.search;

  // 透传请求
  const fetchOpts = {
    method: request.method,
    headers: new Headers(),
    redirect: 'manual',
  };
  // 复制 headers（除了 host）
  for (const [k, v] of request.headers.entries()) {
    if (k.toLowerCase() === 'host') continue;
    fetchOpts.headers.set(k, v);
  }
  fetchOpts.headers.set('Host', 'ybq-ai-search.garyyuen.workers.dev');

  if (!['GET', 'HEAD'].includes(request.method)) {
    fetchOpts.body = request.body;
  }

  const response = await fetch(targetUrl, fetchOpts);

  // 复制响应，强制 200 状态（Pages Function bug workaround：
  // 某些情况下 Pages Function 会把响应状态误判为 405）
  const actualStatus = response.status === 405 ? 200 : response.status;

  return new Response(response.body, {
    status: actualStatus,
    statusText: actualStatus === 200 ? 'OK' : response.statusText,
    headers: response.headers,
  });
}

// 显式处理 CORS preflight（避免 OPTIONS 走代理）
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
