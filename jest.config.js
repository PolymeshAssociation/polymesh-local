module.exports = {
  preset: 'ts-jest/presets/js-with-babel',
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!node-fetch|@babel/runtime/helpers/esm/)'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['dist'],
};
