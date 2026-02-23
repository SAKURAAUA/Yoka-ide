import type { EditorType } from '@/types/editor';

/**
 * Selection data from any editor type
 */
export interface SelectionData {
  // Source info
  editorType: EditorType;
  sourceId?: string;
  sourceName?: string;
  
  // Content
  text: string;
  html?: string;
  markdown?: string;
  json?: any;
  
  // Format options for AI input
  formattedText?: string;
  asMarkdownTable?: string;
  asCSV?: string;
  asTSV?: string;
  
  // Metadata
  timestamp: number;
  selectionRange?: {
    start: number;
    end: number;
  };
}

/**
 * DragDropPayload - data transferred during drag
 */
export interface DragDropPayload {
  selection: SelectionData;
  format: 'text' | 'markdown' | 'html' | 'json';
}

/**
 * Convert selection to AI-friendly format
 */
export function formatSelectionForAI(selection: SelectionData): string {
  // Priority: markdown > html > text
  if (selection.asMarkdownTable) {
    return selection.asMarkdownTable;
  }
  
  if (selection.markdown) {
    return selection.markdown;
  }
  
  if (selection.html) {
    return selection.html;
  }
  
  return selection.text;
}

/**
 * Create drag data for HTML5 drag and drop
 */
export function createDragData(selection: SelectionData, format: DragDropPayload['format'] = 'text'): DragDropPayload {
  return {
    selection,
    format,
  };
}

/**
 * Serialize drag data for transfer
 */
export function serializeDragData(payload: DragDropPayload): string {
  return JSON.stringify(payload);
}

/**
 * Parse drag data from transfer
 */
export function parseDragData(data: string): DragDropPayload | null {
  try {
    return JSON.parse(data) as DragDropPayload;
  } catch {
    return null;
  }
}

/**
 * Set drag data to dataTransfer
 */
export function setDragData(
  event: DragEvent,
  selection: SelectionData,
  format: DragDropPayload['format'] = 'text'
): void {
  const payload = createDragData(selection, format);
  
  // Set text format (fallback)
  event.dataTransfer?.setData('text/plain', formatSelectionForAI(selection));
  
  // Set JSON format for internal use
  event.dataTransfer?.setData('application/json', serializeDragData(payload));
  
  // Set custom format
  event.dataTransfer?.setData('x-opencode-editor/selection', serializeDragData(payload));
}

/**
 * Get drag data from drag event
 */
export function getDragData(event: DragEvent): DragDropPayload | null {
  // Try custom format first
  const customData = event.dataTransfer?.getData('x-opencode-editor/selection');
  if (customData) {
    return parseDragData(customData);
  }
  
  // Try JSON format
  const jsonData = event.dataTransfer?.getData('application/json');
  if (jsonData) {
    return parseDragData(jsonData);
  }
  
  // Fall back to plain text
  const textData = event.dataTransfer?.getData('text/plain');
  if (textData) {
    return {
      selection: {
        editorType: 'code',
        text: textData,
        timestamp: Date.now(),
      },
      format: 'text',
    };
  }
  
  return null;
}

/**
 * Check if drag event contains editor selection
 */
export function isEditorDragEvent(event: DragEvent): boolean {
  const formats = event.dataTransfer?.types || [];
  return formats.includes('x-opencode-editor/selection') || 
         formats.includes('application/json');
}

/**
 * Convert spreadsheet selection to markdown table
 */
export function spreadsheetToMarkdown(values: unknown[][]): string {
  if (!values || values.length === 0) return '';
  
  let markdown = '';
  
  values.forEach((row, index) => {
    const rowStr = row.map(cell => {
      const str = String(cell ?? '');
      // Escape pipe characters
      return str.replace(/\|/g, '\\|');
    }).join(' | ');
    
    markdown += `| ${rowStr} |`;
    
    // Add separator after first row (header)
    if (index === 0) {
      markdown += '\n|' + row.map(() => '---').join(' | ') + ' |';
    }
    markdown += '\n';
  });
  
  return markdown.trim();
}

/**
 * Convert spreadsheet selection to CSV
 */
