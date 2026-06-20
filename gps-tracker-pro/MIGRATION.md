# Dependency security updates (dompurify / uuid)

## Summary

`npm audit` reported 3 moderate vulnerabilities in transitive dependencies:

| Package   | Via      | Issue                                      |
|-----------|----------|--------------------------------------------|
| dompurify | jspdf    | XSS / config pollution (≤ 3.4.10)          |
| uuid      | exceljs  | Buffer bounds check (≤ 11.1.0)             |
| exceljs   | direct   | Pulled in vulnerable `uuid@8.x`            |

`npm update jspdf` and `npm update exceljs` did not resolve them: both packages are already on their latest stable releases (`jspdf@4.2.1`, `exceljs@4.4.0`).

## Fix applied

Added **npm overrides** in `package.json`:

```json
"overrides": {
  "dompurify": "^3.4.11",
  "uuid": "^11.1.1"
}
```

This pins patched transitive versions without downgrading `exceljs` (npm’s suggested `audit fix --force` would downgrade to `exceljs@3.4.0` — not acceptable).

## Application code

No API changes were required:

- **PDF** — `src/utils/exportReportHeavy.js` + `src/utils/pdfFontUtils.js` use the public jsPDF API (`jsPDF`, `autoTable`, fonts). `dompurify` is an optional jsPDF dependency and is not imported by our code.
- **Excel** — `exportReportExcel` uses `ExcelJS.Workbook`, worksheets, and `writeBuffer()`. `uuid` is internal to exceljs; our code does not call `uuid` directly.

## Verification

```bash
npm audit --audit-level=moderate   # 0 vulnerabilities
npm test                           # unit tests incl. PDF + Excel export mocks
```

## If overrides are removed later

When upstream releases fixed versions:

1. Remove the `overrides` block.
2. Run `npm update jspdf exceljs && npm audit`.
3. Re-run export tests.

Do **not** run `npm audit fix --force` without reviewing semver-major downgrades.
