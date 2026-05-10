import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { loadSkillsFromSkillsDir } from './loadSkillsDir.ts'

function writeSkill(skillsDir: string, skillPath: string): void {
  const skillDir = join(skillsDir, ...skillPath.split('/'))
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(
    join(skillDir, 'SKILL.md'),
    `---\ndescription: ${skillPath}\n---\n# ${skillPath}\n`,
    'utf8',
  )
}

const tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('loads flat and nested skills with colon namespaces', async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'neocode-skills-'))
  tempDirs.push(tmpDir)
  const skillsDir = join(tmpDir, 'skills')
  mkdirSync(skillsDir, { recursive: true })

  writeSkill(skillsDir, 'flat-skill')
  writeSkill(skillsDir, 'git/commit')
  writeSkill(skillsDir, 'frontend/react/form')

  const results = await loadSkillsFromSkillsDir(skillsDir, 'userSettings')
  const promptSkills = results.map(r => r.skill).filter(s => s.type === 'prompt')
  const skillNames = promptSkills.map(s => s.name).sort()

  expect(skillNames).toEqual([
    'flat-skill',
    'frontend:react:form',
    'git:commit',
  ])

  const nestedSkill = promptSkills.find(s => s.name === 'git:commit')
  expect(nestedSkill).toBeDefined()
  expect(nestedSkill!.skillRoot).toBe(join(skillsDir, 'git', 'commit'))

  const deepSkill = promptSkills.find(s => s.name === 'frontend:react:form')
  expect(deepSkill).toBeDefined()
  expect(deepSkill!.skillRoot).toBe(
    join(skillsDir, 'frontend', 'react', 'form'),
  )
})
