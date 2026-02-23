import type { EditorType } from '@/types/editor';

// File extension to editor type mapping
const EDITOR_TYPE_MAP: Record<string, EditorType> = {
  // Code editors
  js: 'code',
  jsx: 'code',
  ts: 'code',
  tsx: 'code',
  py: 'code',
  java: 'code',
  cpp: 'code',
  c: 'code',
  h: 'code',
  hpp: 'code',
  cs: 'code',
  go: 'code',
  rs: 'code',
  rb: 'code',
  php: 'code',
  swift: 'code',
  kt: 'code',
  scala: 'code',
  vue: 'code',
  svelte: 'code',
  html: 'browser',
  css: 'code',
  scss: 'code',
  less: 'code',
  json: 'code',
  xml: 'code',
  yaml: 'code',
  yml: 'code',
  toml: 'code',
  ini: 'code',
  sh: 'code',
  bash: 'code',
  zsh: 'code',
  ps1: 'code',
  sql: 'code',
  graphql: 'code',
  md: 'markdown',
  txt: 'markdown',
  
  // Document editors (Microsoft Word)
  doc: 'document',
  docx: 'document',
  odt: 'document',
  rtf: 'document',
  
  // Spreadsheet editors (Microsoft Excel)
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  xlsm: 'spreadsheet',
  csv: 'spreadsheet',
  ods: 'spreadsheet',
  
  // Markdown (dedicated)
  mdx: 'markdown',
};

// Mime type to editor type mapping
const MIME_TYPE_MAP: Record<string, EditorType> = {
  // Code
  'text/plain': 'code',
  'text/javascript': 'code',
  'application/javascript': 'code',
  'text/typescript': 'code',
  'application/typescript': 'code',
  'text/python': 'code',
  'application/python': 'code',
  'text/html': 'browser',
  'text/css': 'code',
  'application/json': 'code',
  'application/xml': 'code',
  'text/xml': 'code',
  'application/yaml': 'code',
  'text/yaml': 'code',
  
  // Documents
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.oasis.opendocument.text': 'document',
  'application/rtf': 'document',
  'text/rtf': 'document',
  
  // Spreadsheets
  'application/vnd.ms-excel': 'spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'application/vnd.oasis.opendocument.spreadsheet': 'spreadsheet',
  'text/csv': 'spreadsheet',
  
  // Markdown
  'text/markdown': 'markdown',
  'text/x-markdown': 'markdown',
  'application/markdown': 'markdown',
  'application/x-markdown': 'markdown',
};

/**
 * Detect editor type from file path
 */
export function detectEditorTypeFromPath(filePath: string): EditorType {
  if (!filePath) {
    return 'code';
  }
  
  // Extract extension
  const lastDotIndex = filePath.lastIndexOf('.');
  const lastSlashIndex = filePath.lastIndexOf('/');
  const lastBackslashIndex = filePath.lastIndexOf('\\');
  
  // Handle files without extension or hidden files
  if (lastDotIndex === -1 || lastDotIndex < Math.max(lastSlashIndex, lastBackslashIndex)) {
    return 'code';
  }
  
  const extension = filePath.substring(lastDotIndex + 1).toLowerCase();
  
  // Check if it's a known extension
  if (extension in EDITOR_TYPE_MAP) {
    return EDITOR_TYPE_MAP[extension];
  }
  
  return 'code';
}

/**
 * Detect editor type from mime type
 */
export function detectEditorTypeFromMimeType(mimeType: string): EditorType {
  if (!mimeType) {
    return 'code';
  }
  
  const normalizedMime = mimeType.toLowerCase();
  
  if (normalizedMime in MIME_TYPE_MAP) {
    return MIME_TYPE_MAP[normalizedMime];
  }
  
  // Try to match by prefix
  if (normalizedMime.startsWith('text/')) {
    return 'code';
  }
  
  return 'code';
}

