export function adapt(handler) {
  return async request => {
    const headers = Object.fromEntries(request.headers);
    headers.host = new URL(request.url).host;
    const req = { method: request.method, headers, body: request.method === 'POST' ? await request.text() : undefined };
    const output = new Headers();
    let status = 200, response;
    const res = {
      setHeader(key, value) { output.set(key, value); },
      status(code) { status = code; return this; },
      json(body) { output.set('Content-Type', 'application/json; charset=utf-8'); response = new Response(JSON.stringify(body), { status, headers: output }); return this; }
    };
    await handler(req, res);
    return response || new Response(null, {status:500});
  };
}
