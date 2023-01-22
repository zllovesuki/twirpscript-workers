// adopted from https://github.com/RichiCoder1/opentelemetry-sdk-workers

import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import {
  ReadableSpan,
  Span,
  SpanExporter,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import {
  configureExporterTimeout,
  ExportServiceError,
  OTLPExporterConfigBase,
  OTLPExporterError,
  parseHeaders,
  appendResourcePathToUrl,
} from "@opentelemetry/otlp-exporter-base";
import {
  createExportTraceServiceRequest,
  IExportTraceServiceRequest,
} from "@opentelemetry/otlp-transformer";
import { Context } from "@opentelemetry/api";

export type OTLPCloudflareExporterBaseConfig = Omit<
  OTLPExporterConfigBase,
  "hostname"
> & {
  url: string;
};

/**
 * Cloudflare Collector Exporter abstract base class
 * Adapted from: https://raw.githubusercontent.com/open-telemetry/opentelemetry-js/main/experimental/packages/otlp-exporter-base/src/OTLPExporterBase.ts
 */
export abstract class OTLPCloudflareExporterBase<
  T extends OTLPCloudflareExporterBaseConfig,
  ExportItem,
  ServiceRequest
> {
  private DEFAULT_HEADERS: Record<string, string> = {};

  public readonly url: string;
  public readonly timeoutMillis: number;
  protected _concurrencyLimit: number;
  protected _sendingPromises: Promise<unknown>[] = [];
  protected headers: Record<string, string>;

  /**
   * @param config
   */
  constructor(config: T = {} as T) {
    this.url = this.getUrl(config.url);
    this.headers = Object.assign(
      this.DEFAULT_HEADERS,
      parseHeaders(config.headers)
    );

    this._concurrencyLimit =
      typeof config.concurrencyLimit === "number"
        ? config.concurrencyLimit
        : Infinity;

    this.timeoutMillis = configureExporterTimeout(config.timeoutMillis);
  }

  /**
   * Export items.
   * @param items
   * @param resultCallback
   */
  export(
    items: ExportItem[],
    resultCallback: (result: ExportResult) => void
  ): void {
    if (this._sendingPromises.length >= this._concurrencyLimit) {
      resultCallback({
        code: ExportResultCode.FAILED,
        error: new Error("Concurrent export limit reached"),
      });
      return;
    }

    this._export(items)
      .then(() => {
        resultCallback({ code: ExportResultCode.SUCCESS });
      })
      .catch((error: ExportServiceError) => {
        resultCallback({ code: ExportResultCode.FAILED, error });
      });
  }

  private _export(items: ExportItem[]): Promise<unknown> {
    return this.send(items);
  }

  send(items: ExportItem[]): Promise<void> {
    const serviceRequest = this.convert(items);
    const signal: AbortSignal = (AbortSignal as any).timeout(
      this.timeoutMillis
    );
    const body = JSON.stringify(serviceRequest);

    const promise = fetch(this.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...this.headers,
      },
      body,
      signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new OTLPExporterError(res.statusText, res.status);
        }
      })
      .catch((e) => {
        throw new OTLPExporterError((e as Error).message);
      });

    this._sendingPromises.push(promise);
    return promise;
  }

  /**
   * Shutdown the exporter.
   */
  shutdown(): Promise<void> {
    throw new Error("Shutdown is not supported by this exporter.");
  }

  abstract convert(objects: ExportItem[]): ServiceRequest;
  abstract getUrl(urlBase: string): string;
}

const DEFAULT_COLLECTOR_RESOURCE_PATH = "v1/traces";

export interface OTLPJsonTraceExporterConfig
  extends OTLPCloudflareExporterBaseConfig {}
export class OTLPJsonTraceExporter extends OTLPCloudflareExporterBase<
  OTLPJsonTraceExporterConfig,
  ReadableSpan,
  IExportTraceServiceRequest
> {
  getUrl(url: string): string {
    return appendResourcePathToUrl(url, DEFAULT_COLLECTOR_RESOURCE_PATH);
  }
  convert(spans: ReadableSpan[]): IExportTraceServiceRequest {
    return createExportTraceServiceRequest(spans, true);
  }
}

export class EventSpanProcessor implements SpanProcessor {
  private spans = new Set<ReadableSpan>();

  constructor(private exporter: SpanExporter) {}

  forceFlush(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.exporter.export(Array.from(this.spans), (result) => {
        if (result.code === ExportResultCode.SUCCESS) {
          this.spans.clear();
          resolve();
        } else {
          reject(result.error);
        }
      });
    });
  }
  onStart(_: Span, __: Context): void {}
  onEnd(span: ReadableSpan): void {
    this.spans.add(span);
  }
  shutdown(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
