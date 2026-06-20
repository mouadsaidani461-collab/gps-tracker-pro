/** PDF / Excel export — loaded only when user clicks export (keeps exceljs/jspdf out of Reports chunk). */

import { triggerFileDownload } from './exportUtils';
import { ensureArabicPdfFont, textNeedsArabicFont } from './pdfFontUtils';

export async function exportReportPdf({ title, headers, rows, filename }) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const needsArabic = textNeedsArabicFont(title, headers, rows);
  const fontName = needsArabic ? await ensureArabicPdfFont(doc) : 'helvetica';

  doc.setFont(fontName);
  doc.setFontSize(14);
  doc.text(title, 40, 40);
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 56,
    styles: { fontSize: 9, cellPadding: 4, font: fontName },
    headStyles: { fillColor: [15, 23, 42], font: fontName },
  });
  doc.save(filename);
}

export async function exportReportExcel({ sheetName, headers, rows, filename }) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers);
  rows.forEach((row) => {
    const excelRow = sheet.addRow(row);
    row.forEach((cell, idx) => {
      const num = typeof cell === 'number' ? cell : Number(String(cell).replace(/[^\d.-]/g, ''));
      if (!Number.isNaN(num) && /^[\d.,-]+$/.test(String(cell).trim())) {
        excelRow.getCell(idx + 1).value = num;
      }
    });
  });
  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerFileDownload(blob, filename);
}
