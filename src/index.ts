import "./tracing/performance";
import { initTracer } from "./tracing";
import { haberdasherHandler } from "./server/hat";
import { handleRPC } from "./server/handler";
import { WorkerRouter } from "@worker-tools/router";
import { ok } from "@worker-tools/response-creators";

export interface Env {
  TRACE_ENDPOINT: string;
}

const router = new WorkerRouter();

router.all("/twirp/*", (req, ctx) => {
  const { tracer, provider } = initTracer(
    "twirpscript",
    ctx.env.TRACE_ENDPOINT
  );
  const response = handleRPC([haberdasherHandler], req, tracer);
  ctx.waitUntil(response.finally(async () => await provider.forceFlush()));
  return response;
});

router.get("/", () => ok("Hello World"));

export default router;
