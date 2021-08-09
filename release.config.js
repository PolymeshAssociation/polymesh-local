const script = script => ({
  path: './scripts/lifecycle',
  script,
})

module.exports = {
  repositoryUrl: 'https://github.com/PolymathNetwork/polymesh-local.git',
  branches: [
    'master',
    {
      name: 'beta',
      prerelease: true,
    },
    {
      name: 'alpha',
      prerelease: true,
    },
  ],
  verifyConditions: [
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/git',
    '@semantic-release/github',
  ],
  prepare: [
    script('preversion'),
    script('prepublishOnly'),
    script('prepack'),
    '@semantic-release/changelog',
    // {path: './scripts/update-version.js'},
    script('version'),
    '@semantic-release/npm',
    {
      path: '@semantic-release/git',
      assets: ['package.json', 'CHANGELOG.md', 'README.md', 'docs'],
    },
    script('postversion'),
  ],
  publish: [
    '@semantic-release/npm',
    '@semantic-release/github',
    script('postpack'),
    script('postpublish'),
  ],
}