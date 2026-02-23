import { describe, it, expect } from 'vitest';
import { detectEditorType, detectEditorTypeFromPath, isSupportedEditorType } from './detectEditorType';

describe('detectEditorType', () => {
  describe('detectEditorTypeFromPath', () => {
    it('should detect code files', () => {
      expect(detectEditorTypeFromPath('src/index.ts')).toBe('code');
      expect(detectEditorTypeFromPath('src/App.jsx')).toBe('code');
      expect(detectEditorTypeFromPath('utils/helpers.py')).toBe('code');
      expect(detectEditorTypeFromPath('config.json')).toBe('code');
    });

    it('should detect document files', () => {
      expect(detectEditorTypeFromPath('document.docx')).toBe('document');
      expect(detectEditorTypeFromPath('report.doc')).toBe('document');
      expect(detectEditorTypeFromPath('notes.odt')).toBe('document');
    });

    it('should detect spreadsheet files', () => {
      expect(detectEditorTypeFromPath('data.xlsx')).toBe('spreadsheet');
      expect(detectEditorTypeFromPath('budget.xls')).toBe('spreadsheet');
      expect(detectEditorTypeFromPath('data.csv')).toBe('spreadsheet');
    });

    it('should detect markdown files', () => {
      expect(detectEditorTypeFromPath('readme.md')).toBe('code'); // .md maps to code
      expect(detectEditorTypeFromPath('guide.mdx')).toBe('markdown');
    });

    it('should default to code for unknown extensions', () => {
      expect(detectEditorTypeFromPath('somefile.xyz')).toBe('code');
      expect(detectEditorTypeFromPath('README')).toBe('code');
    });

    it('should handle files without extension', () => {
      expect(detectEditorTypeFromPath('Dockerfile')).toBe('code');
      expect(detectEditorTypeFromPath('Makefile')).toBe('code');
    });
  });

  describe('isSupportedEditorType', () => {
    it('should return true for supported types', () => {
      expect(isSupportedEditorType('code')).toBe(true);
      expect(isSupportedEditorType('document')).toBe(true);
      expect(isSupportedEditorType('spreadsheet')).toBe(true);
      expect(isSupportedEditorType('markdown')).toBe(true);
    });

    it('should return false for unsupported types', () => {
      expect(isSupportedEditorType('pdf')).toBe(false);
      expect(isSupportedEditorType('image')).toBe(false);
    });
  });
});
