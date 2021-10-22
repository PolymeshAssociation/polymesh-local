## [2.2.1](https://github.com/PolymathNetwork/polymesh-local/compare/v2.2.0...v2.2.1) (2021-10-22)


### Bug Fixes

* 🐛 Add restart always to alice node ([#12](https://github.com/PolymathNetwork/polymesh-local/issues/12)) ([9776477](https://github.com/PolymathNetwork/polymesh-local/commit/9776477cf78d2ed6b9046ee686d795aa92f23713))

# [2.2.0](https://github.com/PolymathNetwork/polymesh-local/compare/v2.1.0...v2.2.0) (2021-10-21)


### Features

* 🎸 Add rest api ([#11](https://github.com/PolymathNetwork/polymesh-local/issues/11)) ([aa37e61](https://github.com/PolymathNetwork/polymesh-local/commit/aa37e6186b30a1a1527f01ff2ad88ec9dcdcba97))

# [2.1.0](https://github.com/PolymathNetwork/polymesh-local/compare/v2.0.3...v2.1.0) (2021-10-07)


### Features

* 🎸 Added --only flags to run only some services ([9e9fcb4](https://github.com/PolymathNetwork/polymesh-local/commit/9e9fcb426dc226d49f8ce7515093334285a03a99))

## [2.0.3](https://github.com/PolymathNetwork/polymesh-local/compare/v2.0.2...v2.0.3) (2021-10-06)


### Bug Fixes

* 🐛 Fix bad import path for consts ([#9](https://github.com/PolymathNetwork/polymesh-local/issues/9)) ([2e3df97](https://github.com/PolymathNetwork/polymesh-local/commit/2e3df977083b2a5c0d80400f4ed70ce65476446b))

## [2.0.2](https://github.com/PolymathNetwork/polymesh-local/compare/v2.0.1...v2.0.2) (2021-10-06)


### Bug Fixes

* 🐛 inconsistent permissions ([de6b30d](https://github.com/PolymathNetwork/polymesh-local/commit/de6b30d896dc77d99e98b722b3adb7998d76b654))

## [2.0.1](https://github.com/PolymathNetwork/polymesh-local/compare/v2.0.0...v2.0.1) (2021-10-04)


### Bug Fixes

* 🐛 Remove sudo calls ([#6](https://github.com/PolymathNetwork/polymesh-local/issues/6)) ([f7d2fcf](https://github.com/PolymathNetwork/polymesh-local/commit/f7d2fcf54023f8119bb4d676fa05b6ed3cf73c19))

# [2.0.0](https://github.com/PolymathNetwork/polymesh-local/compare/v1.2.0...v2.0.0) (2021-09-30)


* Ncbd 442 add save command (#5) ([4c908ab](https://github.com/PolymathNetwork/polymesh-local/commit/4c908ab75de21041bfcff6fdf28530779db33c3f)), closes [#5](https://github.com/PolymathNetwork/polymesh-local/issues/5)


### BREAKING CHANGES

* 🧨 Removes autoloading of snapshot

✅ Closes: NCBD-442

* refactor: 💡 Use containers function to check running

Instead of calling out to the Polymesh node check if any containers are
up like "stop" was

* feat: 🎸 Display running version to user

✅ Closes: NCBD-443

* feat: 🎸 Add flag for specifying node image

Allow user to specify Polymesh node image to use so they can test things
that haven't been bundled as part of a release

* feat: 🎸 Update generate snapshot to support passing an image

* fix: 🐛 Wait for containers to be up

* fix: 🐛 Update snapshot time so it advances right away

* remove user in dockerfile

* linux support

Co-authored-by: Raycar5 <raycar5@users.noreply.github.com>

# [1.2.0](https://github.com/PolymathNetwork/polymesh-local/compare/v1.1.0...v1.2.0) (2021-09-22)


### Features

* 🎸 Add tooling and subquery services ([#3](https://github.com/PolymathNetwork/polymesh-local/issues/3)) ([0f52f3c](https://github.com/PolymathNetwork/polymesh-local/commit/0f52f3c8057537588f063bc8679ecb597f25044a))
* 🎸 Dont lint semantic release bot commit messages ([#4](https://github.com/PolymathNetwork/polymesh-local/issues/4)) ([3e6fbe9](https://github.com/PolymathNetwork/polymesh-local/commit/3e6fbe947527511b22727cbb672bda5206fc3e0a))

# [1.1.0](https://github.com/PolymathNetwork/polymesh-local/compare/v1.0.2...v1.1.0) (2021-08-10)


### Features

* 🎸 add 3.1.0 snapshots and restrict version values ([cd727e9](https://github.com/PolymathNetwork/polymesh-local/commit/cd727e99ed712817e870a3d5d8b254f518c7c05d))

## [1.0.2](https://github.com/PolymathNetwork/polymesh-local/compare/v1.0.1...v1.0.2) (2021-08-10)


### Bug Fixes

* 🐛 add npmignore and modify prepack script ([2074483](https://github.com/PolymathNetwork/polymesh-local/commit/20744839d74dfc85afdfa6c08e47bf2e46397606))

## [1.0.1](https://github.com/PolymathNetwork/polymesh-local/compare/v1.0.0...v1.0.1) (2021-08-10)


### Bug Fixes

* 🐛 add build step to the release pipeline ([4fa3d97](https://github.com/PolymathNetwork/polymesh-local/commit/4fa3d975619917918d85f5ed89ecff75072f2419))

# 1.0.0 (2021-08-10)


### Features

* 🎸 add github actions ([61a8fc4](https://github.com/PolymathNetwork/polymesh-local/commit/61a8fc4bc6de080e6831a0c9c0efaa85f7bdd5b4))
* 🎸 create start and stop commands ([459d8ca](https://github.com/PolymathNetwork/polymesh-local/commit/459d8ca982538951f98026bcbb5b4d1590c6f689))
* 🎸 semantic release action ([57b0ff6](https://github.com/PolymathNetwork/polymesh-local/commit/57b0ff61af61ca6f798942bb150fb4075aeaa331))
