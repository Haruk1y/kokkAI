import { handleApiRequest } from '../apps/api/server.mjs';
import { createWebHandler } from '../apps/web/server.mjs';
import { validateHealthPayload } from '../packages/shared/src/health.js';

async function invokeHandler(handler, { method = 'GET', url = '/', host = 'localhost' } = {}) {
  return new Promise((resolve, reject) => {
    const request = {
      method,
      url,
      headers: { host },
    };

    const response = {
      headers: {},
      statusCode: 200,
      writeHead(statusCode, headers) {
        this.statusCode = statusCode;
        this.headers = {
          ...this.headers,
          ...headers,
        };
      },
      end(body = '') {
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body,
        });
      },
    };

    Promise.resolve(handler(request, response)).catch(reject);
  });
}

const webHandler = createWebHandler({
  apiBaseUrl: 'http://localhost:3001',
});

const apiHealthResponse = await invokeHandler(handleApiRequest, {
  url: '/health',
  host: 'localhost:3001',
});

if (apiHealthResponse.statusCode !== 200) {
  throw new Error(`API /health returned ${apiHealthResponse.statusCode}`);
}

const apiPayload = JSON.parse(apiHealthResponse.body);
const apiValidation = validateHealthPayload(apiPayload);

if (!apiValidation.ok) {
  throw new Error(apiValidation.errors.join('; '));
}

if (!apiPayload.notes.some((note) => note.includes('Loaded') && note.includes('dossier'))) {
  throw new Error('API /health did not report dossier loading');
}

if (!apiPayload.seed?.dossier_ids?.includes('school-lunch-fee-waiver')) {
  throw new Error('API /health did not include the curated dossier id in the loaded catalog');
}

const apiRootResponse = await invokeHandler(handleApiRequest, {
  url: '/',
  host: 'localhost:3001',
});

if (apiRootResponse.statusCode !== 200) {
  throw new Error(`API / returned ${apiRootResponse.statusCode}`);
}

const apiPersonasResponse = await invokeHandler(handleApiRequest, {
  url: '/personas',
  host: 'localhost:3001',
});

if (apiPersonasResponse.statusCode !== 200) {
  throw new Error(`API /personas returned ${apiPersonasResponse.statusCode}`);
}

const personaCatalog = JSON.parse(apiPersonasResponse.body);
const sampleRegistrySummary = personaCatalog.registries.find(
  (registry) => registry.dossier_id === 'summer-electricity-relief',
);

if (!sampleRegistrySummary) {
  throw new Error('API /personas did not return the sample persona registry');
}

const institutionReplayMode = sampleRegistrySummary.modes.find(
  (modeDefinition) => modeDefinition.mode === 'committee_institution_replay',
);
const partyRemovedMode = sampleRegistrySummary.modes.find(
  (modeDefinition) => modeDefinition.mode === 'committee_party_bias_removed',
);
const citizensAssemblyMode = sampleRegistrySummary.modes.find(
  (modeDefinition) => modeDefinition.mode === 'citizens_assembly',
);

if (!institutionReplayMode || !partyRemovedMode || !citizensAssemblyMode) {
  throw new Error('API /personas did not enumerate all three MVP deliberation modes');
}

if (
  institutionReplayMode.configuration.party_bias !== 'preserved' ||
  partyRemovedMode.configuration.party_bias !== 'removed'
) {
  throw new Error('API /personas did not preserve the expected mode configuration split');
}

if (citizensAssemblyMode.persona_count < 3) {
  throw new Error('API /personas did not expose diverse citizen personas');
}

const apiSamplePersonaRegistryResponse = await invokeHandler(handleApiRequest, {
  url: '/personas/summer-electricity-relief',
  host: 'localhost:3001',
});

if (apiSamplePersonaRegistryResponse.statusCode !== 200) {
  throw new Error(
    `API /personas/summer-electricity-relief returned ${apiSamplePersonaRegistryResponse.statusCode}`,
  );
}

const samplePersonaRegistry = JSON.parse(apiSamplePersonaRegistryResponse.body);
const sampleCitizensMode = samplePersonaRegistry.modes.find(
  (modeDefinition) => modeDefinition.mode === 'citizens_assembly',
);

if (!sampleCitizensMode?.personas.every((persona) => persona.demographics)) {
  throw new Error('API /personas/:dossierId did not return citizen demographics');
}

const webHealthResponse = await invokeHandler(webHandler, {
  url: '/health',
  host: 'localhost:3000',
});

if (webHealthResponse.statusCode !== 200) {
  throw new Error(`Web /health returned ${webHealthResponse.statusCode}`);
}

if (!webHealthResponse.body.includes('Prototype 01 Bootstrap')) {
  throw new Error('Web /health did not render the expected heading');
}

if (!webHealthResponse.body.includes('http://localhost:3001')) {
  throw new Error('Web /health did not inject the API base URL');
}

const webRootResponse = await invokeHandler(webHandler, {
  url: '/',
  host: 'localhost:3000',
});

if (webRootResponse.statusCode !== 200) {
  throw new Error(`Web / returned ${webRootResponse.statusCode}`);
}

process.stdout.write(
  'Smoke test passed for API and web route handlers without binding network sockets.\n',
);
