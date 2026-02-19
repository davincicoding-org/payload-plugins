# payload-intl

## 1.3.2

### Patch Changes

- Updated dependencies [[`1b4aa68`](https://github.com/davincicoding-org/payload-plugins/commit/1b4aa68bd191e2fc45d31ea4a417deb0b0975054)]:
  - @davincicoding/payload-utils@0.0.3

## 1.3.1

### Patch Changes

- Updated dependencies [[`eedd9c4`](https://github.com/davincicoding-org/payload-plugins/commit/eedd9c4085676c2c7c0dc9832feafadb7055caee)]:
  - @davincicoding/payload-utils@0.0.2

## 1.3.0

### Minor Changes

- [`4965bef`](https://github.com/davincicoding-org/payload-plugins/commit/4965bef485dd7a8f2b18c50cd35b295da82eb47a) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Add dual storage strategy (`db` and `upload`) for message persistence. Default is `db` which stores translations as JSON in the database, avoiding HTTP fetches during `next build`. Auto-migrates existing documents when switching strategies.

### Patch Changes

- [`d9c65b4`](https://github.com/davincicoding-org/payload-plugins/commit/d9c65b4790095247384d233522945d16418792bc) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Internall changes

## 1.2.5

### Patch Changes

- [`bc347db`](https://github.com/davincicoding-org/payload-plugins/commit/bc347db70f32bd24830bdb7cae25d7d477f0d4b5) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Strip declare module 'payload' augmentation from built payload-types.d.ts. Previously, each plugin shipped its own module augmentation with a partial Config, causing CollectionSlug to narrow to only the common subset when multiple plugins were installed together.

## 1.2.4

### Patch Changes

- [`71a9c33`](https://github.com/davincicoding-org/payload-plugins/commit/71a9c33b64e576a230e7eeca75b364389dcf882f) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Use string type for collectionSlug option and clean up tsconfig include paths. Update internal dependency for renamed common API.

## 1.2.3

### Patch Changes

- [`39e96d5`](https://github.com/davincicoding-org/payload-plugins/commit/39e96d52476b2abb8c52fe7e076f77ac26b81008) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Improve UI

## 1.2.2

### Patch Changes

- [`1740509`](https://github.com/davincicoding-org/payload-plugins/commit/17405099470100f5982d7834a13994ffa10f6e59) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix catalog: protocol leaking into published package.json — zod dependency now resolves to a real version

## 1.2.1

### Patch Changes

- [`a7772b9`](https://github.com/davincicoding-org/payload-plugins/commit/a7772b9b6fdf5ee0a4d8dd8d5adc48d998f4692b) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix @repo/common resolution error — common utilities are now bundled into the package

## 1.2.0

### Minor Changes

- [`4a33929`](https://github.com/davincicoding-org/payload-plugins/commit/4a3392949890b1f49a2e24695a0cf9874a211fea) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Remove required styles import — styles are now bundled automatically

## 1.1.0

### Minor Changes

- [`475b53d`](https://github.com/davincicoding-org/payload-plugins/commit/475b53de49d15dc3e58394306d6dc4c88dd25a2c) Thanks [@michaelcamper](https://github.com/michaelcamper)! - allow fetchMessages to be used in edge environment

## 1.0.0

### Major Changes

- [`4bb87d9`](https://github.com/davincicoding-org/payload-plugins/commit/4bb87d9a89cd7664d74d6b2ee8a687240db4c43d) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Official 1.0 release
