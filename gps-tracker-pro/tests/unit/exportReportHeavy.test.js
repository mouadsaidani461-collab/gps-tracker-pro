import { describe, it, expect, vi, afterEach } from 'vitest';

describe('exportReportExcel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes xlsx buffer and triggers download', async () => {
    const writeBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    const addRow = vi.fn(function addRow() {
      return {
        getCell: () => ({ value: null }),
      };
    });

    vi.doMock('exceljs', () => ({
      Workbook: class MockWorkbook {
        addWorksheet() {
          return {
            addRow,
            getRow: () => ({ font: {} }),
          };
        }

        xlsx = { writeBuffer };
      },
    }));

    const click = vi.fn();
    const remove = vi.fn();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue({
      click,
      remove,
      style: {},
      download: '',
      href: '',
      rel: '',
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});

    const { exportReportExcel } = await import('../../src/utils/exportReportHeavy');
    await exportReportExcel({
      sheetName: 'Trips',
      headers: ['Plate', 'Speed'],
      rows: [['TN-1234', '80']],
      filename: 'report.xlsx',
    });

    expect(addRow).toHaveBeenCalledWith(['Plate', 'Speed']);
    expect(addRow).toHaveBeenCalledWith(['TN-1234', '80']);
    expect(writeBuffer).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });
});
