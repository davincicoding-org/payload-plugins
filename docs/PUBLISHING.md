# Publishing

This monorepo uses [Changesets](https://github.com/changesets/changesets) for versioning and [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC) for tokenless CI publishing via GitHub Actions.

## How releases work

1. A contributor runs `pnpm release` to create a changeset file, commits it, and opens a PR.
2. Once the PR is merged to `main`, the [Changesets GitHub Action](../.github/workflows/release.yaml) detects pending changesets and opens a **"Version Packages"** PR that bumps versions and updates changelogs.
3. When the version PR is merged, the action builds all packages and publishes them to npm using OIDC — no tokens required.

## First-time setup for a new package

npm trusted publishing requires the package to already exist on the registry. For a brand new package, you must do a **one-time manual publish** from your local machine:

```sh
npm login
cd packages/<directory>
pnpm build
npm publish --access public
```

Then configure trusted publishing on npmjs.com:

1. Go to **npmjs.com** > your package > **Settings** > **Trusted Publisher**
2. Select **GitHub Actions** and fill in:
   - **Organization or user**: `davincicoding-org`
   - **Repository**: `payload-plugins`
   - **Workflow filename**: `release.yaml`
3. Click **Set up connection**

After this, all future publishes are handled automatically by CI via OIDC.

