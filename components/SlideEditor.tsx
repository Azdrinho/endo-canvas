
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { 
  Type, Move, Layers, Trash2, Undo, Redo, 
  Sparkles, Plus, Image as ImageIcon, Box,
  ChevronUp, ChevronDown, MoreHorizontal, MousePointer2,
  ArrowRight, X, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Type as TypeIcon, Palette, Maximize,
  Minimize, Group, ChevronRight, Copy, FolderInput, FolderOutput,
  BringToFront, SendToBack,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  Triangle, Star, Minus, ArrowRight as ArrowIcon, Columns, PieChart, BarChart2
} from 'lucide-react';
import { Slide, SlideElement, SlideElementType } from '../types';
import { generateSlideContent } from '../services/geminiService';

interface SlideEditorProps {
  slides: Slide[];
  currentSlideIndex: number;
  onUpdateSlides: (slides: Slide[]) => void;
  onSelectSlide: (index: number) => void;
}

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

// --- ICONS ---
const AIIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" />
  </svg>
);

// --- TYPES ---
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface LayerItemProps {
  element: SlideElement;
  depth?: number;
  expandedGroups: Set<string>;
  toggleExpand: (id: string) => void;
  selectedElementIds: Set<string>;
  onSelect: (id: string, multiSelect: boolean) => void;
  onDelete: (id: string) => void;
}

