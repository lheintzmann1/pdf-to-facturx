const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const fetch = require("node-fetch");

const DEFAULT_API_BASE = "https://api.superpdp.tech";
const DEFAULT_FROM = "ubl";
const DEFAULT_TO = "factur-x";
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Convert a PDF + UBL XML invoice into Factur-X using SuperPDP.
 *
 * @param {Object} options
 * @param {string} options.clientId - SuperPDP OAuth2 client_id.
 * @param {string} options.clientSecret - SuperPDP OAuth2 client_secret.
 * @param {string} options.pdfPath - Path to the input PDF.
 * @param {string} options.invoicePath - Path to the UBL XML invoice.
 * @param {string} [options.outputPath] - Path to save the resulting Factur-X PDF (when binary response).
 * @param {string} [options.from] - Input invoice format. Defaults to "ubl".
 * @param {string} [options.to] - Output invoice format. Defaults to "factur-x".
 * @param {string} [options.apiBase] - API base URL. Defaults to https://api.superpdp.tech.
 * @param {number} [options.timeoutMs] - Request timeout in ms. Defaults to 30000.
 * @returns {Promise<{json?: any, buffer?: Buffer, contentType: string}>}
 */
async function getAccessToken({ apiBase, clientId, clientSecret, timeoutMs }) {
  const tokenUrl = `${apiBase}/oauth2/token`;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs || DEFAULT_TIMEOUT_MS)
    : null;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
    signal: controller ? controller.signal : undefined,
  });

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let message = `SuperPDP OAuth error (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.message) {
        message = `${message}: ${errJson.message}`;
      }
    } catch (_) {
      // ignore parsing error
    }
    throw new Error(message);
  }

  const body = await response.json();
  if (!body || !body.access_token) {
    throw new Error("SuperPDP OAuth error: missing access_token");
  }

  return body.access_token;
}

async function convertToFacturX(options) {
  const {
    clientId,
    clientSecret,
    pdfPath,
    invoicePath,
    outputPath,
    from = DEFAULT_FROM,
    to = DEFAULT_TO,
    apiBase = DEFAULT_API_BASE,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options || {};

  if (!clientId) {
    throw new Error("Missing required option: clientId");
  }
  if (!clientSecret) {
    throw new Error("Missing required option: clientSecret");
  }
  if (!pdfPath) {
    throw new Error("Missing required option: pdfPath");
  }
  if (!invoicePath) {
    throw new Error("Missing required option: invoicePath");
  }
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found: ${pdfPath}`);
  }
  if (!fs.existsSync(invoicePath)) {
    throw new Error(`Invoice XML not found: ${invoicePath}`);
  }

  const accessToken = await getAccessToken({
    apiBase,
    clientId,
    clientSecret,
    timeoutMs,
  });

  const form = new FormData();
  form.append("invoice", fs.createReadStream(invoicePath), {
    filename: path.basename(invoicePath),
    contentType: "application/xml",
  });
  form.append("pdf", fs.createReadStream(pdfPath), {
    filename: path.basename(pdfPath),
    contentType: "application/pdf",
  });

  const url = `${apiBase}/v1.beta/invoices/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...form.getHeaders(),
    },
    body: form,
    signal: controller ? controller.signal : undefined,
  });

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    let message = `SuperPDP API error (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.message) {
        message = `${message}: ${errJson.message}`;
      }
    } catch (_) {
      // ignore parsing error
    }
    throw new Error(message);
  }

  if (contentType.includes("application/json")) {
    const json = await response.json();
    return { json, contentType };
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (outputPath) {
    fs.writeFileSync(outputPath, buffer);
  }

  return { buffer, contentType };
}

module.exports = {
  convertToFacturX,
};