export function spreadsheetToCSV(values: unknown[][]): string {
  if (!values || values.length === 0) return '';
  
  return values.map(row => 
    row.map(cell => {
      const str = String(cell ?? '');
      // Quote if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');
}

/**
 * Convert spreadsheet selection to TSV
 */
export function spreadsheetToTSV(values: unknown[][]): string {
  if (!values || values.length === 0) return '';
  
  return values.map(row => 
    row.map(cell => String(cell ?? '')).join('\t')
  ).join('\n');
}

/**
 * Create selection from code editor
 */
export function createCodeSelection(
  text: string,
  sourceId?: string,
  sourceName?: string,
  selectionRange?: { start: number; end: number }
): SelectionData {
  return {
    editorType: 'code',
    sourceId,
    sourceName,
    text,
    formattedText: text,
    timestamp: Date.now(),
    selectionRange,
  };
}

/**
 * Create selection from document editor
 */
export function createDocumentSelection(
  text: string,
  html: string,
  sourceId?: string,
  sourceName?: string,
  selectionRange?: { start: number; end: number }
): SelectionData {
  // Convert HTML to basic markdown
  const markdown = htmlToMarkdown(html);
  
  return {
    editorType: 'document',
    sourceId,
    sourceName,
    text,
    html,
    markdown,
    formattedText: markdown,
    timestamp: Date.now(),
    selectionRange,
  };
}

/**
 * Create selection from spreadsheet
 */
export function createSpreadsheetSelection(
  values: unknown[][],
  sourceId?: string,
  sourceName?: string
): SelectionData {
  const text = spreadsheetToTSV(values);
  const asMarkdownTable = spreadsheetToMarkdown(values);
  const asCSV = spreadsheetToCSV(values);
  const asTSV = spreadsheetToTSV(values);
  
  return {
    editorType: 'spreadsheet',
    sourceId,
    sourceName,
    text,
    asMarkdownTable,
    asCSV,
    asTSV,
    formattedText: asMarkdownTable || text,
    timestamp: Date.now(),
  };
}

/**
 * Create selection from markdown editor
 */
export function createMarkdownSelection(
  markdown: string,
  sourceId?: string,
  sourceName?: string,
  selectionRange?: { start: number; end: number }
): SelectionData {
  return {
    editorType: 'markdown',
    sourceId,
    sourceName,
    text: markdown,
    markdown,
    formattedText: markdown,
    timestamp: Date.now(),
    selectionRange,
  };
}

/**
 * Simple HTML to Markdown conversion
 */
function htmlToMarkdown(html: string): string {
  let markdown = html;
  
  // Headers
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
  
  // Bold and italic
  markdown = markdown.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i>(.*?)<\/i>/gi, '*$1*');
  
  // Code
  markdown = markdown.replace(/<code>(.*?)<\/code>/gi, '`$1`');
  markdown = markdown.replace(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');
  
  // Links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Lists
  markdown = markdown.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
  markdown = markdown.replace(/<ul[^>]*>|<\/ul>/gi, '');
  markdown = markdown.replace(/<ol[^>]*>|<\/ol>/gi, '');
  
  // Blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n\n');
  
  // Paragraphs and line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
  markdown = markdown.replace(/<\/p>/gi, '\n\n');
  markdown = markdown.replace(/<p[^>]*>/gi, '');
  
  // Clean up remaining tags
  markdown = markdown.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  markdown = markdown.replace(/&nbsp;/g, ' ');
  markdown = markdown.replace(/&amp;/g, '&');
  markdown = markdown.replace(/&lt;/g, '<');
  markdown = markdown.replace(/&gt;/g, '>');
  markdown = markdown.replace(/&quot;/g, '"');
  
  // Clean up whitespace
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  
  return markdown.trim();
}

export default {
  formatSelectionForAI,
  createDragData,
  serializeDragData,
  parseDragData,
  setDragData,
  getDragData,
  isEditorDragEvent,
  spreadsheetToMarkdown,
  spreadsheetToCSV,
  spreadsheetToTSV,
  createCodeSelection,
  createDocumentSelection,
  createSpreadsheetSelection,
  createMarkdownSelection,
};
