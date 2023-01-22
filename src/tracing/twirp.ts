import { Span, SpanKind, SpanStatusCode, Tracer } from "@opentelemetry/api";
import { TwirpContext, TwirpServerRuntime } from "twirpscript/runtime/server";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";

export interface TracedContext {
  span: Span;
}

export function mountTracingHooks<T extends TracedContext>(
  tracer: Tracer,
  app: TwirpServerRuntime<TwirpContext<T>>
) {
  app.on("requestReceived", (ctx, request) => {
    const span = tracer.startSpan("request.received", {
      kind: SpanKind.SERVER,
    });
    if (request.headers["cf-connecting-ip"]) {
      span.setAttribute(
        SemanticAttributes.HTTP_CLIENT_IP,
        request.headers["cf-connecting-ip"]
      );
    }
    if (request.headers["user-agent"]) {
      span.setAttribute(
        SemanticAttributes.HTTP_USER_AGENT,
        request.headers["user-agent"]
      );
    }
    span.setAttribute("component", "twirp");
    if (ctx.service) {
      span.setAttribute("twirp.service", ctx.service.name);
    }

    ctx.span = span;
  });

  app.on("requestRouted", (ctx) => {
    if (ctx.method) {
      ctx.span.updateName(ctx.method.name);
    }
  });

  app.on("error", (ctx, err) => {
    ctx.span.recordException(err);
    ctx.span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err.msg,
    });
    if (err.meta && err.meta.error) {
      ctx.span.addEvent("err.meta.error", {
        message: err.meta.error,
      });
    }
  });

  app.on("responseSent", (ctx, resp) => {
    ctx.span.setAttribute(SemanticAttributes.HTTP_STATUS_CODE, resp.statusCode);
    ctx.span.end();
  });
}
