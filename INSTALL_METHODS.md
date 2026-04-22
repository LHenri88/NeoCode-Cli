# NeoCode Installation Methods

Quick reference for all supported installation methods for NeoCode CLI.

---

## 🚀 Quick Install (Recommended)

### 1. npm Global (Official Package)

```bash
npm install -g @neocode/cli
```

**Verify:**
```bash
neocode --version
```

---

## 📦 Alternative Installation Methods

### 2. GitHub Direct Install

Install directly from GitHub repository (bypasses npm):

```bash
npm install -g https://gitlawb.com/z6MkqDnb7Siv3Cwj7pGJq4T5EsUisECqR8KpnDLwcaZq5TPr/neocode
```

Or from GitHub mirror:
```bash
npm install -g https://github.com/LHenri88/NeoCode
```

**Benefits:**
- No npm registry required
- Always get latest from main branch
- Bypass npm 2FA issues

---

### 3. Scripted Install (macOS/Linux)

One-line installer that handles all dependencies:

```bash
curl -fsSL https://raw.githubusercontent.com/LHenri88/NeoCode/main/scripts/install.sh | bash
```

**What it does:**
- Checks Node.js version (installs if needed)
- Installs Bun (optional, faster startup)
- Offers to install Ollama (local AI)
- Installs NeoCode globally
- Pulls recommended AI model (qwen2.5-coder:7b)

**Environment Variables:**
```bash
# Install specific version
export NEOCODE_VERSION=0.1.8
curl -fsSL https://raw.githubusercontent.com/LHenri88/NeoCode/main/scripts/install.sh | bash

# Custom install directory
export INSTALL_DIR=$HOME/.local/bin
curl -fsSL https://raw.githubusercontent.com/LHenri88/NeoCode/main/scripts/install.sh | bash
```

---

### 4. Scripted Install (Windows)

PowerShell installer for Windows 10/11:

```powershell
irm https://raw.githubusercontent.com/LHenri88/NeoCode/main/scripts/install.ps1 | iex
```

**What it does:**
- Checks Node.js version (uses winget to install if needed)
- Offers to install Ollama via winget
- Installs NeoCode globally
- Pulls recommended AI model

**Custom version:**
```powershell
$env:NEOCODE_VERSION = "0.1.8"
irm https://raw.githubusercontent.com/LHenri88/NeoCode/main/scripts/install.ps1 | iex
```

---

### 5. Local Development Install

Clone and build from source:

```bash
# Clone repository
git clone https://gitlawb.com/z6MkqDnb7Siv3Cwj7pGJq4T5EsUisECqR8KpnDLwcaZq5TPr/neocode.git
cd neocode

# Install dependencies
bun install
# or: npm install

# Build
bun run build
# or: npm run build

# Link globally
bun link
# or: npm link

# Verify
neocode --version
```

**For development:**
```bash
# Run without building
bun run dev

# Run with auto-reload
bun --watch src/entrypoints/cli.tsx

# Run tests
bun test
```

---

### 6. Bun Install (Fast Alternative)

If you have Bun installed:

```bash
bun install -g @neocode/cli
```

**Benefits:**
- Faster installation
- Faster package resolution
- Built-in test runner

---

### 7. pnpm Install

If you prefer pnpm:

```bash
pnpm install -g @neocode/cli
```

---

### 8. Yarn Install

If you prefer Yarn:

```bash
yarn global add @neocode/cli
```

---

## 🔧 Post-Installation Setup

### Configure AI Provider

After installation, configure your AI provider:

#### Option A: Interactive Setup (Recommended)

```bash
neocode
```

Then inside NeoCode:
```
/provider
```

Follow prompts to select provider and enter API key.

#### Option B: Environment Variables

**OpenAI:**
```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_MODEL=gpt-4o
```

**Ollama (Local):**
```bash
export CLAUDE_CODE_USE_OPENAI=1
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=qwen2.5-coder:7b
```

**Gemini:**
```bash
export GEMINI_API_KEY=your-key-here
export GEMINI_MODEL=gemini-2.0-flash-exp
```

#### Option C: Profile File

Create `.neocode-profile.json` in your project:

```json
{
  "provider": "ollama",
  "baseURL": "http://localhost:11434/v1",
  "model": "qwen2.5-coder:7b",
  "apiKey": ""
}
```

---

## 🩺 Verify Installation

### 1. Check Version
```bash
neocode --version
```

### 2. Run Diagnostics
```bash
neocode
```

Inside NeoCode:
```
/doctor
```

This checks:
- Node.js version
- Dependencies (ripgrep)
- Provider configuration
- Network connectivity

### 3. Test Query
```
Tell me about NeoCode's features
```

If you see a streaming response, installation is successful!

---

## 🐛 Troubleshooting

### "neocode: command not found"

**macOS/Linux:**
```bash
echo 'export PATH="$PATH:$(npm config get prefix)/bin"' >> ~/.bashrc
source ~/.bashrc
```

**Windows:**
```powershell
$env:PATH += ";$(npm config get prefix)"
```

Or restart your terminal.

### "ripgrep not found"

Install ripgrep:

**macOS:**
```bash
brew install ripgrep
```

**Windows:**
```powershell
winget install BurntSushi.ripgrep.MSVC
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install ripgrep
```

### "OPENAI_API_KEY is required"

Run `/provider` inside NeoCode to configure your AI provider.

### "Failed to connect to Ollama"

Start Ollama service:
```bash
ollama serve
```

Then in a new terminal:
```bash
neocode
```

### npm 403 Error (Publishing Only)

If you're trying to **publish** to npm and get a 403 error:

**Error:**
```
npm error 403 Forbidden - Two-factor authentication required
```

**Solutions:**

1. **Create automation token:**
   ```bash
   npm login
   npm token create --type=automation
   ```

2. **Use token:**
   ```bash
   npm publish --otp=<token>
   ```

3. **Or use authenticator app** (not USB key):
   - Setup 2FA in npmjs.com settings
   - Choose "Authenticator App"
   - Get OTP code from app
   ```bash
   npm publish --otp=<6-digit-code>
   ```

**Note:** This only affects package maintainers publishing to npm. Regular users can install without any authentication.

---

## 📚 Next Steps

After successful installation:

1. **Read the [User Guide](docs/USER_GUIDE.md)** - Learn NeoCode basics
2. **Explore [Commands](docs/COMMANDS.md)** - Discover slash commands
3. **Check [Installation Guide](docs/INSTALLATION.md)** - Detailed setup instructions
4. **Join [Community](https://github.com/LHenri88/NeoCode/discussions)** - Get help and share

---

## 🔗 Quick Links

- **Documentation:** [docs/](docs/)
- **GitHub Issues:** https://github.com/LHenri88/NeoCode/issues
- **Discussions:** https://github.com/LHenri88/NeoCode/discussions
- **Security:** [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)

---

## 📝 For Package Maintainers

### Publishing to npm

**Prerequisites:**
- npm account with publish access to `@neocode/cli`
- 2FA enabled (authenticator app or automation token)

**Steps:**

1. **Update version:**
   ```bash
   npm version patch  # or minor, major
   ```

2. **Build and verify:**
   ```bash
   bun run build:verified
   bun run smoke
   ```

3. **Publish:**
   ```bash
   npm publish --otp=<code-or-token>
   ```

**Or use GitHub Actions:**

Push a version tag:
```bash
git tag v0.1.9
git push origin v0.1.9
```

Workflow `.github/workflows/release.yml` will automatically:
- Run tests
- Build package
- Publish to npm (using `NPM_TOKEN` secret)

---

**Need Help?** Open an issue: https://github.com/LHenri88/NeoCode/issues
