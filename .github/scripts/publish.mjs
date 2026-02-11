import { execSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const packagesDir = 'packages'
const dirs = readdirSync(packagesDir)
let hasFailure = false

for (const dir of dirs) {
  const pkgPath = join(packagesDir, dir, 'package.json')
  let pkgJson
  try {
    pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  } catch {
    continue
  }

  if (pkgJson.private) continue

  // Check if this version is already published
  try {
    const published = execSync(`npm view ${pkgJson.name} version 2>/dev/null`, {
      encoding: 'utf-8',
    }).trim()
    if (published === pkgJson.version) {
      console.log(`${pkgJson.name}@${pkgJson.version} — already published`)
      continue
    }
  } catch {
    // Package may not exist yet on npm — that's fine, publish it
  }

  console.log(`Publishing ${pkgJson.name}@${pkgJson.version}...`)
  try {
    execSync('npm publish --provenance --access public', {
      cwd: join(packagesDir, dir),
      stdio: 'inherit',
    })
    console.log(`${pkgJson.name}@${pkgJson.version} published`)
  } catch {
    console.error(`Failed to publish ${pkgJson.name}@${pkgJson.version}`)
    hasFailure = true
  }
}

if (hasFailure) process.exit(1)
