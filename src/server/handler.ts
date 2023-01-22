import { Tracer } from "@opentelemetry/api";
import {
  createTwirpServerless,
  InboundRequest,
  Service,
} from "twirpscript/runtime/server";
import { mountTracingHooks, TracedContext } from "../tracing/twirp";

export async function handleRPC<ContextExt extends TracedContext>(
  services: Service[],
  request: Request,
  tracer?: Tracer
): Promise<Response> {
  const parsed = new URL(request.url);
  const app = createTwirpServerless<ContextExt, typeof services>(services);

  if (tracer) {
    mountTracingHooks(tracer, app);
  }

  const appRequest: InboundRequest = {
    method: request.method,
    headers: {},
    body: new Uint8Array(await request.arrayBuffer()),
    url: parsed.pathname,
  };
  request.headers.forEach((v, k) => {
    appRequest.headers[k] = v;
  });

  const appResponse = await app(appRequest);

  let responseHeaders: Headers = new Headers();
  for (const [k, v] of Object.entries(appResponse.headers)) {
    if (v) {
      responseHeaders.set(k, v);
    }
  }

  return new Response(appResponse.body, {
    headers: responseHeaders,
    status: appResponse.statusCode,
  });
}
