# OpenTelemetry in Gemini CLI 

OpenTelemetry (OTEL) is an open-source framework that standardizes how software is instrumented to generate and collect telemetry data (traces, metrics, logs). 

## Collectors

Collectors act as pipelines, receiving telemetry from the CLI and forwarding it to a destination.

- **Local Collector:** For development and debugging. Saves data to local files.
- **GCP Collector:** Sends telemetry to your Google Cloud project for long-term analysis and visualization (Cloud Trace, Monitoring, Logging).
