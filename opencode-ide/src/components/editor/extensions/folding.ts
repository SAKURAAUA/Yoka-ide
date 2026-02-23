import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// Type for Tiptap commands
type CommandReturn = boolean | void;
type CommandFn = (props: { commands: Record<string, unknown>; tr: unknown; state: unknown; dispatch: unknown }) => CommandReturn;
type CommandMap = Record<string, CommandFn>;

/**
 * HeadingFolding - Custom extension to add folding functionality to headings
 * Allows users to collapse/expand sections under headings
 */
export const HeadingFolding = Node.create({
  name: 'headingFolding',
  
  group: 'block',
  
  content: 'block+',
  
  defining: true,
  
  addAttributes() {
    return {
      level: {
        default: 1,
      },
      folded: {
        default: false,
        parseHTML: element => element.getAttribute('data-folded') === 'true',
        renderHTML: attributes => {
          return {
            'data-folded': attributes.folded,
          };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      { tag: 'div[data-heading-folding]' },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-heading-folding': '' }), 0];
  },
  
  addCommands() {
    return {
      toggleFold: () => ({ commands }: { commands: any }) => {
        // This would toggle the folding state
        // Implementation depends on specific requirements
        return true;
      },
    } as unknown as CommandMap;
  },
});

/**
 * Simple collapsible headings - a simpler approach using details/summary
 * This creates a collapsible section under a heading
 */
export const CollapsibleSection = Node.create({
  name: 'collapsibleSection',
  
  group: 'block',
  
  content: 'block+',
  
  defining: true,
  
  addAttributes() {
    return {
      collapsed: {
        default: false,
        parseHTML: element => element.getAttribute('data-collapsed') === 'true',
        renderHTML: attributes => {
          return {
            'data-collapsed': attributes.collapsed,
          };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      { tag: 'details' },
    ];
  },
  
  renderHTML({ HTMLAttributes, node }) {
    return ['details', mergeAttributes(HTMLAttributes, { 
      'data-collapsed': node.attrs.collapsed,
      open: !node.attrs.collapsed ? '' : undefined,
    }), ['summary', { 'data-type': 'collapsible-summary' }, 'Click to expand'], 0];
  },
  
  addCommands() {
    return {
      toggleCollapsed: () => ({ commands }: { commands: any }) => {
        return commands.updateAttributes(this.name, {
          collapsed: (current: boolean) => !current,
        });
      },
    } as unknown as CommandMap;
  },
});

/**
 * HeadingCollapse - Extension to collapse content under headings
 * Adds a button to the left of headings to collapse/expand
 */
export const HeadingCollapse = Node.create({
  name: 'headingCollapse',
  
  addOptions() {
    return {
      onCollapsedChange: null as ((collapsed: boolean, from: number, to: number) => void) | null,
    };
  },
  
  addAttributes() {
    return {
      collapsed: {
        default: false,
        parseHTML: element => element.getAttribute('data-heading-collapsed') === 'true',
        renderHTML: attributes => {
          return {
            'data-heading-collapsed': attributes.collapsed,
          };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      { tag: 'div[data-heading-collapse]' },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-heading-collapse': '' }), 0];
  },
  
  addCommands() {
    return {
      toggleHeadingCollapse: () => ({ commands }: { commands: any }) => {
        return commands.updateAttributes(this.name, {
          collapsed: (current: boolean) => !current,
        });
      },
      
      expandAllHeadings: () => ({ commands }: { commands: any }) => {
        // Find all collapsed headings and expand them
        return true;
      },
      
      collapseAllHeadings: () => ({ commands }: { commands: any }) => {
        // Find all headings and collapse them
        return true;
      },
    } as unknown as CommandMap;
  },
});

export default HeadingFolding;
