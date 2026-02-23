'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { UniverInstanceType, type Workbook } from '@univerjs/core';
import { UniverProvider, useUniver, type WorkbookData } from './UniverProvider';
import { importXlsx, exportXlsx, downloadXlsx } from '@/lib/editor/xlsxConverter';
import { Table, Upload, Download, Plus, X } from 'lucide-react';

export interface SpreadsheetEditorProps {
  initialData?: WorkbookData;
  onChange?: (data: WorkbookData) => void;
  onSelectionChange?: (selection: SelectionRange | null) => void;
  containerId?: string;
}

export interface SelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  values: unknown[][];
}

/**
 * SpreadsheetEditor - Wraps Univer in a React component
 * Handles file import/export and selection tracking
 */
export function SpreadsheetEditor({
  initialData,
  onChange,
  onSelectionChange,
  containerId = 'spreadsheet-container',
}: SpreadsheetEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isReady, error, createWorkbook, univer } = useUniver();
  const [workbookId, setWorkbookId] = useState<string | null>(null);

  // Initialize workbook
  useEffect(() => {
    if (!isReady || !createWorkbook) return;

    const created = createWorkbook(initialData);
    if (created) {
      setWorkbookId(created.unitId);
    }
  }, [isReady, createWorkbook, initialData]);

  // Handle file import
  const handleImport = useCallback(async (file: File) => {
    try {
      const data = await importXlsx(file);
      const created = createWorkbook(data);
      if (created) {
        setWorkbookId(created.unitId);
        onChange?.(data);
      }
    } catch (err) {
      console.error('Failed to import file:', err);
    }
  }, [createWorkbook, onChange]);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleImport(file);
    }
  }, [handleImport]);

  // Handle export
  const handleExport = useCallback(() => {
    if (!univer || !workbookId) return;
    
    try {
      const getAllUnitsByType = (univer as any).getAllUnitsByType;
      if (typeof getAllUnitsByType !== 'function') return;
      const workbooks = getAllUnitsByType.call(univer, UniverInstanceType.UNIVER_SHEET) as Workbook[];
      const wb = workbooks.find((unit) => {
        const unitIdGetter = (unit as any).getUnitId;
        if (typeof unitIdGetter === 'function') {
          return unitIdGetter.call(unit) === workbookId;
        }
        return (unit as any).id === workbookId;
      });
      if (wb) {
        const snapshot = wb.getSnapshot();
        const buffer = exportXlsx(snapshot as unknown as WorkbookData);
        const blob = new Blob([buffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'spreadsheet.xlsx';
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export file:', err);
    }
  }, [univer, workbookId]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 text-red-600 p-4">
        <div className="text-center">
          <Table size={48} className="mx-auto mb-2 opacity-50" />
          <p>Failed to initialize spreadsheet editor</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <button
          className="flex items-center gap-1 px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
          onClick={() => fileInputRef.current?.click()}
          title="Import xlsx"
        >
          <Upload size={14} />
          <span>Import</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
          }}
        />
        
        <button
          className="flex items-center gap-1 px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
          onClick={handleExport}
          disabled={!workbookId}
          title="Export xlsx"
        >
          <Download size={14} />
          <span>Export</span>
        </button>
        
        <div className="flex-1" />
        
        <span className="text-xs text-gray-500">
          {isReady ? 'Ready' : 'Loading...'}
        </span>
      </div>

      {/* Univer Container */}
      <div
        ref={containerRef}
        id={containerId}
        className="flex-1"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {!isReady && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <Table size={48} className="mx-auto mb-4 opacity-50" />
              <p>Initializing spreadsheet editor...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * SpreadsheetEditorWithProvider - SpreadsheetEditor with UniverProvider
 * Use this when you don't have a parent UniverProvider
 */
export function SpreadsheetEditorWithProvider(props: SpreadsheetEditorProps) {
  return (
    <UniverProvider containerId={props.containerId || 'spreadsheet-container'}>
      <SpreadsheetEditor {...props} />
    </UniverProvider>
  );
}

export default SpreadsheetEditor;
