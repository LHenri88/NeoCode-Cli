/**
 * /computer-use command — enable, disable, or inspect Computer Use.
 *
 * Usage:
 *   /computer-use           — show status
 *   /computer-use on        — enable for this session (sets env flag)
 *   /computer-use off       — disable
 *   /computer-use status    — show platform capabilities
 */

import type { LocalCommandCall } from '../../types/command.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { getChicagoEnabled } from '../../utils/computerUse/gates.js'

function getPlatformCapabilities(): { platform: string; screenshot: boolean; mouse: boolean; keyboard: boolean } {
  const p = process.platform
  return {
    platform: p,
    screenshot: p === 'darwin' || p === 'win32' || p === 'linux',
    mouse: p === 'darwin' || p === 'linux',
    keyboard: p === 'darwin' || p === 'linux',
  }
}

function getEnableHint(): string {
  const p = process.platform
  if (p === 'darwin') return 'Full Computer Use available (screenshot + mouse + keyboard via native Swift/Rust modules).'
  if (p === 'win32') return 'Screenshot available via PowerShell. Mouse/keyboard require xdotool (Linux only).'
  if (p === 'linux') return 'Full Computer Use available via xdotool + scrot.'
  return 'Platform not fully supported.'
}

export const call: LocalCommandCall = async (args, _ctx) => {
  const sub = (args ?? '').trim().toLowerCase()

  if (!sub || sub === 'status') {
    const enabled = getChicagoEnabled()
    const caps = getPlatformCapabilities()
    const envOverride = Boolean(process.env.COMPUTER_USE_ENABLED)
    const cfg = getGlobalConfig() as Record<string, unknown>
    const cfgEnabled = Boolean(cfg.computerUseEnabled)

    const lines = [
      `**Computer Use** — ${enabled ? '✅ enabled' : '⬜ disabled'}`,
      '',
      `Platform: \`${caps.platform}\``,
      `  Screenshot: ${caps.screenshot ? '✅' : '❌'}`,
      `  Mouse control: ${caps.mouse ? '✅' : '❌'}`,
      `  Keyboard control: ${caps.keyboard ? '✅' : '❌'}`,
      '',
    ]

    if (envOverride) {
      lines.push('Enabled via `COMPUTER_USE_ENABLED=1` env variable.')
    } else if (cfgEnabled) {
      lines.push('Enabled via global config (`computerUseEnabled: true`).')
    } else {
      lines.push('Run `/computer-use on` to enable, or set `COMPUTER_USE_ENABLED=1`.')
    }

    lines.push('')
    lines.push(getEnableHint())

    return { type: 'text', value: lines.join('\n') }
  }

  if (sub === 'on' || sub === 'enable') {
    saveGlobalConfig(prev => ({
      ...(prev as Record<string, unknown>),
      computerUseEnabled: true,
    }))
    const caps = getPlatformCapabilities()
    const features = [
      caps.screenshot && 'Screenshot',
      caps.mouse && 'Mouse control',
      caps.keyboard && 'Keyboard control',
    ].filter(Boolean).join(', ')

    return {
      type: 'text',
      value:
        `Computer Use enabled ✅\n` +
        `Available on \`${process.platform}\`: ${features}\n\n` +
        `The AI can now see your screen and control the computer when you ask it to.\n` +
        `Each action will request your approval unless you enable yolo mode.`,
    }
  }

  if (sub === 'off' || sub === 'disable') {
    saveGlobalConfig(prev => {
      const p = prev as Record<string, unknown>
      const { computerUseEnabled: _cu, ...rest } = p
      return rest as typeof prev
    })
    return { type: 'text', value: 'Computer Use disabled.' }
  }

  return {
    type: 'text',
    value:
      'Usage:\n' +
      '  /computer-use           — show status\n' +
      '  /computer-use on        — enable\n' +
      '  /computer-use off       — disable\n' +
      '  /computer-use status    — detailed capabilities',
  }
}
