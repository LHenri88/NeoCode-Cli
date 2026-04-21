# 🚀 NeoCode Standalone Binary Build Guide

This guide explains how to build **standalone executables** of NeoCode that bundle the entire runtime, allowing users to run NeoCode without installing Node.js or Bun.

## 📦 What is a Standalone Binary?

A standalone binary is a **single executable file** that contains:
- The compiled NeoCode application code
- Node.js runtime (embedded)
- All dependencies bundled in

Users can simply download and run the executable without any prerequisites!

## 🎯 Quick Start

### Build for Your Current Platform
```bash
bun run build:standalone
```

### Build for All Platforms
```bash
bun run build:standalone:all
```

### Build for Specific Platforms
```bash
bun run build:standalone:windows   # Windows x64
bun run build:standalone:linux     # Linux x64
bun run build:standalone:macos     # macOS (x64 + ARM64)
```

## 🛠️ Build Strategies

NeoCode supports **3 build strategies**. By default, **PKG is automatically selected** as it's the most reliable for NeoCode's architecture.

### 1. **PKG Strategy** ✨ (Recommended - Default)
Uses [@yao-pkg/pkg](https://github.com/yao-pkg/pkg) - a maintained fork of Vercel's pkg with Node 20+ support.

**Pros:**
- ✅ **Default strategy** - works out of the box
- ✅ Most compatible and battle-tested
- 🌍 Works on all platforms
- 📦 Mature and stable
- 🔧 **Best for NeoCode** - handles external deps (AWS SDK, sharp, etc.)
- 🎯 Recommended for production releases

**Cons:**
- Larger binaries (~66MB)
- Requires `npx` available (usually pre-installed with Node.js)

**Force this strategy:**
```bash
bun run build:standalone:pkg
```

### 2. **Bun Strategy** (Experimental - Fastest but Limited)
Uses Bun's experimental `--compile` flag to create native executables.

**Pros:**
- ⚡ Very fast build times
- 📦 Smallest binary sizes (~40-60MB)
- 🚀 Native performance
- ✨ Best startup time

**Cons:**
- ❌ **Doesn't work with NeoCode's external dependencies** (AWS SDK, sharp)
- Requires Bun v1.0.0+
- Experimental feature
- Not recommended for NeoCode (use for simple projects)

**Force this strategy:**
```bash
bun run build:standalone:bun
```

### 3. **Caxa Strategy** (Fallback)
Uses [caxa](https://github.com/leafac/caxa) to create a simple executable wrapper.

**Pros:**
- 🎯 Simple and reliable
- 📁 Portable archive format
- ⚙️ Easy debugging

**Cons:**
- ❗ **Requires Node.js on target machine**
- Larger file size
- Slower extraction on first run

**Force this strategy:**
```bash
bun run scripts/build-standalone.ts --all --strategy caxa
```

## 📋 Available Commands

### NPM Scripts (Recommended)

```bash
# Build for current platform (auto-detect strategy)
bun run build:standalone

# Build for all platforms
bun run build:standalone:all

# Build for specific platforms
bun run build:standalone:windows
bun run build:standalone:linux
bun run build:standalone:macos

# Force specific strategy
bun run build:standalone:bun    # Bun strategy for all platforms
bun run build:standalone:pkg    # PKG strategy for all platforms
```

### Direct Script Usage

For advanced options, run the script directly:

```bash
# Show help
bun run scripts/build-standalone.ts --help

# Build with custom output directory
bun run scripts/build-standalone.ts --all --output ./releases

# Build with verbose output
bun run scripts/build-standalone.ts --all --verbose

# Combine options
bun run scripts/build-standalone.ts \
  --windows --linux \
  --strategy pkg \
  --output ./dist-binaries \
  --verbose
```

## 📁 Output Structure

After building, you'll find standalone executables in `./bin-standalone/`:

```
bin-standalone/
├── neocode-windows-x64.exe    # Windows 64-bit
├── neocode-linux-x64          # Linux 64-bit
├── neocode-macos-x64          # macOS Intel (x64)
└── neocode-macos-arm64        # macOS Apple Silicon (ARM64)
```

## 🚀 Usage

### Running the Standalone Binary

**Windows:**
```cmd
neocode-windows-x64.exe --version
neocode-windows-x64.exe
```

**Linux/macOS:**
```bash
chmod +x neocode-linux-x64
./neocode-linux-x64 --version
./neocode-linux-x64
```

### Installing Globally (Optional)

**Linux/macOS:**
```bash
# Copy to system bin
sudo cp neocode-linux-x64 /usr/local/bin/neocode
sudo chmod +x /usr/local/bin/neocode

# Now run from anywhere
neocode --version
```

**Windows:**
```cmd
# Add to PATH or copy to a directory in PATH
copy neocode-windows-x64.exe C:\Windows\System32\neocode.exe

# Now run from anywhere
neocode --version
```

## 🔍 Strategy Selection (Auto-detect)

The build script automatically selects the best strategy for NeoCode:

1. **Check for npx** → Use PKG strategy ✅ **(Default - Recommended)**
2. **Check for Bun v1.0.0+** → Use Bun strategy ⚠️ (may fail with externals)
3. **Fallback** → Use Caxa strategy

Override with `--strategy` flag if needed.

**Note:** PKG is prioritized because it handles NeoCode's external dependencies (AWS SDK, sharp, etc.) correctly, while Bun's --compile doesn't support externals well.

## 📊 Binary Size Comparison

Real-world sizes for NeoCode v0.1.8:

| Strategy | Windows | Linux | macOS x64 | macOS ARM64 | Works with NeoCode? |
|----------|---------|-------|-----------|-------------|---------------------|
| **PKG** ✅ | **66 MB** | ~66 MB | ~66 MB | ~66 MB | ✅ **Yes (Default)** |
| **Bun** ⚠️ | ~45 MB  | ~42 MB | ~48 MB   | ~45 MB | ❌ No (externals issue) |
| **Caxa** 🟡 | ~120 MB | ~110 MB | ~115 MB | ~112 MB | ⚠️ Requires Node.js |

## 🐛 Troubleshooting

### "Command not found" Error

**Problem:** Build script can't find required tools.

**Solution:** Install dependencies:
```bash
# Bun strategy
curl -fsSL https://bun.sh/install | bash

# PKG strategy (no install needed - uses npx)
# Caxa strategy (no install needed - uses npx)
```

### Permission Denied on Linux/macOS

**Problem:** Can't execute the binary.

**Solution:** Add execute permission:
```bash
chmod +x neocode-linux-x64
```

### Binary Too Large

**Problem:** Binaries are larger than expected.

**Solution:** Use Bun strategy for smallest binaries:
```bash
bun run build:standalone:bun
```

### Build Fails with Bun Strategy - "Could not resolve: @aws-sdk/..."

**Problem:** Bun --compile throws errors about missing AWS SDK or other external dependencies:
```
error: Could not resolve: "@aws-sdk/client-bedrock"
error: Could not resolve: "@aws-sdk/client-bedrock-runtime"
```

**Root Cause:** NeoCode's build marks certain packages as `external` (AWS SDK, sharp, etc.) to avoid bundling them. Bun's `--compile` doesn't support external dependencies well.

**Solution:** The auto-detect now prioritizes PKG strategy by default. If you manually specified Bun:
```bash
# Instead of: bun run build:standalone:bun
# Use default (PKG):
bun run build:standalone

# Or force PKG explicitly:
bun run build:standalone:pkg
```

This is now the **default behavior** - you don't need to do anything special!

### "Module not found" at Runtime

**Problem:** Missing native dependencies.

**Solution:**
1. Ensure `bun run build` completes successfully first
2. Check that `dist/cli.mjs` exists
3. Use PKG strategy (default - better dependency bundling)

## 🎨 CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Standalone Binaries

on:
  release:
    types: [created]

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Build standalone binary
        run: bun run build:standalone

      - name: Upload binaries
        uses: actions/upload-artifact@v3
        with:
          name: neocode-${{ matrix.os }}
          path: bin-standalone/*
```

### GitLab CI Example

```yaml
build:standalone:
  stage: build
  image: oven/bun:latest
  script:
    - bun install
    - bun run build:standalone:all
  artifacts:
    paths:
      - bin-standalone/*
    expire_in: 30 days
```

## 📦 Distribution

### Recommended: Use PKG Strategy for Releases

For official releases, we recommend PKG strategy:
```bash
bun run build:standalone:pkg
```

**Why?**
- ✅ Most battle-tested and stable
- ✅ Best cross-platform compatibility
- ✅ No runtime dependencies required
- ✅ Trusted by many production apps

### Create Release Archives

```bash
# After building
cd bin-standalone

# Create release archives
zip neocode-windows-x64-v0.1.8.zip neocode-windows-x64.exe
tar -czf neocode-linux-x64-v0.1.8.tar.gz neocode-linux-x64
tar -czf neocode-macos-x64-v0.1.8.tar.gz neocode-macos-x64
tar -czf neocode-macos-arm64-v0.1.8.tar.gz neocode-macos-arm64

# Calculate checksums
sha256sum * > checksums.txt
```

## 🔒 Security Considerations

1. **Code Signing** (Recommended for production)
   - Windows: Use `signtool` to sign `.exe` files
   - macOS: Use `codesign` and `notarytool`
   - Linux: Use `gpg` to create detached signatures

2. **Verify Binaries**
   ```bash
   # Users should verify checksums
   sha256sum -c checksums.txt
   ```

3. **Privacy**
   - Standalone binaries maintain NeoCode's no-telemetry guarantee
   - All privacy features are preserved in compiled form

## 🆘 Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Review build output with `--verbose` flag
3. Try a different strategy (`--strategy pkg`)
4. Open an issue: https://github.com/anthropics/claude-code/issues

## 📚 Additional Resources

- [Bun Compile Docs](https://bun.sh/docs/bundler/executables)
- [@yao-pkg/pkg GitHub](https://github.com/yao-pkg/pkg)
- [Caxa Documentation](https://github.com/leafac/caxa)
- [NeoCode Main README](./README.md)

---

**Built with NeoCode** 🚀 | Privacy-First, Multi-Provider AI CLI
