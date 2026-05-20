# pdf-to-facturx

Convert a PDF + UBL XML invoice to Factur-X using SuperPDP.

## Install

```bash
npm install
```

## CLI

```bash
SUPERPDP_CLIENT_ID=your_id SUPERPDP_CLIENT_SECRET=your_secret \
  bin/cli.js --pdf samples/invoice.pdf --invoice samples/invoice.xml --out samples/facturx.pdf --timeout 30000
```

## Library

```js
const { convertToFacturX } = require("./src");

convertToFacturX({
  clientId: process.env.SUPERPDP_CLIENT_ID,
  clientSecret: process.env.SUPERPDP_CLIENT_SECRET,
  pdfPath: "./samples/invoice.pdf",
  invoicePath: "./samples/invoice.xml",
  outputPath: "./samples/facturx.pdf",
}).then(() => console.log("Done"));
```

## Options

- `clientId` (required) SuperPDP OAuth2 client_id
- `clientSecret` (required) SuperPDP OAuth2 client_secret
- `pdfPath` (required) input PDF path
- `invoicePath` (required) input UBL XML path
- `outputPath` optional output path for Factur-X PDF
- `from` default: `ubl`
- `to` default: `factur-x`
- `apiBase` default: `https://api.superpdp.tech`
- `timeoutMs` default: `30000`
