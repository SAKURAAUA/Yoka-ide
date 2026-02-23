import { useCallback } from 'react';
import type React from 'react';
import { getDragData, isEditorDragEvent, formatSelectionForAI, type SelectionData, type DragDropPayload } from '@/lib/editor/selectionDragDrop';

export interface EditorDropHandlerOptions {
  /**
   * Callback when valid editor content is dropped
   */
  onEditorContentDrop?: (selection: SelectionData) => void;
  
  /**
   * Callback when any content is dropped
   */
  onDrop?: (data: DragDropPayload | null, event: DragEvent) => void;
  
  /**
   * Enable/disable the handler
   */
  enabled?: boolean;
  
  /**
   * Custom filter for accepting drops
   */
  accept?: (event: DragEvent) => boolean;
}

/**
 * Hook to handle editor content drops into chat input
 */
export function useEditorDropHandler(options: EditorDropHandlerOptions = {}) {
  const { 
    onEditorContentDrop, 
    onDrop,
    enabled = true,
    accept 
  } = options;

  /**
   * Handle drop event from editor
   */
  const handleDrop = useCallback((event: DragEvent) => {
    if (!enabled) return;

    // Check if custom accept function rejects
    if (accept && !accept(event)) {
      return;
    }

    // Try to get editor drag data
    const payload = getDragData(event);

    if (payload) {
      // Valid editor content dropped
      onEditorContentDrop?.(payload.selection);
      onDrop?.(payload, event);
    } else {
      // Not editor content - try regular file or text
      onDrop?.(null, event);
    }
  }, [enabled, accept, onEditorContentDrop, onDrop]);

  /**
   * Check if a drag event contains editor content
   */
  const isEditorDrop = useCallback((event: DragEvent): boolean => {
    return isEditorDragEvent(event);
  }, []);

  /**
   * Get the selection data from a drag event without handling the drop
   */
  const extractSelection = useCallback((event: DragEvent): SelectionData | null => {
    const payload = getDragData(event);
    return payload?.selection || null;
  }, []);

  /**
   * Format selection for AI input
   */
  const formatForAI = useCallback((selection: SelectionData): string => {
    return formatSelectionForAI(selection);
  }, []);

  /**
   * Create a drop handler for a specific element
   */
  const createDropHandler = useCallback((element: HTMLElement | null) => {
    if (!element || !enabled) return () => {};

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      event.dataTransfer!.dropEffect = 'copy';
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      
      // Check if custom accept function rejects
      if (accept && !accept(event)) {
        return;
      }

      const payload = getDragData(event);

      if (payload) {
        onEditorContentDrop?.(payload.selection);
        onDrop?.(payload, event);
      } else {
        onDrop?.(null, event);
      }
    };

    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('drop', handleDrop);

    return () => {
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('drop', handleDrop);
    };
  }, [enabled, accept, onEditorContentDrop, onDrop]);

  return {
    handleDrop,
    isEditorDrop,
    extractSelection,
    formatForAI,
    createDropHandler,
  };
}

/**
 * Hook to make an element a drop target for editor content
 */
export function useEditorDropTarget(
  ref: React.RefObject<HTMLElement>,
  options: EditorDropHandlerOptions = {}
) {
  const { onEditorContentDrop, onDrop, enabled = true, accept } = options;
  
  const handleDrop = useEditorDropHandler({
    onEditorContentDrop,
    onDrop,
    enabled,
    accept,
  });

  // The actual event handlers are managed via ref in the component
  // This hook provides the logic
  return handleDrop;
}

/**
 * Hook to initiate drag from editor selection
 */
export function useEditorDragStart() {
  /**
   * Start dragging editor selection
   */
  const startDrag = useCallback((
    event: React.DragEvent | DragEvent,
    selection: SelectionData,
    format: DragDropPayload['format'] = 'text'
  ) => {
    const payload: DragDropPayload = {
      selection,
      format,
    };

    // Set data for internal use
    const serialized = JSON.stringify(payload);
    event.dataTransfer?.setData('x-opencode-editor/selection', serialized);
    event.dataTransfer?.setData('application/json', serialized);
    
    // Set display text
    const displayText = formatSelectionForAI(selection);
    event.dataTransfer?.setData('text/plain', displayText);
    
    // Set effect
    event.dataTransfer!.effectAllowed = 'copy';
  }, []);

  return { startDrag };
}

export default useEditorDropHandler;
