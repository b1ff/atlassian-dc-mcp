# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.23.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.22.0...v0.23.0) (2026-06-18)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





# [0.22.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.21.0...v0.22.0) (2026-06-18)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





# [0.21.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.20.1...v0.21.0) (2026-06-18)


### Features

* **bitbucket:** add multiline comment support for pull request comments ([edaf6ea](https://github.com/b1ff/atlassian-dc-mcp/commit/edaf6ea9a200afa811a8546f492d05fb37c4fe52))





## [0.20.1](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.20.0...v0.20.1) (2026-06-18)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





# [0.20.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.19.1...v0.20.0) (2026-06-08)


### Features

* **bitbucket:** support creating and updating pull requests as drafts ([190c19a](https://github.com/b1ff/atlassian-dc-mcp/commit/190c19a075285d18d8391bdb7fdd32feec605d32))





## [0.19.1](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.19.0...v0.19.1) (2026-05-24)


### Bug Fixes

* **bitbucket:** clarify that reviewers param requires 'name', not 'slug' ([59c45dc](https://github.com/b1ff/atlassian-dc-mcp/commit/59c45dc917d9abf05939335b4ea62671a462bcda))





# [0.19.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.18.0...v0.19.0) (2026-04-27)


### Features

* **setup:** add CLI flags and non-interactive mode ([7de53f0](https://github.com/b1ff/atlassian-dc-mcp/commit/7de53f0b23704e84324b59bbcb8d830a1596f44a))





# [0.18.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.17.1...v0.18.0) (2026-04-24)


### Features

* **setup:** validate credentials via product services with retry and friendly errors ([6056320](https://github.com/b1ff/atlassian-dc-mcp/commit/60563200e62b513fe8f3b5b4a190edfa1be25a13))





## [0.17.1](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.17.0...v0.17.1) (2026-04-23)


### Bug Fixes

* prevent double-concatenation of API base path after setup CLI ([39cd1c7](https://github.com/b1ff/atlassian-dc-mcp/commit/39cd1c7c6dc6dc842b110c6650002487df534dd5))





# [0.17.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.16.0...v0.17.0) (2026-04-23)


### Features

* add interactive setup CLI with secure credential storage ([f317903](https://github.com/b1ff/atlassian-dc-mcp/commit/f317903a9975b66442f54e520a5a1656a69d1a1b))





# [0.16.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.15.0...v0.16.0) (2026-04-14)


### Features

* add keywords to package.json for npm search visibility ([0735f27](https://github.com/b1ff/atlassian-dc-mcp/commit/0735f27600d8215ba0c11c48916d3edc844f01b5))
* improve supply-chain transparency (closes [#26](https://github.com/b1ff/atlassian-dc-mcp/issues/26)) ([98912b2](https://github.com/b1ff/atlassian-dc-mcp/commit/98912b26bddc4cafd847eb526fa8f76546576203))





# [0.15.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.14.3...v0.15.0) (2026-04-07)


### Features

* **bitbucket:** improve updatePullRequest tool descriptions to prevent missing version parameter ([7999012](https://github.com/b1ff/atlassian-dc-mcp/commit/7999012a7abad2fa55dc5a2300abef516bd92631))





## [0.14.3](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.14.2...v0.14.3) (2026-04-02)


### Bug Fixes

* **bitbucket:** normalize project key and repo slug casing in API calls ([35cf924](https://github.com/b1ff/atlassian-dc-mcp/commit/35cf924d78974f73d59f2d6879873eb8bbe027e8))





## [0.14.2](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.14.1...v0.14.2) (2026-04-02)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.14.1](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.14.0...v0.14.1) (2026-04-01)


### Bug Fixes

* use proper version for MCP server responces ([d1f5e5b](https://github.com/b1ff/atlassian-dc-mcp/commit/d1f5e5b59c592921f940916af008363414aa4c0e))





# [0.14.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.13.0...v0.14.0) (2026-03-23)


### Features

* **bitbucket:** add automatic filtering out resolved comment threads in PR activities ([f44244e](https://github.com/b1ff/atlassian-dc-mcp/commit/f44244ee739c7aa56dc11836f63af121d0e3e2c6))





# [0.13.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.12.2...v0.13.0) (2026-03-21)


### Features

* add ability to specify external config file to MCP, to provide configuration to MCP without specifying credentials in the file ([c97d380](https://github.com/b1ff/atlassian-dc-mcp/commit/c97d38004ebc7e233ea276a36c2e233536d2d0ca))
* **bitbucket:** add token-optimized response modes ([9c8f3c8](https://github.com/b1ff/atlassian-dc-mcp/commit/9c8f3c8c99be2fffb7a32ecf14def5e004a11512))





## [0.12.2](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.12.1...v0.12.2) (2026-03-21)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.12.1](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.12.0...v0.12.1) (2026-03-21)


### Bug Fixes

* **bitbucket:** [#22](https://github.com/b1ff/atlassian-dc-mcp/issues/22) address the issue that replies in PRs are invisible to LLM ([bb22fa1](https://github.com/b1ff/atlassian-dc-mcp/commit/bb22fa1e8cc80f3983c08f58bd6cdd735f7eb9d7))





# [0.12.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.11.2...v0.12.0) (2026-03-18)


### Features

* add support for dashboard api ([a7b1eef](https://github.com/b1ff/atlassian-dc-mcp/commit/a7b1eef732b8d7ee8e9f32aee0c6d6502bf18c95))





## [0.11.2](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.11.1...v0.11.2) (2026-03-12)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.11.1](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.11.0...v0.11.1) (2026-03-12)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





# [0.11.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.10.2...v0.11.0) (2026-03-09)


### Features

* **bitbucket:** add pending comment support and submitPullRequestReview tool ([0bd74c2](https://github.com/b1ff/atlassian-dc-mcp/commit/0bd74c2243524a5e8a9f7f7c464a01e18e9db884))





## [0.10.2](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.10.1...v0.10.2) (2026-03-09)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.10.1](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.10.0...v0.10.1) (2026-03-09)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





# [0.10.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.9.12...v0.10.0) (2026-01-31)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.9.12](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.9.11...v0.9.12) (2026-01-03)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.9.11](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.9.10...v0.9.11) (2026-01-03)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.9.10](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.9.9...v0.9.10) (2026-01-03)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.9.9](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.9.8...v0.9.9) (2025-09-13)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.9.8](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.9.7...v0.9.8) (2025-09-13)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.9.7](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.9.6...v0.9.7) (2025-09-13)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.9.6](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.9.3...v0.9.6) (2025-09-13)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.9.5](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.9.3...v0.9.5) (2025-09-13)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.9.4](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.9.3...v0.9.4) (2025-09-13)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.9.3](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.9.2...v0.9.3) (2025-09-13)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.9.2](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.9.0...v0.9.2) (2025-09-13)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.9.1](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.9.0...v0.9.1) (2025-09-13)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





# [0.9.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.8.2...v0.9.0) (2025-09-13)


### Features

* preparation to publish to MCP registry ([1fdb772](https://github.com/b1ff/atlassian-dc-mcp/commit/1fdb772b419a5c472fafa2de4304e471471447c5))





## [0.8.3](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.8.0...v0.8.3) (2025-09-06)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.8.2](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.8.0...v0.8.2) (2025-09-06)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.8.1](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.8.0...v0.8.1) (2025-09-06)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





# [0.8.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.7.0...v0.8.0) (2025-09-06)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





# [0.7.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.6.0...v0.7.0) (2025-08-03)


### Bug Fixes

* update bitbucket tool name given that anthropic API does not accept long name generated by claude code. ([c670e7b](https://github.com/b1ff/atlassian-dc-mcp/commit/c670e7ba8e4c509cb486f72fedf012509e9234d2))


### Features

* **bitbucket:** add support for fetching pull request diffs based on the specified path ([29150f3](https://github.com/b1ff/atlassian-dc-mcp/commit/29150f32f37966e47bda3d4e322fef4923bf7df3))
* **bitbucket:** add support for PR changes and comments posting ([3b1f95b](https://github.com/b1ff/atlassian-dc-mcp/commit/3b1f95bcc3731cc787ffb76cfce710e980e1cb58))
* **bitbucket:** reduce size of PR comments ([125d990](https://github.com/b1ff/atlassian-dc-mcp/commit/125d9907eb1b7b81256e66b86b602ccc472e1200))





## [0.6.1](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.6.0...v0.6.1) (2025-05-26)


### Bug Fixes

* update bitbucket tool name given that anthropic API does not accept long name generated by claude code. ([c670e7b](https://github.com/b1ff/atlassian-dc-mcp/commit/c670e7ba8e4c509cb486f72fedf012509e9234d2))





# [0.6.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.5.0...v0.6.0) (2025-05-26)


### Features

* add the ability to read PR comments for bitbucket. ([3a895f5](https://github.com/b1ff/atlassian-dc-mcp/commit/3a895f5e353b62fb71985ea14d6b57a24740662b))





# [0.5.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.3.4...v0.5.0) (2025-05-14)


### Features

* **bitbucket:** add support of api base path instead of only host to support paths based installations. ([dea959b](https://github.com/b1ff/atlassian-dc-mcp/commit/dea959bf64493a90a9a5058db6bf80c462de2ee7))





# [0.4.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.3.4...v0.4.0) (2025-05-03)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.3.4](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.3.3...v0.3.4) (2025-03-08)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





# [0.3.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.2.1...v0.3.0) (2025-03-03)


### Features

* improve error details for confluence and bitbucket so the LLM is able to correct itself based on the error. ([96f469f](https://github.com/b1ff/atlassian-dc-mcp/commit/96f469f6562c38f7460a4e13096b7f55d45acc1c))





# [0.2.0](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.1.6...v0.2.0) (2025-03-02)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.1.5](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.1.4...v0.1.5) (2025-03-02)


### Bug Fixes

* **bitbucket:** remove dependencies from node-fetch polyfill since it is supported by node natively ([6268835](https://github.com/b1ff/atlassian-dc-mcp/commit/6268835a4ef80009b78f42dca073a04e0aca61e4))





## [0.1.4](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.1.3...v0.1.4) (2025-03-02)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket





## [0.1.3](https://github.com/b1ff/atlassian-dc-mcp/compare/v0.1.2...v0.1.3) (2025-03-02)


### Bug Fixes

* correct bin configurations and the relative paths. ([0bed1aa](https://github.com/b1ff/atlassian-dc-mcp/commit/0bed1aa86e94a1d0d589b43d1c50fad55025eb2c))





## 0.1.2 (2025-03-02)


### Bug Fixes

* binary executable is now non compiled ones. ([18fa866](https://github.com/b1ff/atlassian-dc-mcp/commit/18fa8661d71e3b1246f35869bec0acefe7ac2df5))





## 0.1.1 (2025-03-02)

**Note:** Version bump only for package @atlassian-dc-mcp/bitbucket
