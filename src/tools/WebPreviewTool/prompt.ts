export const WEB_PREVIEW_TOOL_NAME = 'WebPreview'

export const DESCRIPTION = `Manages a local web development server and browser preview for the current project.

Actions:
- \`start\` — Detect the framework, start the dev server, and optionally open the browser
- \`stop\`  — Terminate the running dev server
- \`status\` — Return the current server state (running, port, URL, recent logs)
- \`open_browser\` — Open the preview URL in the user's default browser

Key behaviours:
- Auto-detects framework (Next.js, Vite, Astro, Remix, SvelteKit, CRA, etc.) from package.json
- Auto-detects the IDE (VS Code, Cursor, Windsurf, etc.) from environment variables
- Captures dev server stdout/stderr and surfaces errors back to the agent
- Requires user confirmation before opening the browser for the first time
- Zero external service dependencies — everything runs locally`
