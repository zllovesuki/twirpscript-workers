import opentelemetry, { Tracer } from "@opentelemetry/api";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import {
  BasicTracerProvider,
  AlwaysOnSampler,
} from "@opentelemetry/sdk-trace-base";
import { EventSpanProcessor, OTLPJsonTraceExporter } from "./exporter";

export interface Tracing {
  tracer: Tracer;
  provider: BasicTracerProvider;
}

export function initTracer(serviceName: string, endpoint: string): Tracing {
  const provider = new BasicTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
    sampler: new AlwaysOnSampler(),
  });
  const exporter = new OTLPJsonTraceExporter({
    url: endpoint,
  });
  provider.addSpanProcessor(new EventSpanProcessor(exporter));

  return {
    tracer: provider.getTracer("otlp_http"),
    provider: provider,
  };
}
