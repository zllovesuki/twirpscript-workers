/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { createTwirpServerless } from "twirpscript";
import { InboundRequest } from "twirpscript/runtime/server";
import { haberdasherHandler } from "./server/hat";

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const parsed = new URL(request.url);
    const app = createTwirpServerless([haberdasherHandler]);

    const appRequest: InboundRequest = {
      method: request.method,
      headers: {},
      body: new Uint8Array(await request.arrayBuffer()),
      url: parsed.pathname,
    };
    request.headers.forEach((v, k) => {
      appRequest.headers[k] = v;
    });

    const response = await app(appRequest);
    let responseHeaders: Headers = new Headers();
    for (const [k, v] of Object.entries(response.headers)) {
      if (v) {
        responseHeaders.set(k, v);
      }
    }
    return new Response(response.body, {
      headers: responseHeaders,
      status: response.statusCode,
    });
  },
};
