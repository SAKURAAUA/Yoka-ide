// OpenCode IDE - 编辑器类型定义
// 支持多格式编辑器：代码、文档、表格、Markdown

export type EditorType = 'code' | 'document' | 'spreadsheet' | 'markdown' | 'browser';

export interface EditorTab {
  id: string;
  type: EditorType;
  title: string;
  path?: string;
  content?: string;
  isDirty: boolean;
  icon?: string;
  canClose?: boolean;
}

export interface SelectionRange {
  editorType: EditorType;
  start: Position;
  end: Position;
  content: string;
  format: 'text' | 'markdown' | 'html';
}

export interface Position {
  line?: number;
  column?: number;
  offset?: number;
}

export interface DragDropPayload {
  type: 'selection' | 'file' | 'text';
  data: SelectionRange | File | string;
  source: string;
  position?: Position;
}
