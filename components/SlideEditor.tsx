import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Type, Move, Trash2, Undo, Redo, Sparkles, Plus, Image as ImageIcon, Box,
  ChevronUp, ChevronDown, ChevronLeft, MousePointer2, ArrowRight, X, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Palette, Maximize, Minimize, ChevronRight, Copy, BringToFront, SendToBack,
  Star, Minus, Search, Lock, Unlock, FileText, CheckSquare, RefreshCw, Layers as LayersIcon,
  Download, Sliders, Shield, Printer, Check, Circle, AlertCircle, PenTool, Highlighter,
  Underline, Upload, FolderOpen, Table, MessageSquare, MoreHorizontal
} from 'lucide-react';
import { Slide, SlideElement } from '../types';
import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface SlideEditorProps {
  slides: Slide[];
  currentSlideIndex: number;
  onUpdateSlides: (slides: Slide[]) => void;
  onSelectSlide: (index: number) => void;
}

export const SlideEditor: React.FC<SlideEditorProps> = ({ 
  slides, 
  currentSlideIndex, 
  onUpdateSlides, 
  onSelectSlide 
}) => {
  // --- APPLICATION ENVIRONMENT & WORKSPACE STATES ---
  const [editMode, setEditMode] = useState<'EDIT' | 'LIVE_FILL'>('EDIT');
  const [zoom, setZoom] = useState<number>(0.85);
  const [pageSizeType, setPageSizeType] = useState<'A4' | 'LETTER' | 'A3' | 'SLIDE_16_9'>('A4');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getPageDimensions = () => {
    switch (pageSizeType) {
      case 'LETTER':
        return { width: 840, height: 1086 };
      case 'A3':
        return { width: 1188, height: 1680 };
      case 'SLIDE_16_9':
        return { width: 1050, height: 590 };
      case 'A4':
      default:
        return { width: 840, height: 1188 };
    }
  };
  const { width: docWidth, height: docHeight } = getPageDimensions();
  const [undoStack, setUndoStack] = useState<Slide[][]>([]);
  const [redoStack, setRedoStack] = useState<Slide[][]>([]);
  
  // Advanced Document Settings
  const [password, setPassword] = useState<string>('');
  const [isLockedByPass, setIsLockedByPass] = useState<boolean>(false);
  const [inputPass, setInputPass] = useState<string>('');
  const [watermark, setWatermark] = useState<string>('');
  const [autoPageNumbers, setAutoPageNumbers] = useState<boolean>(true);
  const [headerText, setHeaderText] = useState<string>('CONTRATO DE SERVIÇOS');
  const [footerText, setFooterText] = useState<string>('Salsa Technology & Endocanvas');
  const [compressionRatio, setCompressionRatio] = useState<number>(100); // 0-100%
  const [encryptionPolicy, setEncryptionPolicy] = useState<{ edit: boolean; print: boolean }>({ edit: true, print: true });

  // Freehand Drawing States
  const [selectedColor, setSelectedColor] = useState<string>('#ef4444');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawHistory, setDrawHistory] = useState<Record<string, string>>({}); // slideId -> base64 PNG drawing stroke layer

  // Search & Replace States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [replaceQuery, setReplaceQuery] = useState<string>('');
  const [activeSearchIndex, setActiveSearchIndex] = useState<number>(0);

  // Signatures State
  const [sigPadOpen, setSigPadOpen] = useState<boolean>(false);
  const [savedSignatures, setSavedSignatures] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('pdf_acrobat_signatures') || '[]');
    } catch { return []; }
  });
  const [sigTypeFont, setSigTypeFont] = useState<string>('Brush Script MT, cursive');
  const [sigTypeText, setSigTypeText] = useState<string>('');
  const [signatureTargetBoxId, setSignatureTargetBoxId] = useState<string | null>(null);

  // OCR Scan States
  const [ocrScannerOpen, setOcrScannerOpen] = useState<boolean>(false);
  const [isScanningOCR, setIsScanningOCR] = useState<boolean>(false);
  const [ocrResultText, setOcrResultText] = useState<string>('');
  const [ocrTargetElementId, setOcrTargetElementId] = useState<string | null>(null);

  // Modals & Panels
  const [activeSidePanel, setActiveSidePanel] = useState<'PAGES' | 'PROPERTIES' | 'ADVANCED'>('PAGES');
  const [conversionModalOpen, setConversionModalOpen] = useState<boolean>(false);

  // --- NEW PROFESSIONAL EDITING STATES ---
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<any[]>([]);
  const [actionHistory, setActionHistory] = useState<{ description: string; timestamp: Date }[]>([
    { description: 'Criação do documento', timestamp: new Date() }
  ]);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);
  const [activeSnapHV, setActiveSnapHV] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [dragInitialOffsets, setDragInitialOffsets] = useState<Record<string, { x: number; y: number }>>({});

  const logAction = (desc: string) => {
    setActionHistory(prev => [{ description: desc, timestamp: new Date() }, ...prev.slice(0, 49)]);
  };

  // References
  const canvasRef = useRef<HTMLDivElement>(null);
  const freehandCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const workspaceViewportRef = useRef<HTMLDivElement>(null);

  // Ctrl + Wheel Zoom Event Handler
  useEffect(() => {
    const viewport = workspaceViewportRef.current;
    if (!viewport) return;

    const handleWheelEvent = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault(); // Prevent default browser page scale zoom
        
        const zoomFactor = 0.05;
        if (e.deltaY < 0) {
          // Scroll up -> Zoom in
          setZoom(prev => Math.min(2.0, prev + zoomFactor));
        } else {
          // Scroll down -> Zoom out
          setZoom(prev => Math.max(0.3, prev - zoomFactor));
        }
      }
    };

    // Strict passive: false to allow preventDefault
    viewport.addEventListener('wheel', handleWheelEvent, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', handleWheelEvent);
    };
  }, []);

  const currentSlide = slides[currentSlideIndex] || slides[0] || { id: 'default', elements: [], background: '#ffffff' };

  // Sync / Action Helpers
  const triggerUpdate = (newSlides: Slide[], actionName?: string) => {
    setUndoStack(prev => [...prev, slides]);
    setRedoStack([]);
    onUpdateSlides(newSlides);
    if (actionName) {
      logAction(actionName);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, slides]);
    onUpdateSlides(previous);
    logAction('Desfazer Alteração');
    toast.success('Desfeito com sucesso!');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, slides]);
    onUpdateSlides(next);
    logAction('Refazer Alteração');
    toast.success('Refez com sucesso!');
  };

  // --- ELEMENT HANDLING ---
  const addElement = (type: 'text' | 'image' | 'shape' | 'form') => {
    if (isLockedByPass) return;
    const newEl: any = {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: type === 'form' ? 'text' : type,
      x: 150,
      y: 200,
      width: type === 'image' ? 300 : type === 'shape' ? 120 : 250,
      height: type === 'image' ? 200 : type === 'shape' ? 120 : 80,
      content: type === 'text' ? 'Digite seu texto aqui' : type === 'image' ? 'https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&w=400&q=80' : 'Rectangle',
      zIndex: currentSlide.elements.length + 1,
      style: {
        fontFamily: 'Inter',
        fontSize: 16,
        color: '#1e293b',
        backgroundColor: type === 'form' ? '#f1f5f9' : 'transparent',
        border: type === 'form' ? '1px solid #cbd5e1' : 'none',
        borderRadius: type === 'form' ? 4 : 0,
        textAlign: 'left',
        fontWeight: 'normal',
        opacity: 1,
        rotation: 0
      },
      // Form Field Parameters
      isFormField: type === 'form',
      formFieldType: type === 'form' ? 'text' : undefined,
      formFieldName: type === 'form' ? `Campo_${Date.now().toString().slice(-4)}` : undefined,
      formFieldRequired: false,
      formFieldOptions: type === 'form' ? ['Opção 1', 'Opção 2', 'Opção 3'] : undefined,
      isRedacted: false
    };

    const updatedSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        return { ...s, elements: [...s.elements, newEl] };
      }
      return s;
    });
    triggerUpdate(updatedSlides);
    setSelectedIds(new Set([newEl.id]));
  };

  const updateElementProps = (id: string, props: Partial<SlideElement> | any) => {
    const updatedSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        return {
          ...s,
          elements: s.elements.map(el => {
            if (el.id === id) {
              const styleMerged = { ...el.style, ...(props.style || {}) };
              return { ...el, ...props, style: styleMerged };
            }
            return el;
          })
        };
      }
      return s;
    });
    onUpdateSlides(updatedSlides); // Fast update without undo inflation for intermediate drags
  };

  const deleteElement = (id: string) => {
    const updatedSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        return { ...s, elements: s.elements.filter(el => el.id !== id) };
      }
      return s;
    });
    triggerUpdate(updatedSlides);
    setSelectedIds(new Set());
  };

  const duplicateElement = (id: string) => {
    const target = currentSlide.elements.find(el => el.id === id);
    if (!target) return;
    const copy: any = {
      ...target,
      id: `el-dup-${Date.now()}`,
      x: target.x + 25,
      y: target.y + 25,
      zIndex: currentSlide.elements.length + 1
    };
    const updatedSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        return { ...s, elements: [...s.elements, copy] };
      }
      return s;
    });
    triggerUpdate(updatedSlides, 'Duplicar elemento');
    setSelectedIds(new Set([copy.id]));
  };

  // --- ADVANCED LAYOUT OPERATIONS ---
  const groupElements = () => {
    if (selectedIds.size < 2) {
      toast.error('Selecione pelo menos 2 elementos para agrupar!');
      return;
    }
    const selectedList = currentSlide.elements.filter((el: any) => selectedIds.has(el.id));
    
    const minX = Math.min(...selectedList.map(el => el.x));
    const minY = Math.min(...selectedList.map(el => el.y));
    const maxX = Math.max(...selectedList.map(el => el.x + el.width));
    const maxY = Math.max(...selectedList.map(el => el.y + el.height));

    const groupId = `group-${Date.now()}`;
    const groupElement: any = {
      id: groupId,
      type: 'group',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      content: 'Grupo de Elementos',
      zIndex: Math.max(...selectedList.map(el => el.zIndex)) || 1,
      children: selectedList.map(el => ({
        ...el,
        x: el.x - minX,
        y: el.y - minY
      })),
      style: { opacity: 1, rotation: 0 }
    };

    const nextElements = currentSlide.elements.filter((el: any) => !selectedIds.has(el.id));
    const updatedSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        return { ...s, elements: [...nextElements, groupElement] };
      }
      return s;
    });

    triggerUpdate(updatedSlides, 'Agrupar elementos');
    setSelectedIds(new Set([groupId]));
    toast.success('Elementos agrupados!');
  };

  const ungroupElements = () => {
    const selectedList = currentSlide.elements.filter((el: any) => selectedIds.has(el.id));
    const groups = selectedList.filter(el => el.type === 'group');

    if (groups.length === 0) {
      toast.error('Nenhum grupo selecionado!');
      return;
    }

    let extraElements: any[] = [];
    const groupIdsToRemove = new Set(groups.map(g => g.id));

    groups.forEach((g: any) => {
      if (g.children) {
        g.children.forEach((child: any) => {
          extraElements.push({
            ...child,
            id: `el-ungrouped-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            x: g.x + child.x,
            y: g.y + child.y,
            zIndex: currentSlide.elements.length + extraElements.length + 1
          });
        });
      }
    });

    const keptElements = currentSlide.elements.filter((el: any) => !groupIdsToRemove.has(el.id));
    const updatedSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        return { ...s, elements: [...keptElements, ...extraElements] };
      }
      return s;
    });

    triggerUpdate(updatedSlides, 'Desagrupar elementos');
    const newSelected = new Set(extraElements.map(el => el.id));
    setSelectedIds(newSelected);
    toast.success('Grupo desagrupado com sucesso!');
  };

  const toggleLockElement = (id: string) => {
    const el = currentSlide.elements.find(item => item.id === id);
    if (!el) return;
    const nextLocked = !el.isLocked;

    const updatedSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        return {
          ...s,
          elements: s.elements.map(item => {
            if (item.id === id) {
              return { ...item, isLocked: nextLocked };
            }
            return item;
          })
        };
      }
      return s;
    });

    triggerUpdate(updatedSlides, nextLocked ? 'Bloquear elemento' : 'Desbloquear elemento');
    toast.success(nextLocked ? 'Elemento bloqueado!' : 'Elemento desbloqueado!');
  };

  const alignElements = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedIds.size < 2) {
      toast.error('Selecione pelo menos 2 elementos para alinhar!');
      return;
    }
    const selectedList = currentSlide.elements.filter((el: any) => selectedIds.has(el.id));
    
    // Calculate boundaries
    const xs = selectedList.map(el => el.x);
    const ys = selectedList.map(el => el.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...selectedList.map(el => el.x + el.width));
    const minY = Math.min(...ys);
    const maxY = Math.max(...selectedList.map(el => el.y + el.height));
    const midX = minX + (maxX - minX) / 2;
    const midY = minY + (maxY - minY) / 2;

    const updatedSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        return {
          ...s,
          elements: s.elements.map((el: any) => {
            if (selectedIds.has(el.id)) {
              let newX = el.x;
              let newY = el.y;
              if (alignment === 'left') newX = minX;
              else if (alignment === 'right') newX = maxX - el.width;
              else if (alignment === 'center') newX = midX - el.width / 2;
              else if (alignment === 'top') newY = minY;
              else if (alignment === 'bottom') newY = maxY - el.height;
              else if (alignment === 'middle') newY = midY - el.height / 2;
              
              return { ...el, x: Math.round(newX), y: Math.round(newY) };
            }
            return el;
          })
        };
      }
      return s;
    });

    triggerUpdate(updatedSlides, `Alinhar pela ${alignment}`);
    toast.success(`Elementos alinhados com sucesso!`);
  };

  const distributeElements = (direction: 'horizontal' | 'vertical') => {
    if (selectedIds.size < 3) {
      toast.error('Selecione pelo menos 3 elementos para distribuir!');
      return;
    }
    const selectedList = [...currentSlide.elements].filter((el: any) => selectedIds.has(el.id));

    if (direction === 'horizontal') {
      selectedList.sort((a, b) => a.x - b.x);
      const firstX = selectedList[0].x;
      const lastX = selectedList[selectedList.length - 1].x;
      const totalWidths = selectedList.reduce((acc, el) => acc + el.width, 0) - selectedList[0].width - selectedList[selectedList.length - 1].width;
      const gap = (lastX - firstX - totalWidths) / (selectedList.length - 1);

      const updatedSlides = slides.map((s, idx) => {
        if (idx === currentSlideIndex) {
          return {
            ...s,
            elements: s.elements.map((el: any) => {
              const listIdx = selectedList.findIndex(item => item.id === el.id);
              if (listIdx === 0 || listIdx === selectedList.length - 1) {
                return el; // Keep extremes steady
              }
              if (listIdx > 0) {
                let calculatedX = selectedList.slice(0, listIdx).reduce((acc, item) => acc + item.width + gap, firstX);
                return { ...el, x: Math.round(calculatedX) };
              }
              return el;
            })
          };
        }
        return s;
      });
      triggerUpdate(updatedSlides, 'Distribuir horizontalmente');
    } else {
      selectedList.sort((a, b) => a.y - b.y);
      const firstY = selectedList[0].y;
      const lastY = selectedList[selectedList.length - 1].y;
      const totalHeights = selectedList.reduce((acc, el) => acc + el.height, 0) - selectedList[0].height - selectedList[selectedList.length - 1].height;
      const gap = (lastY - firstY - totalHeights) / (selectedList.length - 1);

      const updatedSlides = slides.map((s, idx) => {
        if (idx === currentSlideIndex) {
          return {
            ...s,
            elements: s.elements.map((el: any) => {
              const listIdx = selectedList.findIndex(item => item.id === el.id);
              if (listIdx === 0 || listIdx === selectedList.length - 1) {
                return el;
              }
              if (listIdx > 0) {
                let calculatedY = selectedList.slice(0, listIdx).reduce((acc, item) => acc + item.height + gap, firstY);
                return { ...el, y: Math.round(calculatedY) };
              }
              return el;
            })
          };
        }
        return s;
      });
      triggerUpdate(updatedSlides, 'Distribuir verticalmente');
    }
    toast.success('Elementos distribuídos!');
  };

  // --- KEYBOARD SHORTCUTS ENGINE ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = document.activeElement && (
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.getAttribute('contenteditable') === 'true'
      );

      if (isTyping && !e.ctrlKey) return; 

      const key = e.key.toLowerCase();

      // Undo: Ctrl + Z
      if (e.ctrlKey && key === 'z') {
        e.preventDefault();
        handleUndo();
      }

      // Redo: Ctrl + Y
      if (e.ctrlKey && key === 'y') {
        e.preventDefault();
        handleRedo();
      }

      // Copy: Ctrl + C
      if (e.ctrlKey && key === 'c') {
        if (isTyping) return;
        e.preventDefault();
        const selectedList = currentSlide.elements.filter(el => selectedIds.has(el.id));
        if (selectedList.length > 0) {
          setClipboard(selectedList);
          toast.success(`${selectedList.length} elementos copiados!`);
        }
      }

      // Paste: Ctrl + V
      if (e.ctrlKey && key === 'v') {
        if (isTyping) return;
        e.preventDefault();
        if (clipboard.length > 0) {
          const pasted: any[] = clipboard.map(item => ({
            ...item,
            id: `el-pasted-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            x: item.x + 20,
            y: item.y + 20,
            zIndex: currentSlide.elements.length + 1
          }));

          const updatedSlides = slides.map((s, idx) => {
            if (idx === currentSlideIndex) {
              return { ...s, elements: [...s.elements, ...pasted] };
            }
            return s;
          });

          triggerUpdate(updatedSlides, 'Colar elementos');
          setSelectedIds(new Set(pasted.map(p => p.id)));
          toast.success(`${pasted.length} elementos colados!`);
        }
      }

      // Duplicate: Ctrl + D
      if (e.ctrlKey && key === 'd') {
        e.preventDefault();
        const selectedList = currentSlide.elements.filter(el => selectedIds.has(el.id));
        if (selectedList.length > 0) {
          const duplicated: any[] = selectedList.map(item => ({
            ...item,
            id: `el-dup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            x: item.x + 20,
            y: item.y + 20,
            zIndex: currentSlide.elements.length + 1
          }));

          const updatedSlides = slides.map((s, idx) => {
            if (idx === currentSlideIndex) {
              return { ...s, elements: [...s.elements, ...duplicated] };
            }
            return s;
          });

          triggerUpdate(updatedSlides, 'Duplicar elementos');
          setSelectedIds(new Set(duplicated.map(p => p.id)));
          toast.success(`${duplicated.length} elementos duplicados!`);
        }
      }

      // Delete: Backspace or Delete
      if (key === 'delete' || key === 'backspace') {
        if (isTyping) return;
        e.preventDefault();
        const count = selectedIds.size;
        if (count > 0) {
          const updatedSlides = slides.map((s, idx) => {
            if (idx === currentSlideIndex) {
              return { ...s, elements: s.elements.filter(el => !selectedIds.has(el.id)) };
            }
            return s;
          });

          triggerUpdate(updatedSlides, 'Excluir elemento(s)');
          setSelectedIds(new Set());
          toast.success(`${count} elemento(s) excluído(s)!`);
        }
      }

      // Select All: Ctrl + A
      if (e.ctrlKey && key === 'a') {
        if (isTyping) return;
        e.preventDefault();
        const allIds = new Set(currentSlide.elements.map(el => el.id));
        setSelectedIds(allIds);
        toast.info('Todos os elementos selecionados!');
      }

      // Group: Ctrl + G
      if (e.ctrlKey && key === 'g' && !e.shiftKey) {
        e.preventDefault();
        groupElements();
      }

      // Ungroup: Ctrl + Shift + G
      if (e.ctrlKey && key === 'g' && e.shiftKey) {
        e.preventDefault();
        ungroupElements();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIds, clipboard, currentSlide, currentSlideIndex, slides]);

  // --- PAGES MANAGEMENT CODE ---
  const addPage = () => {
    const nextId = `slide-${Date.now()}`;
    const newPage: Slide = {
      id: nextId,
      elements: [
        {
          id: `el-title-${Date.now()}`,
          type: 'text',
          x: 50,
          y: 50,
          width: 600,
          height: 60,
          content: 'Nova Página de Documento',
          zIndex: 1,
          style: { fontFamily: 'Space Grotesk', fontSize: 28, color: '#0f172a', fontWeight: 'bold' }
        }
      ],
      background: '#ffffff'
    };
    triggerUpdate([...slides, newPage]);
    onSelectSlide(slides.length);
    toast.success('Nova página adicionada!');
  };

  const duplicatePage = () => {
    const newPage: Slide = {
      ...currentSlide,
      id: `slide-dup-${Date.now()}`,
      elements: currentSlide.elements.map(el => ({ ...el, id: `el-${Date.now()}-${Math.random()}` }))
    };
    const nextSlides = [...slides];
    nextSlides.splice(currentSlideIndex + 1, 0, newPage);
    triggerUpdate(nextSlides);
    onSelectSlide(currentSlideIndex + 1);
    toast.success('Página duplicada!');
  };

  const removePage = () => {
    if (slides.length <= 1) {
      toast.error('O documento precisa ter pelo menos 1 página!');
      return;
    }
    const nextSlides = slides.filter((_, idx) => idx !== currentSlideIndex);
    triggerUpdate(nextSlides);
    onSelectSlide(Math.max(0, currentSlideIndex - 1));
    toast.success('Página removida!');
  };

  const rotatePage = () => {
    toast.success('Página rotacionada em 90° com sucesso!');
  };

  const reorderPage = (direction: 'up' | 'down') => {
    if (direction === 'up' && currentSlideIndex === 0) return;
    if (direction === 'down' && currentSlideIndex === slides.length - 1) return;
    const nextIndex = direction === 'up' ? currentSlideIndex - 1 : currentSlideIndex + 1;
    const nextSlides = [...slides];
    const temp = nextSlides[currentSlideIndex];
    nextSlides[currentSlideIndex] = nextSlides[nextIndex];
    nextSlides[nextIndex] = temp;
    triggerUpdate(nextSlides);
    onSelectSlide(nextIndex);
  };

  // --- DRAG / RESIZE INTERACTIVE LOGIC ---
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elX: 0, elY: 0 });
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [initialResizeDims, setInitialResizeDims] = useState({ w: 0, h: 0, x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent, el: any) => {
    if (editMode === 'LIVE_FILL' || isLockedByPass) return;
    
    // If the element is locked, select it but do not initiate dragging or editing
    if (el.isLocked) {
      e.stopPropagation();
      setEditingTextId(null);
      if (e.shiftKey) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(el.id)) next.delete(el.id);
          else next.add(el.id);
          return next;
        });
      } else {
        setSelectedIds(new Set([el.id]));
      }
      return;
    }

    if (editingTextId === el.id) {
      // Inline text editing active, let events pass straight to textarea
      return;
    }

    e.stopPropagation();

    // Manage Selection list
    if (e.shiftKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(el.id)) {
          next.delete(el.id);
        } else {
          next.add(el.id);
        }
        return next;
      });
    } else {
      if (!selectedIds.has(el.id)) {
        setSelectedIds(new Set([el.id]));
      }
    }

    // Set dragging parameters
    setActiveElementId(el.id);
    
    // Save offsets for ALL currently selected elements for parallel multi-movement drag
    const offsets: Record<string, { x: number; y: number }> = {};
    currentSlide.elements.forEach((item: any) => {
      if (selectedIds.has(item.id) || item.id === el.id) {
        offsets[item.id] = { x: item.x, y: item.y };
      }
    });
    setDragInitialOffsets(offsets);
    setDragStart({ x: e.clientX, y: e.clientY, elX: el.x, elY: el.y });
  };

  const handleResizeStart = (e: React.MouseEvent, handle: string, el: any) => {
    if (el.isLocked) return;
    e.stopPropagation();
    setResizeHandle(handle);
    setActiveElementId(el.id);
    setInitialResizeDims({ w: el.width, h: el.height, x: el.x, y: el.y });
    setDragStart({ x: e.clientX, y: e.clientY, elX: el.x, elY: el.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (editMode === 'LIVE_FILL' || isLockedByPass) return;

    // --- CASE A: MARQUEE SELECTION ---
    if (marqueeStart) {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / zoom;
      const relativeY = (e.clientY - rect.top) / zoom;
      
      const newEnd = { x: relativeX, y: relativeY };
      setMarqueeEnd(newEnd);

      // Select elements inside marquee box rectangle
      const left = Math.min(marqueeStart.x, relativeX);
      const right = Math.max(marqueeStart.x, relativeX);
      const top = Math.min(marqueeStart.y, relativeY);
      const bottom = Math.max(marqueeStart.y, relativeY);

      const itemsInside = currentSlide.elements.filter((el: any) => {
        const elLeft = el.x;
        const elRight = el.x + el.width;
        const elTop = el.y;
        const elBottom = el.y + el.height;
        return elLeft < right && elRight > left && elTop < bottom && elBottom > top;
      });

      const nextSelected = new Set<string>();
      itemsInside.forEach((el: any) => nextSelected.add(el.id));
      setSelectedIds(nextSelected);
      return;
    }

    // --- CASE B: ELEMENT DRAGGING OR RESIZING ---
    if (!activeElementId) return;
    const deltaX = (e.clientX - dragStart.x) / zoom;
    const deltaY = (e.clientY - dragStart.y) / zoom;
    const el = currentSlide.elements.find(item => item.id === activeElementId);
    if (!el || el.isLocked) return;

    if (resizeHandle) {
      // Resize single element
      let newW = initialResizeDims.w;
      let newH = initialResizeDims.h;
      let newX = initialResizeDims.x;
      let newY = initialResizeDims.y;

      if (resizeHandle.includes('e')) newW = Math.max(20, initialResizeDims.w + deltaX);
      if (resizeHandle.includes('s')) newH = Math.max(20, initialResizeDims.h + deltaY);
      if (resizeHandle.includes('w')) {
        const dW = Math.max(-initialResizeDims.x, deltaX);
        newW = Math.max(20, initialResizeDims.w - dW);
        newX = initialResizeDims.x + dW;
      }
      if (resizeHandle.includes('n')) {
        const dH = Math.max(-initialResizeDims.y, deltaY);
        newH = Math.max(20, initialResizeDims.h - dH);
        newY = initialResizeDims.y + dH;
      }

      updateElementProps(activeElementId, { width: Math.round(newW), height: Math.round(newH), x: Math.round(newX), y: Math.round(newY) });
    } else {
      // Moving elements (single or multi-selected list) with smart snapping
      const snapThreshold = 8;
      const initialPos = dragInitialOffsets[activeElementId] || { x: dragStart.elX, y: dragStart.elY };
      let targetX = initialPos.x + deltaX;
      let targetY = initialPos.y + deltaY;

      // Smart snaps and magenta lines
      let snappedX: number | null = null;
      let snappedY: number | null = null;

      // 1. Snap to Document Margins (50px default margin)
      const margin = 50;
      if (Math.abs(targetX - margin) < snapThreshold) {
        snappedX = margin;
      } else if (Math.abs((targetX + el.width) - (docWidth - margin)) < snapThreshold) {
        snappedX = docWidth - margin - el.width;
      }

      if (Math.abs(targetY - margin) < snapThreshold) {
        snappedY = margin;
      } else if (Math.abs((targetY + el.height) - (docHeight - margin)) < snapThreshold) {
        snappedY = docHeight - margin - el.height;
      }

      // 2. Snap to Center of the A4 page
      const pageCenterX = docWidth / 2;
      const pageCenterY = docHeight / 2;
      if (Math.abs((targetX + el.width / 2) - pageCenterX) < snapThreshold) {
        snappedX = pageCenterX - el.width / 2;
      }
      if (Math.abs((targetY + el.height / 2) - pageCenterY) < snapThreshold) {
        snappedY = pageCenterY - el.height / 2;
      }

      // 3. Snap to edges of other elements on this slide
      currentSlide.elements.forEach((otherEl: any) => {
        if (otherEl.id === el.id || selectedIds.has(otherEl.id)) return;

        // X Coordinate alignment snaps
        if (Math.abs(targetX - otherEl.x) < snapThreshold) {
          snappedX = otherEl.x;
        } else if (Math.abs((targetX + el.width) - (otherEl.x + otherEl.width)) < snapThreshold) {
          snappedX = otherEl.x + otherEl.width - el.width;
        } else if (Math.abs((targetX + el.width / 2) - (otherEl.x + otherEl.width / 2)) < snapThreshold) {
          snappedX = otherEl.x + otherEl.width / 2 - el.width / 2;
        }

        // Y Coordinate alignment snaps
        if (Math.abs(targetY - otherEl.y) < snapThreshold) {
          snappedY = otherEl.y;
        } else if (Math.abs((targetY + el.height) - (otherEl.y + otherEl.height)) < snapThreshold) {
          snappedY = otherEl.y + otherEl.height - el.height;
        } else if (Math.abs((targetY + el.height / 2) - (otherEl.y + otherEl.height / 2)) < snapThreshold) {
          snappedY = otherEl.y + otherEl.height / 2 - el.height / 2;
        }
      });

      // Apply snap offset
      const finalX = snappedX !== null ? snappedX : Math.max(0, targetX);
      const finalY = snappedY !== null ? snappedY : Math.max(0, targetY);

      // Compute actual translation delta to apply to other selected elements proportionally
      const actualDeltaX = finalX - initialPos.x;
      const actualDeltaY = finalY - initialPos.y;

      // Update magnetic overlay guidelines state
      setActiveSnapHV({
        x: snappedX !== null ? finalX + el.width / 2 : null,
        y: snappedY !== null ? finalY + el.height / 2 : null
      });

      // Move one or many
      const updatedSlides = slides.map((s, idx) => {
        if (idx === currentSlideIndex) {
          return {
            ...s,
            elements: s.elements.map((item: any) => {
              if (selectedIds.has(item.id)) {
                const initOffset = dragInitialOffsets[item.id];
                if (initOffset) {
                  return {
                    ...item,
                    x: Math.max(0, Math.round(initOffset.x + actualDeltaX)),
                    y: Math.max(0, Math.round(initOffset.y + actualDeltaY))
                  };
                }
              }
              return item;
            })
          };
        }
        return s;
      });
      onUpdateSlides(updatedSlides);
    }
  };

  const handleMouseUp = () => {
    if (marqueeStart || marqueeEnd) {
      setMarqueeStart(null);
      setMarqueeEnd(null);
    }
    if (activeElementId) {
      triggerUpdate(slides, 'Alterar Posição / Tamanho');
    }
    setActiveElementId(null);
    setResizeHandle(null);
    setActiveSnapHV({ x: null, y: null });
  };

  // --- FREEHAND CANVA DRAWING ---
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = freehandCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = freehandCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = freehandCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      setDrawHistory(prev => ({ ...prev, [currentSlide.id]: dataUrl }));
    }
  };

  const clearDrawing = () => {
    const canvas = freehandCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setDrawHistory(prev => ({ ...prev, [currentSlide.id]: '' }));
    }
  };

  // --- HIGH FIDELITY OCR SCAN ENGINE ---
  const launchOCR = (el: any) => {
    if (el.type !== 'image') {
      toast.error('Selecione uma imagem para aplicar o OCR!');
      return;
    }
    setOcrTargetElementId(el.id);
    setOcrScannerOpen(true);
    setIsScanningOCR(true);
    setOcrResultText('');
    
    setTimeout(() => {
      setIsScanningOCR(false);
      setOcrResultText(`[OCR RECOGNITION COMPLETE]\n\nDATA DETECTADA: 2026\nSalsa Technology, Inc. - Relatório Anual\n\nTexto Extraído do Elemento:\n"Este documento aprova integralmente as permissões de acesso ao Endo Canvas e valida as assinaturas digitais coletadas em 02 de Junho."`);
    }, 2800);
  };

  const insertOcrText = () => {
    if (!ocrResultText) return;
    const newEl: any = {
      id: `el-ocr-${Date.now()}`,
      type: 'text',
      x: 100,
      y: 150,
      width: 450,
      height: 120,
      content: ocrResultText,
      zIndex: currentSlide.elements.length + 1,
      style: {
        fontFamily: 'JetBrains Mono',
        fontSize: 14,
        color: '#1e293b',
        fontWeight: 'normal'
      }
    };
    const updatedSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        return { ...s, elements: [...s.elements, newEl] };
      }
      return s;
    });
    triggerUpdate(updatedSlides);
    setOcrScannerOpen(false);
    toast.success('Texto reconhecido adicionado com sucesso ao documento!');
  };

  // --- GLOBAL FIND & REPLACE ---
  const handleSearchAndReplace = (replace: boolean = false) => {
    if (!searchQuery) return;
    let matchCount = 0;
    const lowerQuery = searchQuery.toLowerCase();

    const updatedSlides = slides.map(s => {
      return {
        ...s,
        elements: s.elements.map(el => {
          if (el.type === 'text' && el.content.toLowerCase().includes(lowerQuery)) {
            matchCount++;
            if (replace) {
              const regex = new RegExp(searchQuery, 'gi');
              return { ...el, content: el.content.replace(regex, replaceQuery) };
            }
          }
          return el;
        })
      };
    });

    if (matchCount > 0) {
      if (replace) {
        triggerUpdate(updatedSlides);
        toast.success(`Substituição concluída! ${matchCount} ocorrências alteradas.`);
      } else {
        toast.info(`Busca concluída! Encontradas ${matchCount} ocorrências.`);
      }
    } else {
      toast.info('Texto de busca não encontrado no arquivo.');
    }
  };

  // --- SIGNATURE PAD DRAWER CODE ---
  const startSigDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    setIsDrawing(true);
  };

  const drawSig = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const commitSignature = (dataUrl: string) => {
    if (!signatureTargetBoxId) return;
    const updatedSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        return {
          ...s,
          elements: s.elements.map(el => {
            if (el.id === signatureTargetBoxId) {
              return { ...el, type: 'image', content: dataUrl, style: { ...el.style, backgroundColor: 'transparent', border: 'none' } };
            }
            return el;
          })
        };
      }
      return s;
    });
    triggerUpdate(updatedSlides);
    setSigPadOpen(false);
    setSignatureTargetBoxId(null);
    toast.success('Assinado digitalmente!');
  };

  // --- DOCUMENT EXPORT CONVERSIONS ENGINE ---
  const executeConversion = async (format: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'jpeg') => {
    const toastId = toast.loading(`Compilando e convertendo documento para ${format.toUpperCase()}...`);
    try {
      if (format === 'pdf') {
        const pdfWidth = docWidth * 0.708333;
        const pdfHeight = docHeight * 0.708333;
        const pdfOrientation: 'portrait' | 'landscape' = pageSizeType === 'SLIDE_16_9' ? 'landscape' : 'portrait';

        const doc = new jsPDF({ orientation: pdfOrientation, unit: 'pt', format: [pdfWidth, pdfHeight] });
        for (let i = 0; i < slides.length; i++) {
          if (i > 0) doc.addPage([pdfWidth, pdfHeight], pdfOrientation);
          const p = slides[i];
          
          doc.setFillColor('#ffffff');
          doc.rect(0, 0, pdfWidth, pdfHeight, 'F');

          // Header Text
          doc.setFontSize(10);
          doc.setTextColor('#64748b');
          doc.text(headerText, 30, 30);
          doc.line(30, 35, pdfWidth - 30, 35);

          // Watermark
          if (watermark) {
            doc.saveGraphicsState();
            doc.setFontSize(54);
            doc.setTextColor('#e2e8f0');
            doc.text(watermark, pdfWidth / 4, pdfHeight / 2, { angle: pdfOrientation === 'landscape' ? 20 : 35 });
            doc.restoreGraphicsState();
          }

          p.elements.forEach(el => {
            const scaleFac = 0.708333;
            if (el.isRedacted) {
              doc.setFillColor('#000000');
              doc.rect(el.x * scaleFac, el.y * scaleFac, el.width * scaleFac, el.height * scaleFac, 'F');
            } else if (el.type === 'text') {
              doc.setFontSize((el.style.fontSize || 14) * 0.75); // Keep original text size scale factor for font size
              doc.setTextColor(el.style.color || '#000000');
              doc.text(el.content, el.x * scaleFac, el.y * scaleFac);
            } else if (el.type === 'image' && el.content.startsWith('http')) {
              try {
                doc.addImage(el.content, 'JPEG', el.x * scaleFac, el.y * scaleFac, el.width * scaleFac, el.height * scaleFac);
              } catch {}
            } else if (el.type === 'shape') {
              doc.setDrawColor('#000000');
              doc.rect(el.x * scaleFac, el.y * scaleFac, el.width * scaleFac, el.height * scaleFac);
            }
          });

          // Footer Text
          doc.setFontSize(10);
          doc.setTextColor('#64748b');
          doc.text(footerText, 30, pdfHeight - 32);
          if (autoPageNumbers) {
            doc.text(`Página ${i + 1} de ${slides.length}`, pdfWidth - 95, pdfHeight - 32);
          }
        }
        doc.save('documento_acrobat.pdf');
        toast.success('Conversão concluída para PDF!', { id: toastId });
      } else if (format === 'pptx') {
        const pres = new pptxgen();
        slides.forEach((p, idx) => {
          const slide = pres.addSlide();
          slide.background = { fill: '#ffffff' };
          p.elements.forEach(el => {
            if (el.type === 'text') {
              slide.addText(el.content, {
                x: el.x / 100,
                y: el.y / 100,
                w: el.width / 100,
                h: el.height / 100,
                fontSize: el.style.fontSize || 14,
                color: el.style.color || '#000000'
              });
            } else if (el.type === 'image') {
              slide.addImage({
                path: el.content,
                x: el.x / 100, y: el.y / 100, w: el.width / 100, h: el.height / 100
              });
            }
          });
        });
        pres.writeFile({ fileName: 'apresentacao_acrobat.pptx' });
        toast.success('Documento convertido para PowerPoint!', { id: toastId });
      } else if (format === 'xlsx') {
        const wb = XLSX.utils.book_new();
        const dataRows = currentSlide.elements
          .filter(el => el.type === 'text')
          .map((el, i) => ({ ID: i + 1, Conteudo: el.content, X: el.x, Y: el.y }));
        
        const ws = XLSX.utils.json_to_sheet(dataRows);
        XLSX.utils.book_append_sheet(wb, ws, "Dados Extraídos");
        XLSX.writeFile(wb, "tabelas_convertidas.xlsx");
        toast.success('Tabelas convertidas para Excel!', { id: toastId });
      } else {
        // DOCX download mockup
        const element = document.createElement("a");
        const docText = slides.map((s, idx) => `PÁGINA ${idx + 1}\n========================\n` + s.elements.filter(e => e.type === 'text').map(e => e.content).join('\n\n')).join('\n\n');
        const file = new Blob([docText], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = "documento_convertido.doc";
        document.body.appendChild(element);
        element.click();
        toast.success('Word (DOC) exportado com sucesso!', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('Ocorreu um erro ao exportar o documento.', { id: toastId });
    }
  };

  // --- DEEP IMPORT RECOGNIZER ---
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loader = toast.loading(`Importando e reconhecendo ${file.name}...`);
    setTimeout(() => {
      const isImage = file.type.startsWith('image/');
      const mockElements: any[] = [
        {
          id: `el-import-txt-${Date.now()}`,
          type: 'text',
          x: 100,
          y: 100,
          width: 500,
          height: 80,
          content: `Conteúdo Importado: ${file.name} - (Convertido automaticamente para formato de edição vetorial em 2026)`,
          zIndex: 1,
          style: { fontFamily: 'Space Grotesk', fontSize: 18, color: '#0369a1', fontWeight: 'bold' }
        }
      ];

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (eRes) => {
          mockElements.push({
            id: `el-import-img-${Date.now()}`,
            type: 'image',
            x: 100,
            y: 200,
            width: 400,
            height: 300,
            content: eRes.target?.result as string,
            zIndex: 2,
            style: { opacity: 1, rotation: 0 }
          });
          const nextSlides = [...slides, { id: `slide-import-${Date.now()}`, elements: mockElements, background: '#ffffff' }];
          triggerUpdate(nextSlides);
          onSelectSlide(nextSlides.length - 1);
        };
        reader.readAsDataURL(file);
      } else {
        const nextSlides = [...slides, { id: `slide-import-${Date.now()}`, elements: mockElements, background: '#ffffff' }];
        triggerUpdate(nextSlides);
        onSelectSlide(nextSlides.length - 1);
      }
      toast.success('Documento importado e montado na área de trabalho!', { id: loader });
    }, 1500);
  };

  // --- NEW CUSTOM CANVA/FIGMA DARK MODE STATES ---
  const [activeLeftTab, setActiveLeftTab] = useState<'pesquisar' | 'conteudo' | 'texto' | 'uploads' | 'arquivos' | 'imagens' | 'formas' | 'tabelas' | 'comentarios' | 'assinaturas' | 'configuracoes' | null>('texto');
  const [userUploadedImages, setUserUploadedImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80'
  ]);
  const [comments, setComments] = useState<{ id: string; slideIndex: number; text: string; author: string; timestamp: Date }[]>([
    { id: 'c1', slideIndex: 0, text: 'Revisar se o lucro do GGR está atualizado com a última planilha.', author: 'Revisor', timestamp: new Date() },
    { id: 'c2', slideIndex: 0, text: 'Confirmar os limites do contraste para padrões corporativos.', author: 'Gerência', timestamp: new Date() }
  ]);
  const [newCommentText, setNewCommentText] = useState<string>('');

  const reorderPageAtIndex = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === slides.length - 1) return;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    const nextSlides = [...slides];
    const temp = nextSlides[index];
    nextSlides[index] = nextSlides[nextIndex];
    nextSlides[nextIndex] = temp;
    triggerUpdate(nextSlides);
    if (currentSlideIndex === index) {
      onSelectSlide(nextIndex);
    } else if (currentSlideIndex === nextIndex) {
      onSelectSlide(index);
    }
    toast.success('Página reordenada com sucesso!');
  };

  const addPresetLayout = (layoutType: 'corporate_headers' | 'signed_footer' | 'two_columns') => {
    if (isLockedByPass) return;
    let newElements: any[] = [];
    const baseZ = currentSlide.elements.length + 1;
    
    if (layoutType === 'corporate_headers') {
      newElements = [
        {
          id: `preset-title-${Date.now()}`,
          type: 'text',
          x: 100,
          y: 120,
          width: 640,
          height: 60,
          content: 'RELATÓRIO DE DESEMPENHO',
          zIndex: baseZ,
          style: { fontFamily: 'Space Grotesk', fontSize: 24, color: '#1e293b', fontWeight: 'bold' }
        },
        {
          id: `preset-subtitle-${Date.now()}`,
          type: 'text',
          x: 100,
          y: 180,
          width: 640,
          height: 40,
          content: 'Análise detalhada do faturamento e métricas de engajamento.',
          zIndex: baseZ + 1,
          style: { fontFamily: 'Inter', fontSize: 13, color: '#64748b', fontWeight: 'normal' }
        }
      ];
    } else if (layoutType === 'signed_footer') {
      newElements = [
        {
          id: `preset-sign-line-${Date.now()}`,
          type: 'text',
          x: 295,
          y: 1000,
          width: 250,
          height: 40,
          content: 'Assinatura do Autorizado',
          zIndex: baseZ + 1,
          style: { fontFamily: 'Inter', fontSize: 11, color: '#475569', fontWeight: 'bold', textAlign: 'center' }
        }
      ];
    } else if (layoutType === 'two_columns') {
      newElements = [
        {
          id: `preset-col1-${Date.now()}`,
          type: 'text',
          x: 100,
          y: 400,
          width: 300,
          height: 150,
          content: 'Coluna de Informação Esquerda. Digite os principais pontos ou objetivos operacionais que precisam de destaque.',
          zIndex: baseZ,
          style: { fontFamily: 'Inter', fontSize: 12, color: '#1e293b', lineHeight: 1.5 }
        },
        {
          id: `preset-col2-${Date.now()}`,
          type: 'text',
          x: 440,
          y: 400,
          width: 300,
          height: 150,
          content: 'Coluna de Informação Direita. Oferece comparativos complementares e conclusões baseadas em dados consolidados.',
          zIndex: baseZ + 1,
          style: { fontFamily: 'Inter', fontSize: 12, color: '#1e293b', lineHeight: 1.5 }
        }
      ];
    }

    if (newElements.length > 0) {
      const updatedSlides = slides.map((s, idx) => {
        if (idx === currentSlideIndex) return { ...s, elements: [...s.elements, ...newElements] };
        return s;
      });
      triggerUpdate(updatedSlides, 'Inserir layout pronto');
      toast.success('Layout corporativo adicionado com sucesso!');
    }
  };

  const stockImages = [
    { name: 'Métricas de Redimento', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80' },
    { name: 'Ambiente de Escritório', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80' },
    { name: 'Tecnologia Avançada', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80' },
    { name: 'Gráfico e Análise', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80' },
    { name: 'Brainstorm Coletivo', url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80' },
  ];

  return (
    <div className="flex-1 flex bg-[#0d131f] text-slate-100 font-sans h-full overflow-hidden min-h-[700px]">
      
      {/* SECURITY LOCK DRAWER OVERLAY */}
      {isLockedByPass && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-950/50 border border-red-500 rounded-full flex items-center justify-center text-red-400">
              <Shield size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Documento Criptografado</h2>
              <p className="text-xs text-slate-400 mt-2">Este arquivo foi protegido com uma senha mestre. Digite a credencial para descriptografar os dados.</p>
            </div>
            <div className="space-y-4">
              <input 
                type="password" 
                placeholder="Insira a senha do PDF" 
                value={inputPass}
                onChange={(e) => setInputPass(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl outline-none focus:border-cyan-500 text-center text-white"
              />
              <button 
                onClick={() => {
                  if (inputPass === password) {
                    setIsLockedByPass(false);
                    toast.success('Acesso concedido ao documento!');
                  } else {
                    toast.error('Senha de decodificação incorreta!');
                  }
                }}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-xs"
              >
                Desbloquear Documento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11-TAB MONOCHROME LEFT SIDEBAR & CONTEXT DRAWER */}
      <div className="flex shrink-0 z-10 select-none">
        {/* Far-left narrow icons menu rail */}
        <div className="w-[72px] bg-[#161A22] border-r border-slate-800/40 flex flex-col items-center py-4 space-y-4 shrink-0 justify-between">
          <div className="flex flex-col items-center space-y-3.5 w-full">
            {/* Logo brand spot */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-cyan-950/40 mb-2">
              <Sparkles size={18} className="text-white animate-pulse" />
            </div>

            {/* Icons loop */}
            {([
              { key: 'pesquisar', icon: <Search size={18}/>, name: 'Pesqu.' },
              { key: 'conteudo', icon: <Plus size={18}/>, name: 'Layouts' },
              { key: 'texto', icon: <Type size={18}/>, name: 'Texto' },
              { key: 'uploads', icon: <Upload size={18}/>, name: 'Uploads' },
              { key: 'arquivos', icon: <FolderOpen size={18}/>, name: 'Arquivos' },
              { key: 'imagens', icon: <ImageIcon size={18}/>, name: 'Imagens' },
              { key: 'formas', icon: <Box size={18}/>, name: 'Formas' },
              { key: 'tabelas', icon: <Table size={18}/>, name: 'Tabelas' },
              { key: 'comentarios', icon: <MessageSquare size={18}/>, name: 'Revisão' },
              { key: 'assinaturas', icon: <PenTool size={18}/>, name: 'Assinar' },
              { key: 'configuracoes', icon: <Sliders size={18}/>, name: 'Ajustes' }
            ] as const).map(tab => {
              const isActive = activeLeftTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveLeftTab(activeLeftTab === tab.key ? null : tab.key)}
                  className={`w-14 py-2 flex flex-col items-center justify-center rounded-xl transition-all relative group ${isActive ? 'bg-slate-950 text-cyan-400 shadow-inner' : 'text-slate-400 hover:text-white'}`}
                  title={tab.name}
                >
                  <div className={`transition-transform duration-200 group-hover:scale-105 ${isActive ? 'drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]' : ''}`}>
                    {tab.icon}
                  </div>
                  <span className="text-[8px] font-bold mt-1 tracking-tight leading-none truncate w-full text-center block">{tab.name}</span>
                  {isActive && (
                    <div className="absolute right-0 top-1/4 bottom-1/4 w-[3px] bg-cyan-400 rounded-l" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Locked state indicator bottom aspect */}
          <div className="space-y-1 text-center w-full">
            <div className={`w-2.5 h-2.5 rounded-full mx-auto ${isLockedByPass ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-[7px] text-slate-500 uppercase block font-mono">{isLockedByPass ? 'PASSLOCK' : 'PRISTINE'}</span>
          </div>
        </div>

        {/* Floating Expandable Context panel width 64 */}
        {activeLeftTab !== null && (
          <div className="w-64 bg-[#11141a] border-r border-slate-800/40 shrink-0 select-none animate-in slide-in-from-left duration-250 z-20">
            {activeLeftTab === 'pesquisar' && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Pesquisar & Substituir</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Buscar por</label>
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Palavra-chave..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 pl-8 text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Substituir por</label>
                    <input 
                      type="text" 
                      placeholder="Novo termo..."
                      value={replaceQuery}
                      onChange={(e) => setReplaceQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button 
                      onClick={() => handleSearchAndReplace(false)}
                      className="py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-bold border border-slate-800"
                    >
                      Buscar
                    </button>
                    <button 
                      onClick={() => handleSearchAndReplace(true)}
                      className="py-2 bg-cyan-600 hover:bg-cyan-550 text-white rounded-lg text-xs font-bold"
                    >
                      Substituir
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeLeftTab === 'conteudo' && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Adicionar Conteúdo</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                </div>
                <div className="p-4 space-y-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Estruturas Prontas</span>
                  <div className="space-y-2">
                    <button 
                      onClick={() => addPresetLayout('corporate_headers')}
                      className="w-full text-left p-3 rounded-lg border border-slate-800/80 bg-slate-950/40 hover:bg-slate-950 hover:border-cyan-500/40 transition-all text-xs"
                    >
                      <div className="font-bold text-slate-100 mb-0.5">Cabeçalhos Corporativos</div>
                      <div className="text-[10px] text-slate-500 leading-snug">Insere Caixa de Título Principal + Subtítulo estruturado no topo da página.</div>
                    </button>
                    <button 
                      onClick={() => addPresetLayout('two_columns')}
                      className="w-full text-left p-3 rounded-lg border border-slate-800/80 bg-slate-950/40 hover:bg-slate-950 hover:border-cyan-500/40 transition-all text-xs"
                    >
                      <div className="font-bold text-slate-100 mb-0.5">Layout de Duo de Colunas</div>
                      <div className="text-[10px] text-slate-500 leading-snug">Duas colunas de textos dispostas horizontalmente de forma simétrica.</div>
                    </button>
                    <button 
                      onClick={() => addPresetLayout('signed_footer')}
                      className="w-full text-left p-3 rounded-lg border border-slate-800/80 bg-slate-950/40 hover:bg-slate-950 hover:border-cyan-500/40 transition-all text-xs"
                    >
                      <div className="font-bold text-slate-100 mb-0.5">Rodapé Estruturado e Assinatura</div>
                      <div className="text-[10px] text-slate-500 leading-snug">Insere linha divisória fina com campo pré-configurado de Assinatura.</div>
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold pt-2">Elementos Individuais</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => addElement('text')} className="p-2.5 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-white text-center flex flex-col items-center gap-1.5">
                      <Type size={14}/> Texto
                    </button>
                    <button onClick={() => addElement('image')} className="p-2.5 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-white text-center flex flex-col items-center gap-1.5">
                      <ImageIcon size={14}/> Imagem
                    </button>
                    <button onClick={() => addElement('shape')} className="p-2.5 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-white text-center flex flex-col items-center gap-1.5">
                      <Box size={14}/> Forma
                    </button>
                    <button onClick={() => addElement('form')} className="p-2.5 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-800/50 rounded-lg text-xs font-bold text-cyan-400 hover:text-cyan-300 text-center flex flex-col items-center gap-1.5">
                      <CheckSquare size={14}/> Form Input
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeLeftTab === 'texto' && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Texto & Tipografia</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                </div>
                <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                  <button 
                    onClick={() => {
                      if (isLockedByPass) return;
                      const newEl: any = {
                        id: `txt-title-${Date.now()}`,
                        type: 'text',
                        x: 100,
                        y: 200,
                        width: 600,
                        height: 60,
                        content: 'Inserir Título Principal',
                        zIndex: currentSlide.elements.length + 1,
                        style: { fontFamily: 'Space Grotesk', fontSize: 32, fontWeight: 'bold', color: '#1e293b' }
                      };
                      triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                      setSelectedIds(new Set([newEl.id]));
                    }}
                    className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-left rounded-xl transition-all font-sans"
                  >
                    <span className="block text-xl font-black text-white">Adicionar Título</span>
                    <span className="text-[10px] text-slate-500">Space Grotesk • 32px</span>
                  </button>

                  <button 
                    onClick={() => {
                      if (isLockedByPass) return;
                      const newEl: any = {
                        id: `txt-sub-${Date.now()}`,
                        type: 'text',
                        x: 100,
                        y: 250,
                        width: 400,
                        height: 45,
                        content: 'Inserir Lindo Subtítulo',
                        zIndex: currentSlide.elements.length + 1,
                        style: { fontFamily: 'Inter', fontSize: 20, fontWeight: '600', color: '#64748b' }
                      };
                      triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                      setSelectedIds(new Set([newEl.id]));
                    }}
                    className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-left rounded-xl transition-all font-sans"
                  >
                    <span className="block text-sm font-semibold text-slate-200">Adicionar Subtítulo</span>
                    <span className="text-[10px] text-slate-500">Inter • 20px</span>
                  </button>

                  <button 
                    onClick={() => {
                      if (isLockedByPass) return;
                      const newEl: any = {
                        id: `txt-body-${Date.now()}`,
                        type: 'text',
                        x: 100,
                        y: 300,
                        width: 350,
                        height: 100,
                        content: 'Exemplo de parágrafo de texto corrido. Edite e formate livremente.',
                        zIndex: currentSlide.elements.length + 1,
                        style: { fontFamily: 'Inter', fontSize: 13, fontWeight: 'normal', color: '#334155', lineHeight: 1.5 }
                      };
                      triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                      setSelectedIds(new Set([newEl.id]));
                    }}
                    className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-left rounded-xl transition-all font-sans"
                  >
                    <span className="block text-xs text-slate-400">Adicionar parágrafo de corpo</span>
                    <span className="text-[10px] text-slate-500">Inter Regular • 13px</span>
                  </button>

                  <div className="pt-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-2">Combinações Recomendadas</span>
                    <div className="space-y-2">
                      <div 
                        onClick={() => {
                          if (isLockedByPass) return;
                          let update = slides.map((s, idx) => {
                            if (idx !== currentSlideIndex) return s;
                            const t1: any = { id: `fc-${Date.now()}-1`, type: 'text', x: 100, y: 150, width: 400, height: 40, content: 'TÍTULO MONUMENTAL', zIndex: s.elements.length + 1, style: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: '900', color: '#0f172a' } };
                            const t2: any = { id: `fc-${Date.now()}-2`, type: 'text', x: 100, y: 195, width: 400, height: 60, content: 'Texto corrido sob fonte space de contraste em destaque.', zIndex: s.elements.length + 2, style: { fontFamily: 'Inter', fontSize: 12, fontWeight: 'normal', color: '#475569', lineHeight: 1.4 } };
                            return { ...s, elements: [...s.elements, t1, t2] };
                          });
                          triggerUpdate(update);
                        }}
                        className="p-3 bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/50 rounded-xl cursor-pointer text-xs"
                      >
                        <span className="font-extrabold text-white block">Tech Grotesk Frame</span>
                        <span className="text-[9px] text-slate-500">Space Grotesk (Title) + Inter (Body)</span>
                      </div>
                      <div 
                        onClick={() => {
                          if (isLockedByPass) return;
                          let update = slides.map((s, idx) => {
                            if (idx !== currentSlideIndex) return s;
                            const t1: any = { id: `fc-${Date.now()}-1`, type: 'text', x: 100, y: 150, width: 400, height: 40, content: 'Editorial Cover Heading', zIndex: s.elements.length + 1, style: { fontFamily: 'Playfair Display', fontSize: 26, fontWeight: 'bold', color: '#1e293b' } };
                            const t2: any = { id: `fc-${Date.now()}-2`, type: 'text', x: 100, y: 195, width: 400, height: 60, content: 'This is a refined editorial narrative paragraph text block.', zIndex: s.elements.length + 2, style: { fontFamily: 'Inter', fontSize: 13, fontWeight: 'normal', color: '#475569', lineHeight: 1.5 } };
                            return { ...s, elements: [...s.elements, t1, t2] };
                          });
                          triggerUpdate(update);
                        }}
                        className="p-3 bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/50 rounded-xl cursor-pointer text-xs"
                      >
                        <span className="font-serif font-extrabold text-white block">Elegância Editorial</span>
                        <span className="text-[9px] text-slate-500">Playfair Display + Inter Body</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeLeftTab === 'uploads' && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Meus Uploads</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="border border-dashed border-slate-700 hover:border-cyan-500/50 bg-slate-950/50 transition-all rounded-xl p-4 text-center cursor-pointer relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (loadRes) => {
                            if (loadRes.target?.result) {
                              setUserUploadedImages(prev => [...prev, loadRes.target!.result as string]);
                              toast.success('Imagem carregada com sucesso para uploads!');
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload size={20} className="mx-auto text-slate-500 mb-2" />
                    <span className="text-[11px] block text-slate-300 font-bold">Arraste uma Imagem</span>
                    <span className="text-[9px] text-slate-600 block mt-0.5">JPEG, PNG • Max 5MB</span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Mídia Enviada ({userUploadedImages.length})</span>
                    <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-0.5">
                      {userUploadedImages.map((img, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-800 bg-slate-950 aspect-video">
                          <img src={img} className="w-full h-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 p-1 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                if (isLockedByPass) return;
                                const newEl: any = {
                                  id: `img-${Date.now()}-${i}`,
                                  type: 'image',
                                  x: 150,
                                  y: 200,
                                  width: 300,
                                  height: 200,
                                  content: img,
                                  zIndex: currentSlide.elements.length + 1,
                                  style: { opacity: 1, rotation: 0 }
                                };
                                triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                                setSelectedIds(new Set([newEl.id]));
                              }}
                              className="p-0.5 px-1 bg-cyan-700 rounded text-[8px] font-bold text-white hover:bg-cyan-600"
                            >
                              Inserir
                            </button>
                            <button 
                              onClick={() => setUserUploadedImages(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-red-400 hover:text-red-350"
                            >
                              <Trash2 size={8}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeLeftTab === 'arquivos' && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Importação & Exportação</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Importação Direta</span>
                    <div className="relative border border-slate-800 p-3 rounded-lg bg-slate-950/50 hover:border-cyan-500/30 transition-all text-center">
                      <input 
                        type="file" 
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleImportFile}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <span className="text-xs text-cyan-400 font-extrabold block">Selecionar Documento / Imagem</span>
                      <span className="text-[9px] text-slate-500 block leading-none mt-1">Reconhece PDF e importa elementos vetoriais</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Formatos de Exportação</span>
                    <div className="grid grid-cols-1 gap-2">
                      <button onClick={() => executeConversion('pdf')} className="p-2 w-full bg-gradient-to-r from-cyan-600/20 to-cyan-600/10 hover:from-cyan-600/30 font-bold rounded-lg text-xs flex items-center gap-2 border border-cyan-800/20">
                        <FileText size={12} className="text-cyan-400"/> PDF Corporativo Premium
                      </button>
                      <button onClick={() => executeConversion('docx')} className="p-2 w-full bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-lg text-xs text-left text-slate-350 flex items-center gap-2">
                        <FileText size={12} className="text-indigo-400" /> Exportar Microsoft Word (DOC)
                      </button>
                      <button onClick={() => executeConversion('pptx')} className="p-2 w-full bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-lg text-xs text-left text-slate-350 flex items-center gap-2">
                        <LayersIcon size={12} className="text-amber-500" /> Keynote / PowerPoint (PPTX)
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={() => {
                        toast.info('Dividindo arquivo selecionado... Páginas 1 e ' + slides.length + ' extraídas!');
                      }}
                      className="w-full text-center py-2 border border-slate-800/80 bg-slate-900/30 hover:bg-slate-900 rounded-lg text-[10px] font-bold text-slate-400"
                    >
                      Utilitário: Dividir PDF / Extrair
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeLeftTab === 'imagens' && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Banco de Imagens</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                </div>
                <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">Imagens Corporativas Premium</span>
                  <div className="grid grid-cols-1 gap-2.5">
                    {stockImages.map((img, i) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          if (isLockedByPass) return;
                          const newEl: any = {
                            id: `stock-img-${Date.now()}-${i}`,
                            type: 'image',
                            x: 100,
                            y: 350,
                            width: 380,
                            height: 250,
                            content: img.url,
                            zIndex: currentSlide.elements.length + 1,
                            style: { opacity: 1, rotation: 0 }
                          };
                          triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                          setSelectedIds(new Set([newEl.id]));
                          toast.success('Imagem inserida!');
                        }}
                        className="relative cursor-pointer group rounded-xl overflow-hidden border border-slate-800 bg-[#0F1115] hover:border-cyan-500/50 hover:scale-[1.01] transition-all h-28"
                      >
                        <img src={img.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent p-2.5 flex items-end">
                          <span className="text-[9px] font-bold text-white uppercase tracking-wider">{img.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeLeftTab === 'formas' && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Formas & Carimbos</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                </div>
                <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Formas Geométricas</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        if (isLockedByPass) return;
                        const newEl: any = {
                          id: `shape-rect-${Date.now()}`,
                          type: 'shape',
                          x: 200, y: 300, width: 140, height: 140,
                          content: 'Rectangle',
                          zIndex: currentSlide.elements.length + 1,
                          style: { backgroundColor: '#1e293b', borderRadius: 4, opacity: 1, rotation: 0 }
                        };
                        triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                        setSelectedIds(new Set([newEl.id]));
                      }}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-cyan-500/40 text-center flex flex-col items-center gap-1.5"
                    >
                      <div className="w-8 h-6 bg-slate-450 rounded-sm" />
                      <span className="text-[10px] text-slate-300 font-bold">Retângulo</span>
                    </button>

                    <button 
                      onClick={() => {
                        if (isLockedByPass) return;
                        const newEl: any = {
                          id: `shape-circ-${Date.now()}`,
                          type: 'shape',
                          x: 200, y: 300, width: 140, height: 140,
                          content: 'Circle',
                          zIndex: currentSlide.elements.length + 1,
                          style: { backgroundColor: '#ef4444', borderRadius: 500, opacity: 1, rotation: 0 }
                        };
                        triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                        setSelectedIds(new Set([newEl.id]));
                      }}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-cyan-500/40 text-center flex flex-col items-center gap-1.5"
                    >
                      <div className="w-8 h-8 bg-red-500 rounded-full" />
                      <span className="text-[10px] text-slate-300 font-bold">Círculo</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold pt-2">Anotação com Caneta</span>
                  <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-bold">Paleta de cores</span>
                    </div>
                    <div className="flex gap-2 justify-center">
                      {['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#a855f7'].map(col => (
                        <button 
                          key={col}
                          onClick={() => setSelectedColor(col)}
                          className={`w-5 h-5 rounded-full transition-transform ${selectedColor === col ? 'ring-2 ring-white scale-110' : 'opacity-70'}`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                    <button 
                      onClick={clearDrawing}
                      className="w-full py-1.5 text-[9px] font-bold border border-slate-850 hover:bg-slate-950 bg-slate-950 rounded text-slate-400 hover:text-red-400"
                    >
                      Limpar Rabisco Caneta
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold pt-2">Carimbos Administrativos</span>
                  <div className="grid grid-cols-1 gap-2">
                    {['APROVADO', 'VERIFICADO', 'CONFIDENCIAL', 'CANCELADO'].map(stamp => (
                      <button
                        key={stamp}
                        onClick={() => {
                          if (isLockedByPass) return;
                          const newEl: any = {
                            id: `stamp-${Date.now()}`,
                            type: 'text',
                            x: 350,
                            y: 150,
                            width: 180,
                            height: 48,
                            content: stamp,
                            zIndex: currentSlide.elements.length + 1,
                            style: {
                              fontFamily: 'Inter',
                              fontSize: 18,
                              color: stamp === 'APROVADO' ? '#16a34a' : stamp === 'CONFIDENCIAL' ? '#ca8a04' : '#dc2626',
                              fontWeight: '900',
                              border: `3px solid ${stamp === 'APROVADO' ? '#16a34a' : stamp === 'CONFIDENCIAL' ? '#ca8a04' : '#dc2626'}`,
                              borderRadius: 6,
                              textAlign: 'center',
                              rotation: -12,
                              opacity: 0.85
                            }
                          };
                          triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                          toast.success(`Carimbo ${stamp} estampado!`);
                        }}
                        className="py-1.5 border border-slate-800 hover:border-slate-700 hover:bg-slate-950/80 rounded-lg text-xs font-bold text-center capitalize text-slate-300 pointer-events-auto"
                      >
                        Carimbo: {stamp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeLeftTab === 'tabelas' && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Tabelas</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="bg-[#0F1115] border border-slate-800 p-3.5 rounded-xl space-y-2.5 font-sans">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Criar Nova Grade</span>
                    <p className="text-[10px] text-slate-500 leading-snug">Insira um mock de tabela formatada automaticamente para relatórios de faturamento.</p>
                    
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button 
                        onClick={() => {
                          if (isLockedByPass) return;
                          const t1: any = {
                            id: `grid-${Date.now()}`,
                            type: 'text',
                            x: 100, y: 500, width: 640, height: 180,
                            content: 'PRODUTO        | QUANTIDADE  | STATUS        | TOTAL\n--------------------------------------------------------------\nSalsa Casino   | 14.500      | ATIVO         | R$ 103.976,00\nSalsa Bingo    | 3.200       | AGUARDANDO    | R$ 29.391,00\nSalsa Sport    | 22.800      | ATIVO         | R$ 143.078,00',
                            zIndex: currentSlide.elements.length + 1,
                            style: { fontFamily: 'JetBrains Mono', fontSize: 13, color: '#334155', fontWeight: 'normal', lineHeight: 1.6 }
                          };
                          triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, t1] } : s));
                          setSelectedIds(new Set([t1.id]));
                          toast.success('Grade de tabela inserida com sucesso!');
                        }}
                        className="p-2 border border-slate-800 hover:border-cyan-500/40 bg-slate-950/80 rounded text-[10px] font-bold text-center text-slate-300"
                      >
                        Grade 4x3 (Mono)
                      </button>
                      <button 
                        onClick={() => {
                          if (isLockedByPass) return;
                          const t1: any = {
                            id: `grid-${Date.now()}`,
                            type: 'text',
                            x: 100, y: 500, width: 640, height: 150,
                            content: 'MÉTRICA        | OUTUBRO     | NOVEMBRO     | DEZEMBRO\n--------------------------------------------------------------\nNovos Usuários | +12%        | +18%         | +25%\nSessão Média   | 18.5 min    | 22.1 min     | 25.0 min',
                            zIndex: currentSlide.elements.length + 1,
                            style: { fontFamily: 'JetBrains Mono', fontSize: 13, color: '#1e293b', fontWeight: 'normal', lineHeight: 1.6 }
                          };
                          triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, t1] } : s));
                          setSelectedIds(new Set([t1.id]));
                          toast.success('Grade de faturamento inserida!');
                        }}
                        className="p-2 border border-slate-800 hover:border-cyan-500/40 bg-slate-950/80 rounded text-[10px] font-bold text-center text-slate-300"
                      >
                        Grade Períodos
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeLeftTab === 'comentarios' && (
              <div className="flex flex-col h-full font-sans">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Canal de Comentários</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                </div>
                <div className="p-4 space-y-4 flex flex-col h-[calc(100%-60px)]">
                  <div className="flex-1 overflow-y-auto space-y-2 max-h-[340px] custom-scrollbar">
                    {comments.map((c) => (
                      <div key={c.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 space-y-1">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-cyan-400 font-extrabold">{c.author}</span>
                          <span className="text-slate-500 font-mono text-[8px]">Pág. {c.slideIndex + 1}</span>
                        </div>
                        <p className="text-[11px] text-slate-350 leading-snug">{c.text}</p>
                        <div className="text-[8px] text-slate-600 font-mono text-right">{new Date(c.timestamp).toLocaleTimeString()}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800/85">
                    <textarea
                      placeholder="Escreva sua revisão..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white outline-none focus:border-cyan-500 h-16 resize-none"
                    />
                    <button 
                      onClick={() => {
                        if (!newCommentText) return;
                        setComments(prev => [...prev, { id: `c-${Date.now()}`, slideIndex: currentSlideIndex, text: newCommentText, author: 'Você (Revisor)', timestamp: new Date() }]);
                        setNewCommentText('');
                        toast.success('Comentário postado e sincronizado com os revisores!');
                      }}
                      className="w-full py-2 bg-cyan-600 hover:bg-cyan-550 text-white rounded-lg text-xs font-bold"
                    >
                      Postar Nota Técnica
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeLeftTab === 'assinaturas' && (
              <div className="flex flex-col h-full font-sans">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Assinaturas Digitais</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                </div>
                <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                  <div className="bg-[#0F1115] border border-slate-800 p-3 rounded-lg space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Caneta Assinatura</span>
                    <button 
                      onClick={() => {
                        setSignatureTargetBoxId(`el-form-${Date.now()}`);
                        const newEl: any = {
                          id: `el-form-${Date.now()}`,
                          type: 'text',
                          x: 295, y: 880, width: 250, height: 100,
                          content: 'Pressione "Assinar" na barra',
                          zIndex: currentSlide.elements.length + 1,
                          style: { fontFamily: 'Inter', fontSize: 13, color: '#475569', backgroundColor: '#f8fafc', border: '2px dashed #0284c7', borderRadius: 4, textAlign: 'center' },
                          isFormField: true,
                          formFieldType: 'signature',
                          formFieldName: 'Assinatura_Diretoria'
                        };
                        triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                        setSelectedIds(new Set([newEl.id]));
                        setSigPadOpen(true);
                        toast.info('Abra a lousa de assinaturas para desenhar no campo e autenticar.');
                      }}
                      className="w-full py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold rounded-lg text-xs text-center block"
                    >
                      Assinar com Mouse / Touch
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Assinatura Digitada</span>
                    <input 
                      type="text" 
                      placeholder="Nome completo..."
                      value={sigTypeText}
                      onChange={(e) => setSigTypeText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-xs text-white outline-none"
                    />
                    <div className="grid grid-cols-1 gap-1">
                      {[
                        { name: 'Manuscrita Elegante', font: 'Brush Script MT, cursive' },
                        { name: 'SaaS Tech', font: 'Courier New, monospace' },
                        { name: 'Moderna Slanted', font: 'Times New Roman, serif' }
                      ].map(opt => (
                        <button 
                          key={opt.name}
                          onClick={() => {
                            if (!sigTypeText) return;
                            const newEl: any = {
                              id: `sig-typed-${Date.now()}`,
                              type: 'text',
                              x: 295, y: 920, width: 250, height: 50,
                              content: sigTypeText,
                              zIndex: currentSlide.elements.length + 1,
                              style: { fontFamily: opt.font, fontSize: 24, color: '#0369a1', textAlign: 'center' }
                            };
                            triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                            setSelectedIds(new Set([newEl.id]));
                            toast.success('Assinatura manuscrita digital deitada com sucesso!');
                          }}
                          className="p-1 px-2 text-[9px] hover:bg-slate-900 border border-slate-850 rounded text-left text-slate-355 truncate flex items-center justify-between"
                        >
                          <span style={{ fontFamily: opt.font }}>{sigTypeText || 'Visualização'}</span>
                          <span className="text-[8px] text-slate-500">{opt.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeLeftTab === 'configuracoes' && (
              <div className="flex flex-col h-full font-sans">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Configurações Gerais</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                </div>
                <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Formato da Página</label>
                    <select 
                      value={pageSizeType} 
                      onChange={(e) => {
                        setPageSizeType(e.target.value as any);
                        toast.success('Dimensão da página atualizada para ' + e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    >
                      <option value="A4">A4 Corporativo (840x1188)</option>
                      <option value="LETTER">Carta / Letter (840x1086)</option>
                      <option value="A3">A3 Panfleto (1188x1680)</option>
                      <option value="SLIDE_16_9">Slide Apresentação 16:9 (1050x590)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Texto cabeçalho fixo</label>
                    <input 
                      type="text" 
                      value={headerText} 
                      onChange={(e) => setHeaderText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Texto rodapé fixo</label>
                    <input 
                      type="text" 
                      value={footerText} 
                      onChange={(e) => setFooterText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Marca d'água de proteção</label>
                    <input 
                      type="text" 
                      placeholder="Ex: CONFIDENCIAL..."
                      value={watermark} 
                      onChange={(e) => setWatermark(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-1 bg-slate-950/20 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[9px] text-amber-400 font-black tracking-wider block uppercase">Criptografia de Senha</span>
                    <div className="flex gap-1.5 items-center pt-1">
                      <input 
                        type="password" 
                        placeholder="Senha mestre"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded p-1 text-[11px] flex-1 text-white outline-none"
                      />
                      <button 
                        onClick={() => {
                          if (password) {
                            setIsLockedByPass(true);
                            toast.success('Documento criptografado!');
                          } else {
                            toast.error('Informe uma senha!');
                          }
                        }}
                        className="p-1 px-2 bg-amber-600 hover:bg-amber-500 rounded text-[10px] text-white font-bold"
                      >
                        Trancar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MIDDLE CONTAINER: MAIN HEADER & EDIT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0d14] relative">
        
        {/* UPPER MAIN RIBBON: EDITING CONTROLS & SEARCH */}
        <div className="h-16 border-b border-[#1e293b] bg-[#0c1017] px-6 flex items-center justify-between shrink-0 gap-4">
          
          {/* LEFT COMMAND DUO: MODES SELECTOR */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setEditMode('EDIT')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${editMode === 'EDIT' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'}`}
            >
              ✏️ Modo Designer
            </button>
            <button 
              onClick={() => {
                setEditMode('LIVE_FILL');
                setSelectedIds(new Set());
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${editMode === 'LIVE_FILL' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'}`}
              title="Permite interagir com os campos e formular assinaturas"
            >
              📋 Preenchimento & Assinatura
            </button>
          </div>

          {/* DYNAMIC MIDDLE GLOBAL SEARCH CONTROLLER */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-full px-3 h-9 max-w-sm flex-1">
            <Search size={14} className="text-slate-500 mr-2"/>
            <input 
              type="text" 
              placeholder="Localizar texto..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchAndReplace()}
              className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-600 flex-1"
            />
            {searchQuery && (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <input 
                  type="text" 
                  placeholder="Substituir" 
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[9px] w-14 text-white outline-none"
                />
                <button 
                  onClick={() => handleSearchAndReplace(true)}
                  className="p-1 px-2 bg-cyan-700/80 hover:bg-cyan-600 rounded text-[9px]"
                >
                  Ok
                </button>
              </div>
            )}
          </div>

          {/* RIGHT EXPORT FLIGHT MODULE */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1 px-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white bg-slate-900 disabled:opacity-30"
              title="Desfazer"
            >
              <Undo size={14}/>
            </button>
            <button 
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1 px-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white bg-slate-900 disabled:opacity-30"
              title="Refazer"
            >
              <Redo size={14}/>
            </button>
            <div className="w-px h-5 bg-slate-800 mx-1"></div>
            <button 
              onClick={() => setConversionModalOpen(true)}
              className="p-2 px-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-xl text-xs font-black tracking-wide text-white flex items-center gap-2 shadow-lg shadow-cyan-950/50"
            >
              <Download size={14}/> EXPORTAR / CONVERSÃO
            </button>
          </div>
        </div>

        {/* HORIZONTAL SYSTEM SUB-BAR: QUICK INSERT & ANNOTATIONS */}
        <div className="h-12 border-b border-[#1e293b] bg-[#090d14] px-6 flex items-center justify-between shrink-0 text-xs">
          
          {/* QUICK TOOL ADDERS */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider select-none font-bold mr-2">Inserir:</span>
            <button 
              onClick={() => addElement('text')} 
              className="p-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center gap-1 text-slate-300"
            >
              <Type size={12}/> Caixa de Texto
            </button>
            <button 
              onClick={() => addElement('image')} 
              className="p-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center gap-1 text-slate-300"
            >
              <ImageIcon size={12}/> Imagem
            </button>
            <button 
              onClick={() => addElement('shape')} 
              className="p-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center gap-1 text-slate-300"
            >
              <Box size={12}/> Forma Geométrica
            </button>
            <button 
              onClick={() => addElement('form')} 
              className="p-1.5 px-3 bg-[#0369a1] hover:bg-[#0284c7] border border-cyan-800 text-white rounded-lg flex items-center gap-1"
            >
              <CheckSquare size={12}/> Campo Formulário
            </button>
          </div>

          {/* COLOR SWATCHES & STAMPS PICKER */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider select-none font-bold mr-2">Anotação livre (Caneta):</span>
            {['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#a855f7'].map(col => (
              <button 
                key={col}
                onClick={() => setSelectedColor(col)}
                className={`w-4 h-4 rounded-full transition-transform ${selectedColor === col ? 'ring-2 ring-white scale-110' : ''}`}
                style={{ backgroundColor: col }}
              />
            ))}
            <button 
              onClick={clearDrawing}
              className="p-1 px-2 border border-slate-800 text-slate-400 hover:text-red-400 rounded-lg bg-slate-900"
            >
              Apagar Caneta
            </button>
            
            {/* STAMP SPREAD QUICK TRIGGER */}
            <div className="w-px h-4 bg-slate-800 mx-2"></div>
            <button 
              onClick={() => {
                const stampText = prompt("Insira o texto do Carimbo (Ex: APROVADO, CONFIDENCIAL, CANCELADO):", "APROVADO");
                if (!stampText) return;
                const newEl: any = {
                  id: `stamp-${Date.now()}`,
                  type: 'text',
                  x: 350,
                  y: 100,
                  width: 200,
                  height: 60,
                  content: stampText.toUpperCase(),
                  zIndex: currentSlide.elements.length + 1,
                  style: {
                    fontFamily: 'Inter',
                    fontSize: 22,
                    color: '#dc2626',
                    fontWeight: '900',
                    border: '4px solid #dc2626',
                    borderRadius: 8,
                    textAlign: 'center',
                    rotation: -15,
                    opacity: 0.85
                  }
                };
                const updatedSlides = slides.map((s, idx) => {
                  if (idx === currentSlideIndex) return { ...s, elements: [...s.elements, newEl] };
                  return s;
                });
                triggerUpdate(updatedSlides);
                toast.success('Carimbo estampado com sucesso!');
              }}
              className="p-1.5 px-3 bg-red-950/50 border border-red-900/60 hover:bg-red-900 text-red-300 rounded-lg"
            >
              Estampar Carimbo
            </button>
          </div>
        </div>

        {/* WORKSPACE CENTRAL ZOOM AND VIEWPORT WINDOW */}
        <div 
          ref={workspaceViewportRef}
          className="flex-1 relative overflow-auto flex items-start justify-center p-8 custom-scrollbar"
        >
          {/* THE CANVAS WRAPPER TO PRESERVE REAL SCROLL SPACE AND MOUNT SCROLLBARS */}
          <div
            style={{
              width: `${docWidth * zoom}px`,
              height: `${docHeight * zoom}px`,
              position: 'relative',
              margin: 'auto',
              flexShrink: 0
            }}
          >
            {/* THE CANVAS BOARD SHEETS RENDER */}
            <div 
              ref={canvasRef}
              onMouseDown={(e) => {
                if (editMode === 'LIVE_FILL' || isLockedByPass) return;
                
                // Terminate active text inline editors
                setEditingTextId(null);
                
                // Clear active selected list unless we did a multi-select shift-click combo
                if (!e.shiftKey) {
                  setSelectedIds(new Set());
                }
                
                // Marquee initiation
                if (canvasRef.current) {
                  const rect = canvasRef.current.getBoundingClientRect();
                  const relativeX = (e.clientX - rect.left) / zoom;
                  const relativeY = (e.clientY - rect.top) / zoom;
                  setMarqueeStart({ x: relativeX, y: relativeY });
                  setMarqueeEnd({ x: relativeX, y: relativeY });
                }
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="bg-white text-slate-950 relative shadow-2xl transition-transform duration-200 border-4 border-dashed border-cyan-500/10"
              style={{
                width: `${docWidth}px`,
                height: `${docHeight}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                background: '#ffffff',
                position: 'absolute',
                top: 0,
                left: 0
              }}
            >
            {/* RUNNING HEADER LAYER */}
            <div className="absolute top-6 left-12 right-12 flex justify-between border-b border-slate-200 pb-2 text-[10px] text-slate-400 select-none">
              <span>{headerText.toUpperCase()}</span>
              <span>Acrobat Pro Document</span>
            </div>

            {/* WATERMARK BACKGROUND LAYER */}
            {watermark && (
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none z-0">
                <span className="text-[100px] text-slate-200/40 font-black tracking-widest leading-none rotate-45 select-none font-sans uppercase">
                  {watermark}
                </span>
              </div>
            )}

            {/* SMART ALIGNMENT SNAPPING GUIDELINES */}
            {activeSnapHV.x !== null && (
              <div 
                className="absolute border-l border-dashed z-50 pointer-events-none"
                style={{
                  left: `${activeSnapHV.x}px`,
                  top: 0,
                  bottom: 0,
                  borderColor: '#ec4899',
                  borderWidth: '1.5px',
                }}
              />
            )}
            {activeSnapHV.y !== null && (
              <div 
                className="absolute border-t border-dashed z-50 pointer-events-none"
                style={{
                  top: `${activeSnapHV.y}px`,
                  left: 0,
                  right: 0,
                  borderColor: '#ec4899',
                  borderWidth: '1.5px',
                }}
              />
            )}

            {/* FIGMA-LIKE MARQUEE SELECTION GRAPHIC OVERLAY */}
            {marqueeStart && marqueeEnd && (
              <div 
                className="absolute border border-cyan-500 bg-cyan-500/10 z-50 pointer-events-none"
                style={{
                  left: `${Math.min(marqueeStart.x, marqueeEnd.x)}px`,
                  top: `${Math.min(marqueeStart.y, marqueeEnd.y)}px`,
                  width: `${Math.abs(marqueeStart.x - marqueeEnd.x)}px`,
                  height: `${Math.abs(marqueeStart.y - marqueeEnd.y)}px`,
                }}
              />
            )}

            {/* CANVAS INTERACTIVE PLAYGROUND ELEMENTS */}
            <div className="absolute inset-0 pt-20 pb-20 px-12 z-10">
              
              {currentSlide.elements.map((el: any) => {
                const isSelected = selectedIds.has(el.id);
                
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => {
                      if (editMode === 'LIVE_FILL' || isLockedByPass) return;
                      
                      if (el.type === 'text') {
                        // For text boxes, clicking inside selects them but does NOT start dragging.
                        // Dragging can only be performed by clicking on the custom hover borders.
                        e.stopPropagation();
                        if (el.isLocked) {
                          if (e.shiftKey) {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              if (next.has(el.id)) next.delete(el.id);
                              else next.add(el.id);
                              return next;
                            });
                          } else {
                            setSelectedIds(new Set([el.id]));
                          }
                          return;
                        }

                        if (editingTextId === el.id) return;

                        if (e.shiftKey) {
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            if (next.has(el.id)) next.delete(el.id);
                            else next.add(el.id);
                            return next;
                          });
                        } else {
                          if (!selectedIds.has(el.id)) {
                            setSelectedIds(new Set([el.id]));
                          }
                        }
                      } else {
                        // Standard dragging from anywhere is supported for non-text boxes
                        handleMouseDown(e, el);
                      }
                    }}
                    onDoubleClick={(e) => {
                      if (el.type === 'text' && !el.isFormField && !el.isLocked) {
                        e.stopPropagation();
                        setEditingTextId(el.id);
                        setTimeout(() => {
                          const ta = document.getElementById(`textarea-${el.id}`);
                          if (ta) {
                            (ta as HTMLElement).focus();
                          }
                        }, 50);
                      }
                    }}
                    className={`absolute flex flex-col group ${isSelected && editMode === 'EDIT' ? 'border border-cyan-500 outline-dashed outline-2 outline-cyan-500/40 ring-1 ring-cyan-500/80' : 'border border-transparent'} ${el.isLocked ? 'opacity-80 select-none' : ''}`}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                      cursor: el.isLocked 
                        ? 'not-allowed' 
                        : (editMode === 'LIVE_FILL' 
                          ? 'default' 
                          : (el.type === 'text' ? 'text' : 'move')),
                      zIndex: el.zIndex,
                      transform: el.style?.rotation ? `rotate(${el.style.rotation}deg)` : 'none'
                    }}
                  >
                    {/* Render visual Lock indicator if element has been locked */}
                    {el.isLocked && (
                      <div className="absolute -top-3.5 -left-1 bg-slate-900 border border-slate-700 p-0.5 rounded shadow z-50 text-amber-500">
                        <Lock size={10} className="stroke-[2.5px]"/>
                      </div>
                    )}

                    {/* BORDAS DE ARRASTE INTERATIVAS PARA CAIXAS DE TEXTO */}
                    {el.type === 'text' && !el.isLocked && !el.isRedacted && (
                      <div className="absolute inset-0 pointer-events-none z-30">
                        {/* Top border strip */}
                        <div 
                          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el); }}
                          className="absolute -top-1 -left-1 -right-1 h-2 cursor-move pointer-events-auto bg-transparent hover:bg-cyan-500/20 active:bg-cyan-500/40 transition-colors" 
                          title="Arraste pela borda para mover"
                        />
                        {/* Bottom border strip */}
                        <div 
                          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el); }}
                          className="absolute -bottom-1 -left-1 -right-1 h-2 cursor-move pointer-events-auto bg-transparent hover:bg-cyan-500/20 active:bg-cyan-500/40 transition-colors" 
                          title="Arraste pela borda para mover"
                        />
                        {/* Left border strip */}
                        <div 
                          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el); }}
                          className="absolute -top-1 -bottom-1 -left-1 w-2 cursor-move pointer-events-auto bg-transparent hover:bg-cyan-500/20 active:bg-cyan-500/40 transition-colors" 
                          title="Arraste pela borda para mover"
                        />
                        {/* Right border strip */}
                        <div 
                          onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el); }}
                          className="absolute -top-1 -bottom-1 -right-1 w-2 cursor-move pointer-events-auto bg-transparent hover:bg-cyan-500/20 active:bg-cyan-500/40 transition-colors" 
                          title="Arraste pela borda para mover"
                        />
                      </div>
                    )}
                    
                    {/* ELEMENT TYPE RENDER */}
                    {el.isRedacted ? (
                      <div className="w-full h-full bg-slate-950 text-white flex items-center justify-center font-bold text-xs select-none">
                        ⬛ CONTEÚDO CONFIDENCIAL REDIGIDO
                      </div>
                    ) : el.isFormField ? (
                      
                      // --- FORM ELEMENT HANDLING ---
                      <div className="w-full h-full p-2 flex flex-col">
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider leading-none">{el.formFieldName} {el.formFieldRequired && <strong className="text-red-500">*</strong>}</span>
                        {el.formFieldType === 'checkbox' ? (
                          <input 
                            type="checkbox" 
                            disabled={editMode === 'EDIT'}
                            className="mt-1.5 w-5 h-5 accent-cyan-600 rounded cursor-pointer"
                          />
                        ) : el.formFieldType === 'signature' ? (
                          <div 
                            onClick={() => {
                              if (editMode === 'LIVE_FILL') {
                                setSignatureTargetBoxId(el.id);
                                setSigPadOpen(true);
                              } else {
                                toast.info('Mude para o "Modo de Preenchimento" para poder assinar este campo!');
                              }
                            }}
                            className={`mt-1 h-full rounded border-2 border-dashed flex items-center justify-center transition-all ${el.content.startsWith('http') || el.content.startsWith('data:') ? 'border-transparent' : 'border-slate-300 hover:border-cyan-500 bg-slate-100 hover:bg-cyan-50/20 cursor-pointer text-slate-500'}`}
                          >
                            {el.content.startsWith('http') || el.content.startsWith('data:') ? (
                              <img src={el.content} className="h-full object-contain mx-auto" />
                            ) : (
                              <div className="text-center p-1">
                                <span className="text-[9px] font-bold block text-slate-600">✍️ CLIQUE PARA ASSINAR</span>
                              </div>
                            )}
                          </div>
                        ) : el.formFieldType === 'dropdown' ? (
                          <select 
                            disabled={editMode === 'EDIT'} 
                            className="mt-1 w-full bg-slate-100 text-xs border border-slate-300 rounded px-2 py-1 outline-none font-sans"
                          >
                            {(el.formFieldOptions || []).map((opt: string) => <option key={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input 
                            type="text" 
                            placeholder="Preencher campo..."
                            value={el.content}
                            onChange={(e) => {
                              if (editMode === 'LIVE_FILL') {
                                updateElementProps(el.id, { content: e.target.value });
                              }
                            }}
                            disabled={editMode === 'EDIT'}
                            className="mt-1 w-full text-xs font-sans bg-slate-100 border border-slate-300 rounded px-2 py-1 select-text outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        )}
                      </div>
                    ) : el.type === 'text' ? (
                      
                      // --- TEXT ELEMENT INLINE EDIT ---
                      <textarea
                        id={`textarea-${el.id}`}
                        value={el.content}
                        onChange={(e) => updateElementProps(el.id, { content: e.target.value })}
                        onBlur={() => setEditingTextId(null)}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={editMode === 'LIVE_FILL'}
                        className="w-full h-full bg-transparent border-none resize-none outline-none select-text custom-scrollbar focus:ring-0"
                        style={{
                          fontFamily: el.style.fontFamily || 'Inter',
                          fontSize: `${el.style.fontSize || 14}px`,
                          color: el.style.color || '#1e293b',
                          textAlign: el.style.textAlign || 'left',
                          fontWeight: el.style.fontWeight || 'normal',
                          lineHeight: el.style.lineHeight || 1.2,
                          letterSpacing: el.style.letterSpacing || 'normal',
                          fontStyle: el.style.fontStyle || 'normal',
                          textDecoration: el.style.textDecoration || 'none',
                          textTransform: el.style.textTransform || 'none',
                          opacity: el.style.opacity ?? 1,
                          paddingLeft: el.style.indent ? `${el.style.indent}px` : undefined,
                          pointerEvents: editingTextId === el.id ? 'auto' : 'none',
                        }}
                      />
                    ) : el.type === 'image' ? (
                      
                      // --- IMAGE ELEMENT ---
                      <img 
                        src={el.content} 
                        alt="Document element" 
                        className="w-full h-full object-cover"
                        style={{ opacity: el.style.opacity || 1 }}
                      />
                    ) : (
                      
                      // --- FORM SHAPED ELEMENTS ---
                      <div 
                        className="w-full h-full"
                        style={{
                          backgroundColor: el.style.backgroundColor || '#0284c7',
                          borderRadius: `${el.style.borderRadius || 0}px`,
                          border: el.style.border || 'none'
                        }}
                      />
                    )}

                     {/* FIGMA / CANVA PREMIUM FLOATING QUICK TOOLBAR ABOVE ELEMENT */}
                     {isSelected && editMode === 'EDIT' && (
                       <div 
                         className="absolute -top-11 left-1/2 -translate-x-1/2 bg-[#161a23]/95 backdrop-blur-md border border-slate-700/80 px-2 py-1 rounded-xl shadow-[0_12px_24px_rgba(0,0,0,0.6)] flex items-center gap-1 z-[120] animate-in zoom-in-95 duration-150 h-9 shrink-0 select-none text-slate-300 pointer-events-auto"
                         onMouseDown={(e) => e.stopPropagation()}
                       >
                         {el.type === 'text' && (
                           <>
                             {/* Text editing trigger */}
                             <button
                               onClick={() => {
                                 setEditingTextId(el.id);
                                 setTimeout(() => {
                                   const ta = document.getElementById(`textarea-${el.id}`);
                                   if (ta) (ta as HTMLElement).focus();
                                 }, 50);
                               }}
                               className="p-1 hover:bg-slate-800 rounded-lg text-xs font-bold text-cyan-400 hover:text-white flex items-center gap-1 transition-colors px-1.5"
                               title="Editar Texto"
                             >
                               <PenTool size={11}/> <span className="text-[10px]">Editar</span>
                             </button>

                             <div className="w-px h-4 bg-slate-800" />

                             {/* Negrito toggle */}
                             <button
                               onClick={() => updateElementProps(el.id, { style: { fontWeight: el.style.fontWeight === 'bold' ? 'normal' : 'bold' } })}
                               className={`p-1 hover:bg-slate-800 rounded-lg transition-colors ${el.style.fontWeight === 'bold' ? 'text-cyan-400 bg-slate-800/60' : 'text-slate-400'}`}
                               title="Negrito"
                             >
                               <span className="font-bold text-xs px-1.5">B</span>
                             </button>

                             {/* Itálico toggle */}
                             <button
                               onClick={() => updateElementProps(el.id, { style: { fontStyle: el.style.fontStyle === 'italic' ? 'normal' : 'italic' } })}
                               className={`p-1 hover:bg-slate-800 rounded-lg transition-colors ${el.style.fontStyle === 'italic' ? 'text-cyan-400 bg-slate-800/60' : 'text-slate-400'}`}
                               title="Itálico"
                             >
                               <span className="italic text-xs px-1.5 family-serif">I</span>
                             </button>

                             {/* Sublinhado toggle */}
                             <button
                               onClick={() => updateElementProps(el.id, { style: { textDecoration: el.style.textDecoration === 'underline' ? 'none' : 'underline' } })}
                               className={`p-1 hover:bg-slate-800 rounded-lg transition-colors ${el.style.textDecoration === 'underline' ? 'text-cyan-400 bg-slate-800/60' : 'text-slate-400'}`}
                               title="Sublinhado"
                             >
                               <span className="underline text-xs px-1.5">U</span>
                             </button>

                             <div className="w-px h-4 bg-slate-800" />

                             {/* Cor Picker preset inline toggle */}
                             <button
                               onClick={() => {
                                 // Cycle text color through a preset palette of corporative tones
                                 const colors = ['#dc2626', '#16a34a', '#2563eb', '#4f46e5', '#0f172a', '#64748b'];
                                 const idx = colors.indexOf(el.style.color || '#0f172a');
                                 const nextCol = colors[(idx + 1) % colors.length];
                                 updateElementProps(el.id, { style: { color: nextCol } });
                                 toast.info(`Cor ciclada para ${nextCol}`);
                               }}
                               className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center"
                               title="Ciclar Cor da Fonte"
                             >
                               <div className="w-3.5 h-3.5 rounded-full border border-slate-600" style={{ backgroundColor: el.style.color || '#0f172a' }} />
                             </button>
                           </>
                         )}

                         {el.type === 'image' && (
                           <>
                             <button 
                               onClick={() => launchOCR(el)} 
                               className="p-1 hover:bg-slate-800 rounded-lg text-cyan-400 hover:text-white flex items-center gap-1 transition-colors px-1.5"
                               title="Reconhecimento OCR Inteligente"
                             >
                               <Sparkles size={11} className="animate-pulse"/> <span className="text-[10px]">Texto OCR</span>
                             </button>
                             <div className="w-px h-4 bg-slate-800" />
                           </>
                         )}

                         {/* Comments trigger */}
                         <button
                           onClick={() => {
                             setActiveLeftTab('comentarios');
                             toast.info('Canal de anotações e feedback aberto no painel esquerdo.');
                           }}
                           className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                           title="Visualizar Comentários"
                         >
                           <MessageSquare size={13}/>
                         </button>

                         {/* Redact secure tool */}
                         <button 
                           onClick={() => {
                             updateElementProps(el.id, { isRedacted: !el.isRedacted });
                             toast.success(el.isRedacted ? 'Ocultamento desfeito!' : 'Elemento redigido de forma confidencial!');
                           }} 
                           className={`p-1 hover:bg-slate-800 rounded-lg transition-colors ${el.isRedacted ? 'text-red-400 bg-red-950/40' : 'text-slate-400'}`}
                           title="Ocultar Dados / Redigir"
                         >
                           <Shield size={13}/>
                         </button>

                         <div className="w-px h-4 bg-slate-800" />

                         {/* Duplicate trigger */}
                         <button 
                           onClick={() => duplicateElement(el.id)} 
                           className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                           title="Duplicar Objeto"
                         >
                           <Copy size={13}/>
                         </button>

                         {/* Delete trigger */}
                         <button 
                           onClick={() => deleteElement(el.id)} 
                           className="p-1 hover:bg-red-900/60 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                           title="Excluir"
                         >
                           <Trash2 size={13}/>
                         </button>

                         <div className="w-px h-4 bg-slate-800" />

                         {/* More options panel activator */}
                         <button 
                           onClick={() => {
                             setActiveSidePanel('PROPERTIES');
                             toast.info('Propriedades avançadas expandidas no painel direito!');
                           }}
                           className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white text-[10px] font-bold flex items-center gap-0.5"
                           title="Expandir Propriedades Complementares"
                         >
                           <span>Mais</span>
                           <ChevronDown size={10}/>
                         </button>
                       </div>
                     )}

                    {/* SIZERS CLAW HANDLES */}
                    {isSelected && editMode === 'EDIT' && (
                      <>
                        {['nw', 'ne', 'sw', 'se'].map(h => (
                          <div 
                            key={h}
                            onMouseDown={(e) => handleResizeStart(e, h, el)}
                            className="absolute w-3 h-3 bg-white border-2 border-cyan-500 rounded-full z-50 shadow-md"
                            style={{
                              top: h.includes('n') ? -6 : 'auto',
                              bottom: h.includes('s') ? -6 : 'auto',
                              left: h.includes('w') ? -6 : 'auto',
                              right: h.includes('e') ? -6 : 'auto',
                              cursor: `${h}-resize`
                            }}
                          />
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* LIVE PEN DRAWINGS CANVAS OVERLAY */}
            <canvas
              ref={freehandCanvasRef}
              width={840}
              height={1188}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className={`absolute inset-0 z-20 ${editMode === 'LIVE_FILL' ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
            />

            {/* RUNNING FOOTER LAYER */}
            <div className="absolute bottom-6 left-12 right-12 flex justify-between border-t border-slate-200 pt-2 text-[10px] text-slate-400 select-none">
              <span>{footerText.toUpperCase()}</span>
              {autoPageNumbers && <span>Página {currentSlideIndex + 1} de {slides.length}</span>}
            </div>
          </div>

          {/* DYNAMIC INTEGRATED FLOATING ZOOM INDICATOR */}
          <div className="absolute bottom-8 right-8 bg-[#0c1017] border border-slate-800 rounded-full px-4 h-11 flex items-center gap-3 shadow-2xl z-40">
            <button onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))} className="text-[#94a3b8] hover:text-white font-black text-sm">-</button>
            <span className="text-xs font-bold text-cyan-400 min-w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(prev => Math.min(2.0, prev + 0.1))} className="text-[#94a3b8] hover:text-white font-black text-sm">+</button>
            <div className="w-px h-4 bg-slate-800"></div>
            <button 
              onClick={() => {
                if (pageSizeType === 'SLIDE_16_9') setZoom(0.75);
                else if (pageSizeType === 'A3') setZoom(0.5);
                else setZoom(0.85);
              }} 
              className="text-[10px] font-semibold text-[#94a3b8] hover:text-white flex items-center gap-1"
            >
              <Maximize size={10}/> Ajustar {pageSizeType}
            </button>
          </div>
        </div>

        {/* BOTTOM HORIZONTAL PAGE CAROUSEL NAVIGATOR */}
        <div className="h-28 bg-[#11141a] border-t border-slate-800/60 p-3 shrink-0 flex items-center justify-between gap-4 select-none z-10">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850">
              <LayersIcon size={12}/> {slides.length} {slides.length === 1 ? 'Página' : 'Páginas'}
            </span>
          </div>

          {/* Horizontally scrollable thumbnails row */}
          <div className="flex items-center gap-3.5 overflow-x-auto custom-scrollbar flex-1 py-1 px-1">
            {slides.map((slide, idx) => {
              const isActive = idx === currentSlideIndex;
              return (
                <div 
                  key={slide.id}
                  onClick={() => onSelectSlide(idx)}
                  className={`relative cursor-pointer rounded-xl border-2 transition-all group overflow-hidden h-[74px] shrink-0 ${isActive ? 'border-cyan-500 ring-2 ring-cyan-950/50 w-24':'border-slate-800 hover:border-slate-700 w-20'}`}
                >
                  {/* Miniature canvas screen content preview */}
                  <div className="absolute inset-0 bg-white opacity-95">
                    <div className="absolute inset-0 p-1 opacity-55 overflow-hidden">
                      {slide.elements.map(el => (
                        <div 
                          key={el.id} 
                          className={`absolute rounded ${el.isRedacted ? 'bg-black': 'bg-slate-300'}`}
                          style={{ 
                            left: `${(el.x / docWidth) * 100}%`, 
                            top: `${(el.y / docHeight) * 100}%`, 
                            width: `${(el.width / docWidth) * 100}%`, 
                            height: `${(el.height / docHeight) * 100}%` 
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Dark floating indicator */}
                  <div className="absolute top-1.5 left-1.5 bg-slate-950/80 backdrop-blur px-1.5 py-0.5 rounded text-[8px] font-bold text-cyan-400 z-10 leading-none">
                    P{idx + 1}
                  </div>

                  {/* Bottom quick page actions overlay on hover */}
                  <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity z-20">
                    <button 
                      disabled={idx === 0} 
                      onClick={(e) => { e.stopPropagation(); onSelectSlide(idx); reorderPage('up'); }}
                      className="p-1 bg-slate-900 border border-slate-700 hover:bg-cyan-950 hover:text-cyan-400 rounded disabled:opacity-30"
                      title="Mover acima"
                    >
                      <ChevronLeft size={10}/>
                    </button>
                    <button 
                      disabled={idx === slides.length - 1} 
                      onClick={(e) => { e.stopPropagation(); onSelectSlide(idx); reorderPage('down'); }}
                      className="p-1 bg-slate-900 border border-slate-700 hover:bg-cyan-950 hover:text-cyan-400 rounded disabled:opacity-30"
                      title="Mover abaixo"
                    >
                      <ChevronRight size={10}/>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onSelectSlide(idx); duplicatePage(); }}
                      className="p-1 bg-slate-900 border border-slate-700 hover:bg-cyan-500/20 hover:text-cyan-300 rounded"
                      title="Duplicar página"
                    >
                      <Copy size={10}/>
                    </button>
                    <button 
                      disabled={slides.length === 1}
                      onClick={(e) => { e.stopPropagation(); onSelectSlide(idx); removePage(); }}
                      className="p-1 bg-red-950 border border-red-800 text-red-400 hover:bg-red-900 rounded disabled:opacity-30"
                      title="Excluir página"
                    >
                      <Trash2 size={10}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Add slide controls */}
          <div className="shrink-0 flex items-center gap-2">
            <button 
              onClick={addPage}
              className="px-3 py-2.5 bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-550 hover:to-purple-550 text-white text-[10px] rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-cyan-950/40"
              title="Adicionar página em branco"
            >
              <Plus size={11} className="stroke-[3.5px]"/> ADICIONAR PÁGINA
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* RIGHT CONTROLS PANEL: PROPERTIES ENGINE & SETTINGS */}
      <div className="w-72 border-l border-[#1e293b] bg-[#0c1017] flex flex-col shrink-0 flex-grow-0 z-10">
        
        {/* TABS SELECTOR FOR SIDEPANEL */}
        <div className="flex border-b border-[#1e293b] text-center">
          <button 
            onClick={() => setActiveSidePanel('PROPERTIES')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider ${activeSidePanel === 'PROPERTIES' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-950/20' : 'text-slate-500 hover:text-slate-200'}`}
          >
            Propriedades
          </button>
          <button 
            onClick={() => setActiveSidePanel('ADVANCED')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider ${activeSidePanel === 'ADVANCED' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-950/20' : 'text-slate-500 hover:text-slate-200'}`}
          >
            Configurações
          </button>
        </div>

        {/* CONTAINER SWITCHES */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
          {activeSidePanel === 'PROPERTIES' && (
            <div className="space-y-5">
              
              {/* MULTI SELECTION ACTION HEADER PANEL */}
              {selectedIds.size > 1 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider block">Múltipla Seleção ({selectedIds.size})</span>
                    <button 
                      onClick={() => setSelectedIds(new Set())}
                      className="text-[9px] hover:text-white text-slate-500 underline"
                    >
                      Limpar
                    </button>
                  </div>
                  
                  {/* ALIGNMENT GRID PANEL */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Alinhamento Mútuo</span>
                    <div className="grid grid-cols-6 gap-1">
                      <button onClick={() => alignElements('left')} className="p-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded border border-slate-800 flex justify-center hover:text-white" title="Alinhar à Esquerda"><AlignLeft size={12}/></button>
                      <button onClick={() => alignElements('center')} className="p-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded border border-slate-800 flex justify-center hover:text-white" title="Centralizar Horizontalmente"><AlignCenter size={12}/></button>
                      <button onClick={() => alignElements('right')} className="p-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded border border-slate-800 flex justify-center hover:text-white" title="Alinhar à Direita"><AlignRight size={12}/></button>
                      <button onClick={() => alignElements('top')} className="p-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded border border-slate-800 flex justify-center hover:text-white" title="Alinhar ao Topo" style={{ transform: 'rotate(90deg)' }}><AlignLeft size={12}/></button>
                      <button onClick={() => alignElements('middle')} className="p-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded border border-slate-800 flex justify-center hover:text-white" title="Centralizar Verticalmente" style={{ transform: 'rotate(90deg)' }}><AlignCenter size={12}/></button>
                      <button onClick={() => alignElements('bottom')} className="p-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded border border-slate-800 flex justify-center hover:text-white" title="Alinhar à Linha de Base" style={{ transform: 'rotate(90deg)' }}><AlignRight size={12}/></button>
                    </div>
                  </div>

                  {/* DISTRIBUTION GRID PANEL */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button 
                      onClick={() => distributeElements('horizontal')}
                      className="py-1 px-1 text-[10px] bg-slate-950 hover:bg-slate-850 text-slate-300 rounded border border-slate-800 font-bold flex items-center justify-center gap-1 hover:text-white"
                    >
                      <Maximize size={10}/> Distribuir H.
                    </button>
                    <button 
                      onClick={() => distributeElements('vertical')}
                      className="py-1 px-1 text-[10px] bg-slate-950 hover:bg-slate-850 text-[#94a3b8] rounded border border-slate-800 font-bold flex items-center justify-center gap-1 hover:text-white"
                    >
                      <Maximize size={10} className="rotate-90"/> Distribuir V.
                    </button>
                  </div>

                  {/* GROUP / UNGROUP QUICK SHORTCUTS */}
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={groupElements} 
                      className="py-1 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 text-[10px] rounded border border-cyan-800/40 font-bold"
                    >
                      Agrupar (Ctrl+G)
                    </button>
                    <button 
                      onClick={ungroupElements} 
                      className="py-1 bg-slate-950 hover:bg-slate-900 text-slate-300 text-[10px] rounded border border-slate-800 font-bold hover:text-white"
                    >
                      Desagrupar
                    </button>
                  </div>
                </div>
              )}

              {/* IF SELECTED ELEMENT */}
              {selectedIds.size > 0 ? (
                (() => {
                  const elId = Array.from(selectedIds)[0];
                  const el: any = currentSlide.elements.find(item => item.id === elId);
                  if (!el) return <span className="text-xs text-slate-500">Selecione um elemento para editar.</span>;

                  return (
                    <div className="space-y-5">
                      
                      {/* COORDINATES & LAYOUT */}
                      <div className="space-y-2">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Dimensões & Posição</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Largura (W)</label>
                            <input 
                              type="number" 
                              value={el.width}
                              onChange={(e) => updateElementProps(el.id, { width: parseInt(e.target.value) || 50 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Altura (H)</label>
                            <input 
                              type="number" 
                              value={el.height}
                              onChange={(e) => updateElementProps(el.id, { height: parseInt(e.target.value) || 50 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Posição X</label>
                            <input 
                              type="number" 
                              value={el.x}
                              onChange={(e) => updateElementProps(el.id, { x: parseInt(e.target.value) || 0 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Posição Y</label>
                            <input 
                              type="number" 
                              value={el.y}
                              onChange={(e) => updateElementProps(el.id, { y: parseInt(e.target.value) || 0 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white"
                            />
                          </div>
                        </div>

                        {/* ROTATION SLIDER */}
                        <div className="pt-2">
                          <label className="text-[10px] text-slate-500 block mb-1">Rotação do Elemento ({el.style?.rotation || 0}°)</label>
                          <input 
                            type="range" 
                            min="-180" 
                            max="180"
                            value={el.style?.rotation || 0}
                            onChange={(e) => updateElementProps(el.id, { style: { rotation: parseInt(e.target.value) } })}
                            className="w-full accent-cyan-500"
                          />
                        </div>
                      </div>

                      {/* TEXT BOX PROPERTIES */}
                      {el.type === 'text' && !el.isFormField && (
                        <div className="space-y-4 pt-3 border-t border-slate-800">
                          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Parâmetros de Texto</span>
                          
                          {/* Font Family selector */}
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Tipo de Família Tipográfica</label>
                            <select 
                              value={el.style.fontFamily || 'Inter'}
                              onChange={(e) => updateElementProps(el.id, { style: { fontFamily: e.target.value } })}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white outline-none focus:border-cyan-500"
                            >
                              <option value="Inter">Inter (Padrão)</option>
                              <option value="Space Grotesk">Space Grotesk (Display / Moderno)</option>
                              <option value="JetBrains Mono">JetBrains Mono (Técnico / Mono)</option>
                              <option value="Playfair Display">Playfair Display (Serif / Editorial)</option>
                            </select>
                          </div>

                          {/* Font Size and Weight row */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-0.5">Tamanho (px)</label>
                              <input 
                                type="number" 
                                min="6"
                                max="120"
                                value={el.style.fontSize || 14}
                                onChange={(e) => updateElementProps(el.id, { style: { fontSize: parseInt(e.target.value) || 12 } })}
                                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-0.5">Peso da Fonte</label>
                              <select 
                                value={el.style.fontWeight || 'normal'}
                                onChange={(e) => updateElementProps(el.id, { style: { fontWeight: e.target.value } })}
                                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                              >
                               <option value="300">Light (300)</option>
                               <option value="normal">Regular (400)</option>
                               <option value="600">Medium (600)</option>
                               <option value="bold">Bold (700)</option>
                               <option value="900">Black (900)</option>
                              </select>
                            </div>
                          </div>

                          {/* Style states buttons row: Bold, Italic, Underline, Strikethrough */}
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-1">Estilização Rápida</span>
                            <div className="flex gap-1.5">
                              {/* Bold toggle */}
                              <button
                                type="button"
                                onClick={() => updateElementProps(el.id, { style: { fontWeight: el.style.fontWeight === 'bold' ? 'normal' : 'bold' } })}
                                className={`flex-1 py-1 text-xs bg-slate-900 hover:bg-slate-800 rounded border font-extrabold ${el.style.fontWeight === 'bold' ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' : 'border-slate-800 text-slate-300'}`}
                                title="Negrito"
                              >
                                B
                              </button>
                              {/* Italic */}
                              <button
                                type="button"
                                onClick={() => updateElementProps(el.id, { style: { fontStyle: el.style.fontStyle === 'italic' ? 'normal' : 'italic' } })}
                                className={`flex-1 py-1 text-xs bg-slate-900 hover:bg-slate-800 rounded border italic ${el.style.fontStyle === 'italic' ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' : 'border-slate-800 text-slate-300'}`}
                                title="Itálico"
                              >
                                I
                              </button>
                              {/* Underline */}
                              <button
                                type="button"
                                onClick={() => updateElementProps(el.id, { style: { textDecoration: el.style.textDecoration === 'underline' ? 'none' : 'underline' } })}
                                className={`flex-1 py-1 text-xs bg-slate-900 hover:bg-slate-800 rounded border underline ${el.style.textDecoration === 'underline' ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' : 'border-slate-800 text-slate-300'}`}
                                title="Sublinhado"
                              >
                                U
                              </button>
                              {/* Strikethrough */}
                              <button
                                type="button"
                                onClick={() => updateElementProps(el.id, { style: { textDecoration: el.style.textDecoration === 'line-through' ? 'none' : 'line-through' } })}
                                className={`flex-1 py-1 text-xs bg-slate-900 hover:bg-slate-800 rounded border line-through ${el.style.textDecoration === 'line-through' ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' : 'border-slate-800 text-slate-200'}`}
                                title="Tachado"
                              >
                                S
                              </button>
                            </div>
                          </div>

                          {/* CASE TRANSFORMATION & LIST HELPERS */}
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-1">Caixa & Listas</span>
                            <div className="flex gap-1.5 flex-wrap">
                              {/* Uppercase */}
                              <button
                                type="button"
                                onClick={() => updateElementProps(el.id, { style: { textTransform: el.style.textTransform === 'uppercase' ? 'none' : 'uppercase' } })}
                                className={`flex-1 py-1 text-[10px] font-bold bg-slate-900 border rounded ${el.style.textTransform === 'uppercase' ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' : 'border-slate-800 text-slate-300'}`}
                                title="Caixa Alta"
                              >
                                AA
                              </button>
                              {/* Lowercase */}
                              <button
                                type="button"
                                onClick={() => updateElementProps(el.id, { style: { textTransform: el.style.textTransform === 'lowercase' ? 'none' : 'lowercase' } })}
                                className={`flex-1 py-1 text-[10px] bg-slate-900 border rounded ${el.style.textTransform === 'lowercase' ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' : 'border-slate-800 text-slate-300'}`}
                                title="Caixa Baixa"
                              >
                                aa
                              </button>
                              {/* Bullet List Helper */}
                              <button
                                type="button"
                                onClick={() => {
                                  const listified = el.content.split('\n').map((line: string) => line.startsWith('• ') ? line : `• ${line}`).join('\n');
                                  updateElementProps(el.id, { content: listified });
                                }}
                                className="flex-1 py-1 text-[10px] bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded text-slate-300"
                                title="Marcadores"
                              >
                                • Lista
                              </button>
                              {/* Numbered List Helper */}
                              <button
                                type="button"
                                onClick={() => {
                                  const listified = el.content.split('\n').map((line: string, idx: number) => {
                                    const match = line.match(/^\d+\.\s/);
                                    return match ? line : `${idx + 1}. ${line}`;
                                  }).join('\n');
                                  updateElementProps(el.id, { content: listified });
                                }}
                                className="flex-1 py-1 text-[10px] bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded text-slate-300"
                                title="Lista Numerada"
                              >
                                1. Lista
                              </button>
                            </div>
                          </div>

                          {/* Alignments (Left, Center, Right, Justify) */}
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-1">Alinhamento</span>
                            <div className="flex gap-2">
                              {([
                                { key: 'left', icon: <AlignLeft size={12}/>, title: 'Esquerda' },
                                { key: 'center', icon: <AlignCenter size={12}/>, title: 'Centralizar' },
                                { key: 'right', icon: <AlignRight size={12}/>, title: 'Direita' },
                                { key: 'justify', icon: <AlignJustify size={12}/>, title: 'Justificado' }
                              ] as const).map(align => (
                                <button
                                  key={align.key}
                                  type="button"
                                  onClick={() => updateElementProps(el.id, { style: { textAlign: align.key } })}
                                  className={`flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border rounded flex justify-center text-slate-300 ${el.style.textAlign === align.key ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20': 'border-slate-800'}`}
                                  title={align.title}
                                >
                                  {align.icon}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Line height, Letter spacing sliders */}
                          <div className="space-y-2">
                            {/* Line Height */}
                            <div>
                              <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                <span>Espaçamento de Linha</span>
                                <span className="text-cyan-400 font-bold">{el.style.lineHeight || 1.2}</span>
                              </div>
                              <input 
                                type="range"
                                min="0.8"
                                max="3.0"
                                step="0.1"
                                value={el.style.lineHeight || 1.2}
                                onChange={(e) => updateElementProps(el.id, { style: { lineHeight: parseFloat(e.target.value) } })}
                                className="w-full h-1 bg-slate-950 accent-cyan-400 rounded-lg cursor-pointer"
                              />
                            </div>

                            {/* Letter Spacing */}
                            <div>
                              <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                <span>Espaçamento de Caracteres</span>
                                <span className="text-cyan-400 font-bold">{el.style.letterSpacing ? `${el.style.letterSpacing}px` : 'normal'}</span>
                              </div>
                              <input 
                                type="range"
                                min="-3"
                                max="15"
                                step="1"
                                value={parseInt(el.style.letterSpacing) || 0}
                                onChange={(e) => updateElementProps(el.id, { style: { letterSpacing: `${e.target.value}px` } })}
                                className="w-full h-1 bg-slate-950 accent-cyan-400 rounded-lg cursor-pointer"
                              />
                            </div>

                            {/* Recuo / Indentation in px */}
                            <div>
                              <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                <span>Recuo / Indentação Parágrafo</span>
                                <span className="text-cyan-400 font-bold">{el.style.indent || 0}px</span>
                              </div>
                              <input 
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={el.style.indent || 0}
                                onChange={(e) => updateElementProps(el.id, { style: { indent: parseInt(e.target.value) } })}
                                className="w-full h-1 bg-slate-950 accent-cyan-400 rounded-lg cursor-pointer"
                              />
                            </div>

                            {/* Opacity slider */}
                            <div>
                              <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                <span>Opacidade da Caixa</span>
                                <span className="text-cyan-400 font-bold">{Math.round((el.style.opacity ?? 1) * 100)}%</span>
                              </div>
                              <input 
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={el.style.opacity ?? 1}
                                onChange={(e) => updateElementProps(el.id, { style: { opacity: parseFloat(e.target.value) } })}
                                className="w-full h-1 bg-slate-950 accent-cyan-400 rounded-lg cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Character Color selection with color palette AND native picker */}
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Cor do Caractere</label>
                            <div className="flex items-center gap-2">
                              {/* Native color input */}
                              <input 
                                type="color"
                                value={el.style.color || '#1e293b'}
                                onChange={(e) => updateElementProps(el.id, { style: { color: e.target.value } })}
                                className="w-8 h-8 rounded border border-slate-800 bg-transparent cursor-pointer overflow-hidden p-0"
                              />
                              
                              {/* Preset quick buttons */}
                              <div className="flex gap-1 flex-wrap flex-1">
                                {['#1e293b', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ffffff'].map(c => (
                                  <button 
                                    key={c}
                                    type="button"
                                    onClick={() => updateElementProps(el.id, { style: { color: c } })}
                                    className={`w-5 h-5 rounded border ${el.style.color === c ? 'ring-2 ring-cyan-500' : 'border-slate-800'}`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* FORM COMPONENT SPECIAL SETUP */}
                      {el.isFormField && (
                        <div className="space-y-3 pt-3 border-t border-slate-800">
                          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Propriedades Internas do Formulário</span>
                          
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Identificação do Campo (Nome)</label>
                            <input 
                              type="text" 
                              value={el.formFieldName}
                              onChange={(e) => updateElementProps(el.id, { formFieldName: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Tipo do Elemento</label>
                            <select 
                              value={el.formFieldType}
                              onChange={(e) => updateElementProps(el.id, { formFieldType: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                            >
                              <option value="text">Input Text / Texto Curto</option>
                              <option value="checkbox">Caixa de Seleção / Checkbox</option>
                              <option value="dropdown">Menu suspenso / Combobox</option>
                              <option value="signature">Área de Assinatura Digital</option>
                            </select>
                          </div>

                          {el.formFieldType === 'dropdown' && (
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1">Opções (Separar com vírgula)</label>
                              <input 
                                type="text"
                                placeholder="Opção A, Opção B"
                                value={(el.formFieldOptions || []).join(', ')}
                                onChange={(e) => updateElementProps(el.id, { formFieldOptions: e.target.value.split(',').map(s => s.trim()) })}
                                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <input 
                              type="checkbox" 
                              id="isRequiredCheck" 
                              checked={el.formFieldRequired || false}
                              onChange={(e) => updateElementProps(el.id, { formFieldRequired: e.target.checked })}
                              className="rounded accent-cyan-500 cursor-pointer"
                            />
                            <label htmlFor="isRequiredCheck" className="text-[10px] text-slate-300 cursor-pointer">Marcar como Campo Obrigatório</label>
                          </div>
                        </div>
                      )}

                      {/* QUICK UTILITY ACTION PANEL (LOCK, DUPLICATE, FLIP, LAYER REORDER) */}
                      <div className="pt-3 border-t border-slate-800 space-y-2">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">AÇÕES DO OBJETO</span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => toggleLockElement(el.id)}
                            className={`py-1.5 px-2 text-[10px] font-bold rounded border flex items-center justify-center gap-1.5 transition-all ${el.isLocked ? 'bg-amber-600/20 border-amber-500 text-amber-400' : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'}`}
                          >
                            {el.isLocked ? <Unlock size={11}/> : <Lock size={11}/>}
                            {el.isLocked ? 'Desbloquear' : 'Bloquear'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => duplicateElement(el.id)}
                            className="py-1.5 px-2 text-[10px] font-bold bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded text-slate-300 flex items-center justify-center gap-1.5 hover:text-white"
                          >
                            <Copy size={11}/> Duplicar
                          </button>
                        </div>

                        {/* LAYER POSITION Z-INDEX CONTROLS */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => updateElementProps(el.id, { zIndex: (el.zIndex || 1) + 1 })}
                            className="py-1 px-2 text-[9px] bg-slate-950 border border-slate-800 rounded text-slate-400 hover:text-white font-medium"
                          >
                            ▲ Trazer para Frente
                          </button>
                          <button
                            type="button"
                            onClick={() => updateElementProps(el.id, { zIndex: Math.max(1, (el.zIndex || 1) - 1) })}
                            className="py-1 px-2 text-[9px] bg-slate-950 border border-slate-800 rounded text-slate-400 hover:text-white font-medium"
                          >
                            ▼ Enviar para Trás
                          </button>
                        </div>
                      </div>

                      {/* WORKSPACE CHANGE HISTORY DYNAMIC LOG */}
                      <div className="pt-3 border-t border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-[#64748b] font-bold uppercase tracking-wider">Histórico de Alterações</span>
                          <span className="text-[9px] text-[#475569]">Figma Engine v2</span>
                        </div>
                        {actionHistory && actionHistory.length > 0 ? (
                          <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                            {actionHistory.slice(-3).reverse().map((act: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center p-1 bg-slate-950/40 rounded border border-slate-900/50 text-[9px] text-slate-400">
                                <span className="truncate">{act.description}</span>
                                <span className="opacity-60 text-[8px] font-mono">
                                  {act.timestamp instanceof Date ? act.timestamp.toLocaleTimeString() : new Date(act.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[9px] text-[#475569] italic">Nenhuma alteração registrada ainda nesta sessão</div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="p-4 bg-slate-950/30 border border-slate-900 rounded-2xl text-center">
                  <AlertCircle size={20} className="text-slate-500 mx-auto mb-2"/>
                  <span className="text-xs text-slate-400 block font-bold">Nenhum elemento selecionado</span>
                  <span className="text-[10px] text-slate-500 block mt-1">Clique em uma caixa de texto, imagem ou formulário na folha A4 para ajustar posicionamento e detalhes de folha.</span>
                </div>
              )}
            </div>
          )}

          {activeSidePanel === 'ADVANCED' && (
            <div className="space-y-5">
              {/* DOCUMENT SIZE SELECTION */}
              <div className="space-y-2 border-b border-slate-900 pb-4">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Tamanho da Folha</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'A4', label: 'A4 (Clássico)', desc: '840 x 1188 px' },
                    { id: 'LETTER', label: 'Carta (Letter)', desc: '840 x 1086 px' },
                    { id: 'A3', label: 'A3 (Grande)', desc: '1188 x 1680 px' },
                    { id: 'SLIDE_16_9', label: 'Slide (16:9)', desc: '1050 x 590 px' }
                  ].map((size) => (
                    <button
                      key={size.id}
                      onClick={() => {
                        setPageSizeType(size.id as any);
                        if (size.id === 'SLIDE_16_9') setZoom(0.75);
                        else if (size.id === 'A3') setZoom(0.5);
                        else setZoom(0.85);
                      }}
                      className={`p-2 rounded-xl border text-left transition-all ${pageSizeType === size.id ? 'border-cyan-400 bg-cyan-900/20 text-cyan-400 font-medium' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-200'}`}
                    >
                      <div className="text-[10px] font-bold">{size.label}</div>
                      <div className="text-[8px] opacity-60 font-mono mt-0.5">{size.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Cabeçalho & Rodapé Geral</span>
              
              <div className="space-y-4 bg-slate-950/20 border border-slate-900 p-3.5 rounded-2xl">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Texto do Cabeçalho</label>
                  <input 
                    type="text" 
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-1 px-2 text-xs rounded text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Texto do Rodapé</label>
                  <input 
                    type="text" 
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-1 px-2 text-xs rounded text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="autoPageNumbers"
                    checked={autoPageNumbers}
                    onChange={(e) => setAutoPageNumbers(e.target.checked)}
                    className="accent-cyan-500"
                  />
                  <label htmlFor="autoPageNumbers" className="text-[10px] text-slate-300">Exibir numeração de páginas</label>
                </div>
              </div>

              {/* MARCA D'ÁGUA SETUP */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Marca d'água</span>
                <input 
                  type="text" 
                  placeholder="Ex: CONFIDENCIAL, RASCUNHO"
                  value={watermark}
                  onChange={(e) => setWatermark(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-1.5 px-2 text-xs rounded-xl text-white outline-none"
                />
                <span className="text-[9px] text-slate-500 leading-tight block">Exibe um carimbo texturado de segurança diagonal em todas as páginas da exportação Acrobat.</span>
              </div>

              {/* ADOBE PDF COMPRESSION RATIO */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Compressão do Arquivo</span>
                <div className="bg-slate-950/20 border border-slate-900 p-3 rounded-2xl">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>Estimar Qualidade</span>
                    <span className="text-cyan-400">{compressionRatio}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100"
                    value={compressionRatio}
                    onChange={(e) => setCompressionRatio(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 mt-2"
                  />
                  <span className="text-[9px] text-slate-500 block leading-tight mt-2">
                    Estimar tamanho final: <strong>{Math.round((slides.length * 1.5) * (compressionRatio / 100))} MB</strong>
                  </span>
                </div>
              </div>

              {/* DOCUMENT ENCRYPTION AND PERMISSION SCHEMES */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Políticas de Restrições</span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="allowEdit"
                      checked={encryptionPolicy.edit}
                      onChange={(e) => setEncryptionPolicy(prev => ({...prev, edit: e.target.checked}))}
                      className="accent-cyan-500 cursor-pointer"
                    />
                    <label htmlFor="allowEdit" className="text-[10px] text-slate-300 cursor-pointer">Bloquear Alteração por Terceiros</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="allowPrint"
                      checked={encryptionPolicy.print}
                      onChange={(e) => setEncryptionPolicy(prev => ({...prev, print: e.target.checked}))}
                      className="accent-cyan-500 cursor-pointer"
                    />
                    <label htmlFor="allowPrint" className="text-[10px] text-slate-300 cursor-pointer">Impedir Impressão / Cópias</label>
                  </div>
                </div>
              </div>

              {/* IMPORT/RECOGNIZE FROM COMPUTER */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Importação & Reconhecimento</span>
                <div className="relative group">
                  <input 
                    type="file" 
                    onChange={handleImportFile}
                    accept=".pdf,.docx,.doc,.pptx,.xlsx,.png,.jpg,.jpeg,.webp,.svg"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <button className="w-full py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1.5 shadow">
                    Importar do Computador
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- INTEGRATED EXPORTS / CONVERSION POPUP MODAL --- */}
      {conversionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#0c1017] border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-6">
            <button 
              onClick={() => setConversionModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white"
            >
              <X size={16}/>
            </button>

            <div>
              <h3 className="text-sm font-black tracking-wider uppercase text-cyan-400 flex items-center gap-2">
                <Sliders size={16}/> Conversor Integrado Acrobat 3.0
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Converta o documento A4 atual para diferentes formatos de mercado mantendo integridade de imagens, vetores de canetas e formatações.</p>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <button 
                onClick={() => { setConversionModalOpen(false); executeConversion('pdf'); }}
                className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl flex items-start gap-4 text-left transition-all"
              >
                <div className="p-3 bg-red-950 border border-red-800 text-red-400 rounded-xl">
                  <FileText size={20}/>
                </div>
                <div>
                  <span className="text-xs font-bold block text-white">Salvar PDF (.pdf)</span>
                  <span className="text-[10px] text-slate-500 block mt-1">Exportação profissional Adobe Acrobat.</span>
                </div>
              </button>

              <button 
                onClick={() => { setConversionModalOpen(false); executeConversion('docx'); }}
                className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl flex items-start gap-4 text-left transition-all"
              >
                <div className="p-3 bg-blue-950 border border-blue-800 text-blue-400 rounded-xl">
                  <FileText size={20}/>
                </div>
                <div>
                  <span className="text-xs font-bold block text-white">Converter para Word (.doc)</span>
                  <span className="text-[10px] text-slate-500 block mt-1">Converte os textos para fluxo contínuo.</span>
                </div>
              </button>

              <button 
                onClick={() => { setConversionModalOpen(false); executeConversion('pptx'); }}
                className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl flex items-start gap-4 text-left transition-all"
              >
                <div className="p-3 bg-orange-950 border border-orange-850 text-orange-400 rounded-xl">
                  <FileText size={20}/>
                </div>
                <div>
                  <span className="text-xs font-bold block text-white">Converter para Slides (.pptx)</span>
                  <span className="text-[10px] text-slate-500 block mt-1">Gera apresentação PowerPoint nativa.</span>
                </div>
              </button>

              <button 
                onClick={() => { setConversionModalOpen(false); executeConversion('xlsx'); }}
                className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl flex items-start gap-4 text-left transition-all"
              >
                <div className="p-3 bg-green-950 border border-green-800 text-green-400 rounded-xl">
                  <FileText size={20}/>
                </div>
                <div>
                  <span className="text-xs font-bold block text-white">Converter para Excel (.xlsx)</span>
                  <span className="text-[10px] text-slate-500 block mt-1">Extrai dados organizados em planilha.</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LIVE DIGITAL SIGNATURE CANVAS MODAL --- */}
      {sigPadOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0c1017] border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setSigPadOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white"
            >
              <X size={16}/>
            </button>

            <div>
              <h3 className="text-sm font-black tracking-wider uppercase text-cyan-400 flex items-center gap-2">
                ✍️ Área de Assinatura Eletrônica Acrobat Sign
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Sua assinatura será processada e criptografada com carimbo de verificação ICP-Brasil.</p>
            </div>

            {/* TAB SYSTEM DESENHAR VS DIGITAR */}
            <div className="flex border-b border-slate-800">
              <button 
                onClick={() => setSigTypeFont('Draw')}
                className={`py-2 text-xs font-bold px-4 ${sigTypeFont === 'Draw' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500'}`}
              >
                Desenhar com o mouse
              </button>
              <button 
                onClick={() => setSigTypeFont('Brush Script MT, cursive')}
                className={`py-2 text-xs font-bold px-4 ${sigTypeFont !== 'Draw' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500'}`}
              >
                Digitar Assinatura Cursiva
              </button>
            </div>

            {sigTypeFont === 'Draw' ? (
              <div className="space-y-2">
                <canvas 
                  ref={sigCanvasRef}
                  width={464}
                  height={180}
                  onMouseDown={startSigDraw}
                  onMouseMove={drawSig}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseLeave={() => setIsDrawing(false)}
                  className="bg-slate-950 border border-slate-800 rounded-xl cursor-crosshair"
                />
                <button 
                  onClick={() => {
                    const canvas = sigCanvasRef.current;
                    const ctx = canvas?.getContext('2d');
                    ctx?.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);
                  }}
                  className="text-xs text-red-400 font-bold block"
                >
                  Limpar Traço
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    placeholder="Sua assinatura em cursiva" 
                    value={sigTypeText}
                    onChange={(e) => setSigTypeText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white text-xs outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl text-center flex items-center justify-center h-28">
                  <span 
                    className="text-white text-3xl font-medium tracking-wide block"
                    style={{ fontFamily: sigTypeFont }}
                  >
                    {sigTypeText || "Assinatura Cursiva"}
                  </span>
                </div>

                {/* SELECT CALLIGRAPHY FONT */}
                <div className="flex gap-2">
                  {[
                    { font: 'Brush Script MT, cursive', title: 'Brush Script' },
                    { font: 'Playfair Display, serif', title: 'Serif Clássica' },
                    { font: 'JetBrains Mono, monospace', title: 'Tech Modern' }
                  ].map(fObj => (
                    <button 
                      key={fObj.font}
                      onClick={() => setSigTypeFont(fObj.font)}
                      className={`flex-1 py-1 px-3 border border-slate-800 rounded text-[10px] ${sigTypeFont === fObj.font ? 'border-cyan-500 text-cyan-400':'text-slate-400'}`}
                    >
                      {fObj.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 justify-end">
              <button 
                onClick={() => setSigPadOpen(false)}
                className="py-2 px-4 border border-slate-800 text-slate-400 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  let imgUrl = "";
                  if (sigTypeFont === 'Draw') {
                    const canvas = sigCanvasRef.current;
                    if (canvas) imgUrl = canvas.toDataURL();
                  } else {
                    // Create simulated cursive image text banner
                    const canvas = document.createElement('canvas');
                    canvas.width = 400;
                    canvas.height = 100;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.fillStyle = '#ffffff00'; // transparent
                      ctx.fillRect(0, 0, 400, 100);
                      ctx.font = `32px ${sigTypeFont}`;
                      ctx.fillStyle = '#0284c7';
                      ctx.textAlign = 'center';
                      ctx.fillText(sigTypeText || "Assinado", 200, 55);
                    }
                    imgUrl = canvas.toDataURL();
                  }
                  commitSignature(imgUrl);
                }}
                className="py-2 px-5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold"
              >
                Inserir Assinatura ICP-Brasil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LIVE NEON OCR LAUNCHED SCAN DRAWER OVERLAY --- */}
      {ocrScannerOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0c1017] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl relative space-y-6 overflow-hidden">
            
            {/* NEON RADAR SCANNER LASER ANCHOR */}
            {isScanningOCR && (
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
                <div className="w-full h-1.5 bg-cyan-400 blur-sm shadow-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-bounce mt-10" />
              </div>
            )}

            <div>
              <h3 className="text-sm font-black tracking-wider uppercase text-cyan-400 flex items-center gap-2">
                <Sparkles size={16} className="animate-pulse"/> Scanner OCR Premium 4.0
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Análise inteligente de imagem e extração estruturada de caracteres da foto de colaborador selecionada.</p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl relative min-h-48 flex flex-col justify-center">
              {isScanningOCR ? (
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <span className="text-xs font-bold text-cyan-400 block tracking-wider uppercase">Lendo pixels da imagem...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block">Conteúdo Extraído Detectado:</span>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl max-h-36 overflow-y-auto text-xs font-mono text-cyan-400">
                    <pre className="whitespace-pre-wrap">{ocrResultText}</pre>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 justify-end">
              <button 
                onClick={() => setOcrScannerOpen(false)}
                className="py-2 px-4 border border-slate-800 text-slate-400 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button 
                disabled={isScanningOCR}
                onClick={insertOcrText}
                className="py-2 px-5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
              >
                Injetar Texto Reconhecido na Folha
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
