/** 统一 JSON 响应助手（规避 @types/node 中 Response 静态方法缺失的类型问题） */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
