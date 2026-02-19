# Publishing

This monorepo uses [Changesets](https://github.com/changesets/changesets) for versioning and [npm trusted publishing](https://docs.npmjs.com/generating-provenance-statements#publishing-packages-with-provenance-via-github-actions) (OIDC) for CI publishing via GitHub Actions. No tokens or secrets are needed.

## How releases work

1. A contributor runs `pnpm release` to create a changeset file, commits it, and opens a PR.
2. Once the PR is merged to `main`, the [Changesets GitHub Action](../.github/workflows/ci.yaml) detects pending changesets and opens a **"Version Packages"** PR that bumps versions and updates changelogs.
3. When the version PR is merged, the action builds all packages and publishes them to npm via `pnpm -r publish`.

## Adding a new package

OIDC trusted publishing requires the package to already exist on the registry. For a brand new package:

1. Publish once from your local machine:
   ```sh
   npm login
   cd packages/<directory>
   pnpm build
   pnpm publish --access public
   ```
2. Configure trusted publishing on [npmjs.com](https://npmjs.com):
   - Go to the package > **Settings** > **Trusted Publisher**
   - Select **GitHub Actions** and fill in:
     - **Repository owner**: `davincicoding-org`
     - **Repository**: `payload-plugins`
     - **Workflow filename**: `ci.yaml`
   - Click **Set up connection**

After this, all future publishes are handled automatically by CI.
