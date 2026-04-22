#!/usr/bin/env bash
#
# NeoCode Standalone Binary Installer
# Quick install script for Linux/macOS
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Gitlawb/NeoCode/main/install-standalone.sh | bash
#   or
#   wget -qO- https://raw.githubusercontent.com/Gitlawb/NeoCode/main/install-standalone.sh | bash
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO="Gitlawb/NeoCode"
INSTALL_DIR="$HOME/.local/bin"
BINARY_NAME="neocode"

# Detect OS and Architecture
detect_platform() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch=$(uname -m)

    case "$os" in
        linux*)
            OS="linux"
            ;;
        darwin*)
            OS="macos"
            ;;
        *)
            echo -e "${RED}Error: Unsupported operating system: $os${NC}"
            exit 1
            ;;
    esac

    case "$arch" in
        x86_64|amd64)
            ARCH="x64"
            ;;
        arm64|aarch64)
            ARCH="arm64"
            ;;
        *)
            echo -e "${RED}Error: Unsupported architecture: $arch${NC}"
            exit 1
            ;;
    esac

    echo -e "${BLUE}Detected platform: $OS-$ARCH${NC}"
}

# Get latest release version
get_latest_version() {
    echo -e "${BLUE}Fetching latest release...${NC}"
    LATEST_VERSION=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')

    if [ -z "$LATEST_VERSION" ]; then
        echo -e "${RED}Error: Could not fetch latest version${NC}"
        exit 1
    fi

    echo -e "${GREEN}Latest version: $LATEST_VERSION${NC}"
}

# Construct download URL
get_download_url() {
    if [ "$OS" = "macos" ]; then
        # macOS has separate x64 and arm64 binaries
        BINARY_FILE="neocode-macos-$ARCH"
    else
        # Linux
        BINARY_FILE="neocode-linux-$ARCH"
    fi

    DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST_VERSION/$BINARY_FILE"
    echo -e "${BLUE}Download URL: $DOWNLOAD_URL${NC}"
}

# Download binary
download_binary() {
    echo -e "${BLUE}Downloading NeoCode standalone binary...${NC}"

    local temp_file="/tmp/$BINARY_FILE"

    if command -v curl &> /dev/null; then
        curl -fsSL "$DOWNLOAD_URL" -o "$temp_file"
    elif command -v wget &> /dev/null; then
        wget -q "$DOWNLOAD_URL" -O "$temp_file"
    else
        echo -e "${RED}Error: curl or wget is required${NC}"
        exit 1
    fi

    if [ ! -f "$temp_file" ]; then
        echo -e "${RED}Error: Download failed${NC}"
        exit 1
    fi

    echo -e "${GREEN}Download complete!${NC}"
    echo "$temp_file"
}

# Install binary
install_binary() {
    local temp_file="$1"

    echo -e "${BLUE}Installing to $INSTALL_DIR/$BINARY_NAME...${NC}"

    # Create install directory if it doesn't exist
    mkdir -p "$INSTALL_DIR"

    # Move binary to install location
    mv "$temp_file" "$INSTALL_DIR/$BINARY_NAME"

    # Make executable
    chmod +x "$INSTALL_DIR/$BINARY_NAME"

    echo -e "${GREEN}Installation complete!${NC}"
}

# Check if install directory is in PATH
check_path() {
    if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
        echo -e "${YELLOW}Warning: $INSTALL_DIR is not in your PATH${NC}"
        echo -e "${YELLOW}Add this to your shell configuration file (~/.bashrc, ~/.zshrc, etc.):${NC}"
        echo -e "${BLUE}export PATH=\"\$PATH:$INSTALL_DIR\"${NC}"
        echo ""
        echo -e "${YELLOW}Or run NeoCode with the full path:${NC}"
        echo -e "${BLUE}$INSTALL_DIR/$BINARY_NAME${NC}"
    else
        echo -e "${GREEN}$INSTALL_DIR is already in your PATH${NC}"
    fi
}

# Test installation
test_installation() {
    echo -e "${BLUE}Testing installation...${NC}"

    if "$INSTALL_DIR/$BINARY_NAME" --version &> /dev/null; then
        local version=$("$INSTALL_DIR/$BINARY_NAME" --version)
        echo -e "${GREEN}✓ NeoCode installed successfully!${NC}"
        echo -e "${GREEN}Version: $version${NC}"
    else
        echo -e "${RED}Error: Installation test failed${NC}"
        exit 1
    fi
}

# Main installation flow
main() {
    echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  NeoCode Standalone Binary Installer         ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
    echo ""

    detect_platform
    get_latest_version
    get_download_url

    local temp_file=$(download_binary)
    install_binary "$temp_file"

    echo ""
    check_path

    echo ""
    test_installation

    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  Installation Complete!                      ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Run NeoCode with:${NC}"
    echo -e "${GREEN}  $BINARY_NAME${NC}"
    echo ""
    echo -e "${BLUE}For help:${NC}"
    echo -e "${GREEN}  $BINARY_NAME --help${NC}"
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo -e "${GREEN}  https://github.com/$REPO${NC}"
}

# Run installer
main "$@"
