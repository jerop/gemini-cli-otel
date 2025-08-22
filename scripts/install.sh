# Move install.sh to scripts/install.sh
#!/bin/bash

# OpenTelemetry Extension Installer for Gemini CLI
# Usage: curl -fsSL https://raw.githubusercontent.com/jerop/gemini-cli-otel/main/scripts/install.sh | bash
# Or: bash <(curl -fsSL https://raw.githubusercontent.com/jerop/gemini-cli-otel/main/scripts/install.sh)

set -e

EXTENSION_NAME="otel"
GEMINI_EXTENSIONS_DIR="$(pwd)/.gemini/extensions"
EXTENSION_DIR="$GEMINI_EXTENSIONS_DIR/$EXTENSION_NAME"
REPO_URL="${REPO_URL:-https://github.com/jerop/gemini-cli-otel.git}"

echo "🚀 Installing Gemini CLI OpenTelemetry Extension..."

# Create extensions directory if it doesn't exist
mkdir -p "$GEMINI_EXTENSIONS_DIR"

# Clone or download the extension
if command -v git >/dev/null 2>&1; then
	echo "📦 Cloning extension repository..."
	if [ -d "$EXTENSION_DIR" ]; then
		echo "🔄 Extension already exists, updating..."
		cd "$EXTENSION_DIR"
		git pull
	else
		git clone "$REPO_URL" "$EXTENSION_DIR"
	fi
else
	echo "📦 Downloading extension archive..."
	TEMP_DIR=$(mktemp -d)
	cd "$TEMP_DIR"
    
	# Extract repo name from URL for archive download
	REPO_NAME=$(basename "$REPO_URL" .git)
	ARCHIVE_URL="${REPO_URL%%.git}/archive/main.tar.gz"
    
	# Download and extract
	curl -fsSL "$ARCHIVE_URL" | tar -xz
    
	# Move to correct location
	rm -rf "$EXTENSION_DIR"
	mv "$REPO_NAME-main" "$EXTENSION_DIR"
    
	# Cleanup
	rm -rf "$TEMP_DIR"
fi

echo "✅ Extension installed successfully!"
echo ""
echo "🎯 Available commands:"
echo "  /otel:status        - Check telemetry collector status"
echo "  /otel:start:gcp     - Start GCP telemetry collector"
echo "  /otel:start:local   - Start local telemetry collector"
echo "  /otel:stop          - Stop all telemetry collectors"
echo ""
echo "📖 For more information, see: $EXTENSION_DIR/README.md"
echo ""
echo "🔄 Restart Gemini CLI to load the extension."
