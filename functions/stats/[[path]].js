// Cloudflare Pages Function: 反代 /stats/* 到 ybq-ai-search Worker
// 让 ybq.me/stats/ 看起来跟主站同域名
// 2026-07-19 加

const WORKER_URL = 'https://ybq-ai-search.garyyuen.workers.dev';

export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);

  // 拼接目标 URL（保留 query string 和 sub-path）
  const targetPath = params.path ? '/' + params.path.join('/') : '';
  const targetUrl = WORKER_URL + '/stats' + targetPath + url.search;

  // 透传请求（保留方法、headers、body）
  const newReq = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
    redirect: 'manual',
  });

  // 修改 Host 头（避免 Worker 拒绝）
  newReq.headers.delete('host');
  newReq.headers.set('Host', 'ybq-ai-search.garyyuen.workers.dev');

  const response = await fetch(newReq);

  // 复制响应，去掉一些可能造成问题的 headers
  const newResp = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  // 改写页面里的 Worker URL 到 ybq.me/stats
  newResp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  return newResp;
}
