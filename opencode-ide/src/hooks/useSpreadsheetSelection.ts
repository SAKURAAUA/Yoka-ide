import { useState, useEffect, useCallback } from 'react';

type Workbook = any;
type Sheet = any;
type Range = any;

export interface SpreadsheetSelection {
  unitId: string;
  sheetId: string;
  sheetName: string;
  // Selection range
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  // Convenience
  rowCount: number;
  colCount: number;
  // Cell values in selection
  values: unknown[][];
  // Selected text content (for drag)
  textContent: string;
}

interface UseSpreadsheetSelectionOptions {
  workbook: Workbook | null;
  sheet?: Sheet | null;
}

/**
 * Hook to track spreadsheet selection changes
 */
export function useSpreadsheetSelection(
  workbook: Workbook | null,
  initialSheet: Sheet | null = null
): {
  selection: SpreadsheetSelection | null;
  setSelection: (selection: SpreadsheetSelection | null) => void;
  getSelectedValues: () => unknown[][];
  getSelectedText: () => string;
  clearSelection: () => void;
  selectRange: (startRow: number, startCol: number, endRow: number, endCol: number) => void;
} {
  const [selection, setSelection] = useState<SpreadsheetSelection | null>(null);

  // Listen to selection changes
  useEffect(() => {
    if (!workbook || !initialSheet) return;

    const sheet = initialSheet;
    const unitId = workbook.getId();

    // Initial selection
    const ranges = sheet.getSelection().getActiveRangeList()?.getRanges() || [];
    if (ranges.length > 0) {
      updateSelectionFromRange(ranges[0], unitId, sheet);
    }

    // Subscribe to selection changes
    const disposable = sheet.getSelection().selectionInfo$.subscribe((info: any) => {
      const activeRange = sheet.getSelection().getActiveRange();
      if (activeRange) {
        updateSelectionFromRange(activeRange, unitId, sheet);
      }
    });

    function updateSelectionFromRange(range: Range, unitId: string, sheet: Sheet) {
      const startRow = range.startRow;
      const startCol = range.startColumn;
      const endRow = range.endRow;
      const endCol = range.endColumn;

      // Get cell values
      const values: unknown[][] = [];
      let textContent = '';

      for (let row = startRow; row <= endRow; row++) {
        const rowData: unknown[] = [];
        for (let col = startCol; col <= endCol; col++) {
          const cell = sheet.getCell(row, col);
          const value = cell?.getValue();
          rowData.push(value);
          if (textContent && value !== undefined && value !== null) {
            textContent += '\t';
          }
          if (value !== undefined && value !== null) {
            textContent += String(value);
          }
        }
        values.push(rowData);
      }

      const newSelection: SpreadsheetSelection = {
        unitId,
        sheetId: sheet.getSheetId(),
        sheetName: sheet.getName(),
        startRow,
        startCol,
        endRow,
        endCol,
        rowCount: endRow - startRow + 1,
        colCount: endCol - startCol + 1,
        values,
        textContent: textContent.trim(),
      };

      setSelection(newSelection);
    }

    return () => {
      disposable.dispose();
    };
  }, [workbook, initialSheet]);

  const getSelectedValues = useCallback(() => {
    return selection?.values || [];
  }, [selection]);

  const getSelectedText = useCallback(() => {
    return selection?.textContent || '';
  }, [selection]);

  const clearSelection = useCallback(() => {
    if (!workbook || !initialSheet) return;
    const sheet = initialSheet;
    sheet.getSelection().setSelection([]);
    setSelection(null);
  }, [workbook, initialSheet]);

  const selectRange = useCallback((
    startRow: number, 
    startCol: number, 
    endRow: number, 
    endCol: number
  ) => {
    if (!workbook || !initialSheet) return;
    
    // Note: Univer's API for programmatic selection may vary
    // This is a placeholder for the actual implementation
    console.warn('selectRange: Programmatic selection not fully implemented');
  }, [workbook, initialSheet]);

  return {
    selection,
    setSelection,
    getSelectedValues,
    getSelectedText,
    clearSelection,
    selectRange,
  };
}

/**
 * Hook to extract selected cells as a formatted string (for drag to AI input)
 */
export function useSpreadsheetSelectionAsText(workbook: Workbook | null, sheet: Sheet | null) {
  const { selection, getSelectedText } = useSpreadsheetSelection(workbook, sheet);
  const [asMarkdown, setAsMarkdown] = useState<string>('');
  const [asCSV, setAsCSV] = useState<string>('');

  useEffect(() => {
    if (!selection) {
      setAsMarkdown('');
      setAsCSV('');
      return;
    }

    const { values } = selection;
    
    // Convert to Markdown table
    let md = '';
    values.forEach((row, rowIndex) => {
      const rowStr = row.map(cell => {
        const str = String(cell ?? '');
        // Escape pipe characters
        return str.replace(/\|/g, '\\|');
      }).join(' | ');
      
      md += `| ${rowStr} |`;
      
      // Add separator after header
      if (rowIndex === 0) {
        md += '\n|' + row.map(() => '---').join(' | ') + ' |';
      }
      md += '\n';
    });
    setAsMarkdown(md);

    // Convert to CSV
    const csv = values.map(row => 
      row.map(cell => {
        const str = String(cell ?? '');
        // Quote if contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ).join('\n');
    setAsCSV(csv);

  }, [selection]);

  return {
    selection,
    asMarkdown,
    asCSV,
    asTSV: asCSV.replace(/,/g, '\t'),
  };
}

/**
 * Hook to get active sheet from workbook
 */
export function useActiveSheet(workbook: Workbook | null) {
  const [sheet, setSheet] = useState<Sheet | null>(null);

  useEffect(() => {
    if (!workbook) {
      setSheet(null);
      return;
    }

    // Get active sheet
    const activeSheet = workbook.getActiveSheet();
    setSheet(activeSheet);

    // Listen for sheet changes
    const disposable = workbook.activeSheet$.subscribe((newSheet: any) => {
      setSheet(newSheet);
    });

    return () => {
      disposable.dispose();
    };
  }, [workbook]);

  return sheet;
}

export default useSpreadsheetSelection;
