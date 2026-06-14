import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  containsArabic,
  textNeedsArabicFont,
  ensureArabicPdfFont,
  resetArabicPdfFontCache,
} from '../../src/utils/pdfFontUtils';

describe('pdfFontUtils', () => {
  beforeEach(() => {
    resetArabicPdfFontCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetArabicPdfFontCache();
  });

  it('detects Arabic script', () => {
    expect(containsArabic('مرحبا')).toBe(true);
    expect(containsArabic('Hello')).toBe(false);
    expect(containsArabic('')).toBe(false);
  });

  it('textNeedsArabicFont checks nested values', () => {
    expect(textNeedsArabicFont('Latin', ['English', 'تقرير'])).toBe(true);
    expect(textNeedsArabicFont('Report', ['Trip', 'Driver'])).toBe(false);
  });

  it('ensureArabicPdfFont registers font on jsPDF doc', async () => {
    const fontBytes = new Uint8Array([0, 1, 2, 3]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fontBytes.buffer,
    }));

    const doc = {
      getFontList: vi.fn(() => ({})),
      addFileToVFS: vi.fn(),
      addFont: vi.fn(),
    };

    const fontName = await ensureArabicPdfFont(doc);
    expect(fontName).toBe('NotoSansArabic');
    expect(doc.addFileToVFS).toHaveBeenCalledWith(
      'NotoSansArabic-Regular.ttf',
      expect.any(String),
    );
    expect(doc.addFont).toHaveBeenCalledWith(
      'NotoSansArabic-Regular.ttf',
      'NotoSansArabic',
      'normal',
    );
  });
});

describe('exportReportPdf Arabic text', () => {
  beforeEach(() => {
    resetArabicPdfFontCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetArabicPdfFontCache();
  });

  it('uses Arabic font when title contains Arabic', async () => {
    const setFont = vi.fn();
    const text = vi.fn();
    const save = vi.fn();
    const autoTable = vi.fn();

    vi.doMock('jspdf', () => ({
      jsPDF: class MockJsPDF {
        constructor() {
          this.setFont = setFont;
          this.setFontSize = vi.fn();
          this.text = text;
          this.save = save;
          this.getFontList = () => ({});
          this.addFileToVFS = vi.fn();
          this.addFont = vi.fn();
        }
      },
    }));
    vi.doMock('jspdf-autotable', () => ({ default: autoTable }));

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    }));

    const { exportReportPdf } = await import('../../src/utils/exportReportHeavy');
    await exportReportPdf({
      title: 'تقرير الرحلات',
      headers: ['المركبة'],
      rows: [['TN-1234']],
      filename: 'report.pdf',
    });

    expect(setFont).toHaveBeenCalledWith('NotoSansArabic');
    expect(autoTable).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        styles: expect.objectContaining({ font: 'NotoSansArabic' }),
      }),
    );
    expect(save).toHaveBeenCalledWith('report.pdf');
  });
});
