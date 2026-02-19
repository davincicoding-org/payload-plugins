import { execSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const packagesDirs = ['packages', 'plugins']
let hasFailure = false

// Collect all publishable packages first, then sort by workspace dependencies
// so that dependencies are published before the packages that depend on them.
const entries = []

for (const packagesDir of packagesDirs) {
  let dirs
  try {
    dirs = readdirSync(packagesDir)
  } catch {
    continue
  }

  for (const dir of dirs) {
    const pkgPath = join(packagesDir, dir, 'package.json')
    let pkgJson
    try {
      pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    } catch {
      continue
    }

    if (pkgJson.private) continue
    entries.push({ dir: join(packagesDir, dir), pkgJson })
  }
}

// Topological sort: packages with no workspace deps first
entries.sort((a, b) => {
  const aDeps = Object.keys({ ...a.pkgJson.dependencies, ...a.pkgJson.devDependencies })
  const bDeps = Object.keys({ ...b.pkgJson.dependencies, ...b.pkgJson.devDependencies })
  const aDependsOnB = aDeps.some((d) => d === b.pkgJson.name)
  const bDependsOnA = bDeps.some((d) => d === a.pkgJson.name)
  if (aDependsOnB) return 1
  if (bDependsOnA) return -1
  return 0
})

for (const { dir, pkgJson } of entries) {
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
    execSync('pnpm publish --no-git-checks --provenance --access public', {
      cwd: dir,
      stdio: 'inherit',
    })
    console.log(`${pkgJson.name}@${pkgJson.version} published`)
  } catch {
    console.error(`Failed to publish ${pkgJson.name}@${pkgJson.version}`)
    hasFailure = true
  }
}

if (hasFailure) process.exit(1)
