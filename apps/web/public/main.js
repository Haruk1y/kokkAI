import { validateHealthPayload } from '/shared/health.js';

const { apiBaseUrl, healthRoute } = window.__KOKKAI_CONFIG__;
const endpoint = `${apiBaseUrl}${healthRoute}`;

const endpointElement = document.querySelector('#endpoint');
const statusElement = document.querySelector('#status');
const checkedAtElement = document.querySelector('#checked-at');
const payloadElement = document.querySelector('#payload');

function updateView({ endpointLabel, statusLabel, checkedAt, payload }) {
  endpointElement.textContent = endpointLabel;
  statusElement.textContent = statusLabel;
  checkedAtElement.textContent = checkedAt;
  payloadElement.textContent =
    typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
}

async function loadHealth() {
  updateView({
    endpointLabel: endpoint,
    statusLabel: 'loading',
    checkedAt: 'pending',
    payload: 'Waiting for API response...',
  });

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    const payload = await response.json();
    const validation = validateHealthPayload(payload);

    if (!validation.ok) {
      throw new Error(validation.errors.join('; '));
    }

    updateView({
      endpointLabel: endpoint,
      statusLabel: payload.status,
      checkedAt: new Date(payload.checkedAt).toLocaleString(),
      payload,
    });
  } catch (error) {
    updateView({
      endpointLabel: endpoint,
      statusLabel: 'error',
      checkedAt: 'unavailable',
      payload: error.message,
    });
  }
}

loadHealth();
