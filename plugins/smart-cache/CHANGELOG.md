# payload-smart-cache

## 1.1.9

### Patch Changes

- [#22](https://github.com/davincicoding-org/payload-plugins/pull/22) [`def5c00`](https://github.com/davincicoding-org/payload-plugins/commit/def5c0011fa733718249ea4fbfb929d8e221b108) Thanks [@michaelcamper](https://github.com/michaelcamper)! - fix: move @davincicoding/payload-plugin-kit from devDependencies to dependencies

  The plugin-kit package was listed as a devDependency but is imported at runtime.
  This caused "Module not found" errors for consumers after installing from npm,
  since devDependencies are not installed for published packages.

## 1.1.8

### Patch Changes

- Updated dependencies [[`1b4aa68`](https://github.com/davincicoding-org/payload-plugins/commit/1b4aa68bd191e2fc45d31ea4a417deb0b0975054)]:
  - @davincicoding/payload-utils@0.0.3

## 1.1.7

### Patch Changes

- Updated dependencies [[`eedd9c4`](https://github.com/davincicoding-org/payload-plugins/commit/eedd9c4085676c2c7c0dc9832feafadb7055caee)]:
  - @davincicoding/payload-utils@0.0.2

## 1.1.6

### Patch Changes

- [`d9c65b4`](https://github.com/davincicoding-org/payload-plugins/commit/d9c65b4790095247384d233522945d16418792bc) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Internall changes

## 1.1.5

### Patch Changes

- [`bc347db`](https://github.com/davincicoding-org/payload-plugins/commit/bc347db70f32bd24830bdb7cae25d7d477f0d4b5) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Strip declare module 'payload' augmentation from built payload-types.d.ts. Previously, each plugin shipped its own module augmentation with a partial Config, causing CollectionSlug to narrow to only the common subset when multiple plugins were installed together.

## 1.1.4

### Patch Changes

- [`9dd830b`](https://github.com/davincicoding-org/payload-plugins/commit/9dd830bab3dd401ae4f0814d2a05020dcb3fdaee) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Update docs

## 1.1.3

### Patch Changes

- [`b84e2a4`](https://github.com/davincicoding-org/payload-plugins/commit/b84e2a4d25a178207e79f379ec73e80a14d40928) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix request responses

## 1.1.2

### Patch Changes

- [`1740509`](https://github.com/davincicoding-org/payload-plugins/commit/17405099470100f5982d7834a13994ffa10f6e59) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix catalog: protocol leaking into published package.json — zod dependency now resolves to a real version

## 1.1.1

### Patch Changes

- [`a7772b9`](https://github.com/davincicoding-org/payload-plugins/commit/a7772b9b6fdf5ee0a4d8dd8d5adc48d998f4692b) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix @repo/common resolution error — common utilities are now bundled into the package

## 1.1.0

### Minor Changes

- [`4a33929`](https://github.com/davincicoding-org/payload-plugins/commit/4a3392949890b1f49a2e24695a0cf9874a211fea) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Change default collection behavior: only explicitly included collections are now cached (previously all collections were cached unless excluded). Add

## 1.0.1

### Patch Changes

- [`2fa8035`](https://github.com/davincicoding-org/payload-plugins/commit/2fa8035051df2d20875208c226c465b710c1543a) Thanks [@michaelcamper](https://github.com/michaelcamper)! - allow revalidate overwrite for createRequestHandler

- [`0d04129`](https://github.com/davincicoding-org/payload-plugins/commit/0d0412973b4f01117debb7f0ba6cdb70d82246a8) Thanks [@michaelcamper](https://github.com/michaelcamper)! - rename endpoint

## 1.0.1

### Patch Changes

- [`37ff0cc`](https://github.com/davincicoding-org/payload-plugins/commit/37ff0cc878dd52705b7a109289c7127ad1c7e719) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Add missing exports

- [`f1e27bf`](https://github.com/davincicoding-org/payload-plugins/commit/f1e27bf9440af6a18fc6303ae9bc5aeb45ac7243) Thanks [@michaelcamper](https://github.com/michaelcamper)! - remove type from createCachedRequest export

## 1.0.0

### Major Changes

- [`4bb87d9`](https://github.com/davincicoding-org/payload-plugins/commit/4bb87d9a89cd7664d74d6b2ee8a687240db4c43d) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Official 1.0 release
