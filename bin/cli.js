#!/usr/bin/env node

const path = require("path");
const { convertToFacturX } = require("../src");

function printUsage() {
  console.log(
    [
      "Usage:",
      "  facturx --pdf <file.pdf> --invoice <file.xml> --out <facturx.pdf> --client-id <id> --client-secret <secret>",
      "",
      "Options:",
      "  --pdf        Path to input PDF",
      "  --invoice    Path to input UBL XML",
      "  --out        Path to output Factur-X PDF",
      "  --client-id     SuperPDP OAuth2 client_id (or env SUPERPDP_CLIENT_ID)",
      "  --client-secret SuperPDP OAuth2 client_secret (or env SUPERPDP_CLIENT_SECRET)",
      "  --from       Input format (default: ubl)",
      "  --to         Output format (default: factur-x)",
      "  --api-base   API base URL (default: https://api.superpdp.tech)",
      "  --timeout    Request timeout in ms (default: 30000)",
      "  -h, --help   Show help",
    ].join("\n")
  );
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      args.help = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (value && !value.startsWith("--")) {
      args[key] = value;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const pdfPath = args.pdf;
  const invoicePath = args.invoice;
  const outputPath = args.out;
  const clientId = args["client-id"] || process.env.SUPERPDP_CLIENT_ID;
  const clientSecret = args["client-secret"] || process.env.SUPERPDP_CLIENT_SECRET;
  const timeoutMs = args.timeout ? Number(args.timeout) : undefined;

  if (!pdfPath || !invoicePath || !outputPath || !clientId || !clientSecret) {
    printUsage();
    process.exit(1);
  }

  try {
    await convertToFacturX({
      clientId,
      clientSecret,
      pdfPath: path.resolve(pdfPath),
      invoicePath: path.resolve(invoicePath),
      outputPath: path.resolve(outputPath),
      from: args.from,
      to: args.to,
      apiBase: args["api-base"],
      timeoutMs,
    });
    console.log("Factur-X written to", outputPath);
  } catch (err) {
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
})();
