#!/bin/bash
# ...existing code from uninstall.sh will be moved here...
#!/bin/bash

# OpenTelemetry Extension Uninstaller for Gemini CLI

set -e

EXTENSION_NAME="otel"
GEMINI_EXTENSIONS_DIR="$(pwd)/.gemini/extensions"
EXTENSION_DIR="$GEMINI_EXTENSIONS_DIR/$EXTENSION_NAME"
COLLECTOR_SCRIPT="$EXTENSION_DIR/scripts/telemetry-collector.js"

echo "🗑️  Uninstalling Gemini CLI OpenTelemetry Extension..."

# Stop any running collectors first
if [ -f "$COLLECTOR_SCRIPT" ]; then
	echo "🛑 Stopping any running telemetry collectors..."
	cd "$EXTENSION_DIR/scripts"
	node telemetry-collector.js stop 2>/dev/null || true
fi

# Remove extension directory
if [ -d "$EXTENSION_DIR" ]; then
	echo "📁 Removing extension files..."
	rm -rf "$EXTENSION_DIR"
	echo "✅ Extension uninstalled successfully!"
else
	echo "ℹ️  Extension not found at $EXTENSION_DIR"
fi

# Clean up any leftover processes or temp files
TEMP_DIR="$(pwd)/.gemini/tmp"
if [ -d "$TEMP_DIR/telemetry-pids" ]; then
	echo "🧹 Cleaning up temporary files..."
	rm -rf "$TEMP_DIR/telemetry-pids"
	rm -rf "$TEMP_DIR/telemetry-scripts"
fi

echo ""
echo "🔄 Restart Gemini CLI to complete the uninstall."