/**
 * Detect editor type from file content (basic heuristic)
 * Useful when no path or mime type is available
 */
export function detectEditorTypeFromContent(content: string): EditorType {
  if (!content || typeof content !== 'string') {
    return 'code';
  }
  
  const trimmed = content.trim();
  
  // Check for spreadsheet-like content (CSV)
  if (trimmed.includes(',') && (trimmed.split('\n')[0].split(',').length > 1)) {
    // Could be CSV
    const firstLine = trimmed.split('\n')[0];
    if (firstLine.split(',').length >= 2) {
      return 'spreadsheet';
    }
  }
  
  // Check for document-like content (Word XML or rich text)
  if (trimmed.startsWith('PK') && trimmed.includes('word/')) {
    // DOCX files start with PK (zip signature)
    return 'document';
  }
  
  // Check for Excel-like content
  if (trimmed.startsWith('PK') && trimmed.includes('xl/')) {
    // XLSX files start with PK (zip signature)
    return 'spreadsheet';
  }
  
  // Check for Markdown
  const markdownPatterns = [
    /^# .+$/m,           // Headers
    /^\*\*.*\*\*/m,      // Bold
    /^\*.*\*/m,          // Italic
    /^\[.+\]\(.+\)/m,    // Links
    /^```\w*$/m,         // Code blocks
    /^> .+$/m,           // Blockquotes
    /^- .+$/m,           // Unordered lists
    /^\d+\. .+$/m,       // Ordered lists
  ];
  
  let markdownScore = 0;
  for (const pattern of markdownPatterns) {
    if (pattern.test(trimmed)) {
      markdownScore++;
    }
  }
  
  if (markdownScore >= 2) {
    return 'markdown';
  }
  
  return 'code';
}

/**
 * Detect editor type from File object
 */
export function detectEditorTypeFromFile(file: File): EditorType {
  // Try mime type first
  if (file.type) {
    const type = detectEditorTypeFromMimeType(file.type);
    if (type !== 'code') {
      return type;
    }
  }
  
  // Fall back to name
  return detectEditorTypeFromPath(file.name);
}

/**
 * Main detection function - combines all methods
 */
export function detectEditorType(
  options: {
    path?: string;
    mimeType?: string;
    content?: string;
    file?: File;
  } = {}
): EditorType {
  const { path, mimeType, content, file } = options;
  
  // Priority: file object > path > mimeType > content
  if (file) {
    return detectEditorTypeFromFile(file);
  }
  
  if (path) {
    return detectEditorTypeFromPath(path);
  }
  
  if (mimeType) {
    return detectEditorTypeFromMimeType(mimeType);
  }
  
  if (content) {
    return detectEditorTypeFromContent(content);
  }
  
  return 'code';
}

/**
 * Get display name for editor type
 */
export function getEditorTypeName(type: EditorType): string {
  switch (type) {
    case 'document':
      return '文档';
    case 'spreadsheet':
      return '表格';
    case 'markdown':
      return 'Markdown';
    case 'browser':
      return '浏览器';
    case 'code':
    default:
      return '代码';
  }
}

/**
 * Get icon name for editor type (for use with lucide-react)
 */
export function getEditorTypeIcon(type: EditorType): string {
  switch (type) {
    case 'document':
      return 'FileText';
    case 'spreadsheet':
      return 'Table';
    case 'markdown':
      return 'FileJson';
    case 'browser':
      return 'Globe';
    case 'code':
    default:
      return 'FileCode';
  }
}

/**
 * Check if file type is supported
 */
export function isSupportedEditorType(type: EditorType): boolean {
  return ['code', 'document', 'spreadsheet', 'markdown'].includes(type);
}

/**
 * Check if file requires special editor (not basic code editor)
 */
export function requiresSpecialEditor(filePath: string): boolean {
  const type = detectEditorTypeFromPath(filePath);
  return type === 'document' || type === 'spreadsheet' || type === 'markdown';
}
