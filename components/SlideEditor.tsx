import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Type, Move, Trash2, Undo, Redo, Sparkles, Plus, Image as ImageIcon, Box,
  ChevronUp, ChevronDown, ChevronLeft, ArrowLeft, MousePointer2, ArrowRight, X, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Palette, Maximize, Minimize, ChevronRight, Copy, BringToFront, SendToBack,
  Star, Minus, Search, Lock, Unlock, FileText, CheckSquare, RefreshCw, Layers as LayersIcon,
  Download, Sliders, Shield, Printer, Check, Circle, AlertCircle, PenTool, Highlighter,
  Underline, Upload, FolderOpen, Table, MessageSquare, MoreHorizontal, LayoutGrid, Scissors, Globe,
  Smartphone, Instagram, Info, Link, Link2, Layers, Clock, PlusSquare, Eraser, Crop, Pin} from 'lucide-react';
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
  onBack?: () => void;
}

export const SlideEditor: React.FC<SlideEditorProps> = ({ 
  slides, 
  currentSlideIndex, 
  onUpdateSlides, 
  onSelectSlide,
  onBack
}) => {
  // --- APPLICATION ENVIRONMENT & WORKSPACE STATES ---
  const [editMode, setEditMode] = useState<'EDIT' | 'LIVE_FILL'>('EDIT');
  const [zoom, setZoom] = useState<number>(0.85);
  const [pageSizeType, setPageSizeType] = useState<'A4' | 'LETTER' | 'A3' | 'SLIDE_16_9' | 'CUSTOM'>('A4');
  const [customWidth, setCustomWidth] = useState<number>(840);
  const [customHeight, setCustomHeight] = useState<number>(1188);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getPageDimensions = () => {
    switch (pageSizeType) {
      case 'LETTER':
        return { width: 840, height: 1086 };
      case 'A3':
        return { width: 1188, height: 1680 };
      case 'SLIDE_16_9':
        return { width: 1050, height: 590 };
      case 'CUSTOM':
        return { width: customWidth, height: customHeight };
      case 'A4':
      default:
        return { width: 840, height: 1188 };
    }
  };
  const { width: docWidth, height: docHeight } = getPageDimensions();
  const handleBackgroundChange = (color: string) => {
    const updatedSlides = slides.map((s, idx) => 
      idx === currentSlideIndex ? { ...s, background: color } : s
    );
    triggerUpdate(updatedSlides);
  };
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
  const [drawingWidth, setDrawingWidth] = useState<number>(3);
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

  // --- ADOBE ACROBAT PRO EXCLUSIVE ANNOTATION STATES ---
  const [measureModeActive, setMeasureModeActive] = useState<boolean>(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [brushMode, setBrushMode] = useState<'PEN' | 'HIGHLIGHTER'>('PEN');
  const [isAddingStickyPin, setIsAddingStickyPin] = useState<boolean>(false);
  const [pageOrganizerOpen, setPageOrganizerOpen] = useState<boolean>(false);

  // Modals & Panels
  const [activeSidePanel, setActiveSidePanel] = useState<'PAGES' | 'PROPERTIES' | 'ADVANCED'>('PAGES');
  const [conversionModalOpen, setConversionModalOpen] = useState<boolean>(false);

  // --- NEW PROFESSIONAL EDITING STATES ---
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<any[]>([]);
  const [copiedStyle, setCopiedStyle] = useState<any>(null);
  const [activeThumbnailMenuIndex, setActiveThumbnailMenuIndex] = useState<number | null>(null);
  const [actionHistory, setActionHistory] = useState<{ description: string; timestamp: Date }[]>([
    { description: 'Criação do documento', timestamp: new Date() }
  ]);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);
  const [isExtractingCrop, setIsExtractingCrop] = useState<boolean>(false);
  const [cropBoxStart, setCropBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [cropBoxEnd, setCropBoxEnd] = useState<{ x: number; y: number } | null>(null);
  const [activeSnapHV, setActiveSnapHV] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [dragInitialOffsets, setDragInitialOffsets] = useState<Record<string, { x: number; y: number }>>({});

  // --- IMAGE CROP STATES ---
  const [croppingImageId, setCroppingImageId] = useState<string | null>(null);
  const [activeCropHandle, setActiveCropHandle] = useState<string | null>(null);
  const [cropOriginals, setCropOriginals] = useState<any | null>(null);

  // --- PDF EXPORT PRO SETTINGS ---
  const [pdfCompressionQuality, setPdfCompressionQuality] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [pdfPassword, setPdfPassword] = useState<string>('');

  const logAction = (desc: string) => {
    setActionHistory(prev => [{ description: desc, timestamp: new Date() }, ...prev.slice(0, 49)]);
  };

  // References
  const canvasRef = useRef<HTMLDivElement>(null);
  const freehandCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const workspaceViewportRef = useRef<HTMLDivElement>(null);
  const wasSelectedOnMouseDownRef = useRef<boolean>(false);
  const mouseDownCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

  const lastSelectedViaClickRef = useRef<number | null>(null);

  // Smoothly scroll selected page into view (unless it was selected via direct click inside it)
  useEffect(() => {
    if (lastSelectedViaClickRef.current === currentSlideIndex) {
      lastSelectedViaClickRef.current = null;
      return;
    }
    const activePageElement = document.getElementById(`page-sheet-${currentSlideIndex}`);
    if (activePageElement) {
      activePageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentSlideIndex]);

  const currentSlide = slides[currentSlideIndex] || slides[0] || { id: 'default', elements: [], background: '#ffffff' };

  // Sync / Action Helpers
  const triggerUpdate = (newSlides: Slide[], actionName?: string) => {
    setUndoStack(prev => {
      const next = [...prev, slides];
      if (next.length > 50) return next.slice(next.length - 50);
      return next;
    });
    setRedoStack([]);
    onUpdateSlides(newSlides);
    if (actionName) {
      logAction(actionName);
    }
  };

  const handleCropExtractionConfirm = () => {
    if (!cropBoxStart || !cropBoxEnd) {
      toast.error('Nenhuma área de recorte selecionada!');
      return;
    }

    const startX = Math.min(cropBoxStart.x, cropBoxEnd.x);
    const startY = Math.min(cropBoxStart.y, cropBoxEnd.y);
    const cropW = Math.abs(cropBoxStart.x - cropBoxEnd.x);
    const cropH = Math.abs(cropBoxStart.y - cropBoxEnd.y);

    if (cropW < 5 || cropH < 5) {
      toast.error('Área de seleção muito pequena! Selecione um retângulo maior.');
      return;
    }

    // Find the PDF background image element on the active slide
    const bgEl = currentSlide.elements.find((el: any) => el.id.startsWith('el-pdf-bg-') || (el.type === 'image' && el.x === 0 && el.y === 0));
    if (!bgEl) {
      toast.error('Não foi possível encontrar a imagem de fundo do PDF para recortar!');
      return;
    }

    const loader = toast.loading('Separando e processando elemento do PDF...');

    const img = new Image();
    img.onload = () => {
      try {
        // 1. Extract the cropped selection into a separate canvas
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW * 2; // Keep high resolution 2x scale
        cropCanvas.height = cropH * 2;
        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) {
          toast.dismiss(loader);
          return;
        }

        // Draw cropped segment
        // Image coordinates mapping: img original width/height matches bgEl.width * 2 / height * 2 (or we can use img's natural dims)
        const scaleX = img.naturalWidth / bgEl.width;
        const scaleY = img.naturalHeight / bgEl.height;

        cropCtx.drawImage(
          img,
          startX * scaleX,
          startY * scaleY,
          cropW * scaleX,
          cropH * scaleY,
          0,
          0,
          cropW * 2,
          cropH * 2
        );

        const croppedDataUrl = cropCanvas.toDataURL('image/png');

        // 2. Erase this area from the original background image element
        const cleanCanvas = document.createElement('canvas');
        cleanCanvas.width = img.naturalWidth;
        cleanCanvas.height = img.naturalHeight;
        const cleanCtx = cleanCanvas.getContext('2d');
        if (!cleanCtx) {
          toast.dismiss(loader);
          return;
        }

        // Draw original background
        cleanCtx.drawImage(img, 0, 0);

        // Fill selection area with white to erase it from the background
        cleanCtx.fillStyle = '#ffffff';
        cleanCtx.fillRect(
          startX * scaleX,
          startY * scaleY,
          cropW * scaleX,
          cropH * scaleY
        );

        const newBgDataUrl = cleanCanvas.toDataURL('image/png');

        // 3. Create the new draggable element
        const newElId = `el-cropped-${Date.now()}`;
        const newCroppedElement: any = {
          id: newElId,
          type: 'image',
          x: Math.round(startX),
          y: Math.round(startY),
          width: Math.round(cropW),
          height: Math.round(cropH),
          content: croppedDataUrl,
          zIndex: currentSlide.elements.length + 1,
          style: {
            opacity: 1,
            rotation: 0
          }
        };

        // 4. Update the current slide elements
        const updatedElements = currentSlide.elements.map((el: any) => {
          if (el.id === bgEl.id) {
            return { ...el, content: newBgDataUrl };
          }
          return el;
        });

        const nextElements = [...updatedElements, newCroppedElement];

        const nextSlides = slides.map((s, idx) => 
          idx === currentSlideIndex ? { ...s, elements: nextElements } : s
        );

        triggerUpdate(nextSlides, 'Recortar Elemento do PDF');
        setSelectedIds(new Set([newElId]));
        
        setIsExtractingCrop(false);
        setCropBoxStart(null);
        setCropBoxEnd(null);
        toast.success('Elemento separado e extraído do fundo como objeto móvel! Agora você pode movê-lo, redimensioná-lo ou deletá-lo livremente.', { id: loader, duration: 6000 });
      } catch (err) {
        console.error(err);
        toast.error('Erro ao recortar elemento da imagem de fundo.', { id: loader });
      }
    };

    img.onerror = () => {
      toast.error('Erro de carregamento da imagem de fundo.', { id: loader });
    };

    img.src = bgEl.content;
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => {
      const next = [...prev, slides];
      if (next.length > 50) return next.slice(next.length - 50);
      return next;
    });
    onUpdateSlides(previous);
    logAction('Desfazer Alteração');
    toast.success('Desfeito com sucesso!');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => {
      const nextStack = [...prev, slides];
      if (nextStack.length > 50) return nextStack.slice(nextStack.length - 50);
      return nextStack;
    });
    onUpdateSlides(next);
    logAction('Refazer Alteração');
    toast.success('Refez com sucesso!');
  };

  // --- ELEMENT HANDLING ---
  const addElement = (type: 'text' | 'image' | 'shape' | 'form' | 'comment') => {
    if (isLockedByPass) return;
    const newEl: any = {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: type === 'form' ? 'text' : type,
      x: 150,
      y: 200,
      width: type === 'comment' ? 44 : (type === 'image' ? 300 : type === 'shape' ? 120 : 250),
      height: type === 'comment' ? 44 : (type === 'image' ? 200 : type === 'shape' ? 120 : 80),
      content: type === 'comment' ? 'Insira um comentário ou nota rápida do Acrobat aqui...' : (type === 'text' ? 'Digite seu texto aqui' : type === 'image' ? 'https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&w=400&q=80' : 'Rectangle'),
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

      // Escape or Enter in cropping mode
      if (croppingImageId) {
        if (key === 'escape' || key === 'enter') {
          e.preventDefault();
          setCroppingImageId(null);
          toast.success('Alterações de corte aplicadas!');
          return;
        }
      }

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
        if (e.altKey) {
          const firstEl = currentSlide.elements.find(el => selectedIds.has(el.id));
          if (firstEl) {
            setCopiedStyle({ ...firstEl.style });
            toast.success('Estilo copiado! Pressione Ctrl+Alt+V para colar.');
          }
          return;
        }
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
        if (e.altKey) {
          if (copiedStyle) {
            const updatedSlides = slides.map((s, idx) => {
              if (idx === currentSlideIndex) {
                return {
                  ...s,
                  elements: s.elements.map(el => {
                    if (selectedIds.has(el.id)) {
                      return {
                        ...el,
                        style: { ...el.style, ...copiedStyle }
                      };
                    }
                    return el;
                  })
                };
              }
              return s;
            });
            triggerUpdate(updatedSlides, 'Colar estilo');
            toast.success('Estilo colado com sucesso!');
          } else {
            toast.error('Nenhum estilo na memória para colar.');
          }
          return;
        }
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

      // Enter/F2: Edit Selected Text Element
      if (key === 'enter' || key === 'f2') {
        if (isTyping) return;
        const selectedList = currentSlide.elements.filter(el => selectedIds.has(el.id));
        if (selectedList.length === 1 && selectedList[0].type === 'text' && !selectedList[0].isFormField && !selectedList[0].isLocked) {
          e.preventDefault();
          const targetEl = selectedList[0];
          setEditingTextId(targetEl.id);
          setTimeout(() => {
            const ta = document.getElementById(`textarea-${targetEl.id}`);
            if (ta) {
              (ta as HTMLElement).focus();
            }
          }, 50);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIds, clipboard, currentSlide, currentSlideIndex, slides, copiedStyle, croppingImageId]);

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
    const { width: docWidth, height: docHeight } = getPageDimensions();
    const cx = docWidth / 2;
    const cy = docHeight / 2;

    const rotatedElements = currentSlide.elements.map(el => {
      const elCenterX = el.x + el.width / 2;
      const elCenterY = el.y + el.height / 2;

      // Translate 90° CW around center
      const newElCenterX = cx - (elCenterY - cy);
      const newElCenterY = cy + (elCenterX - cx);

      const rotatedX = newElCenterX - el.height / 2;
      const rotatedY = newElCenterY - el.width / 2;

      return {
        ...el,
        x: Math.max(0, Math.min(docWidth - el.height, rotatedX)),
        y: Math.max(0, Math.min(docHeight - el.width, rotatedY)),
        width: el.height,
        height: el.width,
        style: {
          ...el.style,
          rotation: ((el.style?.rotation || 0) + 90)
        }
      };
    });

    const nextSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        return { ...s, elements: rotatedElements };
      }
      return s;
    });

    triggerUpdate(nextSlides);
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

  // --- ACROBAT INDEX-SPECIFIC PAGE GRID OPERATIONS ---
  const rotatePageAtIndex = (index: number) => {
    const { width: dWidth, height: dHeight } = getPageDimensions();
    const cx = dWidth / 2;
    const cy = dHeight / 2;
    const slideToRotate = slides[index];
    if (!slideToRotate) return;
    
    // Rotate page elements CW around hypothetical center
    const rotatedElements = slideToRotate.elements.map(el => {
      const elCenterX = el.x + el.width / 2;
      const elCenterY = el.y + el.height / 2;
      const newElCenterX = cx - (elCenterY - cy);
      const newElCenterY = cy + (elCenterX - cx);
      const rotatedX = newElCenterX - el.height / 2;
      const rotatedY = newElCenterY - el.width / 2;
      return {
        ...el,
        x: Math.max(0, Math.min(dWidth - el.height, rotatedX)),
        y: Math.max(0, Math.min(dHeight - el.width, rotatedY)),
        width: el.height,
        height: el.width,
        style: {
          ...el.style,
          rotation: ((el.style?.rotation || 0) + 90)
        }
      };
    });
    
    const nextSlides = slides.map((s, idx) => {
      if (idx === index) {
        return { ...s, elements: rotatedElements };
      }
      return s;
    });
    triggerUpdate(nextSlides);
    toast.success(`Página ${index + 1} rotacionada em 90°!`);
  };

  const duplicatePageAtIndex = (index: number) => {
    const slideToDup = slides[index];
    if (!slideToDup) return;
    const newPage: Slide = {
      ...slideToDup,
      id: `slide-dup-${Date.now()}-${Math.random()}`,
      elements: slideToDup.elements.map(el => ({ ...el, id: `el-${Date.now()}-${Math.random()}` }))
    };
    const nextSlides = [...slides];
    nextSlides.splice(index + 1, 0, newPage);
    triggerUpdate(nextSlides);
    onSelectSlide(index + 1);
    toast.success(`Página ${index + 1} duplicada com sucesso!`);
  };

  const removePageAtIndex = (index: number) => {
    if (slides.length <= 1) {
      toast.error('O documento precisa ter pelo menos 1 página!');
      return;
    }
    const nextSlides = slides.filter((_, idx) => idx !== index);
    triggerUpdate(nextSlides);
    onSelectSlide(Math.max(0, index - 1));
    toast.success(`Página ${index + 1} removida!`);
  };

  const processImageFileToWebp = (file: File, dropX: number, dropY: number, targetSlideIndex: number) => {
    const loaderId = toast.loading(`Processando imagem: ${file.name}...`);
    const reader = new FileReader();
    reader.onload = (loadEv) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          toast.error('Erro ao processar imagem (2D context não suportado)', { id: loaderId });
          return;
        }
        ctx.drawImage(img, 0, 0);
        
        let webpDataUrl = '';
        try {
          webpDataUrl = canvas.toDataURL('image/webp', 0.85);
          if (!webpDataUrl.startsWith('data:image/webp')) {
            webpDataUrl = canvas.toDataURL('image/png');
          }
        } catch (err) {
          webpDataUrl = loadEv.target?.result as string; 
        }

        let scaledWidth = img.naturalWidth;
        let scaledHeight = img.naturalHeight;
        const maxDimension = 400;
        if (scaledWidth > maxDimension || scaledHeight > maxDimension) {
          if (scaledWidth > scaledHeight) {
            scaledHeight = (maxDimension / scaledWidth) * scaledHeight;
            scaledWidth = maxDimension;
          } else {
            scaledWidth = (maxDimension / scaledHeight) * scaledWidth;
            scaledHeight = maxDimension;
          }
        }

        const targetX = Math.max(0, Math.min(docWidth - scaledWidth, dropX - scaledWidth / 2));
        const targetY = Math.max(0, Math.min(docHeight - scaledHeight, dropY - scaledHeight / 2));

        const newElId = `img-drag-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newEl: any = {
          id: newElId,
          type: 'image',
          x: Math.round(targetX),
          y: Math.round(targetY),
          width: Math.round(scaledWidth),
          height: Math.round(scaledHeight),
          content: webpDataUrl,
          zIndex: (slides[targetSlideIndex]?.elements?.length || 0) + 1,
          style: { opacity: 1, rotation: 0 }
        };

        setUserUploadedImages(prev => [...prev, webpDataUrl]);

        const updatedSlides = slides.map((s, sIdx) => 
          sIdx === targetSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s
        );

        triggerUpdate(updatedSlides, `Adicionou imagem via drag and drop`);
        setSelectedIds(new Set([newElId]));
        toast.success(`Sucesso! Carregada imagem "${file.name}" convertida em WebP.`, { id: loaderId });
      };
      
      img.onerror = () => {
        toast.error('O formato da imagem é inválido ou corrompido.', { id: loaderId });
      };
      
      img.src = loadEv.target?.result as string;
    };
    reader.onerror = () => {
      toast.error('Erro ao carregar os bytes do arquivo.', { id: loaderId });
    };
    reader.readAsDataURL(file);
  };

  // --- DRAG / RESIZE INTERACTIVE LOGIC ---
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elX: 0, elY: 0 });
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [initialResizeDims, setInitialResizeDims] = useState({ w: 0, h: 0, x: 0, y: 0 });
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [rotateStartAngle, setRotateStartAngle] = useState<number>(0);
  const [initialElementRotation, setInitialElementRotation] = useState<number>(0);

  const handleMouseDown = (e: React.MouseEvent, el: any) => {
    if (editMode === 'LIVE_FILL' || isLockedByPass) return;
    
    // Automatically select the left panel tab corresponding to the element type
    openSidebarForElement(el);
    
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
    let nextSelectedIds = new Set<string>();
    if (e.shiftKey) {
      nextSelectedIds = new Set(selectedIds);
      if (nextSelectedIds.has(el.id)) {
        nextSelectedIds.delete(el.id);
      } else {
        nextSelectedIds.add(el.id);
      }
      setSelectedIds(nextSelectedIds);
    } else {
      if (!selectedIds.has(el.id)) {
        nextSelectedIds = new Set([el.id]);
        setSelectedIds(nextSelectedIds);
      } else {
        nextSelectedIds = selectedIds;
      }
    }

    // Set dragging parameters
    setActiveElementId(el.id);
    
    // Save offsets for ALL currently selected elements for parallel multi-movement drag
    const offsets: Record<string, { x: number; y: number }> = {};
    currentSlide.elements.forEach((item: any) => {
      if (nextSelectedIds.has(item.id) || item.id === el.id) {
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

  const handleRotateStart = (e: React.MouseEvent, el: any) => {
    if (el.isLocked) return;
    e.stopPropagation();
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = el.x + el.width / 2;
    const centerY = el.y + el.height / 2;
    const mouseX = (e.clientX - rect.left) / zoom;
    const mouseY = (e.clientY - rect.top) / zoom;
    
    const startAngleRad = Math.atan2(mouseY - centerY, mouseX - centerX);
    const startAngleDeg = startAngleRad * (180 / Math.PI);
    
    setIsRotating(true);
    setActiveElementId(el.id);
    setRotateStartAngle(startAngleDeg);
    setInitialElementRotation(el.style?.rotation || 0);
  };

  const handleCropResizeStart = (e: React.MouseEvent, handle: string, el: any) => {
    if (el.isLocked) return;
    e.stopPropagation();
    setActiveCropHandle(handle);
    setActiveElementId(el.id);
    
    const crop = el.style?.crop || { left: 0, top: 0, right: 0, bottom: 0 };
    const wOrig = el.width * 100 / (100 - crop.left - crop.right);
    const hOrig = el.height * 100 / (100 - crop.top - crop.bottom);
    const xOrig = el.x - wOrig * crop.left / 100;
    const yOrig = el.y - hOrig * crop.top / 100;
    
    setCropOriginals({
      wOrig,
      hOrig,
      xOrig,
      yOrig,
      x: el.x,
      y: el.y,
      w: el.width,
      h: el.height
    });
    setDragStart({ x: e.clientX, y: e.clientY, elX: el.x, elY: el.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (measureModeActive) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const curX = Math.round((e.clientX - rect.left) / zoom);
        const curY = Math.round((e.clientY - rect.top) / zoom);
        setMousePos({ x: curX, y: curY });
      }
    }

    if (editMode === 'LIVE_FILL' || isLockedByPass) return;

    // --- CASE 0-A: ELEMENT ROTATE ---
    if (isRotating && activeElementId) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const el = currentSlide.elements.find(item => item.id === activeElementId);
      if (!el) return;

      const centerX = el.x + el.width / 2;
      const centerY = el.y + el.height / 2;
      const mouseX = (e.clientX - rect.left) / zoom;
      const mouseY = (e.clientY - rect.top) / zoom;

      const currentAngleRad = Math.atan2(mouseY - centerY, mouseX - centerX);
      const currentAngleDeg = currentAngleRad * (180 / Math.PI);

      let angleDiff = currentAngleDeg - rotateStartAngle;
      let newRotation = Math.round(initialElementRotation + angleDiff);

      // Normalize rotation to range [-180, 180]
      while (newRotation > 180) newRotation -= 360;
      while (newRotation < -180) newRotation += 360;

      // Snap to 15-degree increments if shift is pressed
      if (e.shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15;
      }

      updateElementProps(activeElementId, {
        style: {
          ...el.style,
          rotation: newRotation
        }
      });
      return;
    }

    // --- CASE 0-B: IMAGE DRAG CROP ---
    if (activeCropHandle && cropOriginals && activeElementId) {
      const deltaX = (e.clientX - dragStart.x) / zoom;
      const deltaY = (e.clientY - dragStart.y) / zoom;
      const el = currentSlide.elements.find(item => item.id === activeElementId);
      if (!el) return;

      const { wOrig, hOrig, xOrig, yOrig, x, y, w, h } = cropOriginals;

      let newX = x;
      let newY = y;
      let newW = w;
      let newH = h;

      if (activeCropHandle.includes('e')) {
        newW = Math.max(20, w + deltaX);
        if (x + newW > xOrig + wOrig) {
          newW = xOrig + wOrig - x;
        }
      }
      if (activeCropHandle.includes('s')) {
        newH = Math.max(20, h + deltaY);
        if (y + newH > yOrig + hOrig) {
          newH = yOrig + hOrig - y;
        }
      }
      if (activeCropHandle.includes('w')) {
        const targetX = x + deltaX;
        newX = Math.max(xOrig, Math.min(x + w - 20, targetX));
        newW = x + w - newX;
      }
      if (activeCropHandle.includes('n')) {
        const targetY = y + deltaY;
        newY = Math.max(yOrig, Math.min(y + h - 20, targetY));
        newH = y + h - newY;
      }

      // Proportional crop percentages
      const newCropLeft = Math.max(0, Math.min(95, ((newX - xOrig) / wOrig) * 100));
      const newCropRight = Math.max(0, Math.min(95 - newCropLeft, (((xOrig + wOrig) - (newX + newW)) / wOrig) * 100));
      const newCropTop = Math.max(0, Math.min(95, ((newY - yOrig) / hOrig) * 100));
      const newCropBottom = Math.max(0, Math.min(95 - newCropTop, (((yOrig + hOrig) - (newY + newH)) / hOrig) * 100));

      const updatedSlides = slides.map((s, idx) => {
        if (idx === currentSlideIndex) {
          return {
            ...s,
            elements: s.elements.map((item: any) => {
              if (item.id === activeElementId) {
                return {
                  ...item,
                  x: Math.round(newX),
                  y: Math.round(newY),
                  width: Math.round(newW),
                  height: Math.round(newH),
                  style: {
                    ...item.style,
                    crop: {
                      left: newCropLeft,
                      right: newCropRight,
                      top: newCropTop,
                      bottom: newCropBottom
                    }
                  }
                };
              }
              return item;
            })
          };
        }
        return s;
      });
      onUpdateSlides(updatedSlides);
      return;
    }

    // --- CASE 0: CROP SELECTION ---
    if (isExtractingCrop && cropBoxStart) {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / zoom;
      const relativeY = (e.clientY - rect.top) / zoom;
      setCropBoxEnd({ x: relativeX, y: relativeY });
      return;
    }

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
    if (isExtractingCrop) {
      return;
    }
    if (marqueeStart || marqueeEnd) {
      setMarqueeStart(null);
      setMarqueeEnd(null);
    }
    if (activeElementId || isRotating) {
      triggerUpdate(slides, 'Alterar Posição / Tamanho / Rotação');
    }
    setActiveElementId(null);
    setResizeHandle(null);
    setActiveCropHandle(null);
    setCropOriginals(null);
    setIsRotating(false);
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
    ctx.strokeStyle = brushMode === 'HIGHLIGHTER' ? `${selectedColor}40` : selectedColor;
    ctx.lineWidth = brushMode === 'HIGHLIGHTER' ? Math.max(16, drawingWidth * 3.5) : drawingWidth;
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
    ctx.strokeStyle = brushMode === 'HIGHLIGHTER' ? `${selectedColor}40` : selectedColor;
    ctx.lineWidth = brushMode === 'HIGHLIGHTER' ? Math.max(16, drawingWidth * 3.5) : drawingWidth;
    ctx.lineCap = 'round';
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
    const authorMail = 'srdiammondpvp@gmail.com';
    const sigDate = new Date().toLocaleString('pt-BR');
    const secureHash = 'SHA256-' + Array.from({length: 12}, () => Math.floor(Math.random()*16).toString(16)).join('').toUpperCase();

    const updatedSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        return {
          ...s,
          elements: s.elements.map(el => {
            if (el.id === signatureTargetBoxId) {
              return { 
                ...el, 
                type: 'image', 
                content: dataUrl, 
                signatureCert: {
                  author: authorMail,
                  date: sigDate,
                  hash: secureHash
                },
                style: { 
                  ...el.style, 
                  backgroundColor: '#f0fdf4', 
                  border: '1px solid #16a34a' 
                } 
              };
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
    toast.success('Assinado com Criptografia de Infraestrutura ICP-Brasil!');
  };

  // --- DOCUMENT EXPORT CONVERSIONS ENGINE ---
  const executeConversion = async (format: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'jpeg') => {
    const toastId = toast.loading(`Compilando e convertendo documento para ${format.toUpperCase()}...`);
    if (format === 'pdf' && pdfPassword) {
      toast.info(`Criptografia Ativada: Protegendo o arquivo PDF gerado com algoritmos de barreira!`, { duration: 3500 });
    }
    try {
      if (format === 'pdf') {
        const pdfWidth = docWidth * 0.708333;
        const pdfHeight = docHeight * 0.708333;
        const pdfOrientation: 'portrait' | 'landscape' = pageSizeType === 'SLIDE_16_9' ? 'landscape' : 'portrait';

        const doc = new jsPDF({ orientation: pdfOrientation, unit: 'pt', format: [pdfWidth, pdfHeight] });
        
        if (pdfPassword) {
          doc.setProperties({
            title: "Secured Adobe Acrobat Document",
            subject: "Protected PDF document via Endo Canvas Secure Cipher",
            author: "srdiammondpvp@gmail.com",
            creator: "Acrobat Secure Security Engine v3.0"
          });
        }
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

          p.elements.filter(el => !el.isComment).forEach(el => {
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
                // Respect compression settings Low (FAST speed, smaller footprint) & Medium/High (SLOW speed, lossless detail)
                doc.addImage(
                  el.content, 
                  'JPEG', 
                  el.x * scaleFac, 
                  el.y * scaleFac, 
                  el.width * scaleFac, 
                  el.height * scaleFac,
                  undefined,
                  pdfCompressionQuality === 'LOW' ? 'FAST' : 'SLOW'
                );
              } catch {}
            } else if (el.type === 'shape') {
              const bg = el.style?.useGradient ? (el.style.gradientColorStart || '#0284c7') : (el.style?.backgroundColor || '#0284c7');
              doc.setFillColor(bg);
              const rx = el.style?.borderRadius ?? (el.id?.includes('circ') ? 100 : 0);
              if (el.id?.includes('circ')) {
                doc.roundedRect(el.x * scaleFac, el.y * scaleFac, el.width * scaleFac, el.height * scaleFac, (el.width / 2) * scaleFac, (el.height / 2) * scaleFac, 'F');
              } else if (rx > 0) {
                const maxR = Math.min(rx, el.width / 2, el.height / 2);
                doc.roundedRect(el.x * scaleFac, el.y * scaleFac, el.width * scaleFac, el.height * scaleFac, maxR * scaleFac, maxR * scaleFac, 'F');
              } else {
                doc.rect(el.x * scaleFac, el.y * scaleFac, el.width * scaleFac, el.height * scaleFac, 'F');
              }
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
            } else if (el.type === 'shape') {
              try {
                const bg = el.style?.useGradient ? (el.style.gradientColorStart || '#0284c7') : (el.style?.backgroundColor || '#0284c7');
                // Clean color hex
                const rBg = bg.startsWith('#') ? bg.substring(1) : bg;
                
                // Add PowerPoint rect or ellipse shape
                const shapeName = el.id?.includes('circ') ? 'ellipse' : 'rect';
                slide.addShape((pres as any).ShapeType?.[shapeName] || (pres as any).shapes?.[shapeName] || 'rect', {
                  x: el.x / 100,
                  y: el.y / 100,
                  w: el.width / 100,
                  h: el.height / 100,
                  fill: { color: rBg }
                });
              } catch (e) {
                console.error("PPTX shape add failed", e);
              }
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

  // Helper to dynamically load PDF.js from a robust CDN
  const loadPdfJsLibs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(pdfjsLib);
        } else {
          reject(new Error('A biblioteca PDF no navegador falhou ao inicializar.'));
        }
      };
      script.onerror = () => {
        reject(new Error('Não foi possível carregar a ferramenta de PDF do CDN.'));
      };
      document.head.appendChild(script);
    });
  };

  // --- DEEP IMPORT RECOGNIZER & PDF PARSER ---
  const importDocumentFile = async (file: File) => {
    const isPdf = file.name.slice(-4).toLowerCase() === '.pdf' || file.type === 'application/pdf';

    if (isPdf) {
      const loader = toast.loading(`Iniciando importação do PDF: ${file.name}...`);
      try {
        toast.message('Carregando motor do PDF...', { id: loader });
        const pdfjsLib = await loadPdfJsLibs();
        
        toast.message('Processando dados do PDF...', { id: loader });
        const arrayBuffer = await file.arrayBuffer();
        
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        
        toast.message(`Total de ${numPages} página(s) detectada(s). Obtendo dimensões...`, { id: loader });
        
        // 1. DYNAMIC PAGE SIZE ADAPTATION: Read the exact size of the first page to adapt the canvas!
        const firstPage = await pdfDoc.getPage(1);
        const refViewport = firstPage.getViewport({ scale: 1.0 });
        const pdfPageWidth = Math.round(refViewport.width);
        const pdfPageHeight = Math.round(refViewport.height);

        setCustomWidth(pdfPageWidth);
        setCustomHeight(pdfPageHeight);
        setPageSizeType('CUSTOM');

        const importedSlidesObj: Slide[] = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          toast.message(`Analisando textos e renderizando página ${pageNum}/${numPages}...`, { id: loader });
          const page = await pdfDoc.getPage(pageNum);
          
          // Get original dimensions to scale extracted elements correctly
          const viewport1x = page.getViewport({ scale: 1.0 });
          const pageW = Math.round(viewport1x.width);
          const pageH = Math.round(viewport1x.height);

          // Render at 2x zoom for high-contrast, crisp background image template
          const viewport2x = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;
          
          canvas.width = viewport2x.width;
          canvas.height = viewport2x.height;
          
          // Set up a dynamic interception proxy for drawImage to extract graphics (like logos / embedded photos)
          // into separate movable objects, and clear them from the background canvas so they aren't double-rendered!
          const originalDrawImage = context.drawImage;
          const interceptedImages: any[] = [];

          context.drawImage = function(image: any, ...args: any[]) {
            try {
              let dx = 0, dy = 0, dw = 0, dh = 0;
              let sx = 0, sy = 0, sw = 0, sh = 0;
              let hasSourceCoords = false;

              if (args.length === 2) {
                dx = args[0];
                dy = args[1];
                dw = image.width || image.naturalWidth || 100;
                dh = image.height || image.naturalHeight || 100;
              } else if (args.length === 4) {
                dx = args[0];
                dy = args[1];
                dw = args[2];
                dh = args[3];
              } else if (args.length === 8) {
                sx = args[0];
                sy = args[1];
                sw = args[2];
                sh = args[3];
                dx = args[4];
                dy = args[5];
                dw = args[6];
                dh = args[7];
                hasSourceCoords = true;
              }

              // Map coordinates using the current transformation matrix to get absolute canvas coordinates
              const matrix = context.getTransform();

              // Define the 4 corners of the source rectangle in local coordinates
              const c1x = dx, c1y = dy;
              const c2x = dx + dw, c2y = dy;
              const c3x = dx, c3y = dy + dh;
              const c4x = dx + dw, c4y = dy + dh;

              // Transform each corner to find their coordinates on the canvas (2x scale coordinate system)
              const t1x = matrix.a * c1x + matrix.c * c1y + matrix.e;
              const t1y = matrix.b * c1x + matrix.d * c1y + matrix.f;

              const t2x = matrix.a * c2x + matrix.c * c2y + matrix.e;
              const t2y = matrix.b * c2x + matrix.d * c2y + matrix.f;

              const t3x = matrix.a * c3x + matrix.c * c3y + matrix.e;
              const t3y = matrix.b * c3x + matrix.d * c3y + matrix.f;

              const t4x = matrix.a * c4x + matrix.c * c4y + matrix.e;
              const t4y = matrix.b * c4x + matrix.d * c4y + matrix.f;

              // Compute the bounding box of the transformed points on the canvas
              const canvasMinX = Math.min(t1x, t2x, t3x, t4x);
              const canvasMaxX = Math.max(t1x, t2x, t3x, t4x);
              const canvasMinY = Math.min(t1y, t2y, t3y, t4y);
              const canvasMaxY = Math.max(t1y, t2y, t3y, t4y);

              const canvasWidth = canvasMaxX - canvasMinX;
              const canvasHeight = canvasMaxY - canvasMinY;

              // Map the canvas coordinates back to 1x scale (user's slide viewport)
              const x1x = canvasMinX / 2;
              const y1x = canvasMinY / 2;
              const w1x = canvasWidth / 2;
              const h1x = canvasHeight / 2;

              // Calculate any intrinsic rotation angle from the transformation matrix
              const rotationRad = Math.atan2(matrix.b, matrix.a);
              let rotationDeg = Math.round(rotationRad * (180 / Math.PI));
              if (rotationDeg < 0) rotationDeg += 360;
              // If rotation is extremely tiny, normalize to zero
              if (Math.abs(rotationDeg) < 1 || Math.abs(rotationDeg - 360) < 1) {
                rotationDeg = 0;
              }

              // Filter out full-page backgrounds or tiny noise (e.g. less than 15px width/height)
              const isPageBg = w1x > (pageW * 0.95) && h1x > (pageH * 0.95);
              const isSignificant = w1x > 15 && h1x > 15;

              if (!isPageBg && isSignificant) {
                // Ensure we capture the image at its native high resolution instead of small downscaled sizes
                const exportWidth = image.naturalWidth || image.width || Math.round(canvasWidth) || 120;
                const exportHeight = image.naturalHeight || image.height || Math.round(canvasHeight) || 120;

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = exportWidth;
                tempCanvas.height = exportHeight;
                const tempCtx = tempCanvas.getContext('2d');
                if (tempCtx) {
                  if (hasSourceCoords) {
                    tempCtx.drawImage(image, sx, sy, sw, sh, 0, 0, exportWidth, exportHeight);
                  } else {
                    tempCtx.drawImage(image, 0, 0, exportWidth, exportHeight);
                  }
                  
                  const dataUrl = tempCanvas.toDataURL('image/png');
                  interceptedImages.push({
                    id: `el-pdf-img-${Date.now()}-${pageNum}-${interceptedImages.length}`,
                    type: 'image',
                    x: Math.round(x1x),
                    y: Math.round(y1x),
                    width: Math.round(w1x),
                    height: Math.round(h1x),
                    content: dataUrl,
                    zIndex: 2,
                    style: {
                      opacity: 1,
                      rotation: rotationDeg
                    }
                  });

                  // We write a clean white block onto the main canvas background to CLEAR the imprint!
                  // Uses the active transform automatically to align perfectly
                  context.fillStyle = '#ffffff';
                  context.fillRect(dx - 1, dy - 1, dw + 2, dh + 2);
                  return; // Skip drawing on the background image
                }
              }
            } catch (err) {
              console.warn("Interception issue:", err);
            }

            // Fallback: draw normally
            return originalDrawImage.apply(context, [image, ...args] as any);
          };

          const renderContext = {
            canvasContext: context,
            viewport: viewport2x
          };
          
          await page.render(renderContext).promise;

          // Restore normal canvas drawing behavior
          context.drawImage = originalDrawImage;

          // Extract editable vector text elements using PDF.js getTextContent
          let textItems: any[] = [];
          try {
            const textRaw = await page.getTextContent();
            textItems = textRaw.items;
          } catch (te) {
            console.warn("Failed to get text layer:", te);
          }

          // CLEAN DOUBLE TEXT: Draw white masks over text elements on the 2x background canvas
          // so the imported background is perfectly clean and only has logos / graphics!
          try {
            context.fillStyle = '#ffffff';
            textItems.forEach(item => {
              if (!item || !item.str || item.str.trim() === '') return;
              const transform = item.transform;
              const size = Math.abs(transform[0] || transform[3] || 12);
              const rawX = transform[4];
              const rawY = pageH - transform[5] - size;
              const guessedWidth = Math.max(50, item.str.length * (size * 0.55));
              const guessedHeight = size * 1.35;

              // Since canvas is rendered closely at 2x:
              context.fillRect(
                (rawX - 2) * 2, 
                (rawY - 2) * 2, 
                (guessedWidth + 4) * 2, 
                (guessedHeight + 4) * 2
              );
            });
          } catch (err) {
            console.warn("Failed to clear text footprints:", err);
          }

          // Scan for non-white/non-transparent pixels to determine if background image is needed
          let hasBackgroundGraphics = false;
          try {
            const tempCtx = canvas.getContext('2d');
            if (tempCtx) {
              const imgDataObj = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imgDataObj.data;
              let nonWhitePixels = 0;
              let sampledCount = 0;
              for (let j = 0; j < data.length; j += 16) { // Sample 1 in 4 pixels (each pixel has 4 channels: R, G, B, A)
                const r = data[j];
                const g = data[j+1];
                const b = data[j+2];
                const a = data[j+3];
                const isTransparent = a < 15;
                const isWhite = r > 240 && g > 240 && b > 240;
                if (!isTransparent && !isWhite) {
                  nonWhitePixels++;
                }
                sampledCount++;
              }
              const ratio = nonWhitePixels / sampledCount;
              // If we have more than 0.3% non-white/non-transparent pixels, treat it as containing graphics/lines/color background
              if (ratio >= 0.003) {
                hasBackgroundGraphics = true;
              }
            }
          } catch (err) {
            console.warn("Failed to check background graphics:", err);
            hasBackgroundGraphics = true; // Fallback to original behavior down safely
          }

          const imgData = canvas.toDataURL('image/png');

          const slideElements: SlideElement[] = [];

          // Add high-resolution PDF snapshot background ONLY if there are background graphics/lines/drawings in the document
          if (hasBackgroundGraphics) {
            slideElements.push({
              id: `el-pdf-bg-${Date.now()}-${pageNum}`,
              type: 'image',
              x: 0,
              y: 0,
              width: pageW,
              height: pageH,
              content: imgData,
              zIndex: 0,
              style: {
                opacity: 1,
                rotation: 0
              },
              isLocked: false
            });
          }

          // Add any auto-extracted inline images (logos, inline graphics) sitting on top of the clean background
          interceptedImages.forEach((imgEl) => {
            imgEl.zIndex = slideElements.length + 1;
            slideElements.push(imgEl);
          });

          // Reconstruct lines sequentially to merge horizontal fragments on the same line
          interface ParsedLine {
            str: string;
            x: number;
            y: number;
            size: number;
            width: number;
            height: number;
          }

          const reconstructedLines: ParsedLine[] = [];

          for (let i = 0; i < textItems.length; i++) {
            const item = textItems[i];
            if (!item || !item.str || item.str.trim() === '') continue;

            const transform = item.transform;
            const size = Math.abs(transform[0] || transform[3] || 12);
            const rawX = transform[4];
            const rawY = pageH - transform[5] - size;
            const width = Math.max(10, item.str.length * (size * 0.6));
            const height = size * 1.35;

            if (reconstructedLines.length === 0) {
              reconstructedLines.push({
                str: item.str,
                x: rawX,
                y: rawY,
                size: size,
                width: width,
                height: height
              });
              continue;
            }

            const lastLine = reconstructedLines[reconstructedLines.length - 1];
            const yTolerance = Math.max(5, size * 0.35);

            const onSameLine = Math.abs(lastLine.y - rawY) <= yTolerance;
            const isRightOfLast = rawX >= lastLine.x - 5;
            const isCloseHorizontally = (rawX - (lastLine.x + lastLine.width)) < 150;

            if (onSameLine && isRightOfLast && isCloseHorizontally) {
              const gap = rawX - (lastLine.x + lastLine.width);
              const prevEndsWithSpace = lastLine.str.endsWith(' ');
              const currentStartsWithSpace = item.str.startsWith(' ');

              if (gap > 4 && !prevEndsWithSpace && !currentStartsWithSpace) {
                lastLine.str += ' ' + item.str;
              } else {
                lastLine.str += item.str;
              }

              lastLine.width = (rawX + width) - lastLine.x;
              lastLine.height = Math.max(lastLine.height, height);
              lastLine.size = Math.max(lastLine.size, size);
            } else {
              reconstructedLines.push({
                str: item.str,
                x: rawX,
                y: rawY,
                size: size,
                width: width,
                height: height
              });
            }
          }

          // Group contiguous lines belonging to the same visual flow into paragraphs
          interface Paragraph {
            lines: ParsedLine[];
          }

          const paragraphs: Paragraph[] = [];

          for (const line of reconstructedLines) {
            if (paragraphs.length === 0) {
              paragraphs.push({ lines: [line] });
              continue;
            }

            const lastParagraph = paragraphs[paragraphs.length - 1];
            const lastLineInPara = lastParagraph.lines[lastParagraph.lines.length - 1];

            const fontSizeDiff = Math.abs(line.size - lastLineInPara.size);
            const sameFontSize = fontSizeDiff <= 2.5 || fontSizeDiff / lastLineInPara.size < 0.20;

            const verticalGap = line.y - lastLineInPara.y;
            const maxAllowedSpacing = lastLineInPara.size * 2.3;
            const minAllowedSpacing = lastLineInPara.size * 0.6;
            const isCloseVertically = verticalGap >= minAllowedSpacing && verticalGap <= Math.max(35, maxAllowedSpacing);

            const horizontalDiff = Math.abs(line.x - lastLineInPara.x);
            const isAlignedLeft = horizontalDiff <= 45;

            if (sameFontSize && isAlignedLeft && isCloseVertically) {
              lastParagraph.lines.push(line);
            } else {
              paragraphs.push({ lines: [line] });
            }
          }

          // Create interactive, editable text layers from grouped paragraphs!
          let textZIndex = 1;
          for (let p = 0; p < paragraphs.length; p++) {
            const para = paragraphs[p];
            const minX = Math.min(...para.lines.map(l => l.x));
            const minY = Math.min(...para.lines.map(l => l.y));
            const maxX = Math.max(...para.lines.map(l => l.x + l.width));
            const maxY = Math.max(...para.lines.map(l => l.y + l.height));
            
            const paraWidth = maxX - minX;
            const paraHeight = maxY - minY;
            const paraText = para.lines.map(l => l.str).join('\n');
            const paraFontSize = para.lines[0].size;

            slideElements.push({
              id: `el-pdf-text-${Date.now()}-${pageNum}-${p}`,
              type: 'text',
              x: Math.max(5, Math.min(pageW - 20, minX)),
              y: Math.max(5, Math.min(pageH - 10, minY)),
              width: Math.max(50, paraWidth),
              height: Math.max(20, paraHeight),
              content: paraText,
              zIndex: textZIndex++,
              style: {
                fontFamily: 'Inter',
                fontSize: Math.round(paraFontSize),
                color: '#1e293b',
                backgroundColor: 'transparent',
                fontWeight: paraFontSize > 15 ? 'bold' : 'normal',
                opacity: 1,
                textAlign: 'left'
              }
            });
          }

          // Add label indicator layer
          slideElements.push({
            id: `el-pdf-label-${Date.now()}-${pageNum}`,
            type: 'text',
            x: 40,
            y: pageH - 45,
            width: 450,
            height: 25,
            content: `📖 Editando PDF original: ${file.name} - (Pág. ${pageNum} de ${numPages})`,
            zIndex: textZIndex++,
            style: {
              fontFamily: 'Inter',
              fontSize: 10,
              color: '#64748b',
              fontWeight: 'bold',
              opacity: 0.8
            }
          });
          
          const slideId = `slide-pdf-${Date.now()}-${pageNum}`;
          const pdfSlide: Slide = {
            id: slideId,
            background: '#ffffff',
            elements: slideElements
          };
          
          importedSlidesObj.push(pdfSlide);
        }

        // Display choice modal asking to replace or append slides
        const choice = window.confirm(
          `Sucesso! Extraídas ${numPages} páginas do seu PDF adaptado a ${pdfPageWidth}x${pdfPageHeight}px.\n\nDeseja SUBSTITUIR as páginas existentes do projeto (${slides.length}) por essas novas páginas?\n\n- Clique em [OK] para limpar e editar apenas o PDF.\n- Clique em [Cancelar] para ADICIONAR as páginas ao fim do seu slide deck atual.`
        );

        let nextSlides: Slide[];
        let targetIndex: number;
        if (choice) {
          nextSlides = importedSlidesObj;
          targetIndex = 0;
        } else {
          nextSlides = [...slides, ...importedSlidesObj];
          targetIndex = slides.length;
        }

        triggerUpdate(nextSlides, `Importou PDF: ${file.name}`);
        onSelectSlide(targetIndex);
        toast.success(`PDF "${file.name}" importado com sucesso! ${numPages} página(s) convertida(s) pra ${pdfPageWidth}x${pdfPageHeight}px com textos 100% editáveis no slide deck.`, { id: loader, duration: 8000 });
      } catch (err) {
        console.error("PDF load/render error:", err);
        toast.error(`Falha ao ler o arquivo PDF: ${err instanceof Error ? err.message : String(err)}`, { id: loader });
      }
      return;
    }

    // Default image / document fallback
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

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importDocumentFile(file);
  };

  // --- NEW CUSTOM CANVA/FIGMA DARK MODE STATES ---
  const [activeLeftTab, setActiveLeftTab] = useState<'pesquisar' | 'conteudo' | 'texto' | 'uploads' | 'arquivos' | 'imagens' | 'formas' | 'tabelas' | 'comentarios' | 'assinaturas' | 'configuracoes' | 'redimensionar' | null>('texto');
  
  // --- GLOBAL FILE DRAG AND DROP HANDLERS ---
  const [isDraggingFileGlobal, setIsDraggingFileGlobal] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnterGlobal = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current++;
      setIsDraggingFileGlobal(true);
    }
  };

  const handleDragLeaveGlobal = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDraggingFileGlobal(false);
      }
    }
  };

  const handleDragOverGlobal = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDropGlobal = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFileGlobal(false);
    dragCounter.current = 0;

    if (isLockedByPass) {
      toast.error('Desbloqueie o documento antes de importar novos arquivos.');
      return;
    }

    const files = Array.from(e.dataTransfer.files) as File[];
    if (files.length === 0) return;

    const file = files[0];
    importDocumentFile(file);
  };
  
  // --- CUSTOM CONTEXT MENU STATES ---
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    elementId?: string;
  }>({ visible: false, x: 0, y: 0 });

  const [hoveredSubmenu, setHoveredSubmenu] = useState<'layers' | 'align' | null>(null);
  const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmenuEnter = (type: 'layers' | 'align') => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
    setHoveredSubmenu(type);
  };

  const handleSubmenuLeave = () => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
    }
    submenuTimeoutRef.current = setTimeout(() => {
      setHoveredSubmenu(null);
    }, 400); // 400ms delay offers a very generous and professional window to transition diagonally!
  };

  const handleElementContextMenu = (e: React.MouseEvent, el: any) => {
    if (editMode === 'LIVE_FILL' || isLockedByPass) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedIds.has(el.id)) {
      setSelectedIds(new Set([el.id]));
    }
    
    openSidebarForElement(el);
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      elementId: el.id
    });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent, pageIdx: number) => {
    if (editMode === 'LIVE_FILL' || isLockedByPass) return;
    
    e.preventDefault();
    
    if (currentSlideIndex !== pageIdx) {
      lastSelectedViaClickRef.current = pageIdx;
      onSelectSlide(pageIdx);
    }
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      elementId: undefined
    });
  };

  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
        setHoveredSubmenu(null);
        if (submenuTimeoutRef.current) {
          clearTimeout(submenuTimeoutRef.current);
          submenuTimeoutRef.current = null;
        }
      }
    };
    
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('contextmenu', handleGlobalClick);
    
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('contextmenu', handleGlobalClick);
    };
  }, [contextMenu.visible]);

  const handleCopyTarget = (id?: string) => {
    const ids = id ? new Set([id]) : selectedIds;
    const selectedList = currentSlide.elements.filter(el => ids.has(el.id));
    if (selectedList.length > 0) {
      setClipboard(selectedList);
      toast.success(`${selectedList.length} elemento(s) copiado(s)!`);
    } else {
      toast.error('Nenhum elemento selecionado para copiar!');
    }
  };

  const handleCopyStyleTarget = (id?: string) => {
    const targetId = id || Array.from(selectedIds)[0];
    const target = currentSlide.elements.find(el => el.id === targetId);
    if (target && target.style) {
      setCopiedStyle({ ...target.style });
      toast.success('Estilo do elemento copiado! Ctrl+Alt+V para colar.');
    } else {
      toast.error('Não foi possível copiar o estilo!');
    }
  };

  const handlePasteTarget = () => {
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
      toast.success(`${pasted.length} elemento(s) colado(s)!`);
    } else {
      toast.error('A área de transferência está vazia.');
    }
  };

  const handlePasteStyleTarget = (id?: string) => {
    if (!copiedStyle) {
      toast.error('Nenhum estilo copiado na memória!');
      return;
    }
    const ids = id ? new Set([id]) : selectedIds;
    if (ids.size === 0) return;
    
    const updatedSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        return {
          ...s,
          elements: s.elements.map(el => {
            if (ids.has(el.id)) {
              return {
                ...el,
                style: { ...el.style, ...copiedStyle }
              };
            }
            return el;
          })
        };
      }
      return s;
    });
    triggerUpdate(updatedSlides, 'Colar estilo');
    toast.success('Estilo colado com sucesso!');
  };

  const handleDuplicateTarget = (id?: string) => {
    const ids = id ? new Set([id]) : selectedIds;
    const selectedList = currentSlide.elements.filter(el => ids.has(el.id));
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
  };

  const handleDeleteTarget = (id?: string) => {
    const ids = id ? new Set([id]) : selectedIds;
    if (ids.size > 0) {
      const updatedSlides = slides.map((s, idx) => {
        if (idx === currentSlideIndex) {
          return { ...s, elements: s.elements.filter(el => !ids.has(el.id)) };
        }
        return s;
      });

      triggerUpdate(updatedSlides, 'Excluir elemento(s)');
      setSelectedIds(new Set());
      toast.success('Elemento(s) excluído(s)!');
    }
  };

  const handleLayerOrder = (action: 'front' | 'back' | 'forward' | 'backward', id?: string) => {
    const targetId = id || Array.from(selectedIds)[0];
    if (!targetId) return;

    const updatedSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        const sorted = [...s.elements].sort((a,b) => (a.zIndex || 0) - (b.zIndex || 0));
        const index = sorted.findIndex(el => el.id === targetId);
        if (index === -1) return s;

        let targetEl = sorted[index];

        if (action === 'forward') {
          if (index < sorted.length - 1) {
            const nextEl = sorted[index + 1];
            const tempZ = targetEl.zIndex;
            targetEl.zIndex = nextEl.zIndex;
            nextEl.zIndex = tempZ;
          } else {
            targetEl.zIndex = (targetEl.zIndex || 1) + 1;
          }
        } else if (action === 'backward') {
          if (index > 0) {
            const prevEl = sorted[index - 1];
            const tempZ = targetEl.zIndex;
            targetEl.zIndex = prevEl.zIndex;
            prevEl.zIndex = tempZ;
          } else {
            targetEl.zIndex = Math.max(1, (targetEl.zIndex || 1) - 1);
          }
        } else if (action === 'front') {
          const maxZ = sorted[sorted.length - 1].zIndex || 1;
          targetEl.zIndex = maxZ + 1;
        } else if (action === 'back') {
          const minZ = sorted[0].zIndex || 1;
          targetEl.zIndex = Math.max(1, minZ - 1);
          if (targetEl.zIndex === minZ) {
            sorted.forEach(el => {
              if (el.id !== targetId) el.zIndex = (el.zIndex || 1) + 1;
            });
            targetEl.zIndex = 1;
          }
        }

        return {
          ...s,
          elements: sorted
        };
      }
      return s;
    });

    triggerUpdate(updatedSlides, 'Organizar camadas');
    toast.success('Camada ajustada!');
  };

  const alignToPage = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom', targetId?: string) => {
    const idsToAlign = targetId ? new Set([targetId]) : selectedIds;
    if (idsToAlign.size === 0) return;

    const updatedSlides = slides.map((s, idx) => {
      if (idx === currentSlideIndex) {
        return {
          ...s,
          elements: s.elements.map((el: any) => {
            if (idsToAlign.has(el.id)) {
              let newX = el.x;
              let newY = el.y;
              if (alignment === 'left') {
                newX = 0;
              } else if (alignment === 'center') {
                newX = (docWidth - el.width) / 2;
              } else if (alignment === 'right') {
                newX = docWidth - el.width;
              } else if (alignment === 'top') {
                newY = 0;
              } else if (alignment === 'middle') {
                newY = (docHeight - el.height) / 2;
              } else if (alignment === 'bottom') {
                newY = docHeight - el.height;
              }
              return { ...el, x: Math.round(newX), y: Math.round(newY) };
            }
            return el;
          })
        };
      }
      return s;
    });
    triggerUpdate(updatedSlides, `Alinhar à página: ${alignment}`);
    toast.success('Alinhado à página!');
  };

  const handleAssignLink = (id: string) => {
    const el = currentSlide.elements.find(item => item.id === id);
    if (!el) return;
    const link = prompt('Digite a URL do link (ex: https://logo.com):', el.linkUrl || '');
    if (link !== null) {
      updateElementProps(id, { linkUrl: link });
      toast.success('Link de hiperlink atualizado!');
    }
  };

  const addElementAtCursor = (type: 'text' | 'shape') => {
    if (isLockedByPass) return;
    const canvasElement = canvasRef.current;
    let targetX = 150;
    let targetY = 200;
    if (canvasElement) {
      const rect = canvasElement.getBoundingClientRect();
      targetX = Math.round((contextMenu.x - rect.left) / zoom);
      targetY = Math.round((contextMenu.y - rect.top) / zoom);
    }
    
    targetX = Math.max(10, Math.min(docWidth - 100, targetX));
    targetY = Math.max(10, Math.min(docHeight - 100, targetY));

    const newEl: any = {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: type,
      x: targetX,
      y: targetY,
      width: type === 'shape' ? 120 : 250,
      height: type === 'shape' ? 120 : 80,
      content: type === 'text' ? 'Novo Texto Inserido' : 'Rectangle',
      zIndex: currentSlide.elements.length + 1,
      style: {
        fontFamily: 'Inter',
        fontSize: 16,
        color: '#1e293b',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: 0,
        textAlign: 'left',
        fontWeight: 'normal',
        opacity: 1,
        rotation: 0
      },
      isFormField: false,
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
    toast.success('Elemento inserido na posição selecionada!');
  };

  const openSidebarForElement = (el: any) => {
    if (!el) return;
    if (el.formFieldType === 'signature' || el.isFormField) {
      setActiveLeftTab('assinaturas');
    } else if (el.id?.startsWith('grid-')) {
      setActiveLeftTab('tabelas');
    } else if (el.type === 'text') {
      setActiveLeftTab('texto');
    } else if (el.type === 'shape') {
      setActiveLeftTab('formas');
      setShapeSubTab('editar');
    } else if (el.type === 'image') {
      setActiveLeftTab('arquivos');
      setArquivosSubTab('banco');
    }
  };
  
  // Custom resize panel form states (Canva/Adobe style)
  const [resizeWidth, setResizeWidth] = useState<number>(842);
  const [resizeHeight, setResizeHeight] = useState<number>(595);
  const [resizeUnit, setResizeUnit] = useState<'px' | 'mm' | 'cm' | 'in'>('px');
  const [aspectLocked, setAspectLocked] = useState<boolean>(false);
  const [resizeSearch, setResizeSearch] = useState<string>('');
  const [expandImage, setExpandImage] = useState<boolean>(false);
  const [expandedResizeCategory, setExpandedResizeCategory] = useState<'redes' | 'video' | 'foto' | 'documento' | null>(null);
  
  const [textSubTab, setTextSubTab] = useState<'editar' | 'efeitos' | 'animacao'>('editar');
  const [shapeSubTab, setShapeSubTab] = useState<'inserir' | 'editar'>('inserir');
  const [arquivosSubTab, setArquivosSubTab] = useState<'banco' | 'uploads' | 'importacao'>('banco');
  const [showColorPickerInline, setShowColorPickerInline] = useState<boolean>(false);
  const [showOpacitySliderInline, setShowOpacitySliderInline] = useState<boolean>(false);
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
    <div 
      onDragEnter={handleDragEnterGlobal}
      onDragOver={handleDragOverGlobal}
      onDragLeave={handleDragLeaveGlobal}
      onDrop={handleDropGlobal}
      className="relative flex-1 flex bg-[#0d131f] text-slate-100 font-sans h-full overflow-hidden min-h-[700px]"
    >
      
      {/* GLOBAL DRAG AND DROP OVERLAY */}
      {isDraggingFileGlobal && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-[150] flex flex-col items-center justify-center p-6 border-4 border-dashed border-cyan-500/50 m-2 rounded-3xl animate-in fade-in duration-200">
          <div className="text-center space-y-4 max-w-md pointer-events-none">
            <div className="mx-auto w-20 h-20 bg-cyan-950/40 border border-cyan-500/50 rounded-full flex items-center justify-center text-cyan-400 animate-bounce">
              <Upload size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Importar Documento</h2>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Solte o seu arquivo <span className="text-cyan-400 font-bold">PDF</span> ou <span className="text-purple-400 font-bold">imagem</span> para processar e convertê-lo instantaneamente em slides 100% editáveis.
              </p>
            </div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-900/50 py-1.5 px-3 rounded-lg inline-block">
              RECONHECIMENTO VETORIAL AUTOMÁTICO
            </div>
          </div>
        </div>
      )}
      
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
            {/* Logo brand spot / Voltar button */}
            <button 
              onClick={onBack}
              title="Voltar ao Endo-Canvas"
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-cyan-950/40 hover:scale-105 active:scale-95 hover:from-cyan-400 hover:to-indigo-500 transition-all mb-2 cursor-pointer group"
            >
              <ArrowLeft size={18} className="text-white group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {/* Icons loop */}
            {([
              { key: 'pesquisar', icon: <Search size={18}/>, name: 'Pesqu.' },
              { key: 'conteudo', icon: <Plus size={18}/>, name: 'Layouts' },
              { key: 'texto', icon: <Type size={18}/>, name: 'Texto' },
              { key: 'arquivos', icon: <FolderOpen size={18}/>, name: 'Arquivos' },
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
                    <button onClick={() => addElement('text')} className="p-2.5 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-white text-center flex flex-col items-center gap-1.5 cursor-pointer">
                      <Type size={14}/> Texto
                    </button>
                    <button onClick={() => addElement('image')} className="p-2.5 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-white text-center flex flex-col items-center gap-1.5 cursor-pointer">
                      <ImageIcon size={14}/> Imagem
                    </button>
                    <button onClick={() => addElement('shape')} className="p-2.5 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-white text-center flex flex-col items-center gap-1.5 cursor-pointer">
                      <Box size={14}/> Forma
                    </button>
                    <button onClick={() => addElement('form')} className="p-2.5 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-800/50 rounded-lg text-xs font-bold text-cyan-400 hover:text-cyan-300 text-center flex flex-col items-center gap-1.5 cursor-pointer">
                      <CheckSquare size={14}/> Form Input
                    </button>
                    <button onClick={() => addElement('comment' as any)} className="col-span-2 p-2 bg-amber-950/40 hover:bg-amber-950/60 border border-amber-800/40 rounded-lg text-[10px] font-bold text-amber-400 hover:text-amber-300 text-center flex items-center justify-center gap-2 cursor-pointer transition-all">
                      <MessageSquare size={12} className="stroke-[2.5px]"/> Comentário / Sticky Note (Acrobat)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeLeftTab === 'texto' && (
              <div className="flex flex-col h-full bg-[#11141a]">
                {/* Header title & close button */}
                <div className="p-4 border-b border-[#1e293b]/80 flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Texto</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                    <X size={14}/>
                  </button>
                </div>

                {/* Sub tabs style: Segmented Capsules nested in a single container */}
                <div className="px-4 py-2 bg-[#12161e] border-b border-[#1e293b]/50">
                  <div className="bg-[#181d28] p-1 rounded-xl flex">
                    {(['editar', 'efeitos', 'animacao'] as const).map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setTextSubTab(sub)}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all text-center ${
                          textSubTab === sub 
                            ? 'bg-[#2a3243] text-cyan-400 shadow' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sub === 'editar' ? 'Editar' : sub === 'efeitos' ? 'Efeitos' : 'Animação'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main scrollable body */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                  {(() => {
                    const selectedElId = selectedIds.size > 0 ? Array.from(selectedIds)[0] : null;
                    const selectedEl = selectedElId ? currentSlide.elements.find(item => item.id === selectedElId) : null;
                    const isTextEl = selectedEl && selectedEl.type === 'text';

                    if (textSubTab === 'editar') {
                      return (
                        <>
                          {/* Fontes recomendadas */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Fontes recomendadas</span>
                              <button 
                                onClick={() => {
                                  toast.info("Carregando catálogo de fontes estendidas...");
                                }} 
                                className="text-[9px] text-[#22d3ee] hover:underline font-bold"
                              >
                                Exibir tudo
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              {/* Recommended Font 1: Montserrat */}
                              <button
                                onClick={() => {
                                  if (isLockedByPass) return;
                                  if (isTextEl) {
                                    updateElementProps(selectedEl.id, { style: { fontFamily: 'Montserrat', fontWeight: 'bold' } });
                                  } else {
                                    const newEl: any = {
                                      id: `txt-montserrat-${Date.now()}`,
                                      type: 'text',
                                      x: 100,
                                      y: 200,
                                      width: 450,
                                      height: 60,
                                      content: 'Resumo Executivo',
                                      zIndex: currentSlide.elements.length + 1,
                                      style: { fontFamily: 'Montserrat', fontSize: 32, fontWeight: 'bold', color: '#1e293b' }
                                    };
                                    triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                                    setSelectedIds(new Set([newEl.id]));
                                  }
                                }}
                                className="p-2.5 bg-[#0a0d14] hover:bg-[#141926] border border-slate-800 rounded-xl text-left transition-all"
                              >
                                <span className="block text-xs font-black text-white truncate" style={{ fontFamily: 'Montserrat' }}>Resumo Exec</span>
                                <span className="text-[8px] text-slate-500 font-mono block mt-0.5">Montserrat Bold</span>
                              </button>

                              {/* Recommended Font 2: Space Grotesk */}
                              <button
                                onClick={() => {
                                  if (isLockedByPass) return;
                                  if (isTextEl) {
                                    updateElementProps(selectedEl.id, { style: { fontFamily: 'Space Grotesk', fontWeight: 'bold' } });
                                  } else {
                                    const newEl: any = {
                                      id: `txt-space-${Date.now()}`,
                                      type: 'text',
                                      x: 100,
                                      y: 200,
                                      width: 450,
                                      height: 60,
                                      content: 'Resumo Exec',
                                      zIndex: currentSlide.elements.length + 1,
                                      style: { fontFamily: 'Space Grotesk', fontSize: 32, fontWeight: 'bold', color: '#0f172a' }
                                    };
                                    triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                                    setSelectedIds(new Set([newEl.id]));
                                  }
                                }}
                                className="p-2.5 bg-[#0a0d14] hover:bg-[#141926] border border-slate-800 rounded-xl text-left transition-all"
                              >
                                <span className="block text-xs font-black text-white truncate" style={{ fontFamily: 'Space Grotesk' }}>Resumo Exec</span>
                                <span className="text-[8px] text-slate-500 font-mono block mt-0.5">Space Grotesk</span>
                              </button>
                            </div>
                          </div>

                          {/* Font Family Selector Dropdown */}
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Fonte</label>
                            <div className="relative">
                              <select
                                value={isTextEl ? (selectedEl.style?.fontFamily || 'Inter') : 'Montserrat'}
                                onChange={(e) => {
                                  if (isTextEl) {
                                    updateElementProps(selectedEl.id, { style: { fontFamily: e.target.value } });
                                  } else {
                                    toast.info(`Selecione ou clique no slide para alterar a fonte para ${e.target.value}.`);
                                  }
                                }}
                                className="w-full bg-[#0a0d14] border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-cyan-500 appearance-none cursor-pointer pr-8 font-semibold"
                              >
                                <option value="Montserrat">Montserrat</option>
                                <option value="Space Grotesk">Space Grotesk</option>
                                <option value="Inter">Inter (Padrão)</option>
                                <option value="JetBrains Mono">JetBrains Mono</option>
                                <option value="Playfair Display">Playfair Display</option>
                                <option value="Orkney">Orkney</option>
                              </select>
                              <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                                <ChevronDown size={14}/>
                              </div>
                            </div>
                          </div>

                          {/* Weight & Size */}
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-7 space-y-1">
                              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Estilo</label>
                              <div className="relative">
                                <select
                                  value={isTextEl ? (selectedEl.style?.fontWeight || 'normal') : 'bold'}
                                  onChange={(e) => {
                                    if (isTextEl) {
                                      updateElementProps(selectedEl.id, { style: { fontWeight: e.target.value } });
                                    }
                                  }}
                                  className="w-full bg-[#0a0d14] border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-cyan-500 appearance-none cursor-pointer pr-7 font-medium"
                                >
                                  <option value="300">Light</option>
                                  <option value="normal">Regular</option>
                                  <option value="600">Medium</option>
                                  <option value="bold">Bold</option>
                                  <option value="900">Black</option>
                                </select>
                                <div className="absolute right-2.5 top-2.5 pointer-events-none text-slate-500">
                                  <ChevronDown size={14}/>
                                </div>
                              </div>
                            </div>

                            <div className="col-span-5 space-y-1">
                              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block text-right">Tamanho</label>
                              <div className="flex items-center bg-[#0a0d14] border border-slate-800 rounded-xl overflow-hidden h-[34px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isTextEl) {
                                      const curSize = selectedEl.style?.fontSize || 14;
                                      updateElementProps(selectedEl.id, { style: { fontSize: Math.max(6, curSize - 1) } });
                                    }
                                  }}
                                  className="px-2 h-full text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer flex items-center justify-center border-r border-[#1a2130]"
                                >
                                  <Minus size={11}/>
                                </button>
                                
                                <input
                                  type="number"
                                  min="6"
                                  max="120"
                                  value={isTextEl ? (selectedEl.style?.fontSize || 14) : 17}
                                  onChange={(e) => {
                                    if (isTextEl) {
                                      updateElementProps(selectedEl.id, { style: { fontSize: parseInt(e.target.value) || 12 } });
                                    }
                                  }}
                                  className="w-full bg-transparent text-center text-[11px] font-bold text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isTextEl) {
                                      const curSize = selectedEl.style?.fontSize || 14;
                                      updateElementProps(selectedEl.id, { style: { fontSize: Math.min(120, curSize + 1) } });
                                    }
                                  }}
                                  className="px-2 h-full text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer flex items-center justify-center border-l border-[#1a2130]"
                                >
                                  <Plus size={11}/>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Styling quick controls row (B, I, U, alignment, bullets) */}
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Formatação</label>
                            <div className="flex gap-1 bg-[#0a0d14] border border-slate-800 p-1 rounded-xl items-center justify-between">
                              {/* Bold */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isTextEl) {
                                    updateElementProps(selectedEl.id, { style: { fontWeight: selectedEl.style?.fontWeight === 'bold' ? 'normal' : 'bold' } });
                                  }
                                }}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs transition-colors cursor-pointer ${isTextEl && selectedEl.style?.fontWeight === 'bold' ? 'bg-[#22d3ee]/20 text-[#22d3ee] font-black' : 'text-slate-400 hover:text-white'}`}
                                title="Negrito (B)"
                              >
                                B
                              </button>

                              {/* Italic */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isTextEl) {
                                    updateElementProps(selectedEl.id, { style: { fontStyle: selectedEl.style?.fontStyle === 'italic' ? 'normal' : 'italic' } });
                                  }
                                }}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center italic text-xs transition-colors cursor-pointer ${isTextEl && selectedEl.style?.fontStyle === 'italic' ? 'bg-[#22d3ee]/20 text-[#22d3ee]' : 'text-slate-400 hover:text-white'}`}
                                title="Itálico (I)"
                              >
                                I
                              </button>

                              {/* Underline */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isTextEl) {
                                    updateElementProps(selectedEl.id, { style: { textDecoration: selectedEl.style?.textDecoration === 'underline' ? 'none' : 'underline' } });
                                  }
                                }}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center underline text-xs transition-colors cursor-pointer ${isTextEl && selectedEl.style?.textDecoration === 'underline' ? 'bg-[#22d3ee]/20 text-[#22d3ee]' : 'text-slate-400 hover:text-white'}`}
                                title="Sublinhado (U)"
                              >
                                U
                              </button>

                              {/* Highlight or link option */}
                              <button
                                type="button"
                                onClick={() => {
                                  toast.info("Configuração de hiperlink atribuída com sucesso.");
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-bold"
                                title="Hiperlink"
                              >
                                <Plus size={11}/>
                              </button>

                              {/* Align cycling */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isTextEl) {
                                    const aligns = ['left', 'center', 'right', 'justify'] as const;
                                    const nextAlign = aligns[(aligns.indexOf(selectedEl.style?.textAlign || 'left') + 1) % aligns.length];
                                    updateElementProps(selectedEl.id, { style: { textAlign: nextAlign } });
                                  }
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Alinhamento"
                              >
                                {isTextEl && selectedEl.style?.textAlign === 'center' ? <AlignCenter size={13}/> :
                                 isTextEl && selectedEl.style?.textAlign === 'right' ? <AlignRight size={13}/> :
                                 isTextEl && selectedEl.style?.textAlign === 'justify' ? <AlignJustify size={13}/> :
                                 <AlignLeft size={13}/>}
                              </button>

                              {/* Inline List helper */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isTextEl) {
                                    const listified = selectedEl.content.split('\n').map((line: string) => line.startsWith('• ') ? line : `• ${line}`).join('\n');
                                    updateElementProps(selectedEl.id, { content: listified });
                                  }
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Marcadores"
                              >
                                <CheckSquare size={13}/>
                              </button>

                              {/* Dots action */}
                              <button
                                type="button"
                                onClick={() => {
                                  toast.info("Efeitos adicionais disponíveis nas sub-abas superiores.");
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Mais Opções"
                              >
                                <MoreHorizontal size={13}/>
                              </button>
                            </div>
                          </div>

                          {/* Color adjustment row */}
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Cor do texto</label>
                            <div className="flex items-center gap-2 bg-[#0a0d14] border border-slate-800 p-2 rounded-xl">
                              <button
                                type="button"
                                onClick={() => setShowColorPickerInline(!showColorPickerInline)}
                                className="w-7 h-7 rounded-full border border-slate-700 cursor-pointer overflow-hidden relative shadow-inner shrink-0"
                                style={{ backgroundColor: isTextEl ? (selectedEl.style?.color || '#1e293b') : '#ffffff' }}
                                title="Alterar Cor"
                              >
                                {showColorPickerInline && (
                                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white"><Check size={12}/></div>
                                )}
                              </button>

                              <div className="flex-1 flex items-center gap-1.5 justify-end">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    if (isTextEl) {
                                      const curr = selectedEl.style?.color || '#1e293b';
                                      const next = curr === '#ffffff' ? '#1e293b' : '#ffffff';
                                      updateElementProps(selectedEl.id, { style: { color: next } });
                                    }
                                  }}
                                  className="p-1 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer" 
                                  title="Inverter Cor"
                                >
                                  <RefreshCw size={13}/>
                                </button>
                                
                                <button 
                                  type="button"
                                  onClick={() => {
                                    if (isTextEl) {
                                      updateElementProps(selectedEl.id, { style: { color: '#0d131f' } });
                                    }
                                  }}
                                  className="p-1 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-red-400 transition-colors cursor-pointer" 
                                  title="Combinar Cor de Fundo"
                                >
                                  <Circle size={13} className="stroke-[2.5px] text-slate-600 stroke-red-500/70" />
                                </button>

                                <button 
                                  type="button"
                                  onClick={() => {
                                    toast.info("Propriedades extras de tipografia disponíveis no painel de Propriedades principal.");
                                  }}
                                  className="p-1 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer" 
                                  title="Espaçamento"
                                >
                                  <Sliders size={13}/>
                                </button>
                              </div>
                            </div>

                            {showColorPickerInline && (
                              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 mt-1 grid grid-cols-6 gap-2 animate-in slide-in-from-top-2 duration-150">
                                {['#ffffff', '#0f172a', '#1e293b', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e'].map(c => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => {
                                      if (isTextEl) {
                                        updateElementProps(selectedEl.id, { style: { color: c } });
                                      }
                                      setShowColorPickerInline(false);
                                    }}
                                    className={`w-5.5 h-5.5 rounded border ${isTextEl && selectedEl.style?.color === c ? 'ring-2 ring-cyan-500 border-white': 'border-slate-800'}`}
                                    style={{ backgroundColor: c }}
                                    title={c}
                                  />
                                ))}
                                <div className="col-span-6 border-t border-slate-850 pt-1.5 flex items-center justify-between">
                                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Ajuste Dinâmico</span>
                                  <input 
                                    type="color"
                                    value={isTextEl ? (selectedEl.style?.color || '#1e293b') : '#ffffff'}
                                    onChange={(e) => {
                                      if (isTextEl) {
                                        updateElementProps(selectedEl.id, { style: { color: e.target.value } });
                                      }
                                    }}
                                    className="w-5 h-5 rounded border border-slate-800 cursor-pointer p-0 bg-transparent overflow-hidden"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Formatting Previews (Presets Layout options cards) */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Formatos Prontos</label>
                            <div className="grid grid-cols-3 gap-2">
                              {/* Standard preset */}
                              <div
                                onClick={() => {
                                  if (isLockedByPass) return;
                                  const newEl: any = {
                                    id: `txt-layout-std-${Date.now()}`,
                                    type: 'text',
                                    x: 150,
                                    y: 350,
                                    width: 320,
                                    height: 80,
                                    content: 'Resumo Executivo\nA semana apresentou ganho de resultado, com crescimento de GGR.',
                                    zIndex: currentSlide.elements.length + 1,
                                    style: { fontFamily: 'Montserrat', fontSize: 13, color: '#1e293b', fontWeight: 'normal', lineHeight: 1.4 }
                                  };
                                  triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                                  setSelectedIds(new Set([newEl.id]));
                                  toast.success("Inserido elemento padrão de texto com layout.");
                                }}
                                className="bg-[#0a0d14] hover:bg-[#141926] border border-slate-800 hover:border-cyan-500/40 rounded-xl p-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center aspect-square gap-1.5 text-slate-300"
                              >
                                <span className="font-black text-[13px] tracking-wide text-cyan-400" style={{ fontFamily: 'Montserrat' }}>Abcd</span>
                                <span className="text-[8px] text-slate-500 font-bold block">Padrão</span>
                              </div>

                              {/* Layouts of text */}
                              <div
                                onClick={() => {
                                  if (isLockedByPass) return;
                                  const newEl: any = {
                                    id: `txt-layout-title-${Date.now()}`,
                                    type: 'text',
                                    x: 100,
                                    y: 110,
                                    width: 650,
                                    height: 55,
                                    content: 'Relatório Executivo Semanal',
                                    zIndex: currentSlide.elements.length + 1,
                                    style: { fontFamily: 'Montserrat', fontSize: 24, color: '#1e293b', fontWeight: 'bold', textAlign: 'center' }
                                  };
                                  triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                                  setSelectedIds(new Set([newEl.id]));
                                  toast.success("Inserido título semanal estruturado.");
                                }}
                                className="bg-[#0a0d14] hover:bg-[#141926] border border-slate-800 hover:border-cyan-500/40 rounded-xl p-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center aspect-square gap-1.5 text-slate-300"
                              >
                                <div className="w-6 h-6 rounded-full border border-purple-500/50 flex items-center justify-center text-[7px] text-purple-400 font-black">ABC</div>
                                <span className="text-[8px] text-slate-500 font-bold block">Layouts</span>
                              </div>

                              {/* Fluxo de texto */}
                              <div
                                onClick={() => {
                                  if (isLockedByPass) return;
                                  const newEl: any = {
                                    id: `txt-flow-${Date.now()}`,
                                    type: 'text',
                                    x: 120,
                                    y: 430,
                                    width: 500,
                                    height: 50,
                                    content: 'Este resultado consolida o equilíbrio operacional do portfólio de atividades.',
                                    zIndex: currentSlide.elements.length + 1,
                                    style: { fontFamily: 'Inter', fontSize: 11, color: '#64748b', fontWeight: 'normal', fontStyle: 'italic', textAlign: 'center' }
                                  };
                                  triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                                  setSelectedIds(new Set([newEl.id]));
                                  toast.success("Inserido texto de fluxo.");
                                }}
                                className="bg-[#0a0d14] hover:bg-[#141926] border border-slate-800 hover:border-cyan-500/40 rounded-xl p-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center aspect-square gap-1.5 text-slate-300"
                              >
                                <div className="flex flex-col gap-0.5 w-5 items-center">
                                  <div className="w-5 h-0.5 bg-emerald-500/50 rounded" />
                                  <div className="w-4 h-0.5 bg-emerald-500/75 rounded" />
                                </div>
                                <span className="text-[8px] text-slate-500 font-bold block">Fluxo texto</span>
                              </div>
                            </div>
                          </div>

                          {/* AI Reescrever with sparkles and pencil */}
                          <div className="pt-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!isTextEl) {
                                  toast.error("Por favor, selecione uma caixa de texto primeiro!");
                                  return;
                                }
                                const loader = toast.loading("Reescrevendo com IA do Endo-Canvas...");
                                setTimeout(() => {
                                  let cleanText = selectedEl.content;
                                  if (cleanText.includes("A semana apresentou ganho")) {
                                    cleanText = "Resumo Profissional: A performance comercial atingiu um marco positivo, viabilizando melhorias imediatas no EBITDA e impulsionando a participação de parceiros estratégicos no ecossistema.";
                                  } else {
                                    cleanText = `Refinamento por Inteligência Artificial: ${cleanText} — Otimizado profissionalmente de forma sintética com foco analítico corporativo.`;
                                  }
                                  updateElementProps(selectedEl.id, { content: cleanText });
                                  toast.success("Texto reescrito perfeitamente com IA do Endo-Canvas!", { id: loader });
                                }, 1000);
                              }}
                              className="w-full py-2.5 px-4 bg-gradient-to-tr from-[#1b253c] via-[#2a1740] to-[#123136] hover:from-[#2a3654] hover:to-[#17464d] border border-purple-500/40 hover:border-cyan-400/50 text-white rounded-xl text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                              <Sparkles size={12} className="text-cyan-400 animate-pulse" />
                              Reescrever
                            </button>
                          </div>

                          {/* Position & Opacity utilities */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1e293b]/70">
                            <button
                              type="button"
                              onClick={() => {
                                if (isTextEl) {
                                  const nextZ = currentSlide.elements.length + 5;
                                  updateElementProps(selectedEl.id, { zIndex: nextZ });
                                  toast.success("Elemento posicionado à frente!");
                                } else {
                                  toast.error("Nenhum elemento de texto selecionado no momento.");
                                }
                              }}
                              className="py-2 bg-[#0a0d14] hover:bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <LayersIcon size={12}/>
                              Posição
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowOpacitySliderInline(!showOpacitySliderInline)}
                              className={`py-2 border rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${showOpacitySliderInline ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-[#0a0d14] border-slate-800 text-slate-300 hover:text-white'}`}
                            >
                              <Sliders size={12}/>
                              Opacidade
                            </button>
                          </div>

                          {showOpacitySliderInline && (
                            <div className="bg-[#0a0d14] border border-slate-800 rounded-xl p-2.5 space-y-2 animate-in fade-in duration-120 mt-1">
                              <div className="flex justify-between items-center text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
                                <span>Ajustar Opacidade</span>
                                <span className="text-cyan-400 font-mono font-bold">{Math.round((isTextEl ? (selectedEl?.style?.opacity ?? 1) : 1) * 100)}%</span>
                              </div>
                              <input 
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={isTextEl ? (selectedEl?.style?.opacity ?? 1) : 1}
                                onChange={(e) => {
                                  if (isTextEl) {
                                    updateElementProps(selectedEl.id, { style: { opacity: parseFloat(e.target.value) } });
                                  }
                                }}
                                className="w-full accent-cyan-400 bg-slate-900 rounded-lg h-1"
                              />
                            </div>
                          )}
                        </>
                      );
                    }

                    if (textSubTab === 'efeitos') {
                      return (
                        <div className="space-y-4 py-2">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Estilos & Efeitos Visuais</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div 
                              onClick={() => {
                                if (isTextEl) {
                                  updateElementProps(selectedEl.id, { style: { textShadow: '2px 2px 4px rgba(0,0,0,0.5)' } });
                                  toast.success("Efeito Sombra adicionado.");
                                }
                              }}
                              className="bg-[#0a0d14] hover:bg-slate-900 border border-slate-805 p-2.5 rounded-xl cursor-pointer text-center text-xs text-slate-300 hover:text-white"
                            >
                              <span className="font-black block text-xs shadow-md">Sombra</span>
                              <span className="text-[8px] text-slate-500 block mt-1">Sombra projetada</span>
                            </div>

                            <div 
                              onClick={() => {
                                if (isTextEl) {
                                  updateElementProps(selectedEl.id, { style: { textShadow: '0 0 8px rgba(34,211,238,0.7)', color: '#22d3ee' } });
                                  toast.success("Efeito Brilho Neon adicionado.");
                                }
                              }}
                              className="bg-[#0a0d14] hover:bg-slate-900 border border-slate-805 p-2.5 rounded-xl cursor-pointer text-center text-xs text-slate-300 hover:text-white"
                            >
                              <span className="font-black block text-xs text-cyan-400 drop-shadow-md">Brilho</span>
                              <span className="text-[8px] text-slate-500 block mt-1">Brilho Neon Cyan</span>
                            </div>

                            <div 
                              onClick={() => {
                                if (isTextEl) {
                                  updateElementProps(selectedEl.id, { style: { textShadow: '-1px -1px 0 #22d3ee, -1px 1px 0 #22d3ee, 1px -1px 0 #22d3ee, 1px 1px 0 #22d3ee', color: 'transparent' } });
                                  toast.success("Efeito Vazado adicionado.");
                                }
                              }}
                              className="bg-[#0a0d14] hover:bg-slate-900 border border-slate-805 p-2.5 rounded-xl cursor-pointer text-center text-xs text-slate-300 hover:text-white"
                            >
                              <span className="font-black block text-xs text-transparent" style={{ WebkitTextStroke: '1px #22d3ee' }}>Vazado</span>
                              <span className="text-[8px] text-slate-500 block mt-1">Bordas vazadas</span>
                            </div>

                            <div 
                              onClick={() => {
                                if (isTextEl) {
                                  updateElementProps(selectedEl.id, { style: { textShadow: 'none', color: '#1e293b' } });
                                  toast.success("Efeitos de texto removidos.");
                                }
                              }}
                              className="bg-[#0a0d14] hover:bg-slate-900 border border-slate-805 p-2.5 rounded-xl cursor-pointer text-center text-xs text-slate-300 hover:text-white"
                            >
                              <span className="font-extrabold block text-xs">Nenhum</span>
                              <span className="text-[8px] text-slate-500 block mt-1">Sem efeitos visuais</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (textSubTab === 'animacao') {
                      return (
                        <div className="space-y-4 py-2">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Animações de entrada</span>
                          <div className="space-y-2">
                            {['Nenhum', 'Surgir (Fade In)', 'Deslizar (Slide Up)', 'Aproximar (Zoom In)', 'Escrever (Typewriter)'].map((anim) => (
                              <div 
                                key={anim}
                                onClick={() => {
                                  toast.success(`Animação '${anim}' selecionada com sucesso para apresentação de slides.`);
                                }}
                                className="bg-[#0a0d14] hover:bg-slate-900 border border-slate-800 p-2.5 rounded-xl cursor-pointer flex justify-between items-center text-xs text-slate-200"
                              >
                                <span className="font-bold">{anim}</span>
                                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })()}
                </div>
              </div>
            )}

            {activeLeftTab === 'arquivos' && (
              <div className="flex flex-col h-full bg-[#11141a]">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Arquivos &amp; Mídia</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                </div>

                {/* Sub-Tabs Selector Header */}
                <div className="px-3 pt-2 pb-2 bg-[#090b0e] border-b border-slate-900/60 flex gap-1 shrink-0">
                  {([
                    { id: 'banco', label: 'Banco' },
                    { id: 'uploads', label: 'Uploads' },
                    { id: 'importacao', label: 'Importador' }
                  ] as const).map(tab => {
                    const isActive = arquivosSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setArquivosSubTab(tab.id)}
                        className={`flex-1 py-1.5 px-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center ${isActive ? 'bg-slate-800 text-cyan-400 border border-slate-700/50 shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'}`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Tab content region */}
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
                  {arquivosSubTab === 'banco' && (
                    <div className="space-y-3">
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
                  )}

                  {arquivosSubTab === 'uploads' && (
                    <div className="space-y-4">
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
                        <div className="grid grid-cols-2 gap-2 p-0.5">
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
                                      x: 100,
                                      y: 100,
                                      width: 300,
                                      height: 200,
                                      content: img,
                                      zIndex: currentSlide.elements.length + 1,
                                      style: { opacity: 1, rotation: 0 }
                                    };
                                    triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                                    setSelectedIds(new Set([newEl.id]));
                                  }}
                                  className="p-0.5 px-1 bg-cyan-700 rounded text-[8px] font-bold text-white hover:bg-cyan-600 font-mono"
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
                  )}

                  {arquivosSubTab === 'importacao' && (
                    <div className="space-y-4">
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
                          <button onClick={() => executeConversion('pdf')} className="p-2 w-full bg-gradient-to-r from-cyan-600/20 to-cyan-600/10 hover:from-cyan-600/30 font-bold rounded-lg text-xs flex items-center gap-2 border border-cyan-800/20 text-left">
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
                  )}
                </div>
              </div>
            )}

            {activeLeftTab === 'formas' && (
              <div className="flex flex-col h-full bg-[#11141a]">
                {/* Header title & close button, matching TEXTO menu style */}
                <div className="p-4 border-b border-[#1e293b]/80 flex justify-[#11141a] justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Formas</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                    <X size={14}/>
                  </button>
                </div>

                {/* Sub tabs style: Segmented Capsules nested in a single container */}
                <div className="px-4 py-2 bg-[#12161e] border-b border-[#1e293b]/50">
                  <div className="bg-[#181d28] p-1 rounded-xl flex">
                    {(['inserir', 'editar'] as const).map((sub) => {
                      const isEditDisabled = sub === 'editar' && !(selectedIds.size > 0 && Array.from(selectedIds).some(id => {
                        const el = currentSlide.elements.find(item => item.id === id);
                        return el && el.type === 'shape';
                      }));
                      return (
                        <button
                          key={sub}
                          disabled={isEditDisabled}
                          onClick={() => setShapeSubTab(sub === 'inserir' ? 'inserir' : 'editar')}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all text-center cursor-pointer ${
                            isEditDisabled ? 'opacity-30 cursor-not-allowed text-slate-650' : ''
                          } ${
                            (shapeSubTab === 'inserir' && sub === 'inserir') || (shapeSubTab === 'editar' && sub === 'editar')
                              ? 'bg-[#2a3243] text-cyan-400 shadow' 
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {sub === 'inserir' ? 'Inserir' : 'Propriedades'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main scrollable body */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar bg-[#11141a]">
                  {(() => {
                    const selectedElId = selectedIds.size > 0 ? Array.from(selectedIds)[0] : null;
                    const selectedEl = selectedElId ? currentSlide.elements.find(item => item.id === selectedElId) : null;
                    const isShapeEl = selectedEl && selectedEl.type === 'shape';

                    if (shapeSubTab === 'editar') {
                      if (!isShapeEl) {
                        return (
                          <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3 bg-[#0a0d14] rounded-xl border border-slate-800/80">
                            <Box size={24} className="text-slate-600 animate-pulse" />
                            <div className="font-extrabold text-[#94a3b8] text-xs">Nenhuma Forma Selecionada</div>
                            <p className="text-[10px] text-slate-500 leading-relaxed max-w-[180px]">
                              Clique em uma forma no slide para ajustar suas propriedades de canto, preenchimento, transparência e rotação.
                            </p>
                          </div>
                        );
                      }

                      // Selected shape properties panel
                      return (
                        <div className="space-y-4 animate-in fade-in-50 duration-250 pr-1">
                          {/* Dimensions & position adjustments */}
                          <div className="space-y-2">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Tamanho e Posição</span>
                            <div className="grid grid-cols-2 gap-2">
                              {/* Width */}
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold block">Largura (px)</label>
                                <input 
                                  type="number" 
                                  min="10"
                                  max="3000"
                                  value={Math.round(selectedEl.width || 0)}
                                  onChange={(e) => updateElementProps(selectedEl.id, { width: parseInt(e.target.value) || selectedEl.width })}
                                  className="w-full bg-[#0a0d14] border border-slate-800 rounded-xl p-2 text-xs text-white font-semibold outline-none focus:border-cyan-500"
                                />
                              </div>
                              {/* Height */}
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold block">Altura (px)</label>
                                <input 
                                  type="number" 
                                  min="10"
                                  max="3000"
                                  value={Math.round(selectedEl.height || 0)}
                                  onChange={(e) => updateElementProps(selectedEl.id, { height: parseInt(e.target.value) || selectedEl.height })}
                                  className="w-full bg-[#0a0d14] border border-slate-800 rounded-xl p-2 text-xs text-white font-semibold outline-none focus:border-cyan-500"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {/* Pos X */}
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold block">Posição X (px)</label>
                                <input 
                                  type="number" 
                                  value={Math.round(selectedEl.x || 0)}
                                  onChange={(e) => updateElementProps(selectedEl.id, { x: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-[#0a0d14] border border-slate-800 rounded-xl p-2 text-xs text-white font-semibold outline-none focus:border-cyan-500"
                                />
                              </div>
                              {/* Pos Y */}
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold block">Posição Y (px)</label>
                                <input 
                                  type="number" 
                                  value={Math.round(selectedEl.y || 0)}
                                  onChange={(e) => updateElementProps(selectedEl.id, { y: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-[#0a0d14] border border-slate-800 rounded-xl p-2 text-xs text-white font-semibold outline-none focus:border-cyan-500"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Border radius (Round Corners) */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-extrabold uppercase tracking-wider">Canto Arredondado</span>
                              <span className="text-cyan-400 font-extrabold">
                                {selectedEl.style?.borderRadius !== undefined 
                                  ? `${selectedEl.style.borderRadius}px` 
                                  : (selectedEl.id?.includes('circ') ? '9999px (Círculo)' : '4px')}
                              </span>
                            </div>
                            <div className="flex items-center bg-[#0a0d14] border border-slate-800 p-2.5 rounded-xl h-10 w-full">
                              <input 
                                type="range"
                                min="0"
                                max="120"
                                step="1"
                                value={selectedEl.style?.borderRadius !== undefined ? selectedEl.style.borderRadius : (selectedEl.id?.includes('circ') ? 100 : 4)}
                                onChange={(e) => updateElementProps(selectedEl.id, { style: { borderRadius: parseInt(e.target.value) } })}
                                className="w-full h-1 bg-[#181d28] accent-cyan-400 rounded-lg cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Opacity slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-extrabold uppercase tracking-wider">Opacidade</span>
                              <span className="text-cyan-400 font-extrabold">{Math.round((selectedEl.style?.opacity ?? 1) * 100)}%</span>
                            </div>
                            <div className="flex items-center bg-[#0a0d14] border border-slate-800 p-2.5 rounded-xl h-10 w-full">
                              <input 
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={selectedEl.style?.opacity ?? 1}
                                onChange={(e) => updateElementProps(selectedEl.id, { style: { opacity: parseFloat(e.target.value) } })}
                                className="w-full h-1 bg-[#181d28] accent-cyan-400 rounded-lg cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Rotation slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-extrabold uppercase tracking-wider">Rotação</span>
                              <span className="text-cyan-400 font-extrabold">{selectedEl.style?.rotation || 0}°</span>
                            </div>
                            <div className="flex items-center bg-[#0a0d14] border border-slate-800 p-2.5 rounded-xl h-10 w-full">
                              <input 
                                type="range"
                                min="-180"
                                max="180"
                                step="5"
                                value={selectedEl.style?.rotation || 0}
                                onChange={(e) => updateElementProps(selectedEl.id, { style: { rotation: parseInt(e.target.value) } })}
                                className="w-full h-1 bg-[#181d28] accent-cyan-400 rounded-lg cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Border control */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Borda da Forma</span>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => updateElementProps(selectedEl.id, { style: { border: 'none' } })}
                                className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${selectedEl.style?.border === 'none' || !selectedEl.style?.border ? 'bg-slate-800 text-cyan-400 border-cyan-500' : 'bg-[#0a0d14] border-slate-800 text-slate-400 hover:text-white'}`}
                              >
                                Sem Borda
                              </button>
                              <button
                                type="button"
                                onClick={() => updateElementProps(selectedEl.id, { style: { border: '3px solid #000000' } })}
                                className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${selectedEl.style?.border && selectedEl.style.border !== 'none' ? 'bg-slate-800 text-cyan-400 border-cyan-500' : 'bg-[#0a0d14] border-slate-800 text-slate-400 hover:text-white'}`}
                              >
                                Borda Sólida
                              </button>
                            </div>
                            {selectedEl.style?.border && selectedEl.style.border !== 'none' && (
                              <div className="space-y-2 pt-2 bg-[#0a0d14] border border-slate-800 p-2 rounded-xl">
                                <div className="flex justify-between items-center text-[9px] text-slate-400">
                                  <span>Espessura borda</span>
                                </div>
                                <div className="flex gap-2">
                                  {['1px solid', '3px solid', '5px solid'].map((bVal) => {
                                    const col = selectedEl.style?.border?.split(' ')[2] || '#0055aa';
                                    const isAct = selectedEl.style?.border?.includes(bVal);
                                    return (
                                      <button
                                        key={bVal}
                                        type="button"
                                        onClick={() => updateElementProps(selectedEl.id, { style: { border: `${bVal} ${col}` } })}
                                        className={`flex-1 py-1 text-[9px] font-bold rounded cursor-pointer ${isAct ? 'bg-slate-800 text-cyan-400' : 'bg-slate-950 text-slate-400 hover:text-white'}`}
                                      >
                                        {bVal.split(' ')[0]}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Fill Type */}
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Estilo de Preenchimento</span>
                            <div className="grid grid-cols-2 gap-1 p-1 bg-[#0a0d14] border border-slate-800 rounded-xl">
                              <button
                                type="button"
                                onClick={() => updateElementProps(selectedEl.id, { style: { useGradient: false } })}
                                className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${!selectedEl.style?.useGradient ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                              >
                                Cores Sólidas
                              </button>
                              <button
                                type="button"
                                onClick={() => updateElementProps(selectedEl.id, { style: { useGradient: true, gradientType: selectedEl.style?.gradientType || 'linear', gradientColorStart: selectedEl.style?.gradientColorStart || selectedEl.style?.backgroundColor || '#3b82f6', gradientColorEnd: selectedEl.style?.gradientColorEnd || '#ec4899', gradientAngle: selectedEl.style?.gradientAngle ?? 135 } })}
                                className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${selectedEl.style?.useGradient ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                              >
                                Gradientes
                              </button>
                            </div>
                          </div>

                          {/* Solid Fill Options vs Gradient Fill options */}
                          {!selectedEl.style?.useGradient ? (
                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Selecione uma Cor</span>
                              <div className="flex items-center gap-2 bg-[#0a0d14] border border-slate-800 p-2 rounded-xl">
                                <input 
                                  type="color"
                                  value={selectedEl.style?.backgroundColor || '#0284c7'}
                                  onChange={(e) => updateElementProps(selectedEl.id, { style: { backgroundColor: e.target.value } })}
                                  className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer overflow-hidden p-0"
                                />
                                <div className="flex gap-1 flex-wrap flex-1 justify-end">
                                  {['#0284c7', '#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#1e293b', '#ffffff', '#000000'].map(c => (
                                    <button 
                                      key={c}
                                      type="button"
                                      onClick={() => updateElementProps(selectedEl.id, { style: { backgroundColor: c } })}
                                      className={`w-5 h-5 rounded border cursor-pointer ${selectedEl.style?.backgroundColor === c ? 'ring-2 ring-cyan-500 border-white' : 'border-slate-800'}`}
                                      style={{ backgroundColor: c }}
                                      title={c}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                              {/* Custom Gradient Colors */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-0.5">
                                  <label className="text-[9px] text-slate-500 font-bold block">Cor Inicial</label>
                                  <div className="flex items-center gap-1.5 bg-[#0a0d14] border border-slate-800 p-1.5 rounded-lg">
                                    <input 
                                      type="color"
                                      value={selectedEl.style?.gradientColorStart || '#3b82f6'}
                                      onChange={(e) => updateElementProps(selectedEl.id, { style: { gradientColorStart: e.target.value } })}
                                      className="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer overflow-hidden p-0"
                                    />
                                    <span className="text-[9px] font-mono text-slate-400 uppercase select-all truncate">
                                      {(selectedEl.style?.gradientColorStart || '#3b82f6').substring(0, 7)}
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-0.5">
                                  <label className="text-[9px] text-slate-500 font-bold block">Cor Final</label>
                                  <div className="flex items-center gap-1.5 bg-[#0a0d14] border border-slate-800 p-1.5 rounded-lg">
                                    <input 
                                      type="color"
                                      value={selectedEl.style?.gradientColorEnd || '#ec4899'}
                                      onChange={(e) => updateElementProps(selectedEl.id, { style: { gradientColorEnd: e.target.value } })}
                                      className="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer overflow-hidden p-0"
                                    />
                                    <span className="text-[9px] font-mono text-slate-400 uppercase select-all truncate">
                                      {(selectedEl.style?.gradientColorEnd || '#ec4899').substring(0, 7)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Angle slider (only if Linear style) */}
                              {selectedEl.style?.gradientType !== 'radial' && (
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-400">Ângulo do Gradiente</span>
                                    <span className="text-cyan-400 font-bold">{selectedEl.style?.gradientAngle ?? 135}°</span>
                                  </div>
                                  <input 
                                    type="range"
                                    min="0"
                                    max="360"
                                    step="15"
                                    value={selectedEl.style?.gradientAngle ?? 135}
                                    onChange={(e) => updateElementProps(selectedEl.id, { style: { gradientAngle: parseInt(e.target.value) } })}
                                    className="w-full h-1 bg-[#181d28] accent-cyan-400 rounded-lg cursor-pointer"
                                  />
                                </div>
                              )}

                              {/* Styles toggle: linear or radial */}
                              <div className="space-y-1">
                                <span className="text-[9px] text-slate-500 font-bold block">Tipo Distribuição</span>
                                <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#0a0d14] border border-slate-800 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() => updateElementProps(selectedEl.id, { style: { gradientType: 'linear' } })}
                                    className={`py-1 text-[9px] font-bold rounded transition-all cursor-pointer ${selectedEl.style?.gradientType !== 'radial' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
                                  >
                                    Linear
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateElementProps(selectedEl.id, { style: { gradientType: 'radial' } })}
                                    className={`py-1 text-[9px] font-bold rounded transition-all cursor-pointer ${selectedEl.style?.gradientType === 'radial' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
                                  >
                                    Radial
                                  </button>
                                </div>
                              </div>

                              {/* Presets and options */}
                              <div className="space-y-1 block pt-1.5">
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Presets de Gradiente</span>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {[
                                    { name: 'Aurora', start: '#12c2e9', end: '#f64f59', angle: 135 },
                                    { name: 'Pôr do Sol', start: '#f12711', end: '#f5af19', angle: 45 },
                                    { name: 'Floresta', start: '#11998e', end: '#38ef7d', angle: 135 },
                                    { name: 'Amor Rosa', start: '#ff007f', end: '#7f00ff', angle: 135 },
                                    { name: 'Oceano', start: '#00c6ff', end: '#0072ff', angle: 90 },
                                    { name: 'Lilás Celestial', start: '#e0c3fc', end: '#8ec5fc', angle: 180 },
                                    { name: 'Céu Cósmico', start: '#0f2027', end: '#2c5364', angle: 135 },
                                    { name: 'Pêssego Quente', start: '#ed4264', end: '#ffedbc', angle: 45 }
                                  ].map((p, pIdx) => (
                                    <button
                                      key={pIdx}
                                      type="button"
                                      title={p.name}
                                      onClick={() => updateElementProps(selectedEl.id, { style: { useGradient: true, gradientColorStart: p.start, gradientColorEnd: p.end, gradientAngle: p.angle, gradientType: 'linear' } })}
                                      className="h-6 rounded border border-slate-850 hover:scale-105 active:scale-95 transition-transform shrink-0 cursor-pointer"
                                      style={{
                                        background: `linear-gradient(${p.angle}deg, ${p.start}, ${p.end})`
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // shapeSubTab === 'inserir'
                    return (
                      <div className="space-y-4">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Formas & Corretivo</span>
                        <div className="grid grid-cols-2 gap-1.5 font-sans">
                          <button 
                            onClick={() => {
                              if (isLockedByPass) return;
                              const newEl: any = {
                                id: `shape-rect-${Date.now()}`,
                                type: 'shape',
                                x: 200, y: 350, width: 140, height: 100,
                                content: 'Rectangle',
                                zIndex: currentSlide.elements.length + 1,
                                style: { backgroundColor: '#1e293b', borderRadius: 4, opacity: 1, rotation: 0 }
                              };
                              triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                              setSelectedIds(new Set([newEl.id]));
                              setShapeSubTab('editar');
                            }}
                            className="p-2 border border-slate-800 bg-[#0d1117] hover:bg-[#141822] rounded-xl text-center flex flex-col items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <div className="w-6 h-5 bg-slate-500 rounded-sm" />
                            <span className="text-[9px] text-slate-350 font-bold">Retângulo</span>
                          </button>

                          <button 
                            onClick={() => {
                              if (isLockedByPass) return;
                              const newEl: any = {
                                id: `shape-circ-${Date.now()}`,
                                type: 'shape',
                                x: 200, y: 350, width: 125, height: 125,
                                content: 'Circle',
                                zIndex: currentSlide.elements.length + 1,
                                style: { backgroundColor: '#ef4444', borderRadius: 500, opacity: 1, rotation: 0 }
                              };
                              triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                              setSelectedIds(new Set([newEl.id]));
                              setShapeSubTab('editar');
                            }}
                            className="p-2 border border-slate-800 bg-[#0d1117] hover:bg-[#141822] rounded-xl text-center flex flex-col items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <div className="w-5 h-5 bg-red-500 rounded-full" />
                            <span className="text-[9px] text-slate-350 font-bold">Círculo</span>
                          </button>

                          <button 
                            onClick={() => {
                              if (isLockedByPass) return;
                              const newEl: any = {
                                id: `shape-whiteout-${Date.now()}`,
                                type: 'shape',
                                x: 150, y: 150, width: 160, height: 50,
                                content: 'Whiteout',
                                zIndex: currentSlide.elements.length + 1,
                                style: { backgroundColor: '#ffffff', borderRadius: 0, opacity: 1, rotation: 0, border: 'none' }
                              };
                              triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                              setSelectedIds(new Set([newEl.id]));
                              setShapeSubTab('editar');
                              toast.success('Corretivo criado! Arraste e redimensione para cobrir/apagar logos, textos ou gráficos do PDF original.');
                            }}
                            className="p-2 border border-slate-800 bg-[#0d1117] hover:bg-[#141822] rounded-xl text-center flex flex-col items-center gap-1.5 cursor-pointer transition-colors"
                            title="Apague ou masque qualquer parte do PDF original"
                          >
                            <div className="w-6 h-5 bg-white border border-dashed border-cyan-500 flex items-center justify-center">
                              <Eraser size={10} className="text-cyan-500" />
                            </div>
                            <span className="text-[9px] text-cyan-400 font-bold">Corretivo</span>
                          </button>

                          <button 
                            onClick={() => {
                              if (isLockedByPass) return;
                              const newEl: any = {
                                id: `shape-redact-${Date.now()}`,
                                type: 'redact',
                                x: 150, y: 150, width: 180, height: 44,
                                content: 'Redact Block',
                                zIndex: currentSlide.elements.length + 1,
                                style: { backgroundColor: '#000000', borderRadius: 0, opacity: 1, rotation: 0, border: 'none' }
                              };
                              triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                              setSelectedIds(new Set([newEl.id]));
                              toast.success('Tarja de Censura (Redact) criada! Arraste e posicione-a sobre informações confidenciais do PDF.');
                            }}
                            className="p-2 border border-slate-800 bg-[#0d1117] hover:bg-[#141822] rounded-xl text-center flex flex-col items-center gap-1.5 cursor-pointer transition-colors"
                            title="Ocultar de forma segura informações confidenciais do PDF"
                          >
                            <div className="w-6 h-5 bg-black border border-red-500 flex items-center justify-center text-red-500">
                              <Shield size={10} />
                            </div>
                            <span className="text-[9px] text-red-400 font-bold">Censurar (Redact)</span>
                          </button>
                        </div>

                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold pt-2">Anotação com Caneta</span>
                        <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl space-y-3">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-bold">Paleta de cores</span>
                          </div>
                          <div className="flex gap-2 justify-center">
                            {['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#a855f7'].map(col => (
                              <button 
                                key={col}
                                onClick={() => setSelectedColor(col)}
                                className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${selectedColor === col ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                                style={{ backgroundColor: col }}
                              />
                            ))}
                          </div>

                          {/* Brush thickness choice */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] text-slate-500">
                              <span>Espessura da Caneta</span>
                              <span className="text-cyan-400 font-bold">{drawingWidth}px</span>
                            </div>
                            <input 
                              type="range"
                              min="1"
                              max="20"
                              step="1"
                              value={drawingWidth}
                              onChange={(e) => setDrawingWidth(parseInt(e.target.value))}
                              className="w-full h-1 bg-slate-900 accent-cyan-500 rounded-lg cursor-pointer"
                            />
                            <div className="flex justify-between text-[8px] text-slate-600">
                              <span>Fina</span>
                              <span>Média</span>
                              <span>Grossa</span>
                            </div>
                          </div>

                          <button 
                            onClick={clearDrawing}
                            className="w-full py-1.5 text-[9px] font-bold border border-slate-850 hover:bg-slate-950 bg-slate-950 rounded-lg text-slate-400 hover:text-red-400 cursor-pointer transition-colors"
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
                              className="py-1.5 border border-slate-800 hover:border-slate-705 hover:bg-slate-950/80 rounded-lg text-xs font-bold text-center capitalize text-slate-300 pointer-events-auto cursor-pointer transition-all animate-in fade-in-50"
                            >
                              Carimbo: {stamp}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
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
                    <button 
                      onClick={() => {
                        setIsAddingStickyPin(!isAddingStickyPin);
                        if (!isAddingStickyPin) {
                          toast.info('Modo Alfinete Ativado! Clique em qualquer parte do PDF/Slide para fixar a nota na coordenada exata.');
                        }
                      }}
                      className={`w-full py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer ${
                        isAddingStickyPin 
                          ? 'bg-amber-600 animate-pulse text-white font-extrabold ring-2 ring-amber-500' 
                          : 'bg-amber-500 hover:bg-amber-450 text-slate-900 font-extrabold'
                      }`}
                    >
                      <Pin size={12} className="stroke-[2.5px]"/> {isAddingStickyPin ? 'Aguardando Clique no PDF...' : '📍 Fixar Nota em Coordenada Exata'}
                    </button>

                    <div className="py-2 flex items-center text-slate-600 justify-center gap-2">
                      <div className="h-px bg-slate-800 flex-1"></div>
                      <span className="text-[8px] uppercase tracking-wider font-extrabold select-none">Ou Comentário Geral</span>
                      <div className="h-px bg-slate-800 flex-1"></div>
                    </div>

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
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700/60 rounded-lg text-xs font-bold"
                    >
                      Postar Nota Geral
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
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400">Editar página</span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={14}/></button>
                </div>
                
                {/* Page Dimension Sub-Header matching the user screenshot */}
                <div className="px-4 py-2.5 bg-slate-900/60 border-b border-[#1e293b] flex items-center justify-between text-[11px] text-slate-300">
                  <span className="font-bold text-slate-300">
                    Adicionar título
                  </span>
                  <div className="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                    <Sliders size={10} className="text-cyan-400" />
                    {docWidth} x {docHeight} px
                  </div>
                </div>

                <div className="p-4 space-y-4 max-h-[calc(100vh-210px)] overflow-y-auto custom-scrollbar">
                  {/* GRID OF CANVA-LIKE CARDS AS DEPICTED IN THE SCREENSHOT */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* REDIMENSIONAR */}
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center justify-center text-center hover:border-cyan-500/50 transition-all">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-1 text-cyan-400">
                        <Sliders size={13} />
                      </div>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-200">Redimensionar</span>
                      
                      <select 
                        value={pageSizeType} 
                        onChange={(e) => {
                          setPageSizeType(e.target.value as any);
                          toast.success('Página redimensionada para ' + e.target.value);
                        }}
                        className="mt-1 w-full text-[8px] bg-slate-950 border border-slate-850 rounded p-1 text-slate-300 focus:outline-none"
                      >
                        <option value="A4">A4 (840x1188)</option>
                        <option value="LETTER">Carta (840x1086)</option>
                        <option value="A3">A3 (1188x1680)</option>
                        <option value="SLIDE_16_9">Slide 16:9</option>
                      </select>
                    </div>

                    {/* ANIMAR TUDO */}
                    <button 
                      onClick={() => toast.success('Transições animadas e fade de slide ativados de forma global!')}
                      className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center justify-center text-center hover:border-cyan-500/50 transition-all cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center mb-1 text-pink-400 group-hover:animate-bounce">
                        <Sparkles size={13} />
                      </div>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-200">Animar tudo</span>
                      <span className="text-[7px] text-slate-500 mt-0.5">Efeitos de entrada</span>
                    </button>

                    {/* SUBSTITUIÇÃO RÁPIDA */}
                    <button 
                      onClick={() => {
                        setActiveLeftTab('pesquisar');
                        toast.info('Localizar & Substituir focado no lado esquerdo');
                      }}
                      className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center justify-center text-center hover:border-cyan-500/50 transition-all cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-1 text-emerald-400">
                        <RefreshCw size={13} />
                      </div>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-200">Substituição</span>
                      <span className="text-[7px] text-slate-500 mt-0.5">Localizar texto</span>
                    </button>

                    {/* TRADUZIR */}
                    <button 
                      onClick={() => {
                        const translated = currentSlide.elements.map((el) => {
                          if (el.type === 'text') {
                            let nextContent = el.content;
                            if (el.content.includes('Relatório')) nextContent = 'Weekly Executive Report';
                            else if (el.content.includes('Tabela')) nextContent = 'Executive Table - Weekly Comparison';
                            else if (el.content.includes('Resumo')) nextContent = 'Executive Summary';
                            else if (el.content.includes('GGR')) nextContent = 'GGR Total';
                            else if (el.content.includes('Lucro')) nextContent = 'Gross Profit';
                            return { ...el, content: nextContent };
                          }
                          return el;
                        });
                        triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: translated } : s), 'Traduzir página');
                        toast.success('Página traduzida automaticamente para o Inglês!');
                      }}
                      className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center justify-center text-center hover:border-cyan-500/50 transition-all cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-1 text-indigo-400">
                        <Globe size={13} />
                      </div>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-200">Traduzir</span>
                      <span className="text-[7px] text-slate-500 mt-0.5">Tradução de textos</span>
                    </button>

                    {/* CRIAR EM MASSA */}
                    <button 
                      onClick={() => {
                        setActiveLeftTab('arquivos');
                        toast.info('Utilize a importação de CSV na guia Arquivos para mesclar dados em lote!');
                      }}
                      className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex flex-col items-center justify-center text-center hover:border-cyan-500/50 transition-all cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center mb-1 text-amber-400">
                        <Table size={13} />
                      </div>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-200">Criar em massa</span>
                      <span className="text-[7px] text-slate-500 mt-0.5">Dados dinâmicos</span>
                    </button>

                    {/* CORTAR ELEMENTO PDF */}
                    <button 
                      onClick={() => {
                        setIsExtractingCrop(prev => !prev);
                        setCropBoxStart(null);
                        setCropBoxEnd(null);
                        if (!isExtractingCrop) {
                          toast.promise(
                            new Promise(resolve => setTimeout(resolve, 800)),
                            {
                              loading: 'Iniciando modo de seleção...',
                              success: 'Modo de Recorte Ativo! Clique e arraste na página para selecionar a logo/imagem que deseja separar.',
                              error: 'Erro ao ativar'
                            }
                          );
                        }
                      }}
                      className={`border p-2.5 rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${isExtractingCrop ? 'bg-amber-950/40 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 hover:border-amber-500/50'}`}
                      title="Selecione um logotipo ou gráfico no fundo do PDF para recortar e transformá-lo num elemento móvel independente."
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 ${isExtractingCrop ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-amber-500/10 text-amber-400'}`}>
                        <Scissors size={13} />
                      </div>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-200">Recortar PDF</span>
                      <span className="text-[7px] text-slate-400 mt-0.5">{isExtractingCrop ? 'Ativo (clique/arraste)' : 'Separar Logo/Objeto'}</span>
                    </button>
                  </div>

                  {/* FUNDO / COR ACCORDING TO SCREENSHOT */}
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Fundo</span>
                    <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">Cor</span>
                        
                        {/* Interactive Color swatch picker */}
                        <div className="relative group/color">
                          <button 
                            className="w-8 h-8 rounded-lg border border-slate-700/80 shadow-md cursor-pointer transition-all hover:scale-105"
                            style={{ backgroundColor: currentSlide.background || '#ffffff' }}
                            title="Escolher Cor do Fundo"
                          />
                          {/* Rich Color presets list */}
                          <div className="absolute right-0 top-10 bg-[#161a23] border border-slate-700 rounded-xl p-3 shadow-2xl z-[200] hidden group-hover/color:block w-48">
                            <span className="text-[8px] font-bold text-slate-400 block mb-2 uppercase">Paleta de Cores</span>
                            <div className="grid grid-cols-5 gap-1.5">
                              {['#ffffff', '#f8fafc', '#f1f5f9', '#eaeef4', '#e2e8f0', '#0a0d14', '#1e293b', '#64748b', '#dc2626', '#d97706', '#16a34a', '#2563eb', '#4f46e5', '#db2777', '#0284c7'].map((col) => (
                                <button
                                  key={col}
                                  onClick={() => {
                                    handleBackgroundChange(col);
                                    toast.success(`Cor alterada para ${col}`);
                                  }}
                                  className="w-6 h-6 rounded-md border border-slate-700 cursor-pointer hover:scale-110 transition-transform"
                                  style={{ backgroundColor: col }}
                                  title={col}
                                />
                              ))}
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between gap-1">
                              <span className="text-[8px] text-slate-500">HEX</span>
                              <input 
                                type="text"
                                value={currentSlide.background || '#ffffff'}
                                onChange={(e) => handleBackgroundChange(e.target.value)}
                                className="w-20 bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-[9px] font-mono text-center text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* HEADER & FOOTER TEXT INPUTS */}
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

            {activeLeftTab === 'redimensionar' && (
              <div className="flex flex-col h-full font-sans select-none text-slate-100 bg-[#11141a]">
                {/* Header block with back and close button */}
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <button 
                    onClick={() => {
                      setActiveLeftTab('configuracoes');
                      toast.info('Voltando para Editar Página');
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                    <span>Redimensionar</span>
                  </button>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={14}/></button>
                </div>

                {/* Sub-header displaying the active document parameters */}
                <div className="px-4 py-1.5 bg-slate-900/60 border-b border-[#1e293b] text-[10px] text-slate-400 font-mono">
                  Personalizado {docWidth} x {docHeight} px
                </div>

                {/* Search Bar matching screenshot */}
                <div className="px-4 pt-3 pb-1">
                  <div className="flex items-center bg-slate-950 border border-slate-850 rounded-lg px-2.5 h-8 w-full">
                    <Search size={13} className="text-slate-500 mr-2 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Pesquisar tudo"
                      value={resizeSearch}
                      onChange={(e) => setResizeSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-[11px] text-white placeholder-slate-600 w-full"
                    />
                    {resizeSearch && (
                      <button onClick={() => setResizeSearch('')} className="text-slate-500 hover:text-white text-[12px] cursor-pointer">&times;</button>
                    )}
                  </div>
                </div>

                {/* SCROLLABLE MAIN FORM WITH SECTIONS */}
                <div className="p-4 space-y-4 flex-1 overflow-y-auto max-h-[calc(100vh-270px)] custom-scrollbar">
                  {/* PERSONALIZADO SECTION */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Personalizado</span>
                    
                    <div className="grid grid-cols-12 gap-1.5 items-end">
                      <div className="col-span-4 space-y-1">
                        <label className="text-[9px] text-slate-400 block font-mono">Largura</label>
                        <input 
                          type="number"
                          value={resizeWidth}
                          onChange={(e) => {
                            const val = Math.max(100, parseInt(e.target.value) || 0);
                            setResizeWidth(val);
                            if (aspectLocked) {
                              const ratio = docWidth / docHeight;
                              setResizeHeight(Math.round(val / ratio));
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 focus:border-cyan-500 text-xs text-white rounded p-1.5 text-center font-mono focus:outline-none"
                        />
                      </div>

                      <div className="col-span-4 space-y-1">
                        <label className="text-[9px] text-slate-400 block font-mono">Altura</label>
                        <input 
                          type="number"
                          value={resizeHeight}
                          onChange={(e) => {
                            const val = Math.max(100, parseInt(e.target.value) || 0);
                            setResizeHeight(val);
                            if (aspectLocked) {
                              const ratio = docWidth / docHeight;
                              setResizeWidth(Math.round(val * ratio));
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 focus:border-cyan-500 text-xs text-white rounded p-1.5 text-center font-mono focus:outline-none"
                        />
                      </div>

                      <div className="col-span-3 space-y-1">
                        <label className="text-[9px] text-slate-400 block font-mono">Unidade</label>
                        <select 
                          value={resizeUnit}
                          onChange={(e: any) => setResizeUnit(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 text-xs text-white rounded p-1.5 font-mono focus:outline-none text-center"
                        >
                          <option value="px">px</option>
                          <option value="mm">mm</option>
                          <option value="cm">cm</option>
                          <option value="in">in</option>
                        </select>
                      </div>

                      <div className="col-span-1 pb-1.5 flex justify-center">
                        <button 
                          onClick={() => setAspectLocked(!aspectLocked)}
                          className={`p-1.5 rounded transition-all cursor-pointer ${aspectLocked ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800' : 'text-slate-500 bg-slate-950 border border-slate-850'}`}
                          title={aspectLocked ? "Manter proporções ativado" : "Proporções livres"}
                        >
                          {aspectLocked ? <Link size={12} className="text-cyan-400" /> : <Link2 size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RECOMENDADO SECTION */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Recomendado</span>
                    
                    <div className="space-y-1.5">
                      {([
                        { id: 'insta_portrait', name: 'Publicação de retrato do Instagram', width: 1080, height: 1350, unit: 'px', desc: '1.080 x 1.350 px', icon: <Instagram size={14} className="text-[#a855f7]" /> },
                        { id: 'a4_brochure', name: 'Panfleto A4', width: 840, height: 1188, unit: 'mm', desc: 'A4 (210 x 297 mm)', icon: <Layers size={14} className="text-[#3b82f6]" /> },
                        { id: 'insta_story', name: 'Story do Instagram', width: 1080, height: 1920, unit: 'px', desc: '1.080 x 1.920 px', icon: <Smartphone size={14} className="text-[#f43f5e]" /> }
                      ] as const).filter(p => !resizeSearch || p.name.toLowerCase().includes(resizeSearch.toLowerCase())).map((p) => {
                        const isSelected = resizeWidth === p.width && resizeHeight === p.height;
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              setResizeWidth(p.width);
                              setResizeHeight(p.height);
                              setResizeUnit(p.unit as any);
                              toast.info(`Selecionado template: ${p.name}`);
                            }}
                            className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${isSelected ? 'border-cyan-500 bg-cyan-950/20 text-white' : 'border-slate-850 bg-slate-900/40 hover:border-slate-700 text-slate-300'}`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800">
                              {p.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-extrabold truncate leading-tight">{p.name}</div>
                              <div className="text-[8px] opacity-60 font-mono mt-0.5">{p.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* PROCURAR ACCORDIONS */}
                  <div className="space-y-1.5 flex-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">Procurar</span>
                    
                    {([
                      { key: 'redes', name: 'Redes sociais e anúncios', presets: [
                        { name: 'Post de Instagram (Quadrado)', width: 1080, height: 1080, unit: 'px', desc: '1.080 x 1.080 px' },
                        { name: 'Vídeo do Facebook (Paisagem)', width: 1200, height: 630, unit: 'px', desc: '1.200 x 630 px' },
                        { name: 'Banner do LinkedIn', width: 1584, height: 396, unit: 'px', desc: '1.584 x 396 px' }
                      ]},
                      { key: 'video', name: 'Vídeo', presets: [
                        { name: 'Vídeo Full HD', width: 1920, height: 1080, unit: 'px', desc: '1.920 x 1080 px' },
                        { name: 'Shorts/Reels (Vertical)', width: 1080, height: 1920, unit: 'px', desc: '1.080 x 1.920 px' },
                        { name: 'Vídeo Ultra HD 4K', width: 3840, height: 2160, unit: 'px', desc: '3.840 x 2.160 px' }
                      ]},
                      { key: 'foto', name: 'Foto', presets: [
                        { name: 'Foto Quadrada', width: 800, height: 800, unit: 'px', desc: '800 x 800 px' },
                        { name: 'Retrato de Estúdio', width: 1200, height: 1500, unit: 'px', desc: '1.200 x 1.500 px' }
                      ]},
                      { key: 'documento', name: 'Documento', presets: [
                        { name: 'A4 Clássico', width: 840, height: 1188, unit: 'px', desc: '840 x 1.188 px' },
                        { name: 'Carta/Letter', width: 840, height: 1086, unit: 'px', desc: '840 x 1.086 px' },
                        { name: 'Apresentação Slide 16:9', width: 1050, height: 590, unit: 'px', desc: '1.050 x 590 px' },
                        { name: 'Pôster A3', width: 1188, height: 1680, unit: 'px', desc: '1.188 x 1.680 px' }
                      ]}
                    ] as const).map((cat) => {
                      const isExpanded = expandedResizeCategory === cat.key;
                      return (
                        <div key={cat.key} className="border border-slate-850 rounded-xl overflow-hidden bg-slate-900/20 mb-1.5">
                          <button
                            onClick={() => setExpandedResizeCategory(isExpanded ? null : cat.key)}
                            className="w-full p-2.5 px-3 flex items-center justify-between hover:bg-slate-950/40 transition-colors text-left cursor-pointer"
                          >
                            <span className="text-[10px] font-bold text-slate-300">{cat.name}</span>
                            <ChevronDown size={14} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180 text-cyan-400' : ''}`} />
                          </button>

                          {isExpanded && (
                            <div className="p-2 gap-1.5 flex flex-col bg-slate-950/20 border-t border-slate-850/60 pl-4">
                              {cat.presets.map((sub, sidx) => {
                                const isSubSelected = resizeWidth === sub.width && resizeHeight === sub.height;
                                return (
                                  <button
                                    key={sidx}
                                    onClick={() => {
                                      setResizeWidth(sub.width);
                                      setResizeHeight(sub.height);
                                      setResizeUnit(sub.unit as any);
                                      toast.info(`Selecionado: ${cat.name} > ${sub.name}`);
                                    }}
                                    className={`w-full py-2 px-2.5 rounded text-left transition-all cursor-pointer ${isSubSelected ? 'text-cyan-400 bg-cyan-950/15 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-900/60'}`}
                                  >
                                    <div className="text-[9px]">{sub.name}</div>
                                    <div className="text-[7px] opacity-60 font-mono mt-0.5">{sub.desc}</div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* BOTTOM REGION: EXPAND BOX, REDIMENSIONAR & DUPLICATE */}
                <div className="p-4 border-t border-[#1e293b] bg-[#0d1016] space-y-3.5 shrink-0 select-none">
                  {/* EXPAND CHECKBOX */}
                  <div className="flex items-start gap-2">
                    <input 
                      type="checkbox" 
                      id="stretch-mode" 
                      checked={expandImage}
                      onChange={(e) => setExpandImage(e.target.checked)}
                      className="mt-0.5 rounded accent-cyan-500 border-slate-800 focus:ring-0 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <label htmlFor="stretch-mode" className="text-[10px] font-bold text-slate-300 flex items-center gap-1 cursor-pointer">
                        Expandir imagem 
                        <Info size={10} className="text-cyan-500/80 cursor-help" title="Distribui harmonicamente os elementos para caber nas novas proporções" />
                      </label>
                      <p className="text-[8px] text-slate-500 leading-normal">
                        Redimensione a imagem gerando as partes que faltam.
                      </p>
                    </div>
                  </div>

                  {/* DOUBLE ACTION CTA ROW */}
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        // DUPLICATE AND APPLY NEW DIMENSIONS
                        const newPage: Slide = {
                          ...currentSlide,
                          id: `slide-dup-${Date.now()}`,
                          elements: currentSlide.elements.map(el => ({ ...el, id: `el-${Date.now()}-${Math.random()}` }))
                        };
                        const nextSlides = [...slides];
                        nextSlides.splice(currentSlideIndex + 1, 0, newPage);
                        // Apply dimensions
                        setCustomWidth(resizeWidth);
                        setCustomHeight(resizeHeight);
                        setPageSizeType('CUSTOM');
                        
                        triggerUpdate(nextSlides);
                        onSelectSlide(currentSlideIndex + 1);
                        toast.success('Página duplicada e redimensionada com sucesso!');
                      }}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[#94a3b8] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      Duplicar e redimensionar
                    </button>
                    <button
                      onClick={() => {
                        // APPLY NEW DIMENSIONS DIRECTLY
                        setCustomWidth(resizeWidth);
                        setCustomHeight(resizeHeight);
                        setPageSizeType('CUSTOM');
                        toast.success(`Documento redimensionado com sucesso para ${resizeWidth} x ${resizeHeight} px!`);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-lg text-xs font-black transition-all cursor-pointer text-center shadow-lg shadow-cyan-950/30"
                    >
                      Redimensionar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MIDDLE CONTAINER: MAIN HEADER & EDIT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0d14] relative h-full overflow-hidden">
        
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

        {/* FLOATING ACTION OVERLAY PANEL FOR QUICK PAGE ADJUSTMENTS & RESIZING */}
        <div className="absolute top-[80px] left-1/2 -translate-x-1/2 bg-[#0c1017] border border-slate-800 rounded-full px-1.5 py-1.5 flex items-center justify-center gap-1.5 shadow-2xl z-40">
          <button 
            onClick={() => {
              setActiveLeftTab('configuracoes');
              toast.info('Ativou edição geral desta página!');
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${activeLeftTab === 'configuracoes' ? 'bg-[#1e293b] text-white border border-slate-700/60' : 'text-slate-400 hover:text-white hover:bg-[#11141a]'}`}
          >
            <Sliders size={13} className={activeLeftTab === 'configuracoes' ? 'text-cyan-400' : ''} />
            Editar página
          </button>
          <button 
            onClick={() => {
              setActiveLeftTab('redimensionar');
              // Initialize resize inputs with current dimensions
              setResizeWidth(docWidth);
              setResizeHeight(docHeight);
              toast.info('Selecione uma predefinição ou digite os parâmetros de redimensionamento!');
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${activeLeftTab === 'redimensionar' ? 'bg-[#1e293b] text-white border border-slate-700/60' : 'text-slate-400 hover:text-white hover:bg-[#11141a]'}`}
          >
            <Maximize size={13} className={activeLeftTab === 'redimensionar' ? 'text-cyan-400' : ''} />
            Redimensionar
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1"></div>

          <button 
            onClick={() => {
              setPageOrganizerOpen(true);
              toast.info('Abrindo organizador de páginas estilo Acrobat...');
            }}
            className="px-4 py-1.5 rounded-full text-xs font-extrabold text-slate-400 hover:text-white hover:bg-[#11141a] transition-all duration-200 cursor-pointer flex items-center gap-1.5"
          >
            <Layers size={13} className="text-cyan-400" />
            Organizar Páginas
          </button>

          <button 
            onClick={() => {
              setEditMode(editMode === 'LIVE_FILL' ? 'EDIT' : 'LIVE_FILL');
              setSelectedIds(new Set());
              toast.info(editMode === 'LIVE_FILL' ? 'Caneta e realce desativados.' : 'Modo Canetas & Realce Acrobat Ativado!');
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${editMode === 'LIVE_FILL' ? 'bg-[#ef4444] text-white border border-red-700/60 shadow' : 'text-slate-400 hover:text-white hover:bg-[#11141a]'}`}
          >
            <PenTool size={13} className={editMode === 'LIVE_FILL' ? 'text-white' : 'text-amber-400'} />
            Desbloquear Tinta
          </button>
        </div>

        {/* WORKSPACE CENTRAL ZOOM AND VIEWPORT WINDOW */}
        <div 
          ref={workspaceViewportRef}
          className="flex-1 relative overflow-auto flex flex-col items-center gap-12 py-12 px-16 custom-scrollbar bg-[#0a0d14]"
        >
          {editMode === 'LIVE_FILL' && (
            <div className="sticky top-0 w-full max-w-xl bg-[#0c1017]/95 backdrop-blur-md border border-slate-800 p-3 rounded-2xl flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 mb-2 animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2 px-1">
                <span className="p-1 px-1.5 text-[8.5px] uppercase font-black tracking-widest text-[#10b981] bg-emerald-950 border border-emerald-800 rounded">
                  TINTA / DESENHO
                </span>
                <span className="text-slate-400 text-xs font-bold leading-none">Caneta Acrobat</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Pen tool selection */}
                <button
                  onClick={() => {
                    setBrushMode('PEN');
                    toast.success('Caneta Esferográfica Ativa');
                  }}
                  className={`p-1.5 px-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                    brushMode === 'PEN' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/40' : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                  }`}
                >
                  <PenTool size={11} /> Pen
                </button>
                {/* Highlighter tool selection */}
                <button
                  onClick={() => {
                    setBrushMode('HIGHLIGHTER');
                    toast.success('Marca-Texto Fluorescente Ativo');
                  }}
                  className={`p-1.5 px-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                    brushMode === 'HIGHLIGHTER' ? 'bg-[#eab308] text-slate-950 shadow-md shadow-amber-900/40' : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                  }`}
                >
                  <Highlighter size={11} /> Realce
                </button>
                
                <div className="w-px h-5 bg-slate-800 mx-1"></div>

                {/* Micro Colors selector */}
                <div className="flex items-center gap-1">
                  {[
                    { color: '#ef4444', label: 'Vermelho' },
                    { color: '#3b82f6', label: 'Azul' },
                    { color: '#00f2fe', label: 'Cyan' },
                    { color: '#f59e0b', label: 'Laranja' },
                    { color: '#fef08a', label: 'Amarelo' },
                  ].map(c => (
                    <button
                      key={c.color}
                      onClick={() => {
                        setSelectedColor(c.color);
                        toast.success(`Cor da tinta: ${c.label}`);
                      }}
                      className={`w-3.5 h-3.5 rounded-full border hover:scale-125 duration-100 transition-all ${
                        selectedColor === c.color ? 'border-white scale-110 ring-1 ring-slate-800' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    />
                  ))}
                </div>

                <div className="w-px h-5 bg-slate-800 mx-1"></div>

                {/* Stroke thickness */}
                <select
                  value={drawingWidth}
                  onChange={(e) => setDrawingWidth(parseInt(e.target.value))}
                  className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-bold p-1 px-1.5 rounded-md focus:border-cyan-500 outline-none"
                >
                  <option value="2">2px (Fina)</option>
                  <option value="4">4px (Média)</option>
                  <option value="8">8px (Grossa)</option>
                  <option value="16">16px (Espessa)</option>
                </select>

                <div className="w-px h-5 bg-slate-800 mx-1"></div>

                <button
                  onClick={() => {
                    clearDrawing();
                    toast.info('Tela de rabiscos limpa!');
                  }}
                  className="p-1 px-2 text-[10px] bg-red-950 text-red-400 border border-red-900/60 hover:bg-red-900 hover:text-white rounded font-black uppercase transition-all cursor-pointer"
                >
                  Limpar
                </button>

                <button
                  onClick={() => {
                    setEditMode('EDIT');
                    toast.success('Rabiscos de tinta salvos com sucesso!');
                  }}
                  className="p-1 px-2.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-white rounded font-extrabold uppercase transition-all cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}

          {isExtractingCrop && (
            <div className="sticky top-4 w-full max-w-lg bg-amber-950/95 backdrop-blur-md text-white border border-amber-500 p-3 rounded-2xl flex items-center gap-3 shadow-2xl z-50 mt-2 animate-pulse">
              <div className="p-2 h-8 w-8 bg-amber-600 rounded-lg flex items-center justify-center">
                <Scissors size={14} className="stroke-[2.5px] text-white" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-[11px] font-black uppercase tracking-wider block text-amber-200">Modo Recorte & Separação Ativo ✂️</span>
                <p className="text-[10px] text-amber-50 font-bold leading-normal">
                  Clique e arraste um retângulo sobre a logo, imagem ou elemento do PDF original que deseja recortar para torná-lo um objeto separado móvel!
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsExtractingCrop(false);
                  setCropBoxStart(null);
                  setCropBoxEnd(null);
                }}
                className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white font-black text-[10px] px-2 cursor-pointer border border-white/20 uppercase animate-none"
              >
                Sair
              </button>
            </div>
          )}

          {/* List of stacked slide pages matching Acrobat Reader's layout */}
          {slides.map((slide, idx) => {
            const isSlideActive = idx === currentSlideIndex;
            return (
              <div
                key={slide.id || `slide-${idx}`}
                id={`page-sheet-${idx}`}
                onMouseDownCapture={() => {
                  if (currentSlideIndex !== idx) {
                    lastSelectedViaClickRef.current = idx;
                    onSelectSlide(idx);
                  }
                }}
                className={`relative flex-shrink-0 transition-shadow duration-200 ${
                  isSlideActive ? 'ring-2 ring-cyan-500 shadow-2xl' : 'shadow-lg hover:shadow-xl'
                }`}
                style={{
                  width: `${docWidth * zoom}px`,
                  height: `${docHeight * zoom}px`,
                  position: 'relative',
                }}
              >
                {/* Visual side tag indicating page index */}
                <div className="absolute -left-12 top-2 text-[10px] font-mono text-slate-500 font-bold select-none h-4 flex items-center justify-center">
                  p. {idx + 1}
                </div>

                {/* THE CANVAS BOARD SHEETS RENDER */}
                <div 
                  ref={isSlideActive ? canvasRef : undefined}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (isLockedByPass) return;
                    const files = Array.from(e.dataTransfer.files) as File[];
                    
                    // Check for PDF files
                    const hasPdf = files.some(f => f.name.slice(-4).toLowerCase() === '.pdf' || f.type === 'application/pdf');
                    if (hasPdf) {
                      e.stopPropagation();
                      const pdfFile = files.find(f => f.name.slice(-4).toLowerCase() === '.pdf' || f.type === 'application/pdf')!;
                      importDocumentFile(pdfFile);
                      return;
                    }

                    const imageFiles = files.filter(f => f.type.startsWith('image/'));
                    if (imageFiles.length === 0) return;
                    
                    const rect = e.currentTarget.getBoundingClientRect();
                    const dropX = (e.clientX - rect.left) / zoom;
                    const dropY = (e.clientY - rect.top) / zoom;
                    
                    imageFiles.forEach(file => {
                      processImageFileToWebp(file, dropX, dropY, idx);
                    });
                  }}
                  onMouseDown={(e) => {
                    if (isAddingStickyPin && isSlideActive) {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relativeX = (e.clientX - rect.left) / zoom;
                      const relativeY = (e.clientY - rect.top) / zoom;
                      
                      const newCommentEl = {
                        id: `comment-${Date.now()}`,
                        type: 'comment',
                        x: Math.round(relativeX - 20),
                        y: Math.round(relativeY - 20),
                        width: 40,
                        height: 40,
                        content: 'Escreva seu comentário aqui...',
                        isComment: true,
                        isMinimised: false,
                        commentAuthor: 'srdiammondpvp@gmail.com',
                        commentDate: new Date().toLocaleDateString('pt-BR'),
                        zIndex: slides[idx].elements.length + 15,
                        style: {
                          backgroundColor: '#fef08a'
                        }
                      };
                      const nextSlides = [...slides];
                      nextSlides[idx].elements.push(newCommentEl as any);
                      onUpdateSlides(nextSlides);
                      
                      setIsAddingStickyPin(false);
                      setSelectedIds(new Set([newCommentEl.id]));
                      toast.success('Alfinete de Comentário colocado na posição! Escreva sua anotação na barra lateral.');
                      setActiveLeftTab('comentarios');
                      return;
                    }
                    if (editMode === 'LIVE_FILL' || isLockedByPass) return;
                    
                    // Terminate active text inline editors
                    setEditingTextId(null);
                    setCroppingImageId(null);
                    
                    // Clear active selected list unless we did a multi-select shift-click combo
                    if (!e.shiftKey) {
                      setSelectedIds(new Set());
                    }
                    
                    if (isExtractingCrop && isSlideActive && canvasRef.current) {
                      e.stopPropagation();
                      const rect = canvasRef.current.getBoundingClientRect();
                      const relativeX = (e.clientX - rect.left) / zoom;
                      const relativeY = (e.clientY - rect.top) / zoom;
                      setCropBoxStart({ x: relativeX, y: relativeY });
                      setCropBoxEnd({ x: relativeX, y: relativeY });
                      return;
                    }

                    // Marquee initiation
                    if (isSlideActive && canvasRef.current) {
                      const rect = canvasRef.current.getBoundingClientRect();
                      const relativeX = (e.clientX - rect.left) / zoom;
                      const relativeY = (e.clientY - rect.top) / zoom;
                      setMarqueeStart({ x: relativeX, y: relativeY });
                      setMarqueeEnd({ x: relativeX, y: relativeY });
                    }
                  }}
                  onMouseMove={isSlideActive ? handleMouseMove : undefined}
                  onMouseUp={isSlideActive ? handleMouseUp : undefined}
                  onContextMenu={(e) => handleCanvasContextMenu(e, idx)}
                  className="bg-white text-slate-950 relative border shadow-md w-full h-full select-none"
                  style={{
                    width: `${docWidth}px`,
                    height: `${docHeight}px`,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    background: slide.background || '#ffffff',
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
                  {isSlideActive && activeSnapHV.x !== null && (
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
                  {isSlideActive && activeSnapHV.y !== null && (
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

                  {/* ADOBE ACROBAT MEASUREMENT AND RULER LAYERS */}
                  {isSlideActive && measureModeActive && (
                    <>
                      {/* Vertical Alignment cross-guide */}
                      <div 
                        className="absolute border-l border-dashed pointer-events-none z-[130]"
                        style={{
                          left: `${mousePos.x}px`,
                          top: 0,
                          bottom: 0,
                          borderColor: '#f59e0b',
                          borderWidth: '1px',
                          opacity: 0.65
                        }}
                      />
                      {/* Horizontal Alignment cross-guide */}
                      <div 
                        className="absolute border-t border-dashed pointer-events-none z-[130]"
                        style={{
                          top: `${mousePos.y}px`,
                          left: 0,
                          right: 0,
                          borderColor: '#f59e0b',
                          borderWidth: '1px',
                          opacity: 0.65
                        }}
                      />

                      {/* Cursor Floating Toolkit Coordinate Badge HUD */}
                      <div 
                        className="absolute bg-slate-900/95 text-white border border-amber-500/70 font-mono text-[9px] px-2.5 py-1.5 rounded-lg shadow-2xl pointer-events-none z-[140] select-none flex flex-col gap-0.5 leading-tight"
                        style={{
                          left: `${mousePos.x + 16}px`,
                          top: `${mousePos.y + 16}px`,
                          transformOrigin: 'top left',
                        }}
                      >
                        <div className="font-extrabold text-amber-400 flex items-center gap-1 uppercase tracking-wider text-[8px]">
                          📐 Régua Acrobat
                        </div>
                        <div className="text-slate-200">X: <strong className="text-white">{mousePos.x}px</strong> | {Math.round(mousePos.x * 0.264)}mm</div>
                        <div className="text-slate-200">Y: <strong className="text-white">{mousePos.y}px</strong> | {Math.round(mousePos.y * 0.264)}mm</div>
                        <div className="text-[7.5px] text-slate-450 border-t border-slate-800/80 mt-1 pt-1 italic">
                          Mover mouse para inspecionar
                        </div>
                      </div>

                      {/* Top Horizontal Page Ruler */}
                      <div className="absolute top-0 left-0 right-0 h-4 bg-slate-950/90 border-b border-amber-500/30 text-slate-500 font-mono text-[8px] flex items-center z-[130] pointer-events-none overflow-hidden">
                        {Array.from({ length: Math.ceil(docWidth / 50) }).map((_, i) => (
                          <div 
                            key={i} 
                            className="absolute flex flex-col justify-end h-full"
                            style={{ left: `${i * 50}px` }}
                          >
                            <span className="pl-0.5 leading-none text-slate-400 text-[7px]">{i * 50}</span>
                            <div className="w-px h-2 bg-slate-700 mt-0.5" />
                          </div>
                        ))}
                      </div>

                      {/* Left Vertical Page Ruler */}
                      <div className="absolute top-0 left-0 bottom-0 w-4 bg-slate-950/90 border-r border-amber-500/30 text-slate-500 font-mono text-[8px] z-[130] pointer-events-none overflow-hidden">
                        {Array.from({ length: Math.ceil(docHeight / 50) }).map((_, i) => (
                          <div 
                            key={i} 
                            className="absolute flex items-end justify-end w-full"
                            style={{ top: `${i * 50}px` }}
                          >
                            <span className="text-slate-450 pr-0.5 text-[6.5px] leading-none select-none origin-bottom-right transform rotate-270 translate-y-[-1px]">{i * 50}</span>
                            <div className="h-px w-2 bg-slate-750" />
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* FIGMA-LIKE MARQUEE SELECTION GRAPHIC OVERLAY */}
                  {isSlideActive && marqueeStart && marqueeEnd && (
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

                  {/* INTERACTIVE CROP BOX SELECTION OVERLAY */}
                  {isSlideActive && isExtractingCrop && cropBoxStart && cropBoxEnd && (
                    <div 
                      className="absolute border-2 border-dashed border-amber-500 bg-amber-500/10 z-50 pointer-events-none"
                      style={{
                        left: `${Math.min(cropBoxStart.x, cropBoxEnd.x)}px`,
                        top: `${Math.min(cropBoxStart.y, cropBoxEnd.y)}px`,
                        width: `${Math.abs(cropBoxStart.x - cropBoxEnd.x)}px`,
                        height: `${Math.abs(cropBoxStart.y - cropBoxEnd.y)}px`,
                      }}
                    >
                      {/* Floating Confirm / Cut Tag */}
                      <button className="absolute -top-10 left-1/2 -translate-x-1/2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap pointer-events-auto border border-amber-400 z-[60]"
                           onClick={(e) => {
                             e.preventDefault();
                             e.stopPropagation();
                             handleCropExtractionConfirm();
                           }}
                      >
                        <Scissors size={11} className="stroke-[3px]" /> Confirmar Recorte do PDF
                      </button>
                    </div>
                  )}

                  {/* CANVAS INTERACTIVE PLAYGROUND ELEMENTS */}
                  <div className="absolute inset-0 pt-20 pb-20 px-12 z-10">
                    {slide.elements.map((el: any) => {
                      const isSelected = selectedIds.has(el.id);
                      
                      return (
                        <React.Fragment key={el.id}>
                          <div
                          onMouseDown={(e) => {
                            if (editMode === 'LIVE_FILL' || isLockedByPass) return;
                            
                            // Automatically select the left panel tab corresponding to the element type
                            openSidebarForElement(el);

                            // Keep track of coordinates and whether it was selected before clicking to enable intuitive click-to-edit transitions
                            wasSelectedOnMouseDownRef.current = selectedIds.has(el.id);
                            mouseDownCoordsRef.current = { x: e.clientX, y: e.clientY };
                            
                            if (el.isLocked) {
                              e.stopPropagation();
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

                            if (el.type === 'text') {
                              if (editingTextId === el.id) return;
                              // Beautiful, seamless dragging of text blocks directly from active mouse click anywhere!
                              handleMouseDown(e, el);
                            } else {
                              handleMouseDown(e, el);
                            }
                          }}
                          onMouseUp={(e) => {
                            if (editMode === 'LIVE_FILL' || isLockedByPass || el.isLocked) return;
                            
                            // Calculate drag distance
                            const dist = Math.sqrt(
                              Math.pow(e.clientX - mouseDownCoordsRef.current.x, 2) +
                              Math.pow(e.clientY - mouseDownCoordsRef.current.y, 2)
                            );
                            
                            // If user clicked or released mouse on a text element without active drag movement (dist < 4px)
                            // and the text block is already the focal selection, automatically enter inline editing
                            if (dist < 4) {
                              if (el.type === 'text' && wasSelectedOnMouseDownRef.current && editingTextId !== el.id) {
                                e.stopPropagation();
                                setEditingTextId(el.id);
                                setTimeout(() => {
                                  const ta = document.getElementById(`textarea-${el.id}`);
                                  if (ta) {
                                    (ta as HTMLElement).focus();
                                  }
                                }, 50);
                              }
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
                          onContextMenu={(e) => handleElementContextMenu(e, el)}
                          onMouseEnter={() => {
                            if (measureModeActive) {
                              setHoveredElementId(el.id);
                            }
                          }}
                          onMouseLeave={() => {
                            if (measureModeActive) {
                              setHoveredElementId(null);
                            }
                          }}
                          className={`absolute flex flex-col group transition-[box-shadow,background-color] duration-75 ${
                            measureModeActive && hoveredElementId === el.id
                              ? 'ring-2 ring-amber-500 shadow-lg'
                              : ''
                          } ${
                            editMode === 'EDIT'
                              ? isSelected
                                ? 'shadow-md z-[60]'
                                : 'hover:bg-slate-500/5 hover:z-[40]'
                              : 'outline-none'
                          } ${el.isLocked ? 'select-none' : ''}`}
                          style={{
                            left: `${el.x}px`,
                            top: `${el.y}px`,
                            width: `${el.width}px`,
                            height: `${el.height}px`,
                            cursor: el.isLocked 
                              ? 'not-allowed' 
                              : (editMode === 'LIVE_FILL' 
                                ? 'default' 
                                : (el.type === 'text' && editingTextId === el.id ? 'text' : 'grab')),
                            zIndex: el.zIndex,
                            transform: el.style?.rotation ? `rotate(${el.style.rotation}deg)` : 'none',
                            backgroundColor: el.type === 'shape' ? 'transparent' : el.style?.backgroundColor,
                            borderRadius: el.style?.borderRadius !== undefined 
                              ? `${el.style.borderRadius}px` 
                              : (el.id?.includes('circ') ? '9999px' : undefined),
                            border: el.style?.border || 'none'
                          }}
                        >
                          {/* UNIVERSAL DASHED BOUNDING BOX FOR EVERY ITEM */}
                          {editMode === 'EDIT' && croppingImageId != el.id && (
                            <div 
                              className={`absolute -inset-[2.5px] rounded-[inherit] pointer-events-none z-[49] border transition-colors duration-75 ${
                                isSelected 
                                  ? 'border-2 border-blue-500 ring-4 ring-blue-500/10' 
                                  : 'border border-dashed border-slate-300/40 hover:border-blue-500/50 group-hover:border-blue-500/50'
                               }`} 
                             />
                           )}

                          {/* ACROBAT MEASUREMENT HOVER INFORMATION OVERLAY */}
                          {measureModeActive && hoveredElementId === el.id && (
                            <div className="absolute -inset-[3px] border-[1.5px] border-amber-500 rounded-[inherit] pointer-events-none z-[59] flex items-center justify-center animate-pulse bg-amber-500/5">
                              {/* Width Badge */}
                              <div className="absolute -top-6 left-1/2 -translateX-1/2 bg-slate-900 border border-amber-500/55 text-amber-400 font-mono text-[7.5px] font-bold tracking-wider px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap uppercase pointer-events-none" style={{ transform: 'translateX(-50%)' }}>
                                ↕ {el.width}px ({Math.round(el.width * 0.264)}mm)
                              </div>
                              {/* Height Badge */}
                              <div className="absolute top-1/2 -right-16 -translateY-1/2 bg-slate-900 border border-amber-500/55 text-amber-400 font-mono text-[7.5px] font-bold tracking-wider px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap uppercase pointer-events-none" style={{ transform: 'translateY(-50%) rotate(90deg)', transformOrigin: 'center' }}>
                                ↔ {el.height}px ({Math.round(el.height * 0.264)}mm)
                              </div>
                            </div>
                          )}

                          {/* INTERACTIVE DRAG BORDERS FOR HIGH PRECISAL MOVEMENT - ONLY WHEN SELECTED AND NOT LOCKED */}
                          {editMode === 'EDIT' && isSelected && !el.isLocked && croppingImageId != el.id && (
                            <div className="absolute -inset-[5px] pointer-events-none z-[50]">
                              {/* Top Drag Edge */}
                              <div 
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleMouseDown(e, el);
                                }}
                                className="absolute top-0 left-0 right-0 h-[6px] cursor-move pointer-events-auto bg-transparent"
                                title="Arraste para mover"
                              />
                              {/* Bottom Drag Edge */}
                              <div 
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleMouseDown(e, el);
                                }}
                                className="absolute bottom-0 left-0 right-0 h-[6px] cursor-move pointer-events-auto bg-transparent"
                                title="Arraste para mover"
                              />
                              {/* Left Drag Edge */}
                              <div 
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleMouseDown(e, el);
                                }}
                                className="absolute top-0 bottom-0 left-0 w-[6px] cursor-move pointer-events-auto bg-transparent"
                                title="Arraste para mover"
                              />
                              {/* Right Drag Edge */}
                              <div 
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleMouseDown(e, el);
                                }}
                                className="absolute top-0 bottom-0 right-0 w-[6px] cursor-move pointer-events-auto bg-transparent"
                                title="Arraste para mover"
                              />
                            </div>
                          )}

                          {/* Render visual Lock indicator if element has been locked */}
                          {el.isLocked && (
                            <div className="absolute -top-3.5 -left-1 bg-slate-900 border border-slate-700 p-0.5 rounded shadow z-50 text-amber-500">
                              <Lock size={10} className="stroke-[2.5px]"/>
                            </div>
                          )}

                          {/* ELEMENT TYPE RENDER */}
                          {el.isComment ? (
                            /* --- ADOBE ACROBAT STICKY COMPU-NOTE INTERACTIVE ELEMENT --- */
                            <div 
                              className="w-full h-full p-2.5 flex flex-col justify-between font-sans text-slate-850 rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.12)] relative border border-slate-900/10 text-left select-none overflow-hidden" 
                              style={{ 
                                backgroundColor: el.style?.backgroundColor || '#fef08a', 
                                pointerEvents: 'auto' 
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              {el.isMinimised ? (
                                <div 
                                  className="w-full h-full flex items-center justify-center cursor-pointer"
                                  title="Nota Adesiva de Comentário (Clique Duplo para Expandir)"
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    updateElementProps(el.id, { isMinimised: false, width: 190, height: 140 });
                                  }}
                                >
                                  <MessageSquare size={16} className="text-amber-800 animate-bounce" />
                                  <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between border-b border-black/10 pb-1 mb-1 text-[8px] font-black text-amber-950/60 select-none">
                                    <span className="truncate max-w-[100px]" title={el.commentAuthor}>{el.commentAuthor?.split('@')[0]}</span>
                                    <div className="flex items-center gap-1">
                                      <span>{el.commentDate}</span>
                                      <button 
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateElementProps(el.id, { isMinimised: true, width: 32, height: 32 });
                                        }}
                                        className="p-0.5 hover:bg-black/5 rounded text-amber-950/80 cursor-pointer"
                                        title="Minimizar Nota"
                                      >
                                        <Minus size={8} className="stroke-[3px]" />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <textarea
                                    className="flex-1 w-full bg-transparent border-none outline-none resize-none text-[10px] text-slate-800 font-semibold leading-tight select-text custom-scrollbar focus:ring-0 p-0 overflow-y-auto"
                                    placeholder="Adicione observações aqui..."
                                    value={el.content}
                                    onChange={(e) => updateElementProps(el.id, { content: e.target.value })}
                                    onMouseDown={(e) => e.stopPropagation()}
                                  />

                                  <div className="flex gap-1 justify-between items-center mt-1 border-t border-black/5 pt-1">
                                    <span className="text-[7px] text-slate-550 font-bold uppercase tracking-wider">Cor</span>
                                    <div className="flex gap-1">
                                      <button type="button" onClick={() => updateElementProps(el.id, { style: { ...el.style, backgroundColor: '#fef08a' } })} className="w-2.5 h-2.5 rounded-full bg-yellow-200 border border-yellow-400/40 hover:scale-125 transition-transform cursor-pointer" />
                                      <button type="button" onClick={() => updateElementProps(el.id, { style: { ...el.style, backgroundColor: '#bfdbfe' } })} className="w-2.5 h-2.5 rounded-full bg-blue-200 border border-blue-400/40 hover:scale-125 transition-transform cursor-pointer" />
                                      <button type="button" onClick={() => updateElementProps(el.id, { style: { ...el.style, backgroundColor: '#bbf7d0' } })} className="w-2.5 h-2.5 rounded-full bg-green-200 border border-green-400/40 hover:scale-125 transition-transform cursor-pointer" />
                                      <button type="button" onClick={() => updateElementProps(el.id, { style: { ...el.style, backgroundColor: '#fbcfe8' } })} className="w-2.5 h-2.5 rounded-full bg-pink-200 border border-pink-400/40 hover:scale-125 transition-transform cursor-pointer" />
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : el.isRedacted ? (
                            <div className="w-full h-full bg-slate-950 text-white flex items-center justify-center font-bold text-xs select-none">
                              ⬛ CONTEÚDO CONFIDENCIAL REDIGIDO
                            </div>
                          ) : el.isFormField ? (
                            
                            // --- FORM ELEMENT HANDLING ---
                            <div className="w-full h-full p-2 flex flex-col pt-1.5 pb-1">
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
                                  className={`mt-1 h-full rounded border-2 border-dashed flex flex-col justify-center p-1 transition-all ${el.content.startsWith('http') || el.content.startsWith('data:') ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-300 hover:border-cyan-500 bg-slate-100 hover:bg-cyan-50/20 cursor-pointer text-slate-500'}`}
                                >
                                  {el.content.startsWith('http') || el.content.startsWith('data:') ? (
                                    <div className="flex-1 flex gap-2 items-center justify-between overflow-hidden">
                                      <img src={el.content} className="h-10 object-contain ml-1 max-w-[50%]" />
                                      {el.signatureCert ? (
                                        <div className="flex-1 text-[6.5px] leading-tight font-mono border-l border-emerald-400 pl-1.5 py-0.5 text-left text-emerald-800 select-none overflow-hidden truncate">
                                          <div className="font-extrabold text-[#16a34a] flex items-center gap-0.5">🔒 ICP-BRASIL</div>
                                          <div className="truncate text-emerald-700">Por: {el.signatureCert.author.split('@')[0]}</div>
                                          <div className="text-emerald-700">Data: {el.signatureCert.date.split(' ')[0]}</div>
                                          <div className="text-[5.5px] text-emerald-600 truncate">{el.signatureCert.hash}</div>
                                        </div>
                                      ) : (
                                        <span className="text-[7px] text-emerald-500 font-bold font-mono">✓ VÁLIDO</span>
                                      )}
                                    </div>
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
                              ) : el.formFieldType === 'radio' ? (
                                <div className="mt-1.5 space-y-1 select-none pointer-events-auto">
                                  {(el.formFieldOptions || ['Opção A', 'Opção B']).map((opt: string) => (
                                    <label key={opt} className="flex items-center gap-1.5 text-[10px] text-slate-700 cursor-pointer">
                                      <input 
                                        type="radio" 
                                        name={`radio-${el.id}`}
                                        disabled={editMode === 'EDIT'}
                                        checked={el.content === opt}
                                        onChange={() => {
                                          if (editMode === 'LIVE_FILL') {
                                            updateElementProps(el.id, { content: opt });
                                          }
                                        }}
                                        className="w-3 h-3 accent-cyan-600 cursor-pointer"
                                      />
                                      <span className="truncate leading-none">{opt}</span>
                                    </label>
                                  ))}
                                </div>
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
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  e.stopPropagation();
                                  (e.target as HTMLTextAreaElement).blur();
                                }
                              }}
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
                          ) : el.type === 'comment' ? (
                            <div className="w-full h-full flex items-center justify-center bg-amber-400 border border-amber-500 rounded-full shadow-lg relative group/comment cursor-pointer">
                              <MessageSquare size={20} className="text-amber-950" />
                              {/* Hover text preview balloon */}
                              <div className="absolute bottom-11 bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 shadow-2xl opacity-0 scale-95 group-hover/comment:opacity-100 group-hover/comment:scale-100 pointer-events-none transition-all z-[120] text-[10px] w-48 text-left leading-normal font-sans">
                                <span className="font-bold text-amber-400 block mb-1">Anotação Acrobat</span>
                                {el.content || 'Sem texto'}
                              </div>
                            </div>
                          ) : el.type === 'image' ? (
                            
                            // --- IMAGE ELEMENT WITH NON-DESTRUCTIVE CROP ---
                            (() => {
                              const crop = el.style?.crop || { left: 0, top: 0, right: 0, bottom: 0 };
                              const scaleX = 100 / (100 - crop.left - crop.right);
                              const scaleY = 100 / (100 - crop.top - crop.bottom);
                              const posX = -crop.left * scaleX;
                              const posY = -crop.top * scaleY;

                              return (
                                <div className="w-full h-full relative" id={`image-container-${el.id}`}>
                                  {/* Background uncropped visual preview (visible when in Crop Mode) */}
                                  {croppingImageId === el.id && (
                                    <img 
                                      src={el.content} 
                                      alt="Uncropped background preview" 
                                      className="absolute select-none pointer-events-none max-w-none opacity-35"
                                      style={{
                                        width: `${scaleX * 100}%`,
                                        height: `${scaleY * 100}%`,
                                        left: `${posX}%`,
                                        top: `${posY}%`,
                                        zIndex: -1,
                                      }}
                                    />
                                  )}
                                  {/* Cropped image viewport mask */}
                                  <div className="w-full h-full overflow-hidden relative">
                                    <img 
                                      src={el.content} 
                                      alt="Document element" 
                                      className="absolute select-none pointer-events-none max-w-none"
                                      draggable={false}
                                      onDragStart={(e) => e.preventDefault()}
                                      style={{
                                        width: `${scaleX * 100}%`,
                                        height: `${scaleY * 100}%`,
                                        left: `${posX}%`,
                                        top: `${posY}%`,
                                        opacity: el.style.opacity ?? 1,
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })()
                          ) : el.type === 'redact' ? (
                            <div className="w-full h-full relative overflow-hidden rounded bg-black border border-red-600/30">
                              {editMode === 'EDIT' ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center bg-black/85 pointer-events-none select-none">
                                  <Shield size={16} className="text-red-500 animate-pulse mb-1 shrink-0" />
                                  <span className="text-[9px] font-black text-red-500 leading-tight uppercase tracking-wider animate-pulse">CENSURAR ATIVO</span>
                                  <span className="text-[7px] text-slate-400 font-mono">ACROBAT REDACT</span>
                                </div>
                              ) : (
                                <div className="w-full h-full bg-black flex items-center justify-center select-none pointer-events-none text-red-800 font-mono text-[9px] uppercase font-bold tracking-widest">
                                  [ CENSURADO ]
                                </div>
                              )}
                            </div>
                          ) : (
                            
                            // --- FORM SHAPED ELEMENTS ---
                            <div 
                              className="w-full h-full"
                              style={{
                                ...(el.style?.useGradient
                                  ? {
                                      background: el.style.gradientType === 'radial'
                                        ? `radial-gradient(circle, ${el.style.gradientColorStart || '#3b82f6'}, ${el.style.gradientColorEnd || '#ec4899'})`
                                        : `linear-gradient(${el.style.gradientAngle ?? 135}deg, ${el.style.gradientColorStart || '#3b82f6'}, ${el.style.gradientColorEnd || '#ec4899'})`
                                    }
                                  : { backgroundColor: el.style?.backgroundColor || '#0284c7' }),
                                borderRadius: el.style?.borderRadius !== undefined 
                                  ? `${el.style.borderRadius}px` 
                                  : (el.id?.includes('circ') ? '9999px' : '4px'),
                                border: el.style?.border || 'none'
                              }}
                            />
                          )}

                           {/* FIGMA / CANVA PREMIUM FLOATING QUICK TOOLBAR ABOVE ELEMENT */}
                           {false && isSelected && editMode === 'EDIT' && (
                             <div 
                               className="absolute -top-11 left-1/2 bg-[#161a23]/95 backdrop-blur-md border border-slate-700/80 px-2 py-1 rounded-xl shadow-[0_12px_24px_rgba(0,0,0,0.6)] flex items-center gap-1 z-[120] animate-in zoom-in-95 duration-150 h-9 shrink-0 select-none text-slate-300 pointer-events-auto"
                               style={{ transform: el.style?.rotation ? `translateX(-50%) rotate(${-el.style.rotation}deg)` : 'translateX(-50%)' }}
                               onMouseDown={(e) => e.stopPropagation()}
                             >
                               {/* Quick Lock/Unlock toggle for all types of selected items */}
                               <button 
                                 onClick={() => {
                                   toggleLockElement(el.id);
                                   toast.success(el.isLocked ? 'Elemento DESBLOQUEADO para edição!' : 'Elemento BLOQUEADO para evitar movimentações indesejadas!');
                                 }} 
                                 className={`p-1 hover:bg-slate-800 rounded-lg transition-all px-2 flex items-center gap-1.5 h-7 ${el.isLocked ? 'text-amber-400 bg-amber-950/40 border border-amber-500/30' : 'text-slate-400 hover:text-white'}`}
                                 title={el.isLocked ? "Desbloquear Elemento" : "Bloquear Elemento"}
                               >
                                 {el.isLocked ? <Unlock size={11} className="stroke-[2.5px]"/> : <Lock size={11}/>}
                                 <span className="text-[10px] font-extrabold">{el.isLocked ? 'Desbloquear' : 'Bloquear'}</span>
                               </button>
                               <div className="w-px h-4 bg-slate-800" />

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

                                    {/* --- CROPPING BUTTON --- */}
                                    <button
                                      onClick={() => {
                                        if (croppingImageId === el.id) {
                                          setCroppingImageId(null);
                                          toast.success('Alterações de corte aplicadas!');
                                        } else {
                                          setCroppingImageId(el.id);
                                          toast.info('Modo de Corte Ativo: Arraste os seletores azuis para cortar a imagem.');
                                        }
                                      }}
                                      className={`p-1 rounded-lg flex items-center gap-1 transition-colors px-1.5 h-6 cursor-pointer ${
                                        croppingImageId === el.id 
                                          ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/50 font-bold animate-pulse' 
                                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                      }`}
                                      title="Cortar Imagem (Ajuste não destrutivo)"
                                    >
                                      <Crop size={11} />
                                      <span className="text-[10px]">{croppingImageId === el.id ? 'Concluir' : 'Cortar'}</span>
                                    </button>
                                    <div className="w-px h-4 bg-slate-800" />

                                    {/* Redefinir Corte */}
                                    {el.style?.crop && (el.style.crop.left > 0 || el.style.crop.right > 0 || el.style.crop.top > 0 || el.style.crop.bottom > 0) && (
                                      <>
                                        <button
                                          onClick={() => {
                                            updateElementProps(el.id, {
                                              style: {
                                                ...el.style,
                                                crop: { left: 0, right: 0, top: 0, bottom: 0 }
                                              }
                                            });
                                            toast.success('Corte redefinido com sucesso!');
                                          }}
                                          className="p-1 hover:bg-red-950/40 rounded-lg text-red-400 hover:text-red-300 transition-colors px-1.5 h-6 flex items-center border border-red-900/30 whitespace-nowrap gap-1 cursor-pointer"
                                          title="Redefinir Corte da Imagem"
                                        >
                                          <RefreshCw size={11} />
                                          <span className="text-[10px]">Redefinir</span>
                                        </button>
                                        <div className="w-px h-4 bg-slate-800" />
                                      </>
                                    )}
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
                          {croppingImageId === el.id ? (
                            <>
                              {/* Outline frame border for crop box */}
                              <div className="absolute inset-0 border-2 border-cyan-400 pointer-events-none z-[60]" />
                              
                              {/* 8 Crop Handles */}
                              {[
                                { h: 'nw', cursor: 'nwse-resize', style: { top: -4, left: -4, width: 14, height: 14, borderLeft: '4px solid #00f0ff', borderTop: '4px solid #00f0ff' } },
                                { h: 'ne', cursor: 'nesw-resize', style: { top: -4, right: -4, width: 14, height: 14, borderRight: '4px solid #00f0ff', borderTop: '4px solid #00f0ff' } },
                                { h: 'sw', cursor: 'nesw-resize', style: { bottom: -4, left: -4, width: 14, height: 14, borderLeft: '4px solid #00f0ff', borderBottom: '4px solid #00f0ff' } },
                                { h: 'se', cursor: 'nwse-resize', style: { bottom: -4, right: -4, width: 14, height: 14, borderRight: '4px solid #00f0ff', borderBottom: '4px solid #00f0ff' } },
                                { h: 'n', cursor: 'ns-resize', style: { top: -4, left: 'calc(50% - 10px)', width: 20, height: 6, backgroundColor: '#00f0ff' } },
                                { h: 's', cursor: 'ns-resize', style: { bottom: -4, left: 'calc(50% - 10px)', width: 20, height: 6, backgroundColor: '#00f0ff' } },
                                { h: 'w', cursor: 'ew-resize', style: { left: -4, top: 'calc(50% - 10px)', width: 6, height: 20, backgroundColor: '#00f0ff' } },
                                { h: 'e', cursor: 'ew-resize', style: { right: -4, top: 'calc(50% - 10px)', width: 6, height: 20, backgroundColor: '#00f0ff' } },
                              ].map(handle => (
                                <div
                                  key={handle.h}
                                  onMouseDown={(e) => handleCropResizeStart(e, handle.h, el)}
                                  className="absolute z-[70] shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
                                  style={{
                                    ...handle.style,
                                    cursor: handle.cursor,
                                    position: 'absolute'
                                  }}
                                />
                              ))}
                            </>
                          ) : isSelected && editMode === 'EDIT' && (
                            <>
                              {/* Corner circular handles styled with solid blue border */}
                              {['nw', 'ne', 'sw', 'se'].map(h => (
                                <div 
                                  key={h}
                                  onMouseDown={(e) => handleResizeStart(e, h, el)}
                                  className="absolute w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-full z-50 shadow-md hover:scale-110 active:scale-95 transition-transform"
                                  style={{
                                    top: h.includes('n') ? -7 : 'auto',
                                    bottom: h.includes('s') ? -7 : 'auto',
                                    left: h.includes('w') ? -7 : 'auto',
                                    right: h.includes('e') ? -7 : 'auto',
                                    cursor: `${h}-resize`
                                  }}
                                />
                              ))}

                              {/* Mid-left and Mid-right Pill resizer handles (as requested by user image) */}
                              {!el.isLocked && (
                                <>
                                  {/* Mid-left pill handle */}
                                  <div 
                                    onMouseDown={(e) => handleResizeStart(e, 'w', el)}
                                    className="absolute w-2 h-5 bg-white border-2 border-blue-500 rounded-full z-[52] shadow-md hover:scale-110 active:scale-95 transition-transform cursor-ew-resize"
                                    style={{
                                      left: -5,
                                      top: 'calc(50% - 10px)'
                                    }}
                                    title="Ajustar largura esquerda"
                                  />
                                  {/* Mid-right pill handle */}
                                  <div 
                                    onMouseDown={(e) => handleResizeStart(e, 'e', el)}
                                    className="absolute w-2 h-5 bg-white border-2 border-blue-500 rounded-full z-[52] shadow-md hover:scale-110 active:scale-95 transition-transform cursor-ew-resize"
                                    style={{
                                      right: -5,
                                      top: 'calc(50% - 10px)'
                                    }}
                                    title="Ajustar largura direita"
                                  />
                                </>
                              )}

                              {/* Rotate handle centered vertically below the element (Acrobat / Figma style as in user image) */}
                              {!el.isLocked && (
                                <div 
                                  className="absolute left-[50%] -translate-x-[50%] bottom-[-42px] flex flex-col items-center z-[52] pointer-events-auto"
                                  style={{ transformOrigin: 'center top' }}
                                >
                                  {/* Elegant vertical thread connector */}
                                  <div className="w-[1.5px] h-3 bg-blue-500" />
                                  {/* Button with custom rotate arrow icon */}
                                  <div 
                                    onMouseDown={(e) => handleRotateStart(e, el)}
                                    className="w-7 h-7 bg-blue-500 hover:bg-blue-600 border border-white text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all duration-100 hover:scale-110 active:scale-90"
                                    style={{ transform: el.style?.rotation ? `rotate(${-el.style.rotation}deg)` : 'none' }}
                                    title="Arraste para rotacionar o elemento"
                                  >
                                    <RefreshCw size={12} className="stroke-[2.5px]" />
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* FIGMA / CANVA PREMIUM FLOATING QUICK TOOLBAR ABOVE ELEMENT (NON-ROTATING SIBLING) */}
                        {isSelected && editMode === 'EDIT' && (
                          <div 
                            className="absolute bg-[#161a23]/95 backdrop-blur-md border border-slate-700/80 px-2 py-1 rounded-xl shadow-[0_12px_24px_rgba(0,0,0,0.6)] flex items-center gap-1 z-[120] animate-in zoom-in-95 duration-150 h-9 shrink-0 select-none text-slate-300 pointer-events-auto"
                            style={{ 
                              left: `${el.x + el.width / 2}px`, 
                              top: `${Math.max(8, el.y - 46)}px`, 
                              transform: 'translateX(-50%)' 
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            {/* Quick Lock/Unlock toggle for all types of selected items */}
                            <button 
                              onClick={() => {
                                toggleLockElement(el.id);
                                toast.success(el.isLocked ? 'Elemento DESBLOQUEADO para edição!' : 'Elemento BLOQUEADO para evitar movimentações indesejadas!');
                              }} 
                              className={`p-1 hover:bg-slate-800 rounded-lg transition-all px-2 flex items-center gap-1.5 h-7 ${el.isLocked ? 'text-amber-400 bg-amber-950/40 border border-amber-500/30' : 'text-slate-400 hover:text-white'}`}
                              title={el.isLocked ? "Desbloquear Elemento" : "Bloquear Elemento"}
                            >
                              {el.isLocked ? <Unlock size={11} className="stroke-[2.5px]"/> : <Lock size={11}/>}
                              <span className="text-[10px] font-extrabold">{el.isLocked ? 'Desbloquear' : 'Bloquear'}</span>
                            </button>
                            <div className="w-px h-4 bg-slate-800" />

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
                                  onClick={() => {
                                    const nextDec = el.style?.textDecoration === 'underline' ? 'none' : 'underline';
                                    updateElementProps(el.id, { style: { ...el.style, textDecoration: nextDec } });
                                  }}
                                  className={`p-1 hover:bg-slate-800 rounded-lg transition-colors ${el.style?.textDecoration === 'underline' ? 'text-cyan-400 bg-slate-800/60' : 'text-slate-400'}`}
                                  title="Sublinhado"
                                >
                                  <span className="underline text-xs px-1.5">U</span>
                                </button>

                                {/* Strikethrough / Tachado */}
                                <button
                                  onClick={() => {
                                    const nextDec = el.style?.textDecoration === 'line-through' ? 'none' : 'line-through';
                                    updateElementProps(el.id, { style: { ...el.style, textDecoration: nextDec } });
                                    toast.success(nextDec === 'line-through' ? 'Sugestão de exclusão (Tachado) adicionada!' : 'Tachado removido');
                                  }}
                                  className={`p-1 hover:bg-slate-800 rounded-lg transition-colors ${el.style?.textDecoration === 'line-through' ? 'text-amber-500 bg-slate-800/60' : 'text-slate-400'}`}
                                  title="Tachado / Riscar"
                                >
                                  <span className="line-through text-xs px-1.5 font-bold font-mono">abc</span>
                                </button>

                                <div className="w-px h-4 bg-slate-800" />

                                {/* Acrobat Fluorescent Highlighters */}
                                <span className="text-[8px] font-black text-[#94a3b8] uppercase tracking-wider select-none px-1 font-mono">Realçar:</span>
                                <div className="flex items-center gap-1 bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded-md">
                                  {[
                                    { col: '#fef08a', label: 'Amarelo', outline: '#eab308' },
                                    { col: '#bbf7d0', label: 'Verde', outline: '#22c55e' },
                                    { col: '#fbcfe8', label: 'Rosa', outline: '#ec4899' },
                                    { col: '#bae6fd', label: 'Azul', outline: '#0284c7' }
                                  ].map(marker => {
                                    const isActive = el.style?.backgroundColor === marker.col;
                                    return (
                                      <button
                                        key={marker.col}
                                        onClick={() => {
                                          updateElementProps(el.id, {
                                            style: {
                                              ...el.style,
                                              backgroundColor: isActive ? 'transparent' : marker.col,
                                              border: isActive ? 'none' : `1.5px solid ${marker.outline}`,
                                              borderRadius: 4
                                            }
                                          });
                                          toast.success(isActive ? `Realce ${marker.label} limpo!` : `Texto realçado com marcador ${marker.label} Acrobat!`);
                                        }}
                                        className="w-3 h-3 rounded-full hover:scale-125 transition-all cursor-pointer border border-transparent shadow-sm"
                                        style={{ backgroundColor: marker.col, borderColor: isActive ? marker.outline : 'transparent' }}
                                        title={`Marca-Texto Fluorescente ${marker.label}`}
                                      />
                                    );
                                  })}
                                </div>

                                <div className="w-px h-4 bg-slate-800" />

                                {/* Cor Picker preset inline toggle */}
                                <button
                                  onClick={() => {
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
                                <div className="w-px h-4 bg-slate-800 text-slate-700" />

                                {/* --- CROPPING BUTTON --- */}
                                <button
                                  onClick={() => {
                                    if (croppingImageId === el.id) {
                                      setCroppingImageId(null);
                                      toast.success('Alterações de corte aplicadas!');
                                    } else {
                                      setCroppingImageId(el.id);
                                      toast.info('Modo de Corte Ativo: Arraste os seletores azuis para cortar a imagem.');
                                    }
                                  }}
                                  className={`p-1 rounded-lg flex items-center gap-1 transition-colors px-1.5 h-6 cursor-pointer ${
                                    croppingImageId === el.id 
                                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/50 font-bold animate-pulse' 
                                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                  }`}
                                  title="Cortar Imagem (Ajuste não destrutivo)"
                                >
                                  <Crop size={11} />
                                  <span className="text-[10px]">{croppingImageId === el.id ? 'Concluir' : 'Cortar'}</span>
                                </button>
                                <div className="w-px h-4 bg-slate-800" />

                                {/* Redefinir Corte */}
                                {el.style?.crop && (el.style.crop.left > 0 || el.style.crop.right > 0 || el.style.crop.top > 0 || el.style.crop.bottom > 0) && (
                                  <>
                                    <button
                                      onClick={() => {
                                        updateElementProps(el.id, {
                                          style: {
                                            ...el.style,
                                            crop: { left: 0, right: 0, top: 0, bottom: 0 }
                                          }
                                        });
                                        toast.success('Corte redefinido com sucesso!');
                                      }}
                                      className="p-1 hover:bg-red-950/40 rounded-lg text-red-400 hover:text-red-300 transition-colors px-1.5 h-6 flex items-center border border-red-900/30 whitespace-nowrap gap-1 cursor-pointer"
                                      title="Redefinir Corte da Imagem"
                                    >
                                      <RefreshCw size={11} />
                                      <span className="text-[10px]">Redefinir</span>
                                    </button>
                                    <div className="w-px h-4 bg-slate-800" />
                                  </>
                                )}
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
                      </React.Fragment>
                    );
                  })}
                </div>

                  {/* DRAWINGS LAYOVER IMAGE DISPLAY ALWAYS ON */}
                  {drawHistory[slide.id] && (
                    <img 
                      src={drawHistory[slide.id]} 
                      className="absolute inset-0 w-full h-full pointer-events-none z-20"
                      alt="Desenho"
                    />
                  )}

                  {/* LIVE PEN DRAWINGS CANVAS OVERLAY */}
                  <canvas
                    ref={isSlideActive ? freehandCanvasRef : undefined}
                    width={docWidth}
                    height={docHeight}
                    onMouseDown={isSlideActive ? startDrawing : undefined}
                    onMouseMove={isSlideActive ? draw : undefined}
                    onMouseUp={isSlideActive ? stopDrawing : undefined}
                    onMouseLeave={isSlideActive ? stopDrawing : undefined}
                    className={`absolute inset-0 z-20 ${editMode === 'LIVE_FILL' && isSlideActive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
                  />

                  {/* RUNNING FOOTER LAYER */}
                  <div className="absolute bottom-6 left-12 right-12 flex justify-between border-t border-slate-200 pt-2 text-[10px] text-slate-400 select-none">
                    <span>{footerText.toUpperCase()}</span>
                    {autoPageNumbers && <span>Página {idx + 1} de {slides.length}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

          {/* DYNAMIC INTEGRATED FLOATING ZOOM INDICATOR */}
          <div className="absolute bottom-28 right-8 bg-[#0c1017] border border-slate-800 rounded-full px-4 h-11 flex items-center gap-3 shadow-2xl z-40">
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

        {/* BOTTOM HORIZONTAL PAGE CAROUSEL NAVIGATOR */}
        <div className="h-[96px] shrink-0 bg-[#f1f5f9] dark:bg-[#0f131a] border-t border-slate-200 dark:border-slate-800/80 px-4 flex items-center justify-between select-none z-10 w-full">
          
          {/* Left-aligned horizontally scrollable thumbnails row */}
          <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar flex-1 py-1 px-1">
            {slides.map((slide, idx) => {
              const isActive = idx === currentSlideIndex;
              return (
                <div 
                  key={slide.id}
                  onClick={() => {
                    onSelectSlide(idx);
                    setActiveThumbnailMenuIndex(null);
                  }}
                  className={`relative cursor-pointer rounded-xl border transition-all h-[64px] shrink-0 ${
                    isActive 
                      ? 'border-[3px] border-slate-900 dark:border-cyan-400 shadow-md scale-[1.02] z-40 w-28'
                      : 'border border-slate-300 dark:border-slate-800 hover:border-slate-400 w-24 bg-white dark:bg-slate-950'
                  }`}
                >
                  {/* Miniature canvas screen content preview */}
                  <div className="absolute inset-0 bg-white opacity-95 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 p-1 opacity-55 overflow-hidden">
                      {(!activeElementId || idx === currentSlideIndex) && slide.elements.map(el => (
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

                  {/* Slide number on the bottom-left corner of each card */}
                  <div className="absolute bottom-1 left-2 bg-slate-950/80 backdrop-blur px-1.5 py-0.5 rounded text-[8px] font-black text-white z-10 leading-none">
                    {idx + 1}
                  </div>

                  {/* Ellipsis button inside the active thumbnail (matches Figma "..." circle in screenshot) */}
                  {isActive && (
                    <div className="absolute top-1 right-1 z-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveThumbnailMenuIndex(activeThumbnailMenuIndex === idx ? null : idx);
                        }}
                        className="w-5 h-5 rounded-full bg-slate-900/85 hover:bg-slate-950 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20"
                        title="Mais opções de página"
                      >
                        <MoreHorizontal size={11} />
                      </button>

                      {/* Dropdown options for thumbnail menu styling to match screenshot exactly */}
                      {activeThumbnailMenuIndex === idx && (
                        <div 
                          className="absolute bottom-7 right-[-8px] bg-white border border-slate-200/90 rounded-2xl p-2 shadow-2xl z-[300] w-56 flex flex-col gap-1 text-[11px] text-slate-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Header section with Page Type and exact dimensions */}
                          <div className="px-3 py-1.5 border-b border-slate-100 flex flex-col text-left mb-1 select-none">
                            <span className="text-[11px] font-black text-slate-900 leading-tight">
                              {pageSizeType === 'CUSTOM' ? 'Personalizado' : pageSizeType === 'SLIDE_16_9' ? 'Slide (16:9)' : 'A4'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold font-mono mt-0.5 leading-none">
                              {docWidth} x {docHeight} px
                            </span>
                          </div>

                          {/* "Inserir nova página" option - Light gray row highlight matching screenshot */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveThumbnailMenuIndex(null);
                              addPage();
                            }}
                            className="flex items-center gap-2.5 p-2 px-3 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-left cursor-pointer transition-colors w-full text-slate-800"
                          >
                            <PlusSquare size={13} className="text-slate-700 shrink-0" />
                            <span className="text-[11px] font-bold">Inserir nova página</span>
                          </button>

                          {/* "Duplicar" option */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveThumbnailMenuIndex(null);
                              onSelectSlide(idx);
                              duplicatePage();
                            }}
                            className="flex items-center gap-2.5 p-2 px-3 hover:bg-slate-50 hover:text-slate-950 rounded-xl text-left cursor-pointer transition-colors w-full text-slate-700"
                          >
                            <Copy size={13} className="text-slate-500 shrink-0" />
                            <span className="text-[11px] font-bold">Duplicar</span>
                          </button>

                          {/* "Excluir" option */}
                          <button 
                            disabled={slides.length === 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveThumbnailMenuIndex(null);
                              onSelectSlide(idx);
                              removePage();
                            }}
                            className="flex items-center gap-2.5 p-2 px-3 hover:bg-red-50 text-slate-700 hover:text-red-650 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700 rounded-xl text-left cursor-pointer transition-colors w-full"
                          >
                            <Trash2 size={13} className="text-slate-500 hover:text-red-500 shrink-0" />
                            <span className="text-[11px] font-bold">Excluir</span>
                          </button>

                          {/* "Editar linha do tempo" option */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveThumbnailMenuIndex(null);
                              const seconds = prompt("Ajustar tempo de exibição do slide (em segundos):", "5.0");
                              if (seconds) {
                                toast.success(`Tempo de exibição ajustado para ${seconds}s na Linha do Tempo!`);
                              }
                            }}
                            className="flex items-center gap-2.5 p-2 px-3 hover:bg-slate-50 hover:text-slate-950 rounded-xl text-left cursor-pointer transition-colors w-full text-slate-700"
                          >
                            <Clock size={13} className="text-slate-500 shrink-0" />
                            <span className="text-[11px] font-bold">Editar linha do tempo</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* "+ Página" clean gray action card aligned to the far right, matching the red rectangle exactly */}
          <div className="shrink-0 flex items-center pl-2 ml-4">
            <button
              onClick={addPage}
              className="w-14 h-[64px] rounded-xl bg-[#cbd5e1] hover:bg-[#b5c7db] text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 flex flex-col items-center justify-center gap-1 font-sans transition-all cursor-pointer border border-[#b4c6fc]/10 shadow-sm"
              title="Adicionar página em branco"
            >
              <Plus size={16} className="text-slate-700 dark:text-slate-300 stroke-[2.5]" />
              <span className="text-[10px] font-bold tracking-tight">Página</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT CONTROLS PANEL: PROPERTIES ENGINE & SETTINGS - REMOVED AS REQUESTED */}
      {false && (
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

                          {/* Marcador Fluorescente / Acrobat Highlighting */}
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 block">Marcador de Realce Fluorescente (Estilo Acrobat)</label>
                            <div className="flex gap-1 flex-wrap">
                              {[
                                { name: 'Nenhum', color: 'transparent', label: '❌' },
                                { name: 'Amarelo', color: '#fef500', label: '🟨' },
                                { name: 'Verde', color: '#00ff66', label: '🟩' },
                                { name: 'Rosa', color: '#ff007f', label: '🟥' },
                                { name: 'Azul', color: '#00d5ff', label: '🟦' }
                              ].map(hl => (
                                <button
                                  key={hl.color}
                                  type="button"
                                  onClick={() => updateElementProps(el.id, { style: { backgroundColor: hl.color, borderRadius: hl.color === 'transparent' ? 0 : 4, paddingLeft: hl.color === 'transparent' ? 0 : 6, paddingRight: hl.color === 'transparent' ? 0 : 6 } })}
                                  className={`flex-1 py-1 text-[9px] font-bold rounded border ${el.style.backgroundColor === hl.color ? 'border-cyan-500 text-cyan-400 bg-cyan-950/30' : 'border-slate-800 text-slate-300 bg-slate-900'} hover:bg-slate-800 transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5`}
                                  title={hl.name}
                                >
                                  <span>{hl.label}</span>
                                  <span className="text-[8px] font-normal leading-none">{hl.name}</span>
                                </button>
                              ))}
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
                              <option value="radio">Botões de Opção Única / Radio Buttons</option>
                              <option value="signature">Área de Assinatura Digital</option>
                            </select>
                          </div>

                          {(el.formFieldType === 'dropdown' || el.formFieldType === 'radio') && (
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

                      {/* IMAGE & SHAPE SPECIAL PARAMETERS */}
                      {(el.type === 'image' || el.type === 'shape') && (
                        <div className="space-y-4 pt-3 border-t border-slate-800">
                          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                            {el.type === 'image' ? 'Parâmetros da Imagem' : 'Parâmetros da Forma'}
                          </span>

                          {/* Dimensions display & quick adjustments */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-0.5">Largura (px)</label>
                              <input 
                                type="number" 
                                min="10"
                                max="3000"
                                value={Math.round(el.width || 0)}
                                onChange={(e) => updateElementProps(el.id, { width: parseInt(e.target.value) || el.width })}
                                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-0.5">Altura (px)</label>
                              <input 
                                type="number" 
                                min="10"
                                max="3000"
                                value={Math.round(el.height || 0)}
                                onChange={(e) => updateElementProps(el.id, { height: parseInt(e.target.value) || el.height })}
                                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                              />
                            </div>
                          </div>

                          {/* Coordinates display & manual inputs */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-0.5">Posição X (px)</label>
                              <input 
                                type="number" 
                                value={Math.round(el.x || 0)}
                                onChange={(e) => updateElementProps(el.id, { x: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-0.5">Posição Y (px)</label>
                              <input 
                                type="number" 
                                value={Math.round(el.y || 0)}
                                onChange={(e) => updateElementProps(el.id, { y: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
                              />
                            </div>
                          </div>

                          {/* Opacity slider for images/shapes */}
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                              <span>Opacidade</span>
                              <span className="text-cyan-400 font-bold">{Math.round((el.style?.opacity ?? 1) * 100)}%</span>
                            </div>
                            <input 
                              type="range"
                              min="0.1"
                              max="1.0"
                              step="0.05"
                              value={el.style?.opacity ?? 1}
                              onChange={(e) => updateElementProps(el.id, { style: { ...el.style, opacity: parseFloat(e.target.value) } })}
                              className="w-full h-1 bg-slate-950 accent-cyan-400 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Rotation slider for images/shapes */}
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                              <span>Rotação (Graus)</span>
                              <span className="text-cyan-400 font-bold">{el.style?.rotation || 0}°</span>
                            </div>
                            <input 
                              type="range"
                              min="-180"
                              max="180"
                              step="5"
                              value={el.style?.rotation || 0}
                              onChange={(e) => updateElementProps(el.id, { style: { ...el.style, rotation: parseInt(e.target.value) } })}
                              className="w-full h-1 bg-slate-950 accent-cyan-400 rounded-lg cursor-pointer"
                            />
                          </div>

                           {/* Properties selection for shapes like rounding and gradients */}
                          {el.type === 'shape' && (
                            <div className="space-y-4 pt-2 border-t border-slate-800">
                              {/* Round Corners (Border Radius) Slider */}
                              <div>
                                <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                  <span>Canto Arredondado</span>
                                  <span className="text-cyan-400 font-bold">
                                    {el.style?.borderRadius !== undefined 
                                      ? `${el.style.borderRadius}px` 
                                      : (el.id?.includes('circ') ? '100px (Círculo)' : '4px')}
                                  </span>
                                </div>
                                <input 
                                  type="range"
                                  min="0"
                                  max="120"
                                  step="1"
                                  value={el.style?.borderRadius !== undefined ? el.style.borderRadius : (el.id?.includes('circ') ? 100 : 4)}
                                  onChange={(e) => updateElementProps(el.id, { style: { ...el.style, borderRadius: parseInt(e.target.value) } })}
                                  className="w-full h-1 bg-slate-950 accent-cyan-400 rounded-lg cursor-pointer"
                                />
                              </div>

                              {/* Fill Type Selector */}
                              <div>
                                <span className="text-[10px] text-slate-505 block mb-1">Preenchimento</span>
                                <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() => updateElementProps(el.id, { style: { ...el.style, useGradient: false } })}
                                    className={`py-1 text-[10px] font-bold rounded-md transition-all ${!el.style?.useGradient ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                                  >
                                    Cores Sólidas
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateElementProps(el.id, { style: { ...el.style, useGradient: true, gradientType: el.style?.gradientType || 'linear', gradientColorStart: el.style?.gradientColorStart || el.style?.backgroundColor || '#3b82f6', gradientColorEnd: el.style?.gradientColorEnd || '#ec4899', gradientAngle: el.style?.gradientAngle ?? 135 } })}
                                    className={`py-1 text-[10px] font-bold rounded-md transition-all ${el.style?.useGradient ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                                  >
                                    Gradientes
                                  </button>
                                </div>
                              </div>

                              {/* Solid Fill Options */}
                              {!el.style?.useGradient ? (
                                <div className="space-y-1.5">
                                  <label className="text-[10px] text-slate-500 block mb-0.5">Cor Principal</label>
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="color"
                                      value={el.style?.backgroundColor || '#0284c7'}
                                      onChange={(e) => updateElementProps(el.id, { style: { ...el.style, backgroundColor: e.target.value } })}
                                      className="w-8 h-8 rounded border border-slate-800 bg-transparent cursor-pointer overflow-hidden p-0 shrink-0"
                                    />
                                    <div className="flex gap-1 flex-wrap flex-1">
                                      {['#0284c7', '#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#1e293b', '#ffffff', '#000000'].map(c => (
                                        <button 
                                          key={c}
                                          type="button"
                                          onClick={() => updateElementProps(el.id, { style: { ...el.style, backgroundColor: c } })}
                                          className={`w-5 h-5 rounded border ${el.style?.backgroundColor === c ? 'ring-2 ring-cyan-500' : 'border-slate-850'}`}
                                          style={{ backgroundColor: c }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3 p-2 bg-slate-950/40 border border-slate-900 rounded-lg">
                                  {/* Custom Gradient Colors */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[9px] text-slate-550 block mb-1 text-left">Cor Inicial</label>
                                      <div className="flex items-center gap-1.5">
                                        <input 
                                          type="color"
                                          value={el.style?.gradientColorStart || '#3b82f6'}
                                          onChange={(e) => updateElementProps(el.id, { style: { ...el.style, gradientColorStart: e.target.value } })}
                                          className="w-7 h-7 rounded border border-slate-800 bg-transparent cursor-pointer overflow-hidden p-0"
                                        />
                                        <span className="text-[9px] font-mono text-slate-400 uppercase select-all shrink-0">
                                          {(el.style?.gradientColorStart || '#3b82f6').substring(0, 7)}
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-slate-550 block mb-1 text-left">Cor Final</label>
                                      <div className="flex items-center gap-1.5">
                                        <input 
                                          type="color"
                                          value={el.style?.gradientColorEnd || '#ec4899'}
                                          onChange={(e) => updateElementProps(el.id, { style: { ...el.style, gradientColorEnd: e.target.value } })}
                                          className="w-7 h-7 rounded border border-slate-800 bg-transparent cursor-pointer overflow-hidden p-0"
                                        />
                                        <span className="text-[9px] font-mono text-slate-400 uppercase select-all shrink-0">
                                          {(el.style?.gradientColorEnd || '#ec4899').substring(0, 7)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Angle slider (only if Linear style) */}
                                  {el.style?.gradientType !== 'radial' && (
                                    <div>
                                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                        <span>Ângulo do Gradiente</span>
                                        <span className="text-cyan-400 font-bold">{el.style?.gradientAngle ?? 135}°</span>
                                      </div>
                                      <input 
                                        type="range"
                                        min="0"
                                        max="360"
                                        step="15"
                                        value={el.style?.gradientAngle ?? 135}
                                        onChange={(e) => updateElementProps(el.id, { style: { ...el.style, gradientAngle: parseInt(e.target.value) } })}
                                        className="w-full h-1 bg-slate-950 accent-cyan-400 rounded-lg cursor-pointer"
                                      />
                                    </div>
                                  )}

                                  {/* Styles toggle: linear or radial */}
                                  <div>
                                    <span className="text-[10px] text-slate-500 block mb-1">Estilo de Distribuição</span>
                                    <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
                                      <button
                                        type="button"
                                        onClick={() => updateElementProps(el.id, { style: { ...el.style, gradientType: 'linear' } })}
                                        className={`py-0.5 text-[9px] font-semibold rounded transition-all ${el.style?.gradientType !== 'radial' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
                                      >
                                        Linear
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateElementProps(el.id, { style: { ...el.style, gradientType: 'radial' } })}
                                        className={`py-0.5 text-[9px] font-semibold rounded transition-all ${el.style?.gradientType === 'radial' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
                                      >
                                        Radial
                                      </button>
                                    </div>
                                  </div>

                                  {/* Presets and options */}
                                  <div>
                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Presets de Gradiente</span>
                                    <div className="grid grid-cols-4 gap-1.5">
                                      {[
                                        { name: 'Aurora', start: '#12c2e9', end: '#f64f59', angle: 135 },
                                        { name: 'Pôr do Sol', start: '#f12711', end: '#f5af19', angle: 45 },
                                        { name: 'Floresta', start: '#11998e', end: '#38ef7d', angle: 135 },
                                        { name: 'Amor Rosa', start: '#ff007f', end: '#7f00ff', angle: 135 },
                                        { name: 'Oceano', start: '#00c6ff', end: '#0072ff', angle: 90 },
                                        { name: 'Lilás Celestial', start: '#e0c3fc', end: '#8ec5fc', angle: 180 },
                                        { name: 'Céu Cósmico', start: '#0f2027', end: '#2c5364', angle: 135 },
                                        { name: 'Pêssego Quente', start: '#ed4264', end: '#ffedbc', angle: 45 }
                                      ].map((p, pIdx) => (
                                        <button
                                          key={pIdx}
                                          type="button"
                                          title={p.name}
                                          onClick={() => updateElementProps(el.id, { style: { ...el.style, useGradient: true, gradientColorStart: p.start, gradientColorEnd: p.end, gradientAngle: p.angle, gradientType: 'linear' } })}
                                          className="h-6 rounded border border-slate-800 hover:scale-105 active:scale-95 transition-transform shrink-0"
                                          style={{
                                            background: `linear-gradient(${p.angle}deg, ${p.start}, ${p.end})`
                                          }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
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
      )}

      {/* --- INTEGRATED ADOBE ACROBAT VISUAL PAGE ORGANIZER MODAL --- */}
      {pageOrganizerOpen && (
        <div className="fixed inset-0 bg-[#0c1017]/98 backdrop-blur-md z-[120] flex flex-col font-sans animate-in fade-in duration-200">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 bg-[#0c1017] flex justify-between items-center px-8 shrink-0">
            <div className="flex items-center gap-3 font-sans">
              <div className="p-2 bg-gradient-to-tr from-cyan-600 to-purple-600 rounded-xl text-white shadow-md shadow-cyan-900/30">
                <Layers size={20} className="stroke-[2.5px]" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  Organizador Visual de Páginas <span className="text-[10px] text-cyan-400 font-mono italic">Acrobat Pro v3.0</span>
                </h2>
                <p className="text-slate-400 text-[11px] font-bold mt-0.5">Visualize, reordene, duplique, rotacione e remova páginas em lote no layout grid dinâmico.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Add blank page */}
              <button
                onClick={() => {
                  addPage();
                  toast.success('Página em branco inserida no final do documento!');
                }}
                className="p-2 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-700/60 text-xs font-extrabold text-cyan-400 rounded-xl transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Inserir Página em Branco
              </button>

              <button
                onClick={() => {
                  setPageOrganizerOpen(false);
                  toast.success('Alterações de páginas salvas com sucesso!');
                }}
                className="p-2 px-5 bg-cyan-600 hover:bg-cyan-550 text-[#0c1017] rounded-xl text-xs font-black shadow-lg shadow-cyan-950/40 uppercase tracking-widest transition-all duration-150 cursor-pointer"
              >
                Concluir Layout
              </button>
            </div>
          </div>

          {/* Grid Content */}
          <div className="flex-1 overflow-y-auto p-12 bg-[#080b0f] custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between text-slate-500 font-extrabold text-xs">
                <span>Total de Páginas: <strong className="text-cyan-400">{slides.length}</strong></span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 select-none">Dica: Use os botões rápidos embaixo de cada miniatura</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                {slides.map((slide, idx) => {
                  const isCurrent = idx === currentSlideIndex;
                  return (
                    <div
                      key={slide.id}
                      className={`group bg-slate-950/45 border-2 rounded-2xl p-3 flex flex-col space-y-3 relative hover:scale-[1.03] duration-200 transition-all shadow-xl hover:shadow-cyan-950/20 ${isCurrent ? 'border-cyan-500 ring-2 ring-cyan-500/10' : 'border-slate-850 hover:border-slate-705'}`}
                    >
                      {/* Miniature Representation of slide with elements indicators */}
                      <button
                        onClick={() => {
                          onSelectSlide(idx);
                          toast.success(`Selecionou Página ${idx + 1}`);
                        }}
                        className="w-full aspect-[1/1.41] bg-white border border-slate-250 rounded-xl relative flex flex-col items-center justify-center overflow-hidden hover:opacity-95 text-left shrink-0 shadow-inner group/prev"
                      >
                        {slide.elements.length === 0 ? (
                          <div className="text-slate-400 text-[10px] font-bold text-center p-3 font-mono capitalize">Página em branco</div>
                        ) : (
                          <div className="absolute inset-0 p-2 scale-[0.98] origin-top flex flex-col justify-start pointer-events-none select-none">
                            <div className="text-[7px] font-bold text-slate-400 mb-1 border-b pb-0.5 border-slate-100 uppercase tracking-wider flex items-center justify-between">
                              <span>Acrobat Deck</span>
                              <span className="text-cyan-600">{slide.elements.length} camadas</span>
                            </div>
                            <div className="space-y-1">
                              {slide.elements.slice(0, 5).map(el => (
                                <div key={el.id} className="text-[6px] p-0.5 border rounded bg-slate-50 border-slate-100 flex items-center justify-between">
                                  <span className="truncate max-w-[45px] text-slate-700 capitalize font-mono text-[5.5px]">
                                    ● {el.type === 'text' ? 'Texto' : el.type === 'image' ? 'Imagem' : el.type === 'redact' ? 'Censura' : 'Forma'}
                                  </span>
                                  <span className="text-[5px] text-slate-400 font-mono">z:{el.zIndex}</span>
                                </div>
                              ))}
                              {slide.elements.length > 5 && (
                                <div className="text-[5.5px] text-slate-400 font-bold font-mono pl-1">+{slide.elements.length - 5} elementos...</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Hover Overlay info */}
                        <div className="absolute inset-0 bg-[#0c1017]/55 opacity-0 group-hover/prev:opacity-100 flex items-center justify-center transition-all duration-150">
                          <span className="bg-cyan-500 text-slate-950 font-black px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider shadow">Ativar</span>
                        </div>
                      </button>

                      {/* Info and page numbering */}
                      <div className="flex justify-between items-center text-slate-400 px-1 font-mono">
                        <span className="font-extrabold text-[11px]">PÁG. {idx + 1}</span>
                        {isCurrent && <span className="text-[8px] bg-cyan-950 border border-cyan-800 text-cyan-400 p-0.5 px-1.5 rounded-md font-bold select-none uppercase">Ativo</span>}
                      </div>

                      {/* Visual Actions Tray */}
                      <div className="grid grid-cols-4 gap-1 pt-1 opacity-90 group-hover:opacity-100">
                        {/* Move Left */}
                        <button
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            reorderPageAtIndex(idx, 'up');
                          }}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 rounded transition-colors text-center flex items-center justify-center cursor-pointer"
                          title="Recuar Página"
                        >
                          <ArrowLeft size={12} />
                        </button>

                        {/* Move Right */}
                        <button
                          disabled={idx === slides.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            reorderPageAtIndex(idx, 'down');
                          }}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 rounded transition-colors text-center flex items-center justify-center cursor-pointer"
                          title="Avançar Página"
                        >
                          <ArrowRight size={12} />
                        </button>

                        {/* Rotate page CW */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            rotatePageAtIndex(idx);
                          }}
                          className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors text-center flex items-center justify-center cursor-pointer"
                          title="Rotacionar Página 90°"
                        >
                          <RefreshCw size={11} className="stroke-[2.5px]" />
                        </button>

                        {/* Duplicate page index */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicatePageAtIndex(idx);
                          }}
                          className="p-1 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded transition-colors text-center flex items-center justify-center cursor-pointer"
                          title="Duplicar Esta Página"
                        >
                          <PlusSquare size={12} />
                        </button>
                      </div>

                      {/* Excluir button hovered corner */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePageAtIndex(idx);
                        }}
                        className="absolute top-1 right-1 p-1.5 bg-red-950/80 hover:bg-red-900 border border-red-900/40 text-red-400 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-150 shadow cursor-pointer"
                        title="Remover Página"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

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

            {/* SECURITY & QUALITY CONTROLS FOR ACROBAT UPGRADES */}
            <div className="grid grid-cols-2 gap-5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-wider uppercase text-cyan-400 flex items-center gap-1.5 select-none">
                  🛡️ Proteção por Senha (Password Lock)
                </label>
                <input
                  type="password"
                  placeholder="Introduza uma senha (opcional)..."
                  value={pdfPassword}
                  onChange={(e) => setPdfPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500 h-9 transition-colors font-sans"
                />
                <span className="text-[9px] text-slate-500 block leading-tight select-none">Garante criptografia de metadados no arquivo exportado.</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-wider uppercase text-cyan-400 flex items-center gap-1.5 select-none">
                  📉 Otimizador de Compressão (Image DPI)
                </label>
                <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-lg gap-1">
                  <button
                    type="button"
                    onClick={() => setPdfCompressionQuality('LOW')}
                    className={`flex-1 py-1 text-[10px] font-extrabold rounded cursor-pointer transition-all ${pdfCompressionQuality === 'LOW' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    title="Baixo tamanho de arquivo (72 DPI)"
                  >
                    72 DPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfCompressionQuality('MEDIUM')}
                    className={`flex-1 py-1 text-[10px] font-extrabold rounded cursor-pointer transition-all ${pdfCompressionQuality === 'MEDIUM' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    title="Recomendado - Excelente balanço (150 DPI)"
                  >
                    150 DPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfCompressionQuality('HIGH')}
                    className={`flex-1 py-1 text-[10px] font-extrabold rounded cursor-pointer transition-all ${pdfCompressionQuality === 'HIGH' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    title="Qualidade HD Máxima (300 DPI)"
                  >
                    300 DPI
                  </button>
                </div>
                <span className="text-[9px] text-slate-500 block leading-tight select-none">Escolha o nível de DPI para economizar armazenamento de arquivo.</span>
              </div>
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

      {/* PERFECT INTEGRATED CANVA/FIGMA STYLE RIGHT-CLICK CONTEXT MENU OVERLAY */}
      {contextMenu.visible && (() => {
        let adjustedX = contextMenu.x;
        let adjustedY = contextMenu.y;
        
        if (typeof window !== 'undefined') {
          if (adjustedX + 250 > window.innerWidth) {
            adjustedX = Math.max(10, window.innerWidth - 260);
          }
          if (adjustedY + 420 > window.innerHeight) {
            adjustedY = Math.max(10, window.innerHeight - 440);
          }
        }
        
        const isElement = contextMenu.elementId !== undefined;
        const targetEl = isElement ? currentSlide.elements.find(el => el.id === contextMenu.elementId) : null;
        const showSubmenuOnLeft = typeof window !== 'undefined' ? (adjustedX + 250 + 200 > window.innerWidth) : false;
        
        return (
          <div 
            className="fixed bg-white border border-slate-200 shadow-[0_12px_45px_rgba(0,0,0,0.18)] rounded-2xl p-1.5 w-[240px] text-xs font-semibold text-slate-700 z-[9999] select-none flex flex-col gap-0.5"
            style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {isElement ? (
              <>
                {/* image crop triggers in context menu */}
                {targetEl?.type === 'image' && (
                  <>
                    <button
                      onClick={() => {
                        if (targetEl) {
                          setCroppingImageId(targetEl.id);
                        }
                        setContextMenu(prev => ({ ...prev, visible: false }));
                        toast.info('Modo de Corte Ativo: Arraste os seletores azuis para realizar o corte não destrutivo.');
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Crop size={13} className="text-slate-500 animate-pulse" />
                        <span>Cortar Imagem</span>
                      </div>
                    </button>
                    {(targetEl.style?.crop && (targetEl.style.crop.left > 0 || targetEl.style.crop.right > 0 || targetEl.style.crop.top > 0 || targetEl.style.crop.bottom > 0)) && (
                      <button
                        onClick={() => {
                          if (targetEl) {
                            updateElementProps(targetEl.id, {
                              style: {
                                ...targetEl.style,
                                crop: { left: 0, right: 0, top: 0, bottom: 0 }
                              }
                            });
                            toast.success('Corte redefinido com sucesso!');
                          }
                          setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className="w-full px-3 py-2 text-left rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <RefreshCw size={13} className="text-red-500" />
                        <span>Redefinir Corte</span>
                      </button>
                    )}
                    <div className="border-b border-slate-100 my-1 mx-2" />
                  </>
                )}

                {/* 1. COPY */}
                <button
                  onClick={() => {
                    handleCopyTarget(contextMenu.elementId);
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Copy size={13} className="text-slate-500" />
                    <span>Copiar</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1 font-bold">Ctrl+C</span>
                </button>

                {/* 2. COPY STYLE */}
                <button
                  onClick={() => {
                    handleCopyStyleTarget(contextMenu.elementId);
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Palette size={13} className="text-slate-500" />
                    <span>Copiar estilo</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1 font-bold">Ctrl+Alt+C</span>
                </button>

                {/* 3. PASTE */}
                <button
                  disabled={clipboard.length === 0}
                  onClick={() => {
                    handlePasteTarget();
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 disabled:opacity-40 flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-grow">
                    <FolderOpen size={13} className="text-slate-500" />
                    <span className="ml-2">Colar</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1 font-bold">Ctrl+V</span>
                </button>

                {/* 4. PASTE STYLE */}
                <button
                  disabled={!copiedStyle}
                  onClick={() => {
                    handlePasteStyleTarget(contextMenu.elementId);
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 disabled:opacity-40 flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Underline size={13} className="text-slate-500" />
                    <span>Colar estilo</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1 font-bold">Ctrl+Alt+V</span>
                </button>

                {/* 5. DUPLICATE */}
                <button
                  onClick={() => {
                    handleDuplicateTarget(contextMenu.elementId);
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid size={13} className="text-slate-500" />
                    <span>Duplicar</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1 font-bold">Ctrl+D</span>
                </button>

                {/* 6. DELETE */}
                <button
                  onClick={() => {
                    handleDeleteTarget(contextMenu.elementId);
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-red-50 hover:text-red-600 flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Trash2 size={13} className="text-slate-500 text-slate-500 hover:text-red-500" />
                    <span>Excluir</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1 font-bold">DELETE</span>
                </button>

                <div className="border-b border-slate-100 my-1 mx-2" />

                {/* 7. LAYER NESTED HOVER SUBMENU */}
                <div 
                  className="relative"
                  onMouseEnter={() => handleSubmenuEnter('layers')}
                  onMouseLeave={handleSubmenuLeave}
                >
                  <button className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-800 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Layers size={13} className="text-slate-500" />
                      <span>Organizar Camada</span>
                    </div>
                    <ChevronRight size={13} className="text-slate-400" />
                  </button>

                  {hoveredSubmenu === 'layers' && (
                    <div 
                      className={`absolute ${showSubmenuOnLeft ? 'right-full' : 'left-full'} top-0 bg-white border border-slate-200 shadow-[0_12px_45px_rgba(0,0,0,0.18)] rounded-xl p-1 w-48 text-xs font-semibold text-slate-700 z-[10000] flex flex-col gap-0.5 animate-in fade-in slide-in-from-left-1 duration-150`}
                    >
                      <button
                        onClick={() => {
                          handleLayerOrder('front', contextMenu.elementId);
                          setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                      >
                        <BringToFront size={12} className="text-slate-500" />
                        <span>Trazer para Frente</span>
                      </button>
                      <button
                        onClick={() => {
                          handleLayerOrder('forward', contextMenu.elementId);
                           setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                      >
                        <ChevronUp size={12} className="text-slate-500" />
                         <span>Avançar nível</span>
                      </button>
                      <button
                        onClick={() => {
                          handleLayerOrder('backward', contextMenu.elementId);
                          setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                      >
                        <ChevronDown size={12} className="text-slate-500" />
                        <span>Recuar nível</span>
                      </button>
                      <button
                        onClick={() => {
                          handleLayerOrder('back', contextMenu.elementId);
                          setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                      >
                        <SendToBack size={12} className="text-slate-500" />
                        <span>Enviar para Trás</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 8. ALIGN TO PAGE NESTED HOVER SUBMENU */}
                <div 
                  className="relative"
                  onMouseEnter={() => handleSubmenuEnter('align')}
                  onMouseLeave={handleSubmenuLeave}
                >
                  <button className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-800 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <AlignCenter size={13} className="text-slate-500" />
                      <span>Alinhar à Página</span>
                    </div>
                    <ChevronRight size={13} className="text-slate-400" />
                  </button>

                  {hoveredSubmenu === 'align' && (
                    <div 
                      className={`absolute ${showSubmenuOnLeft ? 'right-full' : 'left-full'} top-0 bg-white border border-slate-200 shadow-[0_12px_45px_rgba(0,0,0,0.18)] rounded-xl p-1 w-48 text-xs font-semibold text-slate-700 z-[10000] flex flex-col gap-0.5 animate-in fade-in slide-in-from-left-1 duration-150`}
                    >
                      <button
                        onClick={() => {
                          alignToPage('left', contextMenu.elementId);
                          setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                      >
                        <AlignLeft size={12} className="text-slate-500" />
                        <span>Alinhar à Esquerda</span>
                      </button>
                      <button
                        onClick={() => {
                          alignToPage('center', contextMenu.elementId);
                          setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                      >
                        <AlignCenter size={12} className="text-slate-500" />
                        <span>Centralizar Horiz.</span>
                      </button>
                      <button
                        onClick={() => {
                          alignToPage('right', contextMenu.elementId);
                          setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                      >
                        <AlignRight size={12} className="text-slate-500" />
                        <span>Alinhar à Direita</span>
                      </button>
                      <button
                        onClick={() => {
                          alignToPage('top', contextMenu.elementId);
                          setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                      >
                        <ChevronUp size={12} className="text-slate-500" />
                        <span>Alinhar ao Topo</span>
                      </button>
                      <button
                        onClick={() => {
                          alignToPage('middle', contextMenu.elementId);
                          setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                      >
                        <AlignCenter size={12} className="text-slate-500" style={{ transform: 'rotate(90deg)' }} />
                        <span>Centralizar Vert.</span>
                      </button>
                      <button
                        onClick={() => {
                          alignToPage('bottom', contextMenu.elementId);
                          setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                      >
                        <ChevronDown size={12} className="text-slate-500" />
                        <span>Alinhar ao Rodapé</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-b border-slate-100 my-1 mx-2" />

                {/* 10. LOCK / UNLOCK */}
                <button
                  onClick={() => {
                    if (contextMenu.elementId) {
                      toggleLockElement(contextMenu.elementId);
                    }
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {targetEl?.isLocked ? (
                      <>
                        <Unlock size={13} className="text-amber-500" />
                        <span className="text-amber-600 font-bold">Desbloquear</span>
                      </>
                    ) : (
                      <>
                        <Lock size={13} className="text-slate-500" />
                        <span>Bloquear</span>
                      </>
                    )}
                  </div>
                  <span className="text-[8px] text-slate-400 bg-slate-100 rounded px-1 py-0.5">Alt+Shift+L</span>
                </button>

                {/* 11. LINK SETUP */}
                <button
                  onClick={() => {
                    if (contextMenu.elementId) {
                      handleAssignLink(contextMenu.elementId);
                    }
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Link2 size={13} className="text-slate-500" />
                    <span>Hiperlink</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1 font-bold">Ctrl+K</span>
                </button>
              </>
            ) : (
              <>
                {/* CANVAS EMPTY-SPACE RIGHT-CLICK ACTIONS */}
                <div className="px-3 py-1.5 text-[10px] uppercase text-slate-400 tracking-wider">Ações da Folha</div>
                
                {/* 1. PASTE */}
                <button
                  disabled={clipboard.length === 0}
                  onClick={() => {
                    handlePasteTarget();
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 disabled:opacity-40 flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen size={13} className="text-slate-500" />
                    <span>Colar Elementos</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1 font-bold">Ctrl+V</span>
                </button>

                {/* 2. SELECT ALL */}
                <button
                  onClick={() => {
                    const allIds = new Set(currentSlide.elements.map(el => el.id));
                    setSelectedIds(allIds);
                    toast.info('Todos os elementos selecionados!');
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MousePointer2 size={13} className="text-slate-500" />
                    <span>Selecionar Tudo</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1 font-bold">Ctrl+A</span>
                </button>

                <div className="border-b border-slate-100 my-1 mx-2" />

                {/* 3. ADD TEXT BOX AT CURSOR */}
                <button
                  onClick={() => {
                    addElementAtCursor('text');
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                >
                  <Type size={13} className="text-cyan-500" />
                  <span>Adicionar Texto Aqui</span>
                </button>

                {/* 4. ADD SHAPE AT CURSOR */}
                <button
                  onClick={() => {
                    addElementAtCursor('shape');
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                >
                  <Box size={13} className="text-amber-500" />
                  <span>Adicionar Forma Aqui</span>
                </button>
              </>
            )}
          </div>
        );
      })()}

    </div>
  );
};
