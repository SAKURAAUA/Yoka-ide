'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { Univer, LocaleType, LogLevel, UniverInstanceType } from '@univerjs/core';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverUIPlugin } from '@univerjs/ui';
import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverSheetsPlugin } from '@univerjs/sheets';
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui';
import { UniverSheetsCorePreset, type IUniverSheetsCorePresetConfig } from '@univerjs/preset-sheets-core';

export interface UniverContextValue {
  univer: Univer | null;
  isReady: boolean;
  error: Error | null;
  createWorkbook: (data?: WorkbookData) => { workbook: any; unitId: string } | null;
}

export interface WorkbookData {
  id?: string;
  name?: string;
  sheetOrder?: string[];
  sheets?: Record<string, SheetData>;
  styles?: Record<string, unknown>;
}

export interface SheetData {
  id: string;
  name: string;
  cellData?: Record<number, Record<number, CellData>>;
  rowCount?: number;
  columnCount?: number;
  defaultColumnWidth?: number;
  defaultRowHeight?: number;
}

export interface CellData {
  v?: unknown;
  t?: number;
  f?: string;
  s?: string;
}

const UniverContext = createContext<UniverContextValue | null>(null);

/**
 * Default workbook data for new spreadsheets
 */
export const DEFAULT_WORKBOOK_DATA: WorkbookData = {
  id: `workbook-${Date.now()}`,
  name: 'Untitled Spreadsheet',
  sheetOrder: ['sheet-01'],
  sheets: {
    'sheet-01': {
      id: 'sheet-01',
      name: 'Sheet 1',
      cellData: {
        0: {
          0: { v: '' },
        },
      },
      rowCount: 1000,
      columnCount: 26,
      defaultColumnWidth: 88,
      defaultRowHeight: 24,
    },
  },
  styles: {},
};

interface UniverProviderProps {
  children: ReactNode;
  containerId?: string;
  locale?: LocaleType;
  onReady?: (univer: Univer) => void;
}

export function UniverProvider({ 
  children, 
  containerId = 'univer-container',
  locale = LocaleType.ZH_CN,
  onReady 
}: UniverProviderProps) {
  const [univer, setUniver] = useState<Univer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let instance: Univer | null = null;
    let isMounted = true;

    const initUniver = async () => {
      try {
        // Create Univer instance with preset
        const presetConfig = {
          container: containerId,
          header: true,
          toolbar: true,
          formulaBar: true,
          statusBarStatistic: true,
        } as unknown as IUniverSheetsCorePresetConfig;

        instance = new Univer({
          locale,
          logLevel: LogLevel.WARN,
        });

        // Register plugins
        instance.registerPlugin(UniverRenderEnginePlugin);
        
        // Use UI plugin with container
        instance.registerPlugin(UniverUIPlugin, {
          container: containerId,
          header: true,
          toolbar: true,
        });
        
        instance.registerPlugin(UniverDocsPlugin);
        instance.registerPlugin(UniverSheetsPlugin);
        instance.registerPlugin(UniverSheetsUIPlugin);

        // Register preset
        (instance as any).registerPlugin(UniverSheetsCorePreset, presetConfig);

        if (isMounted) {
          setUniver(instance);
          setIsReady(true);
          onReady?.(instance);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize Univer'));
        }
      }
    };

    initUniver();

    return () => {
      isMounted = false;
      if (instance) {
        instance.dispose();
      }
    };
  }, [containerId, locale, onReady]);

  const createWorkbook = useCallback((data?: WorkbookData): { workbook: any; unitId: string } | null => {
    if (!univer) return null;
    
    const workbookData: WorkbookData = {
      ...(data || DEFAULT_WORKBOOK_DATA),
      id: data?.id || DEFAULT_WORKBOOK_DATA.id || `workbook-${Date.now()}`,
    };
    
    try {
      const workbook = univer.createUnit(
        UniverInstanceType.UNIVER_SHEET,
        workbookData
      );
      return { workbook, unitId: workbookData.id as string };
    } catch (err) {
      console.error('Failed to create workbook:', err);
      return null;
    }
  }, [univer]);

  const value = useMemo<UniverContextValue>(() => ({
    univer,
    isReady,
    error,
    createWorkbook,
  }), [univer, isReady, error, createWorkbook]);

  return (
    <UniverContext.Provider value={value}>
      {children}
    </UniverContext.Provider>
  );
}

export function useUniver(): UniverContextValue {
  const context = useContext(UniverContext);
  if (!context) {
    throw new Error('useUniver must be used within a UniverProvider');
  }
  return context;
}

export function useUniverWorkbook(unitId?: string): any | null {
  const { univer, isReady } = useUniver();
  const [workbook, setWorkbook] = useState<any | null>(null);

  useEffect(() => {
    if (!univer || !isReady) return;

    if (unitId) {
      const wb = (univer as any).getInstance?.(unitId) || null;
      setWorkbook(wb);
    } else {
      // Get the first workbook
      const instances = (univer as any).getAllUnitsByType?.(UniverInstanceType.UNIVER_SHEET) || [];
      setWorkbook(instances[0] || null);
    }
  }, [univer, isReady, unitId]);

  return workbook;
}

export default UniverProvider;
