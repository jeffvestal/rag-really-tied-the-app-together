// instrumentation.js
console.log('Initializing Elastic OpenTelemetry...');

// Elastic OTel instrumentation
require('@elastic/opentelemetry-node');

// Initialize  OTLP logging
require("./otel-logs.js");
console.log("OTEL_EXPORTER_OTLP_ENDPOINT:", process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
console.log("OTEL_EXPORTER_OTLP_HEADERS:", process.env.OTEL_EXPORTER_OTLP_HEADERS);
