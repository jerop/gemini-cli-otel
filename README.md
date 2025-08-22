# 📊 Gemini CLI OpenTelemetry Extension

This extension provides seamless, background OpenTelemetry collection for Gemini
CLI sessions. It automatically downloads and manages the latest telemetry
collectors, supporting both Google Cloud Platform (GCP) and local file export,
with robust process management and cleanup.

For more details, see the Gemini CLI OpenTelemetry [documentation].

[documentation]: https://github.com/google-gemini/gemini-cli/blob/main/docs/telemetry.md

## 🚀 Features

- **Automatic background telemetry collection**
- **Zero Configuration**: Works out of the box from any repository
- **Dynamic Script Fetching**: Always uses the latest telemetry scripts from
  GitHub
- **Multiple Targets**: Support for both Google Cloud Platform and local file
  output
- **Process Management**: Easy start, stop, and status checking
- **Automatic Cleanup**: Handles process lifecycle and cleanup
- **Integration with Gemini CLI's existing telemetry infrastructure**

## 📋 Installation

### 📥 Install

```bash
curl -fsSL https://raw.githubusercontent.com/jerop/gemini-cli-otel/main/scripts/install.sh | bash
```

### 🗑️ Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/jerop/gemini-cli-otel/main/scripts/uninstall.sh | bash
```

### ✅ Prerequisites

- Authenticate with Google Cloud: `gcloud auth application-default login`
- Set `OTLP_GOOGLE_CLOUD_PROJECT` environment variable (if not passing project
  id as argument)
- Ensure your account has the necessary IAM permissions:
  - Cloud Trace Agent
  - Monitoring Metric Writer
  - Logs Writer

## 🔧 Usage & Commands

The extension provides several slash commands within Gemini CLI:

- `/otel:status` — Check if telemetry collectors are running
- `/otel:start:gcp [project-id]` — Start GCP OpenTelemetry collector in
  background (project id is optional; if omitted, the value is read from the
  `OTLP_GOOGLE_CLOUD_PROJECT` environment variable)
- `/otel:start:local [outfile]` — Start local file-based telemetry collector in
  background
- `/otel:stop` — Stop all running telemetry collectors

When collectors are running in the background, they will automatically collect
telemetry data from your Gemini CLI sessions.

### ⚡ Quickstarts

#### 🌐 GCP

1. In one Gemini CLI session, start the GCP telemetry collector 

```bash
/otel:start:gcp
```

1. Check collector status

```bash
/otel:status
```

1. Use Gemini CLI as usual in other sessions

```bash
> implement a snake game app
```

1. View logs and metrics in GCP logs and metrics explorer

#### 💾 Local

1. In one Gemini CLI session, start the local telemetry collector

```bash
/otel:start:local telemetry.json
```

1. Check collector status

```bash
/otel:status
```

1. Use Gemini CLI as usual in other sessions

```bash
> implement a snake game app
```

1. View the OTEL logs and metrics in `telemetry.json` file.

### 📑 Viewing Collector Logs

Collector logs are written to your home directory:

- **GCP Collector Log:** `~/.gemini/tmp/telemetry-pids/gcp-telemetry.log`
- **Local Collector Log:** `~/.gemini/tmp/telemetry-pids/local-telemetry.log`

To view the collector logs, run:

```bash
tail -f ~/.gemini/tmp/telemetry-pids/gcp-telemetry.log
```

```bash
tail -f ~/.gemini/tmp/telemetry-pids/local-telemetry.log
```

## 🔄 How It Works

1. **Command Execution**: User runs a `/otel:` command
2. **Script Download**: Extension downloads latest scripts from GitHub
3. **Process Launch**: Collector starts as detached background process
4. **Settings Update**: Workspace settings are updated automatically
5. **Data Collection**: Telemetry data flows from Gemini CLI to collector
6. **Data Export**: Collector exports to chosen target (GCP/local/file)

## 📈 Use Cases

- **Development**: Monitor Gemini CLI usage patterns locally
- **Production**: Export telemetry to Google Cloud for analysis
- **Debugging**: Capture detailed traces and logs for troubleshooting
- **Analytics**: Understand tool usage across development teams
- **Performance**: Monitor response times and resource usage

## 💡 Best Practices

- Use local collector for development and debugging.
- Use GCP collector for production or team-wide analysis.
- Always check collector logs for troubleshooting.
