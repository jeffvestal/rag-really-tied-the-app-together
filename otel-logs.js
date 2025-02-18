// otel-logs.js
const { LoggerProvider, BatchLogRecordProcessor } = require("@opentelemetry/sdk-logs");
const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-grpc");
const { credentials } = require("@grpc/grpc-js");
const { Resource } = require("@opentelemetry/resources");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");
const { ConsoleLogRecordExporter } = require("@opentelemetry/sdk-logs");

// 1. Define the resource
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: "rag-ties-the-app-together-frontend",
  [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
});

// 2. Create a LoggerProvider
const loggerProvider = new LoggerProvider({ resource });

// 3. Create an OTLP/gRPC exporter.
//    This will read environment variables like:
//      OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
//      OTEL_EXPORTER_OTLP_HEADERS
//      OTEL_EXPORTER_OTLP_PROTOCOL (should be 'grpc')
const otlpLogExporter = new OTLPLogExporter({
  // If your endpoint requires TLS, provide gRPC credentials:
  credentials: credentials.createSsl(),

  // Or set a specific URL if needed:
  // url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
});

// 4. Add a batch processor for logs
loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(otlpLogExporter));

// (Optional) Also log to console
loggerProvider.addLogRecordProcessor(
  new BatchLogRecordProcessor(new ConsoleLogRecordExporter())
);

exports.otelLogger = loggerProvider.getLogger("default");


// SeverityNumber references (commonly used):
// 1 = TRACE
// 5 = DEBUG
// 9 = INFO
// 13 = WARN
// 17 = ERROR
// 21 = FATAL