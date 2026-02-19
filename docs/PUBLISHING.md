# Publishing

This monorepo uses [Changesets](https://github.com/changesets/changesets) for versioning and [npm trusted publishing](https://docs.npmjs.com/generating-provenance-statements#publishing-packages-with-provenance-via-github-actions) (OIDC) for CI publishing via GitHub Actions.

## How releases work

1. A contributor runs `pnpm release` to create a changeset file, commits it, and opens a PR.
2. Once the PR is merged to `main`, the [Changesets GitHub Action](../.github/workflows/ci.yaml) detects pending changesets and opens a **"Version Packages"** PR that bumps versions and updates changelogs.
3. When the version PR is merged, the action builds all packages and publishes them to npm via `pnpm -r publish`.

## Setup

### GitHub App (required for CI)

A GitHub App token is used so that the Version Packages PR created by changesets triggers CI checks. PRs created by the default `GITHUB_TOKEN` [do not trigger workflows](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow).

1. [Create a GitHub App](https://github.com/organizations/davincicoding-org/settings/apps/new) in the org:
   - **Name**: `payload-plugins-ci` (or any name)
   - **Homepage URL**: the repo URL
   - **Permissions**:
     - Repository > **Contents**: Read and write
     - Repository > **Pull requests**: Read and write
   - **Webhook**: Uncheck "Active" (not needed)
   - Click **Create GitHub App**
2. On the app page, note the **App ID**
3. Generate a **private key** and download the `.pem` file
4. [Install the app](https://github.com/organizations/davincicoding-org/settings/installations) on the `payload-plugins` repository
5. Add repo secrets at `https://github.com/davincicoding-org/payload-plugins/settings/secrets/actions`:
   - `APP_ID` — the App ID from step 2
   - `APP_PRIVATE_KEY` — the full contents of the `.pem` file from step 3

### npm OIDC Trusted Publishing

Each package needs OIDC configured on npmjs.com. Configure trusted publishing at the package's **Settings > Trusted Publisher**:
- **Repository owner**: `davincicoding-org`
- **Repository**: `payload-plugins`
- **Workflow filename**: `ci.yaml`

## Adding a new package

OIDC trusted publishing requires the package to already exist on the registry. For a brand new package:

1. Publish once from your local machine:
   ```sh
   npm login
   cd packages/<directory>
   pnpm build
   pnpm publish --access public
   ```
2. Configure OIDC trusted publishing on npmjs.com (see above)

After this, all future publishes are handled automatically by CI.
