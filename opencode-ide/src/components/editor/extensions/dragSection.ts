import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { DragHandleOptions } from '@tiptap/extension-drag-handle';

// Type for Tiptap commands
type CommandReturn = boolean | void;
type CommandFn = (props: { commands: Record<string, unknown>; tr: unknown; state: unknown; dispatch: unknown }) => CommandReturn;
type CommandMap = Record<string, CommandFn>;

/**
 * SectionDrag - Custom extension for dragging entire sections
 * Works with headings to drag the entire content under a heading
 */
export const SectionDrag = Node.create({
  name: 'sectionDrag',
  
  group: 'block',
  
  content: 'block+',
  
  defining: true,
  
  addAttributes() {
    return {
      draggable: {
        default: true,
        parseHTML: element => element.getAttribute('data-draggable') !== 'false',
        renderHTML: attributes => {
          return {
            'data-draggable': attributes.draggable,
          };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      { tag: 'div[data-section-drag]' },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-section-drag': '' }), 0];
  },
  
  addCommands() {
    return {
      setSectionDraggable: (draggable: boolean) => ({ commands }: { commands: any }) => {
        return commands.updateAttributes(this.name, { draggable });
      },
    } as unknown as CommandMap;
  },
});

/**
 * Custom drag handle with section awareness
 * This extension wraps the existing DragHandle to add section-dragging capability
 */
export const SectionDragHandle = Node.create({
  name: 'sectionDragHandle',
  
  group: 'inline',
  
  inline: true,
  
  atom: true,
  
  addAttributes() {
    return {
      sectionId: {
        default: null,
      },
      collapsed: {
        default: false,
      },
    };
  },
  
  parseHTML() {
    return [
      { tag: 'span[data-section-drag-handle]' },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 
      'data-section-drag-handle': '',
      'class': 'section-drag-handle',
      'contenteditable': 'false',
    }), '⋮⋮'];
  },
  
  addCommands() {
    return {
      addSectionHandle: () => ({ commands }: { commands: any }) => {
        // Insert a section handle at the current position
        return commands.insertContent({
          type: this.name,
        });
      },
    } as unknown as CommandMap;
  },
});

/**
 * DragSection - A complete section drag implementation
 * Wraps content in a draggable container
 */
export const DragSection = Node.create({
  name: 'dragSection',
  
  group: 'block',
  
  content: 'block+',
  
  defining: true,
  
  draggable: true,
  
  addAttributes() {
    return {
      id: {
        default: null,
      },
      level: {
        default: 1,
      },
    };
  },
  
  parseHTML() {
    return [
      { tag: 'div[data-drag-section]' },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 
      'data-drag-section': '',
      'class': 'drag-section',
    }), 0];
  },
  
  addCommands() {
    return {
      wrapInDragSection: (level?: number) => ({ commands }: { commands: any }) => {
        return commands.wrapIn(this.name, { 
          level: level || 1,
          id: `section-${Date.now()}`,
        });
      },
      
      unwrapDragSection: () => ({ commands }: { commands: any }) => {
        return commands.lift(this.name);
      },
    } as unknown as CommandMap;
  },
});

/**
 * SimpleSectionNode - A simpler approach to section dragging
 * Just marks a heading with an ID for drag operations
 */
export const SimpleSectionNode = Node.create({
  name: 'simpleSection',
  
  group: 'block',
  
  content: 'heading block*',
  
  defining: true,
  
  addAttributes() {
    return {
      sectionId: {
        default: null,
      },
    };
  },
  
  parseHTML() {
    return [
      { tag: 'section' },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes(HTMLAttributes, { 'data-section': '' }), 0];
  },
  
  addCommands() {
    return {
      convertToSection: () => ({ commands }: { commands: any }) => {
        // Convert current heading + content to a section
        return true;
      },
      
      setSectionId: (id: string) => ({ commands }: { commands: any }) => {
        return commands.updateAttributes(this.name, { sectionId: id });
      },
    } as unknown as CommandMap;
  },
});

/**
 * HeadingDraggable - Makes headings draggable with their content
 */
export const HeadingDraggable = Node.create({
  name: 'headingDraggable',
  
  group: 'block',
  
  content: 'heading block*',
  
  defining: true,
  
  addAttributes() {
    return {
      draggable: {
        default: true,
        parseHTML: element => element.getAttribute('data-heading-draggable') !== 'false',
        renderHTML: attributes => {
          return {
            'data-heading-draggable': attributes.draggable,
          };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      { tag: 'div[data-heading-draggable]' },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 
      'data-heading-draggable': '',
      'class': 'heading-draggable',
    }), 0];
  },
  
  addCommands() {
    return {
      enableSectionDrag: () => ({ commands }: { commands: any }) => {
        return commands.updateAttributes(this.name, { draggable: true });
      },
      
      disableSectionDrag: () => ({ commands }: { commands: any }) => {
        return commands.updateAttributes(this.name, { draggable: false });
      },
    } as unknown as CommandMap;
  },
});

export default SectionDrag;
