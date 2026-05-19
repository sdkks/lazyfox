## [1.0.3](https://github.com/sdkks/lazyfox/compare/v1.0.2...v1.0.3) (2026-05-19)


### Bug Fixes

* add @semantic-release/npm to bump package.json version on release ([4603534](https://github.com/sdkks/lazyfox/commit/4603534870203d50e33faca12ead92bde24a0b3e))

## [1.0.2](https://github.com/sdkks/lazyfox/compare/v1.0.1...v1.0.2) (2026-05-19)


### Bug Fixes

* persist rabbit scent timer in browser.storage.session ([90d224d](https://github.com/sdkks/lazyfox/commit/90d224d181975afbda84826a9e00e22b165a8708))

## [1.0.1](https://github.com/sdkks/lazyfox/compare/v1.0.0...v1.0.1) (2026-05-19)


### Bug Fixes

* match rabbit scents by tabId instead of URL-based UUID ([c1d21b0](https://github.com/sdkks/lazyfox/commit/c1d21b05b29dcfa4f5e99f30a0a90f287bd1805d))

# 1.0.0 (2026-05-19)


### Bug Fixes

* add Firefox data_collection_permissions to manifest ([c79ba46](https://github.com/sdkks/lazyfox/commit/c79ba466752dada52e57e605d72f31c43f473a2d))
* add packageManager and engines to package.json for CI ([627324e](https://github.com/sdkks/lazyfox/commit/627324e12ca375dcf2a19f53fc045de5c81496c9))
* add required property to Firefox data_collection_permissions ([47a8628](https://github.com/sdkks/lazyfox/commit/47a86282462173c7087196d2cb28cd25f68c0f20))
* bump Firefox min version to 140, set data required to ["none"] ([6ddaad6](https://github.com/sdkks/lazyfox/commit/6ddaad6543b8a9e07045f0958e8fa143855bb2f4))
* persist rabbit scent countdown across popup reopen, add remove button ([9799dd7](https://github.com/sdkks/lazyfox/commit/9799dd71203cb5253b22e79206eaf238a443cc15))
* remove hardcoded version from manifest, let package.json drive it ([5fb8614](https://github.com/sdkks/lazyfox/commit/5fb8614633c0d8ec64911767c2bee6e3390a7a3a))
* return UUID from giveRabbitScent so remove toggle works reliably ([c9f4c2b](https://github.com/sdkks/lazyfox/commit/c9f4c2be0bb60fd142276457b5def0b5b11738f4))
* startScentCountdown was clearing scentUuid via stopScentCountdown ([9fe7f9a](https://github.com/sdkks/lazyfox/commit/9fe7f9a5f663323677c487533693512fc160ed0f))


### Features

* add Makefile, semantic-release, and fix rabbit scent remove button ([4e9d75a](https://github.com/sdkks/lazyfox/commit/4e9d75a91941aff7c90add36ed26646fad4b6d04))
* add popup UI, sleeping page, icons, and store listing docs ([74d9f4c](https://github.com/sdkks/lazyfox/commit/74d9f4c111a0c6bde6bb63c48e7cd0990725912e))
* bootstrap lazyfox extension with WXT, strict TypeScript, and tab suspending core ([138b2dd](https://github.com/sdkks/lazyfox/commit/138b2dd62f2a5c2cf5eb90c621afd8c11e307f51))

# Changelog

All notable changes to this project will be documented in this file.
