import * as XLSX from 'xlsx';
import type { WorkbookData, SheetData, CellData } from '@/components/editor/UniverProvider';

/**
 * Import an xlsx file and convert to Univer WorkbookData
 */
export function importXlsx(file: File): Promise<WorkbookData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const workbookData: WorkbookData = {
          id: `workbook-${Date.now()}`,
          name: workbook.Props?.Title || 'Imported Spreadsheet',
          sheetOrder: [],
          sheets: {},
          styles: {},
        };
        
        // Convert each sheet
        workbook.SheetNames.forEach((sheetName, index) => {
          const sheetNameId = `sheet-${index + 1}`;
          workbookData.sheetOrder!.push(sheetNameId);
          
          const worksheet = workbook.Sheets[sheetName];
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          
          // Convert to Univer cell data format
          const cellData: Record<number, Record<number, CellData>> = {};
          
          for (let r = range.s.r; r <= range.e.r; r++) {
            cellData[r] = {};
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cellRef = XLSX.utils.encode_cell({ r, c });
              const xlsxCell = worksheet[cellRef];
              
              if (xlsxCell) {
                const cell: CellData = {};
                
                // Value
                if (xlsxCell.v !== undefined) {
                  cell.v = xlsxCell.v;
                }
                
                // Type
                if (xlsxCell.t) {
                  switch (xlsxCell.t) {
                    case 'n': // number
                      cell.t = 2;
                      break;
                    case 's': // string
                      cell.t = 1;
                      break;
                    case 'b': // boolean
                      cell.t = 4;
                      break;
                    case 'e': // error
                      cell.t = 5;
                      break;
                  }
                }
                
                // Formula
                if (xlsxCell.f) {
                  cell.f = xlsxCell.f.f;
                }
                
                // Style reference
                // Note: xlsx doesn't expose style IDs directly, would need additional mapping
                
                cellData[r][c] = cell;
              }
            }
          }
          
          const sheetData: SheetData = {
            id: sheetNameId,
            name: sheetName,
            cellData,
            rowCount: range.e.r + 1,
            columnCount: range.e.c + 1,
            defaultColumnWidth: worksheet['!cols']?.[0]?.wpx || 88,
            defaultRowHeight: worksheet['!rows']?.[0]?.hpx || 24,
          };
          
          workbookData.sheets![sheetNameId] = sheetData;
        });
        
        resolve(workbookData);
      } catch (error) {
        reject(new Error(`Failed to parse xlsx file: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsBinaryString(file);
  });
}

/**
 * Import xlsx from ArrayBuffer
 */
export function importXlsxFromArrayBuffer(buffer: ArrayBuffer): WorkbookData {
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  const workbookData: WorkbookData = {
    id: `workbook-${Date.now()}`,
    name: workbook.Props?.Title || 'Imported Spreadsheet',
    sheetOrder: [],
    sheets: {},
    styles: {},
  };
  
  workbook.SheetNames.forEach((sheetName, index) => {
    const sheetNameId = `sheet-${index + 1}`;
    workbookData.sheetOrder!.push(sheetNameId);
    
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    const cellData: Record<number, Record<number, CellData>> = {};
    
    for (let r = range.s.r; r <= range.e.r; r++) {
      cellData[r] = {};
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const xlsxCell = worksheet[cellRef];
        
        if (xlsxCell) {
          const cell: CellData = {};
          
          if (xlsxCell.v !== undefined) {
            cell.v = xlsxCell.v;
          }
          
          if (xlsxCell.t) {
            switch (xlsxCell.t) {
              case 'n': cell.t = 2; break;
              case 's': cell.t = 1; break;
              case 'b': cell.t = 4; break;
              case 'e': cell.t = 5; break;
            }
          }
          
          if (xlsxCell.f) {
            cell.f = xlsxCell.f.f;
          }
          
          cellData[r][c] = cell;
        }
      }
    }
    
    workbookData.sheets![sheetNameId] = {
      id: sheetNameId,
      name: sheetName,
      cellData,
      rowCount: range.e.r + 1,
      columnCount: range.e.c + 1,
    };
  });
  
  return workbookData;
}

/**
 * Export Univer workbook to xlsx file
 */
export function exportXlsx(workbookData: WorkbookData): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  
  if (workbookData.sheetOrder) {
    workbookData.sheetOrder.forEach((sheetId) => {
      const sheetData = workbookData.sheets?.[sheetId];
      if (!sheetData) return;
      
      // Convert Univer cell data to xlsx format
      const worksheet: XLSX.WorkSheet = {};
      
      // Set sheet name
      // Note: xlsx requires unique names
      let sheetName = sheetData.name || `Sheet ${sheetId}`;
      if (workbook.SheetNames.includes(sheetName)) {
        let counter = 1;
        while (workbook.SheetNames.includes(`${sheetName} (${counter})`)) {
          counter++;
        }
        sheetName = `${sheetName} (${counter})`;
      }
      
      // Convert cell data
      if (sheetData.cellData) {
        Object.entries(sheetData.cellData).forEach(([rowKey, rowData]) => {
          const row = parseInt(rowKey, 10);
          
          Object.entries(rowData).forEach(([colKey, cell]) => {
            const col = parseInt(colKey, 10);
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
            
            const xlsxCell: Partial<XLSX.CellObject> = {};
            
            // Value
            if (cell.v !== undefined && cell.v !== null) {
              // Cast to XLSX accepted value types (string, number, boolean, Date)
              xlsxCell.v = cell.v as string | number | boolean | Date;
            }
            
            // Formula
            if (cell.f) {
              // Formula is just the formula string in xlsx
              xlsxCell.f = cell.f as XLSX.CellObject['f'];
            }
            
            // Type
            if (cell.t !== undefined) {
              switch (cell.t) {
                case 1: xlsxCell.t = 's'; break; // string
                case 2: xlsxCell.t = 'n'; break; // number
                case 4: xlsxCell.t = 'b'; break; // boolean
                case 5: xlsxCell.t = 'e'; break; // error
              }
            }
            
            worksheet[cellRef] = xlsxCell as XLSX.CellObject;
          });
        });
      }
      
      // Set range
      const rowCount = sheetData.rowCount || 1000;
      const colCount = sheetData.columnCount || 26;
      worksheet['!ref'] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: rowCount - 1, c: colCount - 1 },
      });
      
      // Column widths
      if (sheetData.defaultColumnWidth) {
        worksheet['!cols'] = [{ wpx: sheetData.defaultColumnWidth }];
      }
      
      // Row heights
      if (sheetData.defaultRowHeight) {
        worksheet['!rows'] = [{ hpx: sheetData.defaultRowHeight }];
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
  }
  
  // Write to buffer
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return buffer;
}

/**
 * Download workbook data as xlsx file
 */
export function downloadXlsx(workbookData: WorkbookData, filename?: string): void {
  const buffer = exportXlsx(workbookData);
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${workbookData.name || 'spreadsheet'}.xlsx`;
  
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(link);
}

/**
 * Get worksheet data as 2D array (for easy processing)
 */
export function getSheetDataAsArray(sheetData: SheetData): unknown[][] {
  const result: unknown[][] = [];
  
  if (!sheetData.cellData) return result;
  
  const rows = Object.keys(sheetData.cellData).map(Number).sort((a, b) => a - b);
  
  rows.forEach((row) => {
    const rowData: unknown[] = [];
    const cols = Object.keys(sheetData.cellData![row] || {}).map(Number).sort((a, b) => a - b);
    
    cols.forEach((col) => {
      const cell = sheetData.cellData![row][col];
      rowData.push(cell?.v ?? '');
    });
    
    result.push(rowData);
  });
  
  return result;
}

/**
 * Create sheet data from 2D array
 */
export function createSheetDataFromArray(
  array: unknown[][], 
  sheetName: string = 'Sheet 1',
  sheetId: string = 'sheet-01'
): SheetData {
  const cellData: Record<number, Record<number, CellData>> = {};
  
  array.forEach((row, rowIndex) => {
    cellData[rowIndex] = {};
    row.forEach((cellValue, colIndex) => {
      cellData[rowIndex][colIndex] = { v: cellValue };
    });
  });
  
  return {
    id: sheetId,
    name: sheetName,
    cellData,
    rowCount: array.length,
    columnCount: array[0]?.length || 0,
  };
}
