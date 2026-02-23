import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import type { WorkbookData, SheetData } from '@/components/editor/UniverProvider';

/**
 * Convert docx file to HTML (for Tiptap)
 */
export async function docxToHtml(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}

/**
 * Convert docx file to Tiptap JSON
 */
export async function docxToTiptapJson(file: File): Promise<any> {
  const html = await docxToHtml(file);
  // Return as HTML for now - could add HTML to Tiptap conversion
  return { type: 'doc', content: html };
}

/**
 * Convert docx to raw text
 */
export async function docxToText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Convert Tiptap HTML content to docx
 */
export async function tiptapHtmlToDocx(html: string): Promise<Blob> {
  // Extract text from HTML (simplified - full conversion would need proper HTML parsing)
  const text = html.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
  
  return textToDocx(text);
}

/**
 * Convert plain text to docx
 */
export async function textToDocx(text: string): Promise<Blob> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun(text || ''),
          ],
        }),
      ],
    }],
  });
  
  const blob = await Packer.toBlob(doc);
  return blob;
}

/**
 * Convert Tiptap JSON to docx
 */
export async function tiptapJsonToDocx(json: any): Promise<Blob> {
  if (!json || !json.content) {
    return textToDocx('');
  }
  
  const children: Paragraph[] = [];
  
  for (const node of json.content) {
    const paragraph = convertNodeToParagraph(node);
    if (paragraph) {
      children.push(paragraph);
    }
  }
  
  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });
  
  return Packer.toBlob(doc);
}

function convertNodeToParagraph(node: any): Paragraph | null {
  if (!node) return null;
  
  switch (node.type) {
    case 'paragraph':
      return new Paragraph({
        children: node.content ? node.content.map((child: any) => convertInlineToTextRun(child)).filter(Boolean) : [],
      });
      
    case 'heading':
      const level = node.attrs?.level || 1;
      const headingLevel = mapHeadingLevel(level);
      return new Paragraph({
        children: node.content ? node.content.map((child: any) => convertInlineToTextRun(child)).filter(Boolean) : [],
        heading: headingLevel,
      });
      
    case 'bulletList':
      // Note: docx doesn't support simple bullet lists without proper numbering
      return new Paragraph({
        children: node.content ? node.content.map((item: any) => {
          return new TextRun('• ' + (item.content?.map((c: any) => c.text || '').join('') || ''));
        }) : [],
      });
      
    case 'codeBlock':
      return new Paragraph({
        children: [
          new TextRun({
            text: node.content?.[0]?.text || '',
            font: 'Courier New',
          }),
        ],
      });
      
    case 'blockquote':
      return new Paragraph({
        children: node.content ? node.content.map((child: any) => convertInlineToTextRun(child)).filter(Boolean) : [],
        indent: { left: 720 },
      });
      
    default:
      return null;
  }
}

function convertInlineToTextRun(node: any): TextRun | null {
  if (!node || node.type !== 'text') return null;
  
  let text = node.text || '';
  const props: any = {};
  
  if (node.marks) {
    for (const mark of node.marks) {
      switch (mark.type) {
        case 'bold':
          props.bold = true;
          break;
        case 'italic':
          props.italics = true;
          break;
        case 'strike':
          props.strike = true;
          break;
        case 'code':
          props.font = 'Courier New';
          break;
      }
    }
  }
  
  return new TextRun({ text, ...props });
}

function mapHeadingLevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  switch (level) {
    case 1: return HeadingLevel.HEADING_1;
    case 2: return HeadingLevel.HEADING_2;
    case 3: return HeadingLevel.HEADING_3;
    case 4: return HeadingLevel.HEADING_4;
    case 5: return HeadingLevel.HEADING_5;
    case 6: return HeadingLevel.HEADING_6;
    default: return HeadingLevel.HEADING_1;
  }
}

/**
 * Export workbook data to xlsx (using existing xlsxConverter)
 */
export { exportXlsx, importXlsx, importXlsxFromArrayBuffer, downloadXlsx } from './xlsxConverter';
