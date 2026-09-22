const {resolveApiBaseUrl} = require('../src/config/apiUrl');

const configuration = process.argv[2];
if (configuration !== 'release' && configuration !== 'Release' &&
    configuration !== 'debug' && configuration !== 'Debug') {
  process.stderr.write('API configuration error: Unknown build configuration.\n');
  process.exit(1);
}
const isRelease = configuration === 'release' || configuration === 'Release';

try {
  resolveApiBaseUrl(process.env.API_BASE_URL, isRelease);
} catch (error) {
  process.stderr.write(`API configuration error: ${error.message}\n`);
  process.exitCode = 1;
}
