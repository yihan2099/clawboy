#!/bin/bash
#
# Pact Skill Installer for OpenClaw
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/pact/pact/main/packages/pact-skill/install.sh | bash
#
# Or manually:
#   ./install.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "  ____            _              _   _      _                      _    "
echo "   _____ _                _                 "
echo "  / ____| |              | |                "
echo " | |    | | __ ___      _| |__   ___  _   _ "
echo " | |    | |/ _\` \ \ /\ / / '_ \ / _ \| | | |"
echo " | |____| | (_| |\ V  V /| |_) | (_) | |_| |"
echo "  \_____|_|\__,_| \_/\_/ |_.__/ \___/ \__, |"
echo "                                       __/ |"
echo "                                      |___/ "
echo -e "${NC}"
echo ""
echo "Pact Skill Installer for OpenClaw"
echo "============================================"
echo ""

# Detect package manager
detect_package_manager() {
    if command -v bun &> /dev/null; then
        echo "bun"
    elif command -v pnpm &> /dev/null; then
        echo "pnpm"
    elif command -v yarn &> /dev/null; then
        echo "yarn"
    elif command -v npm &> /dev/null; then
        echo "npm"
    else
        echo "none"
    fi
}

# Get OpenClaw workspace directory
get_openclaw_workspace() {
    if [ -d "$HOME/.openclaw/workspace/skills" ]; then
        echo "$HOME/.openclaw/workspace/skills"
    elif [ -d "$HOME/.moltbot/workspace/skills" ]; then
        echo "$HOME/.moltbot/workspace/skills"
    elif [ -d "$HOME/.clawdbot/workspace/skills" ]; then
        echo "$HOME/.clawdbot/workspace/skills"
    else
        echo ""
    fi
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}Error: Node.js 20+ is required. Found v${NODE_VERSION}${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Detect package manager
PKG_MANAGER=$(detect_package_manager)
if [ "$PKG_MANAGER" = "none" ]; then
    echo -e "${RED}Error: No package manager found. Install npm, yarn, pnpm, or bun.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Package manager: ${PKG_MANAGER}${NC}"

# Check OpenClaw installation
SKILLS_DIR=$(get_openclaw_workspace)
if [ -z "$SKILLS_DIR" ]; then
    echo -e "${YELLOW}Warning: OpenClaw workspace not found.${NC}"
    echo "Creating skills directory at ~/.openclaw/workspace/skills"
    SKILLS_DIR="$HOME/.openclaw/workspace/skills"
    mkdir -p "$SKILLS_DIR"
fi
echo -e "${GREEN}✓ Skills directory: ${SKILLS_DIR}${NC}"

echo ""
echo -e "${YELLOW}Installing Pact skill...${NC}"

# Create skill directory
PACT_SKILL_DIR="$SKILLS_DIR/pact"
mkdir -p "$PACT_SKILL_DIR"

# Install the package
cd "$PACT_SKILL_DIR"

# Initialize package.json if needed
if [ ! -f "package.json" ]; then
    echo '{"name": "pact-skill", "type": "module"}' > package.json
fi

# Install Pact packages
echo "Installing @pactprotocol/pact-skill..."
case $PKG_MANAGER in
    bun)
        bun add @pactprotocol/pact-skill
        ;;
    pnpm)
        pnpm add @pactprotocol/pact-skill
        ;;
    yarn)
        yarn add @pactprotocol/pact-skill
        ;;
    npm)
        npm install @pactprotocol/pact-skill
        ;;
esac

# Copy SKILL.md to skill directory
if [ -f "node_modules/@pactprotocol/pact-skill/SKILL.md" ]; then
    cp node_modules/@pactprotocol/pact-skill/SKILL.md ./SKILL.md
fi

echo ""
echo -e "${GREEN}✓ Pact skill installed successfully!${NC}"
echo ""

# Configuration prompt
echo -e "${YELLOW}Configuration${NC}"
echo "============="
echo ""
echo "To use Pact, you need to configure your wallet."
echo ""
echo "Option 1: Add to ~/.openclaw/openclaw.json:"
echo ""
echo -e "${BLUE}{"
echo '  "skills": {'
echo '    "entries": {'
echo '      "pact": {'
echo '        "enabled": true,'
echo '        "env": {'
echo '          "PACT_WALLET_PRIVATE_KEY": "0x...",'
echo '          "PACT_SERVER_URL": "https://mcp.pact.io"'
echo '        }'
echo '      }'
echo '    }'
echo '  }'
echo -e "}${NC}"
echo ""
echo "Option 2: Set environment variables:"
echo ""
echo -e "${BLUE}export PACT_WALLET_PRIVATE_KEY=\"0x...\"${NC}"
echo -e "${BLUE}export PACT_SERVER_URL=\"https://mcp.pact.io\"${NC}"
echo ""
echo -e "${YELLOW}Security Note:${NC}"
echo "- Use a dedicated agent wallet, not your main wallet"
echo "- Only fund it with what you're willing to risk"
echo "- Never share your private key"
echo ""
echo -e "${GREEN}Setup complete! Restart OpenClaw to load the skill.${NC}"
echo ""
echo "Quick start:"
echo "  1. Tell your agent: \"List open tasks on Pact\""
echo "  2. Or use CLI: pact list-tasks --status open"
echo ""
echo "Documentation: https://docs.pact.io"
echo "Support: https://github.com/pact/pact/issues"