// --- RECURSIVE LAYERS PANEL ITEM ---
const LayerItem: React.FC<LayerItemProps> = ({ 
  element, 
  depth = 0,
  expandedGroups,
  toggleExpand,
  selectedElementIds,
  onSelect,
  onDelete
}) => {
  const isExpanded = expandedGroups.has(element.id);
  const isSelected = selectedElementIds.has(element.id);
  const isGroup = element.type === 'group';

  const handleToggleExpand = (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleExpand(element.id);
  };

  return (
      <>
        <div 
            onClick={(e) => onSelect(element.id, e.shiftKey)}
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer group text-xs transition-colors ${isSelected ? 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800' : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'}`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
            {/* Expander Arrow */}
            <div className="w-4 flex items-center justify-center">
                {isGroup && (
                    <button onClick={handleToggleExpand} className="text-slate-400 hover:text-white">
                        {isExpanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                    </button>
                )}
            </div>

            {/* Icon */}
            {element.type === 'text' && <Type size={14} className="text-slate-400" />}
            {element.type === 'image' && <ImageIcon size={14} className="text-slate-400" />}
            {element.type === 'shape' && (
                element.style.variant === 'line' ? <Minus size={14} className="text-slate-400" /> :
                element.style.variant === 'arrow_right' ? <ArrowIcon size={14} className="text-slate-400" /> :
                element.style.variant === 'triangle' ? <Triangle size={14} className="text-slate-400" /> :
                element.style.variant === 'star' ? <Star size={14} className="text-slate-400" /> :
                element.style.variant === 'pie' ? <PieChart size={14} className="text-slate-400" /> :
                <Box size={14} className="text-slate-400" />
            )}
            {element.type === 'group' && <Group size={14} className="text-cyan-400" />}
            
            {/* Label */}
            <span className="flex-1 truncate font-medium text-slate-700 dark:text-slate-200">
                {element.type === 'text' ? element.content : element.type === 'group' ? `Group (${element.children?.length})` : `${element.type} ${element.style.variant || ''}`}
            </span>

            {/* Actions */}
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                <button onClick={(e) => { e.stopPropagation(); onDelete(element.id); }} title="Delete"><Trash2 size={14} className="text-slate-400 hover:text-red-500" /></button>
            </div>
        </div>
        
        {/* Render Children Recursively */}
        {isGroup && isExpanded && element.children && (
            <div>
                {element.children.map(child => (
                   <LayerItem 
                      key={child.id} 
                      element={child} 
                      depth={depth + 1} 
                      expandedGroups={expandedGroups}
                      toggleExpand={toggleExpand}
                      selectedElementIds={selectedElementIds}
                      onSelect={onSelect}
                      onDelete={onDelete}
                   />
                ))}
            </div>
        )}
      </>
  );
};

export const SlideEditor: React.FC<SlideEditorProps> = ({ 
  slides, 
  currentSlideIndex, 
  onUpdateSlides, 
  onSelectSlide 
}) => {
  const [history, setHistory] = useState<Slide[][]>([slides]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Selection & Interaction State
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set<string>());
  
  const [interactionMode, setInteractionMode] = useState<'idle' | 'dragging' | 'resizing'>('idle');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // View Panning State
  const [viewPos, setViewPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.8);

  // Clipboard
  const [clipboard, setClipboard] = useState<SlideElement[] | null>(null);

  // For dragging multiple items, we need to store initial positions for ALL selected items
  const [elementsStartSnapshot, setElementsStartSnapshot] = useState<Record<string, { x: number, y: number, w: number, h: number }>>({});
  
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  
  // Expanded Groups in Sidebar
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  const [prompt, setPrompt] = useState('');
  const [promptImages, setPromptImages] = useState<{ base64: string; mimeType: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<'layers' | 'properties'>('layers');

  const currentSlide = slides[currentSlideIndex];
  
  const toggleExpandGroup = (id: string) => {
      setExpandedGroups(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
      });
  };

  // Helper to find deep element
  const findElementById = useCallback((elements: SlideElement[], id: string): SlideElement | null => {
      for (const el of elements) {
          if (el.id === id) return el;
          if (el.children) {
              const found = findElementById(el.children, id);
              if (found) return found;
          }
      }
      return null;
  }, []);

  // For property editing
  const primarySelectedId = selectedElementIds.size > 0 ? selectedElementIds.values().next().value : null;
  const primarySelectedElement = primarySelectedId ? findElementById(currentSlide.elements, primarySelectedId) : null;
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-switch to properties when element selected
  useEffect(() => {
     if (selectedElementIds.size > 0) setActiveSidePanel('properties');
  }, [selectedElementIds]);

  // --- SELECTION LOGIC ---
  const handleSelectElement = (id: string, multiSelect: boolean) => {
      setSelectedElementIds(prev => {
          const newSet = new Set(multiSelect ? prev : []);
          if (multiSelect && prev.has(id)) {
              newSet.delete(id); // Toggle off if already selected
          } else {
              newSet.add(id);
          }
          return newSet;
      });
  };

  const pushHistory = useCallback((newSlides: Slide[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newSlides);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    onUpdateSlides(newSlides);
  }, [history, historyIndex, onUpdateSlides]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      onUpdateSlides(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      onUpdateSlides(history[historyIndex + 1]);
    }
  };

  const handlePromptImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const newImages: { base64: string; mimeType: string }[] = [];
      let processedCount = 0;

      files.forEach((file: File) => {
          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result) {
                  const img = new Image();
                  img.onload = () => {
                      const canvas = document.createElement('canvas');
                      let width = img.width;
                      let height = img.height;
                      
                      // Max dimensions
                      const MAX_WIDTH = 1024;
                      const MAX_HEIGHT = 1024;
                      
                      if (width > height) {
                          if (width > MAX_WIDTH) {
                              height *= MAX_WIDTH / width;
                              width = MAX_WIDTH;
                          }
                      } else {
                          if (height > MAX_HEIGHT) {
                              width *= MAX_HEIGHT / height;
                              height = MAX_HEIGHT;
                          }
                      }
                      
                      canvas.width = width;
                      canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      ctx?.drawImage(img, 0, 0, width, height);
                      
                      // Compress to JPEG to save space
                      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                      
                      newImages.push({
                          base64: dataUrl,
                          mimeType: 'image/jpeg'
                      });

                      processedCount++;
                      if (processedCount === files.length) {
                          setPromptImages(prev => [...prev, ...newImages]);
                      }
                  };
                  img.src = event.target.result as string;
              }
          };
          reader.readAsDataURL(file);
      });
  };

  const handleAIGenerate = async () => {
    if (!prompt.trim() && promptImages.length === 0) return;
    setIsGenerating(true);
    try {
      const generatedSlide = await generateSlideContent(prompt, currentSlide.id, promptImages);
      const newSlides = [...slides];
      newSlides[currentSlideIndex] = generatedSlide;
      pushHistory(newSlides);
      setPrompt('');
      setPromptImages([]);
    } catch (e) {
      console.error(e);
      // alert("Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateElementDeep = (elements: SlideElement[], id: string, updates: Partial<SlideElement> | ((prev: SlideElement) => Partial<SlideElement>)): SlideElement[] => {
      return elements.map(el => {
          if (el.id === id) {
             const newValues = typeof updates === 'function' ? updates(el) : updates;
             if (newValues.style && el.style) {
                 return { ...el, ...newValues, style: { ...el.style, ...newValues.style } };
             }
             return { ...el, ...newValues };
          }
          if (el.children) {
             return { ...el, children: updateElementDeep(el.children, id, updates) };
          }
          return el;
      });
  };

  const updateElement = (elementId: string, updates: Partial<SlideElement> | ((prev: SlideElement) => Partial<SlideElement>)) => {
    const newSlides = [...slides];
    const slide = { ...newSlides[currentSlideIndex] };
    slide.elements = updateElementDeep(slide.elements, elementId, updates);
    newSlides[currentSlideIndex] = slide;
    onUpdateSlides(newSlides);
  };

  const updateSlideBackground = (bg: string) => {
    const newSlides = [...slides];
    newSlides[currentSlideIndex] = { ...newSlides[currentSlideIndex], background: bg };
    onUpdateSlides(newSlides);
  };

  const updateMultipleElements = (updatesMap: Record<string, Partial<SlideElement>>) => {
    const newSlides = [...slides];
    const slide = { ...newSlides[currentSlideIndex] };
    
    const traverseAndUpdate = (elements: SlideElement[]): SlideElement[] => {
        return elements.map((el: SlideElement) => {
            let updatedEl: SlideElement = { ...el };
            const update = updatesMap[el.id as string];
            if (update) {
                updatedEl = { ...updatedEl, ...update };
            }
            if (updatedEl.children) {
                updatedEl.children = traverseAndUpdate(updatedEl.children);
            }
            return updatedEl;
        });
    };

    slide.elements = traverseAndUpdate(slide.elements);
    newSlides[currentSlideIndex] = slide;
    onUpdateSlides(newSlides);
  };

  const commitUpdate = useCallback(() => {
     pushHistory(slides);
  }, [slides, pushHistory]);

  const commitRef = useRef(commitUpdate);
  useEffect(() => { commitRef.current = commitUpdate; }, [commitUpdate]);

  const handleWrapperMouseDown = (e: React.MouseEvent) => {
      // Prevent focus loss when clicking wrapper but allow interactions
      if ((e.target as HTMLElement).closest('input')) return;

      if (e.button === 1) { // Middle Mouse Button
          e.preventDefault();
          setIsPanning(true);
          setPanStart({ x: e.clientX - viewPos.x, y: e.clientY - viewPos.y });
      }
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
      const step = 0.05;
      const delta = e.deltaY < 0 ? step : -step;
      setZoom(prev => {
          const next = Math.max(0.1, Math.min(4, prev + delta));
          return Math.round(next * 100) / 100;
      });
  }, []);

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false });
    
    const isAlreadySelected = selectedElementIds.has(elementId);
    let newSelection = new Set(selectedElementIds);

    if (e.shiftKey) {
        if (isAlreadySelected) newSelection.delete(elementId);
        else newSelection.add(elementId);
        setSelectedElementIds(newSelection);
    } else {
        if (!isAlreadySelected) {
            newSelection = new Set([elementId]);
            setSelectedElementIds(newSelection);
        }
    }

    setInteractionMode('dragging');
    setDragStart({ x: e.clientX, y: e.clientY });

    const snapshots: Record<string, { x: number, y: number, w: number, h: number }> = {};
    newSelection.forEach((id: string) => {
        const el = findElementById(currentSlide.elements, id);
        if (el) {
            snapshots[id] = { x: el.x, y: el.y, w: el.width, h: el.height };
        }
    });
    setElementsStartSnapshot(snapshots);
  };

  const handleResizeStart = (e: React.MouseEvent, handle: ResizeHandle) => {
      e.preventDefault();
      e.stopPropagation();
      if (selectedElementIds.size !== 1) return;
      
      const elementId = Array.from(selectedElementIds)[0] as string;
      if (!elementId) return;

      const element = findElementById(currentSlide.elements, elementId);
      if (!element) return;
      
      setInteractionMode('resizing');
      setActiveHandle(handle);
      setDragStart({ x: e.clientX, y: e.clientY });
      
      setElementsStartSnapshot({ [elementId]: { x: element.x, y: element.y, w: element.width, h: element.height } });
  };

  const handleCopy = useCallback(() => {
      if (selectedElementIds.size === 0) return;
      const toCopy: SlideElement[] = [];
      currentSlide.elements.forEach(el => {
          if (selectedElementIds.has(el.id)) toCopy.push(el);
      });
      setClipboard(toCopy);
  }, [selectedElementIds, currentSlide]);

  const handlePaste = useCallback(() => {
      if (!clipboard || clipboard.length === 0) return;
      const newSlides = [...slides];
      const slide = { ...newSlides[currentSlideIndex] };
      
      const pastedElements = clipboard.map(el => ({
          ...el,
          id: `copy-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
          x: el.x + 20,
          y: el.y + 20,
          zIndex: slide.elements.length + 1
      }));

      slide.elements = [...slide.elements, ...pastedElements];
      newSlides[currentSlideIndex] = slide;
      pushHistory(newSlides);
      setSelectedElementIds(new Set(pastedElements.map(e => e.id)));
  }, [clipboard, slides, currentSlideIndex, pushHistory]);

  const handleDuplicate = useCallback(() => {
      handleCopy();
      setTimeout(handlePaste, 0); 
  }, [handleCopy, handlePaste]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          const target = e.target as HTMLElement;
          const isEditable = target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
          
          if (isEditable) return;

          if (e.key === 'Delete' || e.key === 'Backspace') {
              if (selectedElementIds.size > 0) deleteSelectedElements();
          }

          if (e.ctrlKey || e.metaKey) {
              if (e.key === 'c') { e.preventDefault(); handleCopy(); }
              if (e.key === 'v') { e.preventDefault(); handlePaste(); }
              if (e.key === 'd') { e.preventDefault(); handleDuplicate(); }
              if (e.key === 'z') { e.preventDefault(); handleUndo(); }
              if (e.key === 'y') { e.preventDefault(); handleRedo(); }
              if (e.key === 'g') { 
                  e.preventDefault(); 
                  if (e.shiftKey) handleUngroupSelected();
                  else handleGroupSelected();
              }
          }

          // Nudge with Arrow Keys
          if (selectedElementIds.size > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
              e.preventDefault();
              const step = e.shiftKey ? 10 : 1;
              const updates: Record<string, Partial<SlideElement>> = {};
              
              selectedElementIds.forEach((id: string) => {
                  const el = findElementById(currentSlide.elements, id);
                  if (!el) return;
                  
                  let dx = 0, dy = 0;
                  if (e.key === 'ArrowUp') dy = -step;
                  if (e.key === 'ArrowDown') dy = step;
                  if (e.key === 'ArrowLeft') dx = -step;
                  if (e.key === 'ArrowRight') dx = step;

                  updates[id] = { x: el.x + dx, y: el.y + dy };
              });
              
              updateMultipleElements(updates);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, currentSlide, handleCopy, handlePaste, handleDuplicate, handleUndo, handleRedo]);


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (isPanning) {
            setViewPos({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
            return;
        }

        if (interactionMode === 'idle' || selectedElementIds.size === 0) return;

        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        const scaleFactor = 1 / zoom; 
        const scaledDx = dx * scaleFactor;
        const scaledDy = dy * scaleFactor;

        if (interactionMode === 'dragging') {
            const updates: Record<string, Partial<SlideElement>> = {};
            selectedElementIds.forEach((id: string) => {
                const snapshot = elementsStartSnapshot[id];
                if (snapshot) {
                    updates[id] = {
                        x: snapshot.x + scaledDx,
                        y: snapshot.y + scaledDy
                    };
                }
            });
            updateMultipleElements(updates);
        } 
        else if (interactionMode === 'resizing' && activeHandle && selectedElementIds.size === 1) {
            const id = Array.from(selectedElementIds)[0] as string;
            const snapshot = elementsStartSnapshot[id];
            if (!snapshot || !id) return;

            let { x, y, w, h } = snapshot;

            if (activeHandle.includes('e')) w += scaledDx;
            if (activeHandle.includes('w')) { x += scaledDx; w -= scaledDx; }
            if (activeHandle.includes('s')) h += scaledDy;
            if (activeHandle.includes('n')) { y += scaledDy; h -= scaledDy; }

            if (w < 20) w = 20;
            if (h < 20) h = 20;

            updateElement(id, { x, y, width: w, height: h });
        }
    };

    const handleMouseUp = () => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (interactionMode !== 'idle') {
            setInteractionMode('idle');
            setActiveHandle(null);
            if (commitRef.current) commitRef.current(); 
        }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interactionMode, dragStart, elementsStartSnapshot, activeHandle, selectedElementIds, isPanning, panStart, zoom]);

  const deleteElementRecursive = (elements: SlideElement[], idsToDelete: Set<string>): SlideElement[] => {
      return elements.filter(el => !idsToDelete.has(el.id)).map(el => {
          if (el.children) return { ...el, children: deleteElementRecursive(el.children, idsToDelete) };
          return el;
      });
  };

  const deleteElement = (elementId: string) => {
    const newSlides = [...slides];
    const slide = { ...newSlides[currentSlideIndex] };
    slide.elements = deleteElementRecursive(slide.elements, new Set([elementId]));
    newSlides[currentSlideIndex] = slide;
    pushHistory(newSlides);
    setSelectedElementIds(prev => {
        const next = new Set(prev);
        next.delete(elementId);
        return next;
    });
  };

  const deleteSelectedElements = () => {
      if (selectedElementIds.size === 0) return;
      const newSlides = [...slides];
      const slide = { ...newSlides[currentSlideIndex] };
      slide.elements = deleteElementRecursive(slide.elements, selectedElementIds);
      newSlides[currentSlideIndex] = slide;
      pushHistory(newSlides);
      setSelectedElementIds(new Set());
  };

  const addElement = (type: SlideElementType, variant?: 'sphere' | 'box' | 'triangle' | 'star' | 'arrow_right' | 'line' | 'pie') => {
    const newEl: SlideElement = {
      id: `el-${Date.now()}`,
      type,
      x: CANVAS_WIDTH / 2 - 100,
      y: CANVAS_HEIGHT / 2 - 50,
      width: type === 'text' ? 400 : variant === 'line' || variant === 'arrow_right' ? 200 : 150,
      height: type === 'text' ? 100 : variant === 'line' ? 10 : variant === 'arrow_right' ? 50 : 150,
      content: type === 'text' ? 'Double click to edit' : type === 'image' ? 'https://via.placeholder.com/300' : '',
      zIndex: currentSlide.elements.length + 1,
      children: type === 'group' ? [] : undefined,
      style: {
        fontFamily: 'Orkney',
        fontSize: 24,
        color: '#000000',
        lineHeight: 1.2,
        variant: variant || (type === 'shape' ? 'box' : undefined),
        backgroundColor: (type === 'shape' && variant !== 'arrow_right' && variant !== 'line') ? '#22d3ee' : undefined,
        borderColor: (variant === 'arrow_right' || variant === 'line') ? '#000000' : undefined,
        borderWidth: (variant === 'arrow_right' || variant === 'line') ? 0 : undefined,
        startAngle: variant === 'pie' ? 0 : undefined,
        endAngle: variant === 'pie' ? 90 : undefined
      }
    };
    const newSlides = [...slides];
    newSlides[currentSlideIndex].elements.push(newEl);
    pushHistory(newSlides);
    setSelectedElementIds(new Set([newEl.id]));
  };

  const addSlide = () => {
     const newSlide: Slide = { id: `slide-${Date.now()}`, background: '#f1f1f1', elements: [] };
     const newSlides = [...slides, newSlide];
     pushHistory(newSlides);
     onSelectSlide(newSlides.length - 1);
  };

  const deleteSlide = (index: number) => {
     if (slides.length <= 1) return;
     const newSlides = slides.filter((_, i) => i !== index);
     pushHistory(newSlides);
     if (currentSlideIndex >= newSlides.length) onSelectSlide(newSlides.length - 1);
  };

  const handleGroupSelected = () => {
      if (selectedElementIds.size < 2) return;
      const newSlides = [...slides];
      const slide = { ...newSlides[currentSlideIndex] };
      const selectedEls: SlideElement[] = [];
      const remainingEls: SlideElement[] = [];

      slide.elements.forEach(el => {
          if (selectedElementIds.has(el.id)) selectedEls.push(el);
          else remainingEls.push(el);
      });

      if (selectedEls.length < 2) return; 

      const minX = Math.min(...selectedEls.map(e => e.x));
      const minY = Math.min(...selectedEls.map(e => e.y));
      const maxX = Math.max(...selectedEls.map(e => e.x + e.width));
      const maxY = Math.max(...selectedEls.map(e => e.y + e.height));

      const groupEl: SlideElement = {
          id: `group-${Date.now()}`,
          type: 'group',
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          zIndex: Math.max(...selectedEls.map(e => e.zIndex)) + 1,
          content: '',
          style: {},
          children: selectedEls.map(el => ({
              ...el,
              x: el.x - minX, 
              y: el.y - minY
          }))
      };

      slide.elements = [...remainingEls, groupEl];
      newSlides[currentSlideIndex] = slide;
      pushHistory(newSlides);
      setSelectedElementIds(new Set([groupEl.id]));
      setContextMenu({ ...contextMenu, visible: false });
  };

  const handleUngroupSelected = () => {
      if (selectedElementIds.size !== 1) return;
      const groupId = Array.from(selectedElementIds)[0];
      const groupEl = findElementById(currentSlide.elements, groupId);
      
      if (!groupEl || groupEl.type !== 'group' || !groupEl.children) return;

      const newSlides = [...slides];
      const slide = { ...newSlides[currentSlideIndex] };
      slide.elements = slide.elements.filter(el => el.id !== groupId);
      
      const ungroupedChildren = groupEl.children.map(child => ({
          ...child,
          x: groupEl.x + child.x,
          y: groupEl.y + child.y,
          zIndex: groupEl.zIndex + 1 
      }));

      slide.elements = [...slide.elements, ...ungroupedChildren];
      newSlides[currentSlideIndex] = slide;
      pushHistory(newSlides);
      
      setSelectedElementIds(new Set(ungroupedChildren.map(c => c.id)));
      setContextMenu({ ...contextMenu, visible: false });
  };

  const handleBringToFront = () => {
      if (selectedElementIds.size === 0) return;
      const newSlides = [...slides];
      const slide = { ...newSlides[currentSlideIndex] };
      const selected = slide.elements.filter(el => selectedElementIds.has(el.id));
      const others = slide.elements.filter(el => !selectedElementIds.has(el.id));
      slide.elements = [...others, ...selected];
      slide.elements.forEach((el, i) => el.zIndex = i + 1);
      newSlides[currentSlideIndex] = slide;
      pushHistory(newSlides);
      setContextMenu({ ...contextMenu, visible: false });
  };

  const handleSendToBack = () => {
      if (selectedElementIds.size === 0) return;
      const newSlides = [...slides];
      const slide = { ...newSlides[currentSlideIndex] };
      const selected = slide.elements.filter(el => selectedElementIds.has(el.id));
      const others = slide.elements.filter(el => !selectedElementIds.has(el.id));
      slide.elements = [...selected, ...others];
      slide.elements.forEach((el, i) => el.zIndex = i + 1);
      newSlides[currentSlideIndex] = slide;
      pushHistory(newSlides);
      setContextMenu({ ...contextMenu, visible: false });
  };

  const handleContextMenu = (e: React.MouseEvent, elementId?: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (elementId) {
          if (!selectedElementIds.has(elementId)) {
              setSelectedElementIds(new Set([elementId]));
          }
      } else {
          setSelectedElementIds(new Set());
      }
      setContextMenu({ x: e.clientX, y: e.clientY, visible: true });
  };

  const renderTextToolbar = (el: SlideElement) => {
      if (selectedElementIds.size > 1) return null;
      return (
        <div 
            className="absolute bottom-full left-0 mb-3 bg-slate-800 text-white p-2 rounded-lg shadow-2xl flex items-center gap-2 z-[100] border border-white/10 origin-bottom-left"
            style={{ transform: 'scale(1.25)' }}
            onMouseDown={(e) => e.stopPropagation()} 
        >
            <select 
                className="bg-slate-900 border border-white/10 rounded p-1.5 text-[10px] text-white w-24 outline-none focus:border-cyan-500"
                value={el.style.fontFamily}
                onChange={(e) => updateElement(el.id, { style: { fontFamily: e.target.value as any } })}
            >
                <option value="Orkney">Orkney</option>
            </select>
            <div className="w-px h-6 bg-white/10"></div>
            <div className="flex items-center gap-1 bg-slate-900 rounded border border-white/10 p-0.5">
                 <button onClick={() => updateElement(el.id, { style: { fontSize: Math.max(8, (el.style.fontSize || 24) - 2) } })} className="p-1 hover:text-cyan-400 text-slate-300"><Minimize size={12}/></button>
                 <input 
                    type="number" 
                    value={el.style.fontSize} 
                    onChange={(e) => updateElement(el.id, { style: { fontSize: Number(e.target.value) } })}
                    className="w-8 bg-transparent text-center text-[10px] outline-none font-mono"
                 />
                 <button onClick={() => updateElement(el.id, { style: { fontSize: (el.style.fontSize || 24) + 2 } })} className="p-1 hover:text-cyan-400 text-slate-300"><Maximize size={12}/></button>
            </div>
            <div className="w-px h-6 bg-white/10"></div>
            <div className="relative group">
                <input 
                    type="color" 
                    value={el.style.color || '#000000'} 
                    onChange={(e) => updateElement(el.id, { style: { color: e.target.value } })}
                    className="w-6 h-6 rounded cursor-pointer border-none p-0 overflow-hidden bg-transparent"
                />
            </div>
            <div className="w-px h-6 bg-white/10"></div>
            <div className="flex bg-slate-900 rounded border border-white/10 p-0.5">
                {['left', 'center', 'right'].map((align) => (
                    <button 
                        key={align} 
                        onClick={() => updateElement(el.id, { style: { textAlign: align as any } })}
                        className={`p-1.5 rounded flex justify-center ${el.style.textAlign === align ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        {align === 'left' && <AlignLeft size={12}/>}
                        {align === 'center' && <AlignCenter size={12}/>}
                        {align === 'right' && <AlignRight size={12}/>}
                    </button>
                ))}
            </div>
        </div>
      );
  };

  const geometryProps: Array<'x' | 'y' | 'width' | 'height'> = ['x', 'y', 'width', 'height'];

  const renderPropertiesPanel = () => {
    if (selectedElementIds.size === 0 || !primarySelectedElement) {
        
        return (
            <div className="p-4 space-y-6">
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <Palette size={14}/> Slide Background
                    </h3>
                    <div className="space-y-3">
                        <div className="grid grid-cols-5 gap-2">
                            {['#000000', '#FFFFFF', '#f1f1f1', '#121212', '#22d3ee', '#9333ea', '#CCFF00', '#FF0055'].map(c => (
                                <button 
                                    key={c}
                                    onClick={() => updateSlideBackground(c)}
                                    className={`w-6 h-6 rounded-full border border-white/20 ${currentSlide.background === c ? 'ring-2 ring-cyan-400' : ''}`}
                                    style={{ background: c }}
                                />
                            ))}
                        </div>
                        <div className="flex items-center bg-slate-900 rounded-lg p-2 border border-white/10">
                            <div className="w-6 h-6 rounded mr-2 border border-white/20" style={{ background: currentSlide.background }}></div>
                            <input 
                                type="text" 
                                value={currentSlide.background}
                                onChange={(e) => updateSlideBackground(e.target.value)}
                                className="bg-transparent text-xs text-white w-full outline-none font-mono"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                         Layout
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                         <button onClick={addSlide} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 p-2 rounded text-xs transition-colors">
                            <Plus size={14}/> New Slide
                         </button>
                         <button onClick={() => deleteSlide(currentSlideIndex)} className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded text-xs transition-colors">
                            <Trash2 size={14}/> Delete Slide
                         </button>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="p-4 space-y-6 overflow-y-auto h-full custom-scrollbar">
            <div>
                 <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Move size={14}/> Geometry</h3>
                 <div className="grid grid-cols-2 gap-2">
                     {geometryProps.map(prop => (
                         <div key={prop} className="bg-slate-900 rounded p-2 border border-white/10 flex items-center justify-between">
                             <span className="text-[10px] text-slate-500 uppercase">{prop.charAt(0)}</span>
                             <input 
                                type="number" 
                                value={Math.round(primarySelectedElement[prop] as number)}
                                onChange={(e) => updateElement(primarySelectedElement.id, { [prop]: Number(e.target.value) } as Partial<SlideElement>)}
                                className="w-12 bg-transparent text-right text-xs text-white outline-none"
                             />
                         </div>
                     ))}
                 </div>
                 <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Opacity</span>
                    <input 
                        type="range" min="0" max="1" step="0.1"
                        value={primarySelectedElement.style.opacity ?? 1}
                        onChange={(e) => updateElement(primarySelectedElement.id, { style: { opacity: parseFloat(e.target.value) } })}
                        className="w-24 accent-cyan-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>
                 <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Rotation</span>
                    <input 
                        type="number"
                        value={primarySelectedElement.style.rotation || 0}
                        onChange={(e) => updateElement(primarySelectedElement.id, { style: { rotation: Number(e.target.value) } })}
                        className="w-12 bg-transparent text-right text-xs text-white outline-none border-b border-white/10"
                    />
                 </div>
            </div>

            {primarySelectedElement.type === 'text' && (
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><TypeIcon size={14}/> Typography</h3>
                    <textarea 
                        value={primarySelectedElement.content}
                        onChange={(e) => updateElement(primarySelectedElement.id, { content: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded p-2 text-xs text-white mb-3 min-h-[60px]"
                    />
                    <div className="space-y-2">
                        <select 
                            className="w-full bg-slate-900 border border-white/10 rounded p-2 text-xs text-white outline-none"
                            value={primarySelectedElement.style.fontFamily}
                            onChange={(e) => updateElement(primarySelectedElement.id, { style: { fontFamily: e.target.value as any } })}
                        >
                            <option value="Orkney">Orkney</option>
                        </select>
                        <div className="flex gap-2">
                            <input 
                                type="color" 
                                value={primarySelectedElement.style.color || '#000000'}
                                onChange={(e) => updateElement(primarySelectedElement.id, { style: { color: e.target.value } })}
                                className="h-8 w-8 rounded cursor-pointer bg-transparent border-none"
                            />
                            <div className="flex-1 flex bg-slate-900 rounded border border-white/10">
                                {['left', 'center', 'right'].map((align) => (
                                    <button 
                                        key={align} 
                                        onClick={() => updateElement(primarySelectedElement.id, { style: { textAlign: align as any } })}
                                        className={`flex-1 flex items-center justify-center ${primarySelectedElement.style.textAlign === align ? 'bg-cyan-500 text-white' : 'text-slate-400'}`}
                                    >
                                        {align === 'left' && <AlignLeft size={14}/>}
                                        {align === 'center' && <AlignCenter size={14}/>}
                                        {align === 'right' && <AlignRight size={14}/>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(primarySelectedElement.type === 'shape' || primarySelectedElement.type === 'text') && (
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Box size={14}/> Appearance</h3>
                    <div className="space-y-3">
                         <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">Background</span>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    value={primarySelectedElement.style.backgroundColor || '#ffffff'}
                                    onChange={(e) => updateElement(primarySelectedElement.id, { style: { backgroundColor: e.target.value } })}
                                    className="h-6 w-6 rounded cursor-pointer bg-transparent border-none"
                                />
                                <button onClick={() => updateElement(primarySelectedElement.id, { style: { backgroundColor: 'transparent' } })} className="text-[10px] text-red-400">Clear</button>
                            </div>
                         </div>
                         {/* Border Radius (only if not pie) */}
                         {primarySelectedElement.style.variant !== 'pie' && (
                             <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">Border Radius</span>
                                <input 
                                    type="number"
                                    value={primarySelectedElement.style.borderRadius || 0}
                                    onChange={(e) => updateElement(primarySelectedElement.id, { style: { borderRadius: Number(e.target.value) } })}
                                    className="w-12 bg-slate-900 border border-white/10 rounded text-xs text-white text-right p-1"
                                />
                             </div>
                         )}
                         
                         {/* Pie Specific Controls */}
                         {primarySelectedElement.style.variant === 'pie' && (
                             <>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">Start Angle</span>
                                    <input 
                                        type="number"
                                        value={primarySelectedElement.style.startAngle || 0}
                                        onChange={(e) => updateElement(primarySelectedElement.id, { style: { startAngle: Number(e.target.value) } })}
                                        className="w-12 bg-slate-900 border border-white/10 rounded text-xs text-white text-right p-1"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">End Angle</span>
                                    <input 
                                        type="number"
                                        value={primarySelectedElement.style.endAngle || 360}
                                        onChange={(e) => updateElement(primarySelectedElement.id, { style: { endAngle: Number(e.target.value) } })}
                                        className="w-12 bg-slate-900 border border-white/10 rounded text-xs text-white text-right p-1"
                                    />
                                </div>
                             </>
                         )}
                    </div>
                 </div>
            )}

             <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Layers size={14}/> Arrangement</h3>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleBringToFront} className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-white/10 p-2 rounded text-xs text-white">
                        <BringToFront size={14}/> To Front
                    </button>
                    <button onClick={handleSendToBack} className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-white/10 p-2 rounded text-xs text-white">
                        <SendToBack size={14}/> To Back
                    </button>
                    <button onClick={handleGroupSelected} disabled={selectedElementIds.size < 2} className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-white/10 p-2 rounded text-xs text-white disabled:opacity-50">
                        <Group size={14}/> Group
                    </button>
                    <button onClick={handleUngroupSelected} disabled={primarySelectedElement.type !== 'group'} className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-white/10 p-2 rounded text-xs text-white disabled:opacity-50">
                        <Columns size={14}/> Ungroup
                    </button>
                </div>
             </div>

             {primarySelectedElement.type === 'chart' && primarySelectedElement.chartData && (
                <div className="mt-6 border-t border-white/10 pt-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><BarChart2 size={14}/> Chart Data</h3>
                    
                    <div className="mb-4 space-y-2">
                        <span className="text-xs text-slate-500">Series Colors</span>
                        {primarySelectedElement.chartData.config.series.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <input type="color" value={s.color} onChange={(e) => {
                                    const newSeries = [...primarySelectedElement.chartData!.config.series];
                                    newSeries[i].color = e.target.value;
                                    updateElement(primarySelectedElement.id, { chartData: { ...primarySelectedElement.chartData!, config: { ...primarySelectedElement.chartData!.config, series: newSeries } } });
                                }} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" />
                                <input type="text" value={s.name || s.key} onChange={(e) => {
                                    const newSeries = [...primarySelectedElement.chartData!.config.series];
                                    newSeries[i].name = e.target.value;
                                    updateElement(primarySelectedElement.id, { chartData: { ...primarySelectedElement.chartData!, config: { ...primarySelectedElement.chartData!.config, series: newSeries } } });
                                }} className="flex-1 bg-slate-900 border border-white/10 rounded text-xs text-white p-1" />
                            </div>
                        ))}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr>
                                    <th className="p-1 font-medium text-slate-400">{primarySelectedElement.chartData.config.xAxisKey || 'name'}</th>
                                    {primarySelectedElement.chartData.config.series.map(s => (
                                        <th key={s.key} className="p-1 font-medium text-slate-400">{s.key}</th>
                                    ))}
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {primarySelectedElement.chartData.data.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        <td className="p-1">
                                            <input type="text" value={row[primarySelectedElement.chartData!.config.xAxisKey || 'name'] || ''}
                                                onChange={(e) => {
                                                    const newData = [...primarySelectedElement.chartData!.data];
                                                    newData[rowIndex] = { ...newData[rowIndex], [primarySelectedElement.chartData!.config.xAxisKey || 'name']: e.target.value };
                                                    updateElement(primarySelectedElement.id, { chartData: { ...primarySelectedElement.chartData!, data: newData } });
                                                }}
                                                className="w-full bg-slate-900 border border-white/10 rounded text-xs text-white p-1"
                                            />
                                        </td>
                                        {primarySelectedElement.chartData.config.series.map(s => (
                                            <td key={s.key} className="p-1">
                                                <input type="number" value={row[s.key] || 0}
                                                    onChange={(e) => {
                                                        const newData = [...primarySelectedElement.chartData!.data];
                                                        newData[rowIndex] = { ...newData[rowIndex], [s.key]: Number(e.target.value) };
                                                        updateElement(primarySelectedElement.id, { chartData: { ...primarySelectedElement.chartData!, data: newData } });
                                                    }}
                                                    className="w-full bg-slate-900 border border-white/10 rounded text-xs text-white p-1"
                                                />
                                            </td>
                                        ))}
                                        <td className="p-1">
                                            <button onClick={() => {
                                                const newData = primarySelectedElement.chartData!.data.filter((_, i) => i !== rowIndex);
                                                updateElement(primarySelectedElement.id, { chartData: { ...primarySelectedElement.chartData!, data: newData } });
                                            }} className="text-red-400 hover:text-red-300"><Trash2 size={12}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={() => {
                        const newData = [...primarySelectedElement.chartData!.data];
                        const newRow: any = { [primarySelectedElement.chartData!.config.xAxisKey || 'name']: `Item ${newData.length + 1}` };
                        primarySelectedElement.chartData!.config.series.forEach(s => newRow[s.key] = 0);
                        newData.push(newRow);
                        updateElement(primarySelectedElement.id, { chartData: { ...primarySelectedElement.chartData!, data: newData } });
                    }} className="mt-2 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-white/10 p-1 rounded text-xs text-slate-300">
                        <Plus size={12}/> Add Row
                    </button>
                </div>
             )}
        </div>
    );
  };

  return (
    <div className="flex w-full h-full bg-[#1e1e1e] text-white overflow-hidden relative" ref={containerRef}>
        
        <div 
            className={`flex-1 relative overflow-hidden bg-[#121212] ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
            onMouseDown={handleWrapperMouseDown}
            onWheel={handleWheel}
        >
             <div className="absolute inset-0 opacity-20 pointer-events-none" 
                  style={{ 
                     backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', 
                     backgroundSize: '20px 20px',
                     backgroundPosition: `${viewPos.x}px ${viewPos.y}px`
                  }} 
             />

             {/* MOVED TOOLBAR INSIDE CANVAS CONTAINER TO ALIGN WITH BOTTOM BAR */}
             {/* Added ml-[160px] to visually center it between the left overlay sidebar and right panel */}
             <div className="absolute top-4 left-1/2 -translate-x-1/2 ml-[160px] bg-[#2d2d2d] border border-white/10 rounded-full px-4 py-2 flex items-center gap-1 shadow-2xl z-50">
                <button onClick={handleUndo} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Undo size={18}/></button>
                <button onClick={handleRedo} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Redo size={18}/></button>
                <div className="w-px h-6 bg-white/10 mx-2"></div>
                <button onClick={() => addElement('text')} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Add Text"><Type size={18}/></button>
                <button onClick={() => addElement('image')} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Add Image"><ImageIcon size={18}/></button>
                <button onClick={() => addElement('shape', 'box')} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Add Shape"><Box size={18}/></button>
                <button onClick={() => addElement('shape', 'arrow_right')} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Add Arrow"><ArrowRight size={18}/></button>
                <button onClick={() => addElement('shape', 'pie')} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Add Pie Chart"><PieChart size={18}/></button>
                <div className="w-px h-6 bg-white/10 mx-2"></div>
                <span className="text-xs text-slate-500 font-mono px-2">{(zoom * 100).toFixed(0)}%</span>
             </div>

             <div 
                 className="absolute left-1/2 top-1/2 transition-transform duration-75 ease-out"
                 style={{ 
                     transform: `translate(${viewPos.x}px, ${viewPos.y}px) translate(-50%, -50%) scale(${zoom})`,
                     width: CANVAS_WIDTH,
                     height: CANVAS_HEIGHT
                 }}
             >
                 <div 
                    className="w-full h-full shadow-2xl relative overflow-hidden bg-white"
                    style={{ background: currentSlide.background }}
                    onMouseDown={() => setSelectedElementIds(new Set())}
                 >
                    {currentSlide.elements.map(el => {
                        const isSelected = selectedElementIds.has(el.id);
                        return (
                            <div
                                key={el.id}
                                className={`absolute group ${isSelected ? 'outline outline-2 outline-cyan-500 z-50' : ''}`}
                                style={{
                                    left: el.x,
                                    top: el.y,
                                    width: el.width,
                                    height: el.height,
                                    zIndex: el.zIndex,
                                    cursor: interactionMode === 'idle' ? 'move' : 'default'
                                }}
                                onMouseDown={(e) => handleMouseDown(e, el.id)}
                                onContextMenu={(e) => handleContextMenu(e, el.id)}
                            >
                                {el.type === 'text' && (
                                    <div 
                                        className="w-full h-full whitespace-pre-wrap break-words"
                                        style={{
                                            ...el.style,
                                            userSelect: 'none' 
                                        }}
                                    >
                                        {el.content}
                                    </div>
                                )}
                                {el.type === 'image' && (
                                    <img src={el.content} className="w-full h-full object-cover pointer-events-none" style={{...el.style}} />
                                )}
                                {el.type === 'shape' && (
                                    <div className="w-full h-full" 
                                        style={{ 
                                            backgroundColor: el.style.backgroundColor, 
                                            borderRadius: (el.style.variant === 'sphere' || el.style.variant === 'pie') ? '50%' : el.style.borderRadius,
                                            border: el.style.borderWidth ? `${el.style.borderWidth}px solid ${el.style.borderColor}` : undefined,
                                            clipPath: el.style.variant === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                                            transform: el.style.rotation ? `rotate(${el.style.rotation}deg)` : undefined,
                                            background: el.style.variant === 'pie' 
                                                ? `conic-gradient(transparent 0deg, transparent ${el.style.startAngle || 0}deg, ${el.style.backgroundColor} ${el.style.startAngle || 0}deg, ${el.style.backgroundColor} ${el.style.endAngle || 360}deg, transparent ${el.style.endAngle || 360}deg)`
                                                : el.style.backgroundColor
                                        }} 
                                    >
                                        {el.style.variant === 'arrow_right' && (
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-black">
                                                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        )}
                                    </div>
                                )}
                                {el.type === 'group' && (
                                    <div className="w-full h-full border border-dashed border-cyan-500/30 bg-cyan-500/5 pointer-events-none">
                                        {el.children?.map(child => (
                                            <div key={child.id} 
                                                className="absolute"
                                                style={{
                                                    left: child.x, top: child.y, width: child.width, height: child.height, zIndex: child.zIndex,
                                                    ...child.style,
                                                    background: child.style.variant === 'pie' 
                                                      ? `conic-gradient(transparent 0deg, transparent ${child.style.startAngle || 0}deg, ${child.style.backgroundColor} ${child.style.startAngle || 0}deg, ${child.style.backgroundColor} ${child.style.endAngle || 360}deg, transparent ${child.style.endAngle || 360}deg)`
                                                      : child.style.backgroundColor,
                                                    borderRadius: (child.style.variant === 'sphere' || child.style.variant === 'pie') ? '50%' : child.style.borderRadius,
                                                }}
                                            >
                                                {child.type === 'text' && child.content}
                                                {child.type === 'image' && <img src={child.content} className="w-full h-full object-cover"/>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {el.type === 'chart' && el.chartData && (
                                    <div className="w-full h-full" style={{...el.style}}>
                                        {(() => {
                                            const sanitizedData = el.chartData.data.map(item => {
                                                const newItem = { ...item };
                                                Object.keys(newItem).forEach(key => {
                                                    if (key !== (el.chartData!.config.xAxisKey || 'name') && typeof newItem[key] === 'string') {
                                                        const parsed = parseFloat(String(newItem[key]).replace(/[^0-9.-]+/g,""));
                                                        if (!isNaN(parsed)) newItem[key] = parsed;
                                                    }
                                                });
                                                return newItem;
                                            });
                                            return (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    {el.chartData.type === 'bar' ? (
                                                        <BarChart data={sanitizedData}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" vertical={false} />
                                                            <XAxis dataKey={el.chartData.config.xAxisKey || 'name'} stroke="#ffffff80" tick={{fill: '#ffffff80', fontSize: 12}} />
                                                            <YAxis stroke="#ffffff80" tick={{fill: '#ffffff80', fontSize: 12}} />
                                                            <Tooltip contentStyle={{backgroundColor: '#1e1e1e', borderColor: '#333', color: '#fff'}} />
                                                            <Legend wrapperStyle={{color: '#fff'}} />
                                                            {el.chartData.config.series.map((s, i) => (
                                                                <Bar key={s.key} dataKey={s.key} fill={s.color} name={s.name || s.key} />
                                                            ))}
                                                        </BarChart>
                                                    ) : el.chartData.type === 'line' ? (
                                                        <LineChart data={sanitizedData}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" vertical={false} />
                                                            <XAxis dataKey={el.chartData.config.xAxisKey || 'name'} stroke="#ffffff80" tick={{fill: '#ffffff80', fontSize: 12}} />
                                                            <YAxis stroke="#ffffff80" tick={{fill: '#ffffff80', fontSize: 12}} />
                                                            <Tooltip contentStyle={{backgroundColor: '#1e1e1e', borderColor: '#333', color: '#fff'}} />
                                                            <Legend wrapperStyle={{color: '#fff'}} />
                                                            {el.chartData.config.series.map((s, i) => (
                                                                <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} name={s.name || s.key} strokeWidth={3} />
                                                            ))}
                                                        </LineChart>
                                                    ) : (
                                                        <RechartsPieChart>
                                                            <Pie data={sanitizedData} dataKey={el.chartData.config.series[0]?.key || 'value'} nameKey={el.chartData.config.xAxisKey || 'name'} cx="50%" cy="50%" outerRadius="80%" innerRadius="50%">
                                                                {sanitizedData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={el.chartData!.config.series[index % el.chartData!.config.series.length]?.color || '#8884d8'} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip contentStyle={{backgroundColor: '#1e1e1e', borderColor: '#333', color: '#fff'}} />
                                                            <Legend wrapperStyle={{color: '#fff'}} />
                                                        </RechartsPieChart>
                                                    )}
                                                </ResponsiveContainer>
                                            );
                                        })()}
                                    </div>
                                )}

                                {isSelected && el.type === 'text' && interactionMode === 'idle' && renderTextToolbar(el)}

                                {isSelected && (
                                    <>
                                        {['nw', 'ne', 'sw', 'se'].map(h => (
                                            <div 
                                                key={h}
                                                className="absolute w-3 h-3 bg-white border border-cyan-500 rounded-full z-[60]"
                                                style={{
                                                    top: h.includes('n') ? -6 : 'auto',
                                                    bottom: h.includes('s') ? -6 : 'auto',
                                                    left: h.includes('w') ? -6 : 'auto',
                                                    right: h.includes('e') ? -6 : 'auto',
                                                    cursor: `${h}-resize`
                                                }}
                                                onMouseDown={(e) => handleResizeStart(e, h as ResizeHandle)}
                                            />
                                        ))}
                                    </>
                                )}
                            </div>
                        )
                    })}
                 </div>
             </div>

             {/* FLOATING AI PROMPT BAR */}
             {/* Added ml-[160px] to visually center it between the left overlay sidebar and right panel */}
             <div className="absolute bottom-8 left-1/2 -translate-x-1/2 ml-[160px] w-full max-w-3xl z-50 px-6">
                <div className="relative group w-full">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full opacity-30 group-hover:opacity-70 transition duration-500 blur"></div>
                    <div className="relative flex items-center bg-black rounded-full p-2 shadow-2xl border border-white/10">
                        <div className="pl-6 pr-2 flex items-center justify-center">
                            {isGenerating ? (
                                <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
                            ) : (
                                <Sparkles size={24} className="text-cyan-400" />
                            )}
                        </div>
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleAIGenerate()}
                            placeholder="Describe your slide..."
                            className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-slate-500 h-14 pl-4"
                        />
                        <div className="relative ml-2">
                            <input 
                                type="file" 
                                accept="image/*" 
                                multiple
                                onChange={handlePromptImageUpload} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                title="Upload reference images"
                            />
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative ${promptImages.length > 0 ? 'bg-cyan-500 text-white' : 'bg-white/10 text-slate-400 hover:bg-white/20'}`}>
                                <ImageIcon size={18} />
                                {promptImages.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                        {promptImages.length}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleAIGenerate}
                            disabled={isGenerating || (!prompt.trim() && promptImages.length === 0)}
                            className="w-14 h-14 rounded-full bg-white hover:bg-slate-200 text-black flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ml-2"
                        >
                            <ArrowRight size={24} strokeWidth={3} />
                        </button>
                    </div>
                </div>
             </div>

        </div>

        <div className="w-72 bg-[#1e1e1e] border-l border-white/10 flex flex-col z-40 shadow-xl">
             <div className="flex border-b border-white/10">
                 <button 
                    onClick={() => setActiveSidePanel('layers')} 
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeSidePanel === 'layers' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-white/5' : 'text-slate-500 hover:text-white'}`}
                 >
                    Layers
                 </button>
                 <button 
                    onClick={() => setActiveSidePanel('properties')} 
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeSidePanel === 'properties' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-white/5' : 'text-slate-500 hover:text-white'}`}
                 >
                    Properties
                 </button>
             </div>

             <div className="flex-1 overflow-hidden">
                 {activeSidePanel === 'layers' && (
                     <div className="p-2 space-y-1 overflow-y-auto h-full custom-scrollbar">
                         {[...currentSlide.elements].reverse().map(el => (
                             <LayerItem 
                                key={el.id}
                                element={el}
                                expandedGroups={expandedGroups}
                                toggleExpand={toggleExpandGroup}
                                selectedElementIds={selectedElementIds}
                                onSelect={(id, multi) => handleSelectElement(id, multi)}
                                onDelete={deleteElement}
                             />
                         ))}
                         {currentSlide.elements.length === 0 && (
                             <div className="p-4 text-center text-xs text-slate-500 italic">No elements</div>
                         )}
                     </div>
                 )}
                 {activeSidePanel === 'properties' && renderPropertiesPanel()}
             </div>
        </div>

        {contextMenu.visible && (
            <div 
                className="fixed bg-[#2d2d2d] border border-white/10 rounded-lg shadow-2xl py-1 z-[100] min-w-[150px]"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={() => { handleCopy(); setContextMenu(prev => ({...prev, visible: false})); }} className="w-full text-left px-4 py-2 text-xs text-white hover:bg-cyan-500 flex items-center gap-2"><Copy size={12}/> Copy</button>
                <button onClick={() => { handlePaste(); setContextMenu(prev => ({...prev, visible: false})); }} className="w-full text-left px-4 py-2 text-xs text-white hover:bg-cyan-500 flex items-center gap-2"><FolderInput size={12}/> Paste</button>
                <div className="h-px bg-white/10 my-1"></div>
                <button onClick={handleBringToFront} className="w-full text-left px-4 py-2 text-xs text-white hover:bg-cyan-500 flex items-center gap-2"><BringToFront size={12}/> Bring to Front</button>
                <button onClick={handleSendToBack} className="w-full text-left px-4 py-2 text-xs text-white hover:bg-cyan-500 flex items-center gap-2"><SendToBack size={12}/> Send to Back</button>
                <div className="h-px bg-white/10 my-1"></div>
                <button onClick={deleteSelectedElements} className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500 hover:text-white flex items-center gap-2"><Trash2 size={12}/> Delete</button>
            </div>
        )}
        
        {contextMenu.visible && (
            <div className="fixed inset-0 z-[90]" onClick={() => setContextMenu(prev => ({...prev, visible: false}))}></div>
        )}

    </div>
  );
};
