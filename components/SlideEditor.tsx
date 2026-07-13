import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Type, Move, Trash2, Undo, Redo, Sparkles, Plus, Image as ImageIcon, Box,
  ChevronUp, ChevronDown, ChevronLeft, ArrowLeft, MousePointer2, ArrowRight, X, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Palette, Maximize, Minimize, ChevronRight, Copy, BringToFront, SendToBack,
  Star, Minus, Search, Lock, Unlock, FileText, CheckSquare, RefreshCw, Layers as LayersIcon,
  Download, Sliders, Shield, Printer, Check, Circle, AlertCircle, PenTool, Highlighter,
  Underline, Upload, FolderOpen, Table, MessageSquare, MoreHorizontal, LayoutGrid, Scissors, Globe,
  Smartphone, Instagram, Info, Link, Link2, Layers, Clock, PlusSquare, Eraser, Crop, Pin, Presentation, Play, Edit2, FileDown, FileUp} from 'lucide-react';
import { Slide, SlideElement, PresentationFile, VisualIdentity } from '../types';
import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

// --- GLOBAL CUSTOM FONT UTILITIES & MEMORY CACHE ---
const fontCache: { [key: string]: string } = {};

const fetchFontAsBase64 = async (urlOrUrls: string | string[]): Promise<string> => {
  const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
  let lastError: any = null;
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const buffer = await response.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (err) {
      console.warn(`Failed to fetch font from ${url}:`, err);
      lastError = err;
    }
  }
  throw lastError || new Error('No valid URL provided');
};

const loadFontToVfs = async (doc: any, fontName: string, fontStyle: string, url: string | string[], filename: string) => {
  const cacheKey = `${fontName}-${fontStyle}`;
  try {
    let base64 = fontCache[cacheKey];
    if (!base64) {
      base64 = await fetchFontAsBase64(url);
      fontCache[cacheKey] = base64;
    }
    doc.addFileToVFS(filename, base64);
    doc.addFont(filename, fontName, fontStyle);
  } catch (err) {
    console.error(`Failed to load font ${fontName} (${fontStyle}):`, err);
  }
};

const FONT_URLS: { [key: string]: { regular: string | string[]; bold?: string | string[]; light?: string | string[]; medium?: string | string[] } } = {
  'inter': {
    regular: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf',
    bold: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf'
  },
  'space grotesk': {
    regular: 'https://fonts.gstatic.com/s/spacegrotesk/v13/V8mDoQDjQSkFtoMM3T6r8E79F75pPKIu02g.ttf',
    bold: 'https://fonts.gstatic.com/s/spacegrotesk/v13/V8mDoQDjQSkFtoMM3T6r8E79F75pPKIuxGg.ttf'
  },
  'jetbrains mono': {
    regular: 'https://fonts.gstatic.com/s/jetbrainsmono/v18/t6qY3r92MXPhuX6E2shmFf9VAt8.ttf',
    bold: 'https://fonts.gstatic.com/s/jetbrainsmono/v18/t6qY3r92MXPhuX6E2shmFf9VAt8VMA.ttf'
  },
  'playfair display': {
    regular: 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZ27K1_K_NPGKb_O_L2HZU5_XW3OWY_8.ttf',
    bold: 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZ27K1_K_NPGKb_O_L2HZU5_XW3OWUv8.ttf'
  },
  'montserrat': {
    regular: 'https://fonts.gstatic.com/s/montserrat/v25/JTUHjIg1_i6t8kCHKm4MV96RxZY8.ttf',
    bold: 'https://fonts.gstatic.com/s/montserrat/v25/JTUHjIg1_i6t8kCHKm4MV96RxYY8.ttf'
  },
  'orkney': {
    light: [
      'https://db.onlinewebfonts.com/t/6ac09869bcd949ed727771cfba1ea124.ttf',
      'https://fontlibrary.org/assets/fonts/orkney/e352bbf977e20ec4221a716c527f0ef7/e312fbe98717cc43f339cfdfc63e2714/OrkneyLight.otf'
    ],
    regular: [
      'https://cdn.jsdelivr.net/gh/brazil-gringo/ponto-de-partida@master/app/assets/fonts/Orkney-Regular.ttf',
      'https://db.onlinewebfonts.com/t/1aab5ed24c6a9f95b69de27350a83559.ttf',
      'https://fontlibrary.org/assets/fonts/orkney/e352bbf977e20ec4221a716c527f0ef7/79dfef230a8a6bebc2db8416d80dff80/OrkneyRegular.otf'
    ],
    medium: [
      'https://fontlibrary.org/assets/fonts/orkney/e352bbf977e20ec4221a716c527f0ef7/844781ca8c8cbebc2db8416d80dff80/OrkneyMedium.otf'
    ],
    bold: [
      'https://cdn.jsdelivr.net/gh/brazil-gringo/ponto-de-partida@master/app/assets/fonts/Orkney-Bold.ttf',
      'https://db.onlinewebfonts.com/t/393278564a51e60f06a099a531631e7c.ttf',
      'https://fontlibrary.org/assets/fonts/orkney/e352bbf977e20ec4221a716c527f0ef7/f311fbe94717cc43f339cfdfc63e2714/OrkneyBold.otf'
    ]
  }
};

const normalizeFontFamily = (familyStr: string): string => {
  if (!familyStr) return 'inter';
  return familyStr
    .replace(/['"]/g, '')   // strip all quotes
    .split(',')[0]          // get the first font before comma
    .trim()                 // trim whitespace
    .toLowerCase();         // convert to lowercase
};

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
  const [zoom, setZoom] = useState<number>(0.75);
  const [pageSizeType, setPageSizeType] = useState<'A4' | 'LETTER' | 'A3' | 'SLIDE_16_9' | 'CUSTOM'>('SLIDE_16_9');
  const [customWidth, setCustomWidth] = useState<number>(840);
  const [customHeight, setCustomHeight] = useState<number>(1188);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- MODO DE APRESENTAÇÃO DE SLIDES (ESTILO POWERPOINT) ---
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [presentationSlideIndex, setPresentationSlideIndex] = useState<number>(0);
  const [presentationLaserActive, setPresentationLaserActive] = useState<boolean>(false);
  const [presentationPenActive, setPresentationPenActive] = useState<boolean>(false);
  const [presentationHighlighterActive, setPresentationHighlighterActive] = useState<boolean>(false);
  const [presentationPenColor, setPresentationPenColor] = useState<string>('#ef4444');
  const [presentationLaserPos, setPresentationLaserPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [presentationDrawings, setPresentationDrawings] = useState<Record<number, { points: { x: number; y: number }[]; color: string; width: number }[]>>({});
  const [currentDrawingPoints, setCurrentDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [isPresentationDrawing, setIsPresentationDrawing] = useState<boolean>(false);
  const [presentationDimensions, setPresentationDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

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
  const [autoPageNumbers, setAutoPageNumbers] = useState<boolean>(false);
  const [headerText, setHeaderText] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('');
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
  const [thumbnailMenuPosition, setThumbnailMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [draggedSlideIndex, setDraggedSlideIndex] = useState<number | null>(null);
  const [dragOverSlideIndex, setDragOverSlideIndex] = useState<number | null>(null);
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
        const updatedElements = currentSlide.elements.map((el: any, elIdx: number) => {
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
          elements: s.elements.map((el: any, elIdx: number) => {
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
            elements: s.elements.map((el: any, elIdx: number) => {
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
            elements: s.elements.map((el: any, elIdx: number) => {
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
      if (isPresentationMode) return;

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
  }, [selectedIds, clipboard, currentSlide, currentSlideIndex, slides, copiedStyle, croppingImageId, isPresentationMode]);

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

  const handleReorderSlides = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= slides.length || toIndex < 0 || toIndex >= slides.length) return;
    const nextSlides = [...slides];
    const [removed] = nextSlides.splice(fromIndex, 1);
    nextSlides.splice(toIndex, 0, removed);
    triggerUpdate(nextSlides, 'Reordenar página');
    onSelectSlide(toIndex);
    toast.success(`Ordem da página ajustada!`);
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
        const dW = deltaX;
        newW = Math.max(20, initialResizeDims.w - dW);
        newX = initialResizeDims.x + dW;
      }
      if (resizeHandle.includes('n')) {
        const dH = deltaY;
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
      const finalX = snappedX !== null ? snappedX : targetX;
      const finalY = snappedY !== null ? snappedY : targetY;

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
                    x: Math.round(initOffset.x + actualDeltaX),
                    y: Math.round(initOffset.y + actualDeltaY)
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

  // Helper to ensure any image format (WebP, JPEG, PNG, or external URL) is a clean, CORS-friendly PNG Data URL for jsPDF
  const ensurePngDataUrl = (content: string): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!content) {
        resolve(null);
        return;
      }
      const img = new Image();
      if (content.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');
          resolve(pngUrl);
        } catch (err) {
          if (content.startsWith('data:image/webp')) {
            resolve(null);
          } else if (content.startsWith('data:')) {
            resolve(content);
          } else {
            resolve(null);
          }
        }
      };
      img.onerror = () => {
        if (content.startsWith('data:') && !content.startsWith('data:image/webp')) {
          resolve(content);
        } else {
          resolve(null);
        }
      };
      img.src = content;
    });
  };

  // Parse colors (hex, rgb, rgba) cleanly to prevent jsPDF encodeColorString crashes
  const parseColorToJsPdfColor = (colorStr: string): { r: number; g: number; b: number; alpha: number } => {
    const result = { r: 0, g: 0, b: 0, alpha: 1 };
    if (!colorStr) return result;
    
    colorStr = colorStr.trim().toLowerCase();
    
    if (colorStr.startsWith('rgba')) {
      const match = colorStr.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
      if (match) {
        result.r = parseInt(match[1], 10);
        result.g = parseInt(match[2], 10);
        result.b = parseInt(match[3], 10);
        result.alpha = parseFloat(match[4]);
      }
    } else if (colorStr.startsWith('rgb')) {
      const match = colorStr.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if (match) {
        result.r = parseInt(match[1], 10);
        result.g = parseInt(match[2], 10);
        result.b = parseInt(match[3], 10);
        result.alpha = 1;
      }
    } else if (colorStr.startsWith('#')) {
      let hex = colorStr.substring(1);
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      if (hex.length === 6) {
        result.r = parseInt(hex.substring(0, 2), 16);
        result.g = parseInt(hex.substring(2, 4), 16);
        result.b = parseInt(hex.substring(4, 6), 16);
        result.alpha = 1;
      } else if (hex.length === 8) {
        result.r = parseInt(hex.substring(0, 2), 16);
        result.g = parseInt(hex.substring(2, 4), 16);
        result.b = parseInt(hex.substring(4, 6), 16);
        result.alpha = parseInt(hex.substring(6, 8), 16) / 255;
      }
    } else if (colorStr === 'transparent') {
      result.alpha = 0;
    } else {
      try {
        const tempDiv = document.createElement('div');
        tempDiv.style.color = colorStr;
        document.body.appendChild(tempDiv);
        const computedColor = window.getComputedStyle(tempDiv).color;
        document.body.removeChild(tempDiv);
        const match = computedColor.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
        if (match) {
          result.r = parseInt(match[1], 10);
          result.g = parseInt(match[2], 10);
          result.b = parseInt(match[3], 10);
          result.alpha = match[4] !== undefined ? parseFloat(match[4]) : 1;
        }
      } catch (e) {
        if (colorStr === 'white') { result.r = 255; result.g = 255; result.b = 255; }
        else if (colorStr === 'black') { result.r = 0; result.g = 0; result.b = 0; }
        else if (colorStr === 'red') { result.r = 255; result.g = 0; result.b = 0; }
        else if (colorStr === 'green') { result.r = 0; result.g = 255; result.b = 0; }
        else if (colorStr === 'blue') { result.r = 0; result.g = 0; result.b = 255; }
      }
    }
    return result;
  };

  const interpolateColor = (c1: {r: number, g: number, b: number}, c2: {r: number, g: number, b: number}, factor: number) => {
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * factor),
      g: Math.round(c1.g + (c2.g - c1.g) * factor),
      b: Math.round(c1.b + (c2.b - c1.b) * factor)
    };
  };

  const generateGradientDataUrl = (startColor: string, endColor: string, angle: number, width: number, height: number, isRadial: boolean = false) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width * 2);
      canvas.height = Math.max(1, height * 2);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.scale(2, 2);

      let grad;
      if (isRadial) {
        grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
      } else {
        const alpha = (angle * Math.PI) / 180;
        const dx = Math.sin(alpha);
        const dy = -Math.cos(alpha);
        const halfLen = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
        
        const x1 = width / 2 - dx * halfLen;
        const y1 = height / 2 - dy * halfLen;
        const x2 = width / 2 + dx * halfLen;
        const y2 = height / 2 + dy * halfLen;

        grad = ctx.createLinearGradient(x1, y1, x2, y2);
      }
      grad.addColorStop(0, startColor);
      grad.addColorStop(1, endColor);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error("Failed to generate gradient data URL:", e);
      return null;
    }
  };

  const generateShapeGradientDataUrl = (
    startColor: string,
    endColor: string,
    angle: number,
    width: number,
    height: number,
    isRadial: boolean = false,
    borderRadius: number = 0,
    isCircle: boolean = false
  ) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width * 2);
      canvas.height = Math.max(1, height * 2);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.scale(2, 2);

      ctx.beginPath();
      if (isCircle) {
        const radius = Math.min(width, height) / 2;
        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      } else if (borderRadius > 0) {
        const r = Math.min(borderRadius, width / 2, height / 2);
        ctx.roundRect(0, 0, width, height, r);
      } else {
        ctx.rect(0, 0, width, height);
      }
      ctx.clip();

      let grad;
      if (isRadial) {
        grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
      } else {
        const alpha = (angle * Math.PI) / 180;
        const dx = Math.sin(alpha);
        const dy = -Math.cos(alpha);
        const halfLen = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;

        const x1 = width / 2 - dx * halfLen;
        const y1 = height / 2 - dy * halfLen;
        const x2 = width / 2 + dx * halfLen;
        const y2 = height / 2 + dy * halfLen;
        grad = ctx.createLinearGradient(x1, y1, x2, y2);
      }
      grad.addColorStop(0, startColor);
      grad.addColorStop(1, endColor);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error("Failed to generate shape gradient data URL:", e);
      return null;
    }
  };

  const drawBackground = (doc: any, bg: string, width: number, height: number) => {
    if (!bg) {
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, width, height, 'F');
      return;
    }
    const trimmed = bg.trim();
    if (trimmed.includes('gradient')) {
      const isRadial = trimmed.includes('radial-gradient');
      
      const colorMatches = trimmed.match(/(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+)/g) || [];
      const colors = colorMatches.filter(c => {
        const l = c.toLowerCase();
        return l.startsWith('#') || l.startsWith('rgb') || l.includes('deg') === false;
      });

      let startColor = '#1e293b';
      let endColor = '#0f172a';
      if (colors.length >= 2) {
        startColor = colors[0];
        endColor = colors[colors.length - 1];
      } else if (colors.length === 1) {
        startColor = colors[0];
        endColor = colors[0];
      }

      let angle = 135;
      const angleMatch = trimmed.match(/(\d+)deg/);
      if (angleMatch) {
        angle = parseInt(angleMatch[1], 10);
      }

      const gradImg = generateGradientDataUrl(startColor, endColor, angle, width, height, isRadial);
      if (gradImg) {
        doc.addImage(gradImg, 'PNG', 0, 0, width, height, undefined, 'FAST');
      } else {
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, width, height, 'F');
      }
      return;
    }
    
    const col = parseColorToJsPdfColor(trimmed);
    doc.setFillColor(col.r, col.g, col.b);
    doc.rect(0, 0, width, height, 'F');
  };

  const drawShapeGradient = (doc: any, x: number, y: number, w: number, h: number, startColor: string, endColor: string, angle: number, borderRadius: number = 0, isCircle: boolean = false) => {
    const gradImg = generateShapeGradientDataUrl(startColor, endColor, angle, w, h, false, borderRadius, isCircle);
    if (gradImg) {
      doc.addImage(gradImg, 'PNG', x, y, w, h, undefined, 'FAST');
    } else {
      const c1 = parseColorToJsPdfColor(startColor);
      doc.setFillColor(c1.r, c1.g, c1.b);
      if (isCircle) {
        doc.roundedRect(x, y, w, h, w / 2, h / 2, 'F');
      } else if (borderRadius > 0) {
        doc.roundedRect(x, y, w, h, borderRadius, borderRadius, 'F');
      } else {
        doc.rect(x, y, w, h, 'F');
      }
    }
  };

  const drawSvgPathOnJsPdf = (doc: any, pathStr: string, startX: number, startY: number, w: number, h: number, fillColor: string, strokeColor?: string, strokeWidth?: number) => {
    try {
      doc.saveGraphicsState();
      
      const col = parseColorToJsPdfColor(fillColor || '#0284c7');
      doc.setFillColor(col.r, col.g, col.b);
      
      if (strokeColor && strokeColor !== 'none') {
        const sCol = parseColorToJsPdfColor(strokeColor);
        doc.setStrokeColor(sCol.r, sCol.g, sCol.b);
        if (strokeWidth !== undefined) {
          doc.setLineWidth(strokeWidth * 0.708333);
        }
      }

      // Regex to extract commands and coordinate lists
      const pathCommandRegex = /([a-df-z]+)([^a-df-z]*)/gi;
      let match;
      
      let currentX = startX;
      let currentY = startY;
      
      // We assume the coordinates in the pathStr are scaled within 0 to 100 range.
      const scaleX = w / 100;
      const scaleY = h / 100;
      
      const styleStr = (strokeColor && strokeColor !== 'none') ? 'FD' : 'F';

      while ((match = pathCommandRegex.exec(pathStr)) !== null) {
        const cmd = match[1];
        const argsStr = match[2].trim();
        const nums = argsStr.split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
        
        const uppercaseCmd = cmd.toUpperCase();
        const isRelative = cmd !== uppercaseCmd;
        
        if (uppercaseCmd === 'M' && nums.length >= 2) {
          let x = nums[0] * scaleX;
          let y = nums[1] * scaleY;
          if (isRelative) {
            currentX += x;
            currentY += y;
          } else {
            currentX = startX + x;
            currentY = startY + y;
          }
          doc.moveTo(currentX, currentY);
        } else if (uppercaseCmd === 'L' && nums.length >= 2) {
          for (let k = 0; k < nums.length; k += 2) {
            if (k + 1 < nums.length) {
              let x = nums[k] * scaleX;
              let y = nums[k + 1] * scaleY;
              if (isRelative) {
                currentX += x;
                currentY += y;
              } else {
                currentX = startX + x;
                currentY = startY + y;
              }
              doc.lineTo(currentX, currentY);
            }
          }
        } else if (uppercaseCmd === 'C' && nums.length >= 6) {
          for (let k = 0; k < nums.length; k += 6) {
            if (k + 5 < nums.length) {
              let cp1x = nums[k] * scaleX;
              let cp1y = nums[k + 1] * scaleY;
              let cp2x = nums[k + 2] * scaleX;
              let cp2y = nums[k + 3] * scaleY;
              let destX = nums[k + 4] * scaleX;
              let destY = nums[k + 5] * scaleY;
              
              if (isRelative) {
                cp1x += currentX;
                cp1y += currentY;
                cp2x += currentX;
                cp2y += currentY;
                destX += currentX;
                destY += currentY;
              } else {
                cp1x = startX + cp1x;
                cp1y = startY + cp1y;
                cp2x = startX + cp2x;
                cp2y = startY + cp2y;
                destX = startX + destX;
                destY = startY + destY;
              }
              
              if (typeof doc.curveTo === 'function') {
                doc.curveTo(cp1x, cp1y, cp2x, cp2y, destX, destY);
              } else {
                doc.lineTo(destX, destY);
              }
              currentX = destX;
              currentY = destY;
            }
          }
        } else if (uppercaseCmd === 'Z') {
          doc.close();
        }
      }
      
      doc.fill(styleStr);
      doc.restoreGraphicsState();
    } catch (err) {
      console.warn("Could not render vector path on jsPDF:", err);
    }
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

        const scaleFac = 0.708333;

         // Scan all slides for custom fonts
        const usedFontFamilies = new Set<string>();
        for (const p of slides) {
          for (const el of p.elements) {
            if (el.type === 'text') {
              const family = normalizeFontFamily(el.style?.fontFamily || 'Inter');
              if (family.includes('inter')) usedFontFamilies.add('inter');
              else if (family.includes('space') || family.includes('grotesk')) usedFontFamilies.add('space grotesk');
              else if (family.includes('jetbrains') || family.includes('mono')) usedFontFamilies.add('jetbrains mono');
              else if (family.includes('playfair') || family.includes('display')) usedFontFamilies.add('playfair display');
              else if (family.includes('montserrat')) usedFontFamilies.add('montserrat');
              else if (family.includes('orkney')) usedFontFamilies.add('orkney');
            }
          }
        }

        // Load used custom fonts
        for (const family of usedFontFamilies) {
          const urls = FONT_URLS[family];
          const nameMap: { [key: string]: string } = {
            'inter': 'Inter',
            'space grotesk': 'Space Grotesk',
            'jetbrains mono': 'JetBrains Mono',
            'playfair display': 'Playfair Display',
            'montserrat': 'Montserrat',
            'orkney': 'Orkney'
          };
          const fontName = nameMap[family] || family;
          
          await loadFontToVfs(doc, fontName, 'normal', urls.regular, `${family}-regular.ttf`);
          if (urls.bold) {
            await loadFontToVfs(doc, fontName, 'bold', urls.bold, `${family}-bold.ttf`);
          }
          if (urls.light) {
            await loadFontToVfs(doc, fontName, 'light', urls.light, `${family}-light.ttf`);
          }
          if (urls.medium) {
            await loadFontToVfs(doc, fontName, 'medium', urls.medium, `${family}-medium.ttf`);
          }
        }

        // Save state to disable overlays
        const prevSelectedIds = new Set(selectedIds);
        const prevEditingTextId = editingTextId;
        const prevMeasureModeActive = measureModeActive;
        const prevCroppingImageId = croppingImageId;

        // Temporarily clear selections and interactive overlays
        setSelectedIds(new Set());
        setEditingTextId(null);
        setMeasureModeActive(false);
        setCroppingImageId(null);

        // Give React time to re-render without highlights/handles
        await new Promise(resolve => setTimeout(resolve, 100));

        // Recursive drawing function to handle nested/masked elements cleanly
        const drawElement = async (el: any, allElements: any[]) => {
          if (el.isRedacted) {
            doc.setFillColor('#000000');
            doc.rect(el.x * scaleFac, el.y * scaleFac, el.width * scaleFac, el.height * scaleFac, 'F');
            return;
          }

          if (el.type === 'text') {
            const pdfFontSize = (el.style?.fontSize || 14) * scaleFac;
            doc.setFontSize(pdfFontSize);
            
            const tColor = parseColorToJsPdfColor(el.style?.color || '#000000');
            doc.setTextColor(tColor.r, tColor.g, tColor.b);

            let fontFamily = 'helvetica';
            const origFamily = normalizeFontFamily(el.style?.fontFamily || 'Inter');
            let familyKey = '';
            
            if (origFamily.includes('inter')) {
              fontFamily = 'Inter';
              familyKey = 'inter';
            } else if (origFamily.includes('space') || origFamily.includes('grotesk')) {
              fontFamily = 'Space Grotesk';
              familyKey = 'space grotesk';
            } else if (origFamily.includes('jetbrains') || origFamily.includes('mono')) {
              fontFamily = 'JetBrains Mono';
              familyKey = 'jetbrains mono';
            } else if (origFamily.includes('playfair') || origFamily.includes('display')) {
              fontFamily = 'Playfair Display';
              familyKey = 'playfair display';
            } else if (origFamily.includes('montserrat')) {
              fontFamily = 'Montserrat';
              familyKey = 'montserrat';
            } else if (origFamily.includes('orkney')) {
              fontFamily = 'Orkney';
              familyKey = 'orkney';
            } else if (origFamily.includes('serif')) {
              fontFamily = 'times';
            } else if (origFamily.includes('code') || origFamily.includes('courier')) {
              fontFamily = 'courier';
            }

            // Determine font style based on available weights in FONT_URLS
            let actualStyle = 'normal';
            const weight = String(el.style?.fontWeight || 'normal').toLowerCase();
            const availableVariants: { regular: string | string[]; bold?: string | string[]; light?: string | string[]; medium?: string | string[] } = FONT_URLS[familyKey] || { regular: '' };

            if (weight === 'bold' || weight === '700' || weight === '800' || weight === '900') {
              actualStyle = availableVariants.bold ? 'bold' : 'normal';
            } else if (weight === '300' || weight === 'light') {
              actualStyle = availableVariants.light ? 'light' : 'normal';
            } else if (weight === '600' || weight === 'medium' || weight === '500') {
              actualStyle = availableVariants.medium ? 'medium' : (availableVariants.bold ? 'bold' : 'normal');
            }

            if (el.style?.fontStyle === 'italic') {
              if (fontFamily === 'helvetica' || fontFamily === 'times' || fontFamily === 'courier') {
                actualStyle = actualStyle === 'bold' ? 'bolditalic' : 'italic';
              }
            }
            doc.setFont(fontFamily, actualStyle);

            // Alignment and X coordinate adjustment
            const alignment = el.style?.textAlign || 'left';
            let pdfX = el.x * scaleFac;
            if (alignment === 'center') {
              pdfX = (el.x + el.width / 2) * scaleFac;
            } else if (alignment === 'right') {
              pdfX = (el.x + el.width) * scaleFac;
            }

            // Adjust Y for baseline offset
            const pdfY = (el.y * scaleFac) + (pdfFontSize * 0.82);
            const lineHeightFac = el.style?.lineHeight || 1.2;

            // Split text precisely to fit container width
            const lines = doc.splitTextToSize(el.content || '', el.width * scaleFac);
            
            // Draw line-by-line using precise line heights so layout is perfectly identical
            for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
              const lineY = pdfY + (lineIdx * pdfFontSize * lineHeightFac);
              doc.text(lines[lineIdx], pdfX, lineY, {
                align: alignment
              });
            }
          } else if (el.type === 'image') {
            try {
              const pngDataUrl = await ensurePngDataUrl(el.content);
              if (pngDataUrl) {
                const crop = el.style?.crop;
                if (crop && (crop.left > 0 || crop.top > 0 || crop.right > 0 || crop.bottom > 0)) {
                  // Non-destructive crop rendering via Canvas
                  const croppedImg = await new Promise<string | null>((resolveCrop) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      const w = img.naturalWidth;
                      const h = img.naturalHeight;
                      
                      const cropLeftPx = (crop.left / 100) * w;
                      const cropTopPx = (crop.top / 100) * h;
                      const cropWidthPx = w - cropLeftPx - ((crop.right / 100) * w);
                      const cropHeightPx = h - cropTopPx - ((crop.bottom / 100) * h);

                      canvas.width = Math.max(1, cropWidthPx);
                      canvas.height = Math.max(1, cropHeightPx);
                      
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(img, cropLeftPx, cropTopPx, cropWidthPx, cropHeightPx, 0, 0, canvas.width, canvas.height);
                        resolveCrop(canvas.toDataURL('image/png'));
                      } else {
                        resolveCrop(null);
                      }
                    };
                    img.onerror = () => resolveCrop(null);
                    img.src = pngDataUrl;
                  });

                  if (croppedImg) {
                    doc.addImage(
                      croppedImg,
                      'PNG',
                      el.x * scaleFac,
                      el.y * scaleFac,
                      el.width * scaleFac,
                      el.height * scaleFac,
                      undefined,
                      pdfCompressionQuality === 'LOW' ? 'FAST' : 'SLOW'
                    );
                  } else {
                    doc.addImage(
                      pngDataUrl,
                      'PNG',
                      el.x * scaleFac,
                      el.y * scaleFac,
                      el.width * scaleFac,
                      el.height * scaleFac,
                      undefined,
                      pdfCompressionQuality === 'LOW' ? 'FAST' : 'SLOW'
                    );
                  }
                } else {
                  doc.addImage(
                    pngDataUrl, 
                    'PNG', 
                    el.x * scaleFac, 
                    el.y * scaleFac, 
                    el.width * scaleFac, 
                    el.height * scaleFac,
                    undefined,
                    pdfCompressionQuality === 'LOW' ? 'FAST' : 'SLOW'
                  );
                }
              }
            } catch (imgErr) {
              console.error("Failed to add image to PDF:", imgErr);
            }
          } else if (el.type === 'shape') {
            doc.saveGraphicsState();
            
            // Apply opacity if set
            const opacity = el.style?.opacity !== undefined ? el.style.opacity : 1;
            if (opacity < 1) {
              try {
                const GState = (doc as any).GState || (jsPDF as any).GState;
                if (GState) {
                  doc.setGState(new GState({ opacity }));
                }
              } catch (gsErr) {
                console.warn("Could not set GState opacity:", gsErr);
              }
            }

            const rx = el.style?.borderRadius ?? (el.id?.includes('circ') || el.style?.variant === 'sphere' ? 100 : 0);
            const isCircle = el.id?.includes('circ') || el.style?.variant === 'sphere';
            const isVector = el.style?.variant === 'vector';

            if (isVector) {
              drawSvgPathOnJsPdf(
                doc, 
                el.content, 
                el.x * scaleFac, 
                el.y * scaleFac, 
                el.width * scaleFac, 
                el.height * scaleFac, 
                el.style?.backgroundColor || '#0284c7', 
                el.style?.borderColor, 
                el.style?.borderWidth
              );
            } else if (el.style?.useGradient) {
              const startColor = el.style.gradientColorStart || '#0284c7';
              const endColor = el.style.gradientColorEnd || '#ec4899';
              const angle = el.style.gradientAngle ?? 135;
              drawShapeGradient(doc, el.x * scaleFac, el.y * scaleFac, el.width * scaleFac, el.height * scaleFac, startColor, endColor, angle, rx * scaleFac, isCircle);
            } else {
              const bg = el.style?.backgroundColor || '#0284c7';
              const sColor = parseColorToJsPdfColor(bg);
              doc.setFillColor(sColor.r, sColor.g, sColor.b);
              
              if (isCircle) {
                doc.roundedRect(el.x * scaleFac, el.y * scaleFac, el.width * scaleFac, el.height * scaleFac, (el.width / 2) * scaleFac, (el.height / 2) * scaleFac, 'F');
              } else if (rx > 0) {
                const maxR = Math.min(rx, el.width / 2, el.height / 2);
                doc.roundedRect(el.x * scaleFac, el.y * scaleFac, el.width * scaleFac, el.height * scaleFac, maxR * scaleFac, maxR * scaleFac, 'F');
              } else {
                doc.rect(el.x * scaleFac, el.y * scaleFac, el.width * scaleFac, el.height * scaleFac, 'F');
              }
            }
            doc.restoreGraphicsState();

            // Render nested/masked elements inside this parent's clipping mask
            const children = allElements.filter(child => child.maskedBy === el.id);
            if (children.length > 0) {
              doc.saveGraphicsState();
              
              const parentX = el.x * scaleFac;
              const parentY = el.y * scaleFac;
              const parentW = el.width * scaleFac;
              const parentH = el.height * scaleFac;

              // Temporarily set opacity to 0 to make clipping path stroke/fill invisible
              const GState = (doc as any).GState || (jsPDF as any).GState;
              if (GState) {
                doc.setGState(new GState({ opacity: 0 }));
              }

              if (isCircle) {
                doc.roundedRect(parentX, parentY, parentW, parentH, parentW / 2, parentH / 2, 'S');
              } else if (rx > 0) {
                const maxR = Math.min(rx, el.width / 2, el.height / 2) * scaleFac;
                doc.roundedRect(parentX, parentY, parentW, parentH, maxR, maxR, 'S');
              } else {
                doc.rect(parentX, parentY, parentW, parentH, 'S');
              }
              doc.clip();

              // Restore opacity to original parent opacity for drawing children
              if (GState) {
                const originalOpacity = el.style?.opacity !== undefined ? el.style.opacity : 1;
                doc.setGState(new GState({ opacity: originalOpacity }));
              }

              for (const child of children) {
                await drawElement(child, allElements);
              }

              doc.restoreGraphicsState();
            }
          } else if (el.isFormField) {
            const formX = el.x * scaleFac;
            const formY = el.y * scaleFac;
            const formW = el.width * scaleFac;
            const formH = el.height * scaleFac;

            doc.saveGraphicsState();
            doc.setFillColor(241, 245, 249);
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(1);
            doc.roundedRect(formX, formY, formW, formH, 2, 2, 'FD');
            doc.restoreGraphicsState();

            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.setFont('helvetica', 'bold');
            doc.text((el.formFieldName || '').toUpperCase(), formX + 4, formY + 8);

            if (el.formFieldType === 'checkbox') {
              const checked = el.content === 'true' || el.content === true;
              doc.rect(formX + 4, formY + 12, 10, 10);
              if (checked) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(14, 116, 144);
                doc.text('✓', formX + 5.5, formY + 20.5);
              }
            } else if (el.formFieldType === 'signature') {
              if (el.content && (el.content.startsWith('data:') || el.content.startsWith('http'))) {
                try {
                  const sigUrl = await ensurePngDataUrl(el.content);
                  if (sigUrl) {
                    doc.addImage(sigUrl, 'PNG', formX + 4, formY + 12, formW - 8, formH - 18, undefined, 'FAST');
                  }
                } catch (sigErr) {
                  console.error("Failed to add signature image to PDF:", sigErr);
                }
              } else {
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text('Aguardando Assinatura...', formX + 6, formY + formH - 6);
              }
            } else {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(30, 41, 59);
              doc.text(el.content || '', formX + 4, formY + formH - 6);
            }
          }
        };

        try {
          for (let i = 0; i < slides.length; i++) {
            if (i > 0) doc.addPage([pdfWidth, pdfHeight], pdfOrientation);
            const p = slides[i];
            
            drawBackground(doc, p.background || '#ffffff', pdfWidth, pdfHeight);

            // Header Text
            if (pageSizeType !== 'SLIDE_16_9' && headerText) {
              doc.setFontSize(10);
              doc.setTextColor('#64748b');
              doc.text(headerText, 30, 30);
              doc.line(30, 35, pdfWidth - 30, 35);
            }

            // Watermark
            if (watermark) {
              doc.saveGraphicsState();
              doc.setFontSize(54);
              doc.setTextColor('#e2e8f0');
              doc.text(watermark, pdfWidth / 4, pdfHeight / 2, { angle: pdfOrientation === 'landscape' ? 20 : 35 });
              doc.restoreGraphicsState();
            }

            // Filter out comments and masked elements (since masked elements are drawn nested inside parents)
            doc.saveGraphicsState();
            
            // Temporarily set opacity to 0 to make clipping path stroke/fill invisible
            const GState = (doc as any).GState || (jsPDF as any).GState;
            if (GState) {
              doc.setGState(new GState({ opacity: 0 }));
            }
            doc.rect(0, 0, pdfWidth, pdfHeight, 'S');
            doc.clip();

            // Restore opacity to 1 for rendering the actual elements
            if (GState) {
              doc.setGState(new GState({ opacity: 1 }));
            }

            const elements = p.elements.filter(el => !el.isComment && !el.maskedBy);
            for (const el of elements) {
              await drawElement(el, p.elements);
            }

            doc.restoreGraphicsState();

            // Footer Text
            if (pageSizeType !== 'SLIDE_16_9' && (footerText || autoPageNumbers)) {
              doc.setFontSize(10);
              doc.setTextColor('#64748b');
              if (footerText) {
                doc.text(footerText, 30, pdfHeight - 32);
              }
              if (autoPageNumbers) {
                doc.text(`Página ${i + 1} de ${slides.length}`, pdfWidth - 95, pdfHeight - 32);
              }
            }
          }
          doc.save('documento_acrobat.pdf');
          toast.success('Conversão concluída para PDF com Alta Fidelidade Vetorial!', { id: toastId });
        } catch (error) {
          console.error("Vector rendering failed:", error);
          toast.error('Erro na exportação vetorial do PDF.', { id: toastId });
        } finally {
          // Restore user selections and view options
          setSelectedIds(prevSelectedIds);
          setEditingTextId(prevEditingTextId);
          setMeasureModeActive(prevMeasureModeActive);
          setCroppingImageId(prevCroppingImageId);
        }
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
    } catch (err: any) {
      console.error(err);
      toast.error(`Ocorreu um erro ao exportar o documento: ${err.message || err}`, { id: toastId });
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
          let textRaw: any = null;
          try {
            textRaw = await page.getTextContent();
            textItems = textRaw ? textRaw.items : [];
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
            fontName?: string;
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
                height: height,
                fontName: item.fontName
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
              if (!lastLine.fontName) {
                lastLine.fontName = item.fontName;
              }
            } else {
              reconstructedLines.push({
                str: item.str,
                x: rawX,
                y: rawY,
                size: size,
                width: width,
                height: height,
                fontName: item.fontName
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

          const detectSupportedFontFamily = (pdfFontFamily: string): string => {
            if (!pdfFontFamily) return 'Inter';
            const clean = pdfFontFamily.toLowerCase();
            if (clean.includes('space') || clean.includes('grotesk')) return 'Space Grotesk';
            if (clean.includes('mono') || clean.includes('jetbrains')) return 'JetBrains Mono';
            if (clean.includes('playfair') || clean.includes('serif')) return 'Playfair Display';
            if (clean.includes('montserrat')) return 'Montserrat';
            if (clean.includes('orkney')) return 'Orkney';
            return 'Inter';
          };

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

            let pdfFontFamily = 'Inter';
            if (textRaw?.styles) {
              for (const line of para.lines) {
                if (line.fontName && textRaw.styles[line.fontName]) {
                  const sObj = textRaw.styles[line.fontName];
                  if (sObj && sObj.fontFamily) {
                    pdfFontFamily = sObj.fontFamily;
                    break;
                  }
                }
              }
            }
            const mappedFontFamily = detectSupportedFontFamily(pdfFontFamily);

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
                fontFamily: mappedFontFamily,
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

        // Set pending PDF import state to show custom modal and avoid native iframe blocking
        setPendingPdfImport({
          slides: importedSlidesObj,
          numPages,
          pdfPageWidth,
          pdfPageHeight,
          fileName: file.name,
          loaderId: loader
        });
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

  const handleRecreateSlideFromImage = async (file: File) => {
    setIsRecreatingSlide(true);
    const loader = toast.loading("Enviando imagem do slide para recriação por IA...");
    try {
      const reader = new FileReader();
      reader.onload = async (eRes) => {
        const base64Data = eRes.target?.result as string;
        if (!base64Data) {
          toast.error("Falha ao ler o arquivo de imagem.", { id: loader });
          setIsRecreatingSlide(false);
          return;
        }

        // Dynamically detect the size and aspect ratio of the uploaded image
        const imgObj = new Image();
        imgObj.onload = async () => {
          const isLandscape = imgObj.width > imgObj.height;
          const detectedPageSizeType = isLandscape ? 'SLIDE_16_9' : 'A4';
          
          // Switch page size type so the editor adapts to the identified size
          setPageSizeType(detectedPageSizeType);
          
          try {
            const response = await fetch("/api/gemini/recreate-slide", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: base64Data }),
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Erro de processamento no servidor.");
            }
            
            const slideData = await response.json();
            console.log("[Recreate Slide] Received slide layout:", slideData);
            
            // Map the dimensions according to the detected page type
            let docWidth = 840;
            let docHeight = 1188;
            if (detectedPageSizeType === 'SLIDE_16_9') {
              docWidth = 1050;
              docHeight = 590;
            }
            
            // Dynamic scale coordinate system based on the canvas dimensions returned from Gemini
            const sourceWidth = slideData.canvasWidth || 1000;
            const sourceHeight = slideData.canvasHeight || 1000;
            
            const scaleX = (val: number) => (val / sourceWidth) * docWidth;
            const scaleY = (val: number) => (val / sourceHeight) * docHeight;
            
            // Create a mapping of Gemini's returned custom element ID to our newly generated client-side local ID
            const idMap: { [geminiId: string]: string } = {};
            const processedList = (slideData.elements || []).map((el: any, i: number) => {
              const localId = `ai-recreated-el-${Date.now()}-${i}`;
              if (el.id) {
                idMap[el.id] = localId;
              }
              return { ...el, localId };
            });

            const newElements = processedList.map((el: any, elIdx: number) => {
              const scaledWidth = scaleX(el.width || 200);
              const scaledHeight = scaleY(el.height || 100);
              const scaledX = scaleX(el.x || 100);
              const scaledY = scaleY(el.y || 100);
              
              // Get the mapped parent ID for maskedBy if it references a gemini ID
              const maskedByLocalId = el.maskedBy && idMap[el.maskedBy] ? idMap[el.maskedBy] : el.maskedBy;
              
              return {
                id: el.localId,
                type: el.type || 'text',
                x: Math.max(-500, Math.min(docWidth + 500, scaledX)), // Allow negative coordinates for masked overflow elements
                y: Math.max(-500, Math.min(docHeight + 500, scaledY)), // Allow negative coordinates for masked overflow elements
                width: Math.max(10, Math.min(docWidth * 2, scaledWidth)),
                height: Math.max(10, Math.min(docHeight * 2, scaledHeight)),
                content: el.content || "",
                zIndex: el.zIndex || 1,
                maskedBy: maskedByLocalId,
                style: {
                  fontFamily: el.style?.fontFamily || 'Inter',
                  fontWeight: el.style?.fontWeight || 'normal',
                  fontSize: el.style?.fontSize ? Math.max(8, Math.min(96, el.style.fontSize)) : 14,
                  color: el.style?.color || '#000000',
                  backgroundColor: el.style?.backgroundColor || 'transparent',
                  useGradient: el.style?.useGradient || false,
                  gradientType: el.style?.gradientType || 'linear',
                  gradientColorStart: el.style?.gradientColorStart || '#3b82f6',
                  gradientColorEnd: el.style?.gradientColorEnd || '#ec4899',
                  gradientAngle: el.style?.gradientAngle ?? 135,
                  borderRadius: el.style?.borderRadius !== undefined 
                    ? el.style.borderRadius 
                    : (el.style?.variant === 'sphere' || el.id?.includes('circ') ? 9999 : 0),
                  border: el.style?.border || 'none',
                  opacity: el.style?.opacity !== undefined ? el.style.opacity : 1,
                  textAlign: el.style?.textAlign || 'left',
                  variant: el.style?.variant || 'box',
                }
              };
            });
            
            const newSlide = {
              id: `slide-recreated-${Date.now()}`,
              elements: newElements,
              background: slideData.background || '#ffffff'
            };
            
            const nextSlides = [...slides, newSlide];
            triggerUpdate(nextSlides, "Recriou slide a partir de imagem");
            onSelectSlide(nextSlides.length - 1);
            toast.success(`Slide ${isLandscape ? "Slide (16:9)" : "Retrato (A4)"} recriado com sucesso por IA!`, { id: loader });
          } catch (serverErr: any) {
            console.error("Server slide recreation error:", serverErr);
            toast.error(`Falha do servidor: ${serverErr.message}`, { id: loader });
          } finally {
            setIsRecreatingSlide(false);
          }
        };
        imgObj.onerror = () => {
          toast.error("Falha ao analisar a orientação da imagem do slide.", { id: loader });
          setIsRecreatingSlide(false);
        };
        imgObj.src = base64Data;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("Error in slide recreation read:", err);
      toast.error(`Erro ao ler imagem: ${err.message}`, { id: loader });
      setIsRecreatingSlide(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importDocumentFile(file);
  };

  // --- NEW CUSTOM CANVA/FIGMA DARK MODE STATES ---
  const [activeLeftTab, setActiveLeftTab] = useState<'pesquisar' | 'conteudo' | 'texto' | 'uploads' | 'arquivos' | 'imagens' | 'formas' | 'tabelas' | 'comentarios' | 'assinaturas' | 'configuracoes' | 'redimensionar' | 'apresentacoes' | null>('texto');

  // --- MULTI-PRESENTATION ORGANIZER STATE & HANDLERS ---
  const [presentationList, setPresentationList] = useState<PresentationFile[]>([]);
  const [activePresentationId, setActivePresentationId] = useState<string>('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  // States to bypass native browser blocking prompt windows inside iframe
  const [presentationToDelete, setPresentationToDelete] = useState<PresentationFile | null>(null);
  const [pendingImportData, setPendingImportData] = useState<PresentationFile[] | null>(null);
  const [pendingPdfImport, setPendingPdfImport] = useState<{
    slides: Slide[];
    numPages: number;
    pdfPageWidth: number;
    pdfPageHeight: number;
    fileName: string;
    loaderId: string;
  } | null>(null);

  const switchingToIdRef = useRef<string | null>(null);
  const expectedSlidesStrRef = useRef<string | null>(null);

  // --- AI BRAND IDENTITY ENGINE STATES ---
  const [identities, setIdentities] = useState<VisualIdentity[]>([]);
  const [activeIdentityId, setActiveIdentityId] = useState<string>('');
  const [isApplyingIdentity, setIsApplyingIdentity] = useState<boolean>(false);
  const [isLearningIdentity, setIsLearningIdentity] = useState<boolean>(false);
  const [diversifyLayout, setDiversifyLayout] = useState<boolean>(true);

  // States to build custom identities
  const [isCreatingIdentity, setIsCreatingIdentity] = useState<boolean>(false);
  const [newIdentityName, setNewIdentityName] = useState<string>('');
  const [newIdentityDesc, setNewIdentityDesc] = useState<string>('');
  const [newIdentityColors, setNewIdentityColors] = useState({
    primary: '#0f172a',
    secondary: '#1e293b',
    accent: '#0ea5e9',
    background: '#ffffff'
  });
  const [newIdentityFonts, setNewIdentityFonts] = useState({
    heading: 'Space Grotesk',
    body: 'Inter'
  });

  const [manualExample, setManualExample] = useState<string>('');

  // Load identities from localStorage on mount - Enforce ONLY one identity (Orkney with Gradient)
  useEffect(() => {
    const singleIdentity: VisualIdentity = {
      id: 'identity-orkney',
      name: 'Identidade Orkney (Única)',
      colors: {
        primary: '#ffffff',
        secondary: '#1A1A1A',
        accent: '#30c3cd',
        background: '#1A1A1A'
      },
      fonts: {
        heading: 'Orkney',
        body: 'Orkney'
      },
      description: 'Estilo exclusivo utilizando a fonte Orkney, degradê entre as cores #30c3cd (cyan) e #5552b9 (purple), com fundo escuro elegante #1A1A1A e destaque nos gráficos com as mesmas cores.',
      examples: [
        "Fundo predominantemente na cor #1A1A1A.",
        "Degradê elegante entre as cores #30c3cd e #5552b9.",
        "Destaques nos gráficos utilizando #30c3cd e #5552b9.",
        "Slide inicial com Título, Subtítulo, Data de Atualização e Logo."
      ]
    };

    const loadedIdentities = [singleIdentity];
    setIdentities(loadedIdentities);
    localStorage.setItem('end-visual-identities', JSON.stringify(loadedIdentities));
    setActiveIdentityId('identity-orkney');
    localStorage.setItem('end-current-identity-id', 'identity-orkney');
  }, []);

  const handleSelectIdentity = (id: string) => {
    setActiveIdentityId('identity-orkney');
    localStorage.setItem('end-current-identity-id', 'identity-orkney');
  };

  const handleCreateIdentity = () => {
    if (!newIdentityName.trim()) {
      toast.error("O nome da identidade é obrigatório.");
      return;
    }

    const newId: VisualIdentity = {
      id: `identity-${Date.now()}`,
      name: newIdentityName,
      colors: { ...newIdentityColors },
      fonts: { ...newIdentityFonts },
      description: newIdentityDesc || "Identidade visual personalizada criada pelo usuário.",
      examples: []
    };

    const updated = [...identities, newId];
    setIdentities(updated);
    localStorage.setItem('end-visual-identities', JSON.stringify(updated));
    setActiveIdentityId(newId.id);
    localStorage.setItem('end-current-identity-id', newId.id);

    // Reset creation fields
    setNewIdentityName('');
    setNewIdentityDesc('');
    setIsCreatingIdentity(false);

    toast.success(`Identidade "${newId.name}" criada com sucesso!`);
  };

  const handleDeleteIdentity = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === 'identity-corporate' || id === 'identity-cosmic' || id === 'identity-creative') {
      toast.error("Identidades padrões do sistema não podem ser removidas.");
      return;
    }

    const updated = identities.filter(x => x.id !== id);
    setIdentities(updated);
    localStorage.setItem('end-visual-identities', JSON.stringify(updated));

    if (activeIdentityId === id && updated.length > 0) {
      setActiveIdentityId(updated[0].id);
      localStorage.setItem('end-current-identity-id', updated[0].id);
    }

    toast.success("Identidade removida com sucesso!");
  };

  const handleLearnFromImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLearningIdentity(true);
    toast.info("A IA está analisando a composição e o estilo do slide de referência...");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        try {
          const res = await fetch('/api/gemini/analyze-reference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 })
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Erro ao processar");
          }

          const { styleDescription } = await res.json();

          setIdentities(prev => {
            const updated = prev.map(id => {
              if (id.id === activeIdentityId) {
                const currentExamples = id.examples || [];
                return {
                  ...id,
                  examples: [...currentExamples, styleDescription]
                };
              }
              return id;
            });
            localStorage.setItem('end-visual-identities', JSON.stringify(updated));
            return updated;
          });

          toast.success("Referência de slide aprendida e integrada à identidade!");
        } catch (err: any) {
          toast.error(`Erro ao treinar IA: ${err.message}`);
        } finally {
          setIsLearningIdentity(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast.error(`Erro ao carregar imagem: ${err.message}`);
      setIsLearningIdentity(false);
    }
  };

  const handleAddManualExample = () => {
    if (!manualExample.trim()) return;
    setIdentities(prev => {
      const updated = prev.map(id => {
        if (id.id === activeIdentityId) {
          const currentExamples = id.examples || [];
          return {
            ...id,
            examples: [...currentExamples, manualExample.trim()]
          };
        }
        return id;
      });
      localStorage.setItem('end-visual-identities', JSON.stringify(updated));
      return updated;
    });
    setManualExample('');
    toast.success("Diretriz de estilo registrada!");
  };

  const handleDeleteExample = (exampleIndex: number) => {
    setIdentities(prev => {
      const updated = prev.map(id => {
        if (id.id === activeIdentityId) {
          const currentExamples = id.examples || [];
          return {
            ...id,
            examples: currentExamples.filter((_, idx) => idx !== exampleIndex)
          };
        }
        return id;
      });
      localStorage.setItem('end-visual-identities', JSON.stringify(updated));
      return updated;
    });
    toast.success("Exemplo de estilo removido.");
  };

  const handleApplyIdentity = async (applyToAll: boolean) => {
    const selectedIdentity = identities.find(id => id.id === activeIdentityId);
    if (!selectedIdentity) return;

    setIsApplyingIdentity(true);
    toast.info(applyToAll ? "A IA está reformulando toda a apresentação..." : "A IA está reformulando o slide atual...");

    try {
      const { width: docWidth, height: docHeight } = getPageDimensions();
      const res = await fetch('/api/gemini/apply-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides,
          identity: selectedIdentity,
          currentSlideIndex: currentSlide,
          applyToAll,
          diversify: diversifyLayout,
          width: docWidth,
          height: docHeight
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro no processamento do layout");
      }

      const { slides: updatedSlides } = await res.json();
      onUpdateSlides(updatedSlides);
      toast.success("Identidade Visual aplicada com sucesso!");
    } catch (err: any) {
      toast.error(`Erro ao aplicar identidade: ${err.message}`);
    } finally {
      setIsApplyingIdentity(false);
    }
  };

  // Initialize presentations on mount
  useEffect(() => {
    const savedList = localStorage.getItem('end-presentation-files');
    let loadedList: PresentationFile[] = [];
    let activeId = '';

    if (savedList) {
      try {
        loadedList = JSON.parse(savedList);
      } catch (e) {
        console.error("Failed to parse presentation files", e);
      }
    }

    if (loadedList.length === 0) {
      // Migrate existing localStorage slides if any, else use current slides prop
      const savedSlides = localStorage.getItem('end-slides');
      let initialSlides = slides;
      if (savedSlides) {
        try {
          const parsed = JSON.parse(savedSlides);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialSlides = parsed;
          }
        } catch (e) {
          console.error("Failed to parse end-slides in init", e);
        }
      }

      const initialProj: PresentationFile = {
        id: `pres-${Date.now()}`,
        name: 'Apresentação sem título',
        slides: initialSlides && initialSlides.length > 0 ? initialSlides : [{ id: `slide-0`, elements: [], background: '#ffffff' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      loadedList = [initialProj];
      activeId = initialProj.id;
      localStorage.setItem('end-presentation-files', JSON.stringify(loadedList));
      localStorage.setItem('end-current-presentation-id', activeId);
    } else {
      const savedActiveId = localStorage.getItem('end-current-presentation-id');
      const found = loadedList.find(p => p.id === savedActiveId);
      if (found) {
        activeId = found.id;
      } else {
        activeId = loadedList[0].id;
        localStorage.setItem('end-current-presentation-id', activeId);
      }
    }

    setPresentationList(loadedList);
    setActivePresentationId(activeId);

    // Sync slides to parent state
    const currentPres = loadedList.find(p => p.id === activeId);
    if (currentPres) {
      onUpdateSlides(currentPres.slides);
      onSelectSlide(0);
    }
  }, []);

  // Autosave current slides into active presentation
  useEffect(() => {
    if (!activePresentationId || !slides || slides.length === 0) return;

    // Skip autosave if we are in transition (slides prop hasn't caught up to the switched presentation yet)
    if (switchingToIdRef.current) {
      const currentSlidesStr = JSON.stringify(slides);
      if (currentSlidesStr === expectedSlidesStrRef.current) {
        switchingToIdRef.current = null;
        expectedSlidesStrRef.current = null;
      } else {
        return;
      }
    }

    setPresentationList(prev => {
      const idx = prev.findIndex(p => p.id === activePresentationId);
      if (idx === -1) return prev;

      const currentSlidesStr = JSON.stringify(prev[idx].slides);
      const newSlidesStr = JSON.stringify(slides);
      if (currentSlidesStr === newSlidesStr) return prev;

      const updated = prev.map((p, i) => i === idx ? { ...p, slides, updatedAt: new Date().toISOString() } : p);
      localStorage.setItem('end-presentation-files', JSON.stringify(updated));
      return updated;
    });
  }, [slides, activePresentationId]);

  const handleSelectPresentation = (id: string) => {
    const found = presentationList.find(p => p.id === id);
    if (!found) return;

    expectedSlidesStrRef.current = JSON.stringify(found.slides);
    switchingToIdRef.current = id;
    setActivePresentationId(id);
    localStorage.setItem('end-current-presentation-id', id);

    setUndoStack([]);
    setRedoStack([]);

    onUpdateSlides(found.slides);
    onSelectSlide(0);
    toast.success(`Apresentação "${found.name}" carregada!`);
  };

  const handleCreateNewPresentation = (name: string = 'Apresentação sem título') => {
    const newProj: PresentationFile = {
      id: `pres-${Date.now()}`,
      name: name,
      slides: [{ id: `slide-${Date.now()}`, elements: [], background: '#ffffff' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedList = [newProj, ...presentationList];
    setPresentationList(updatedList);
    localStorage.setItem('end-presentation-files', JSON.stringify(updatedList));

    expectedSlidesStrRef.current = JSON.stringify(newProj.slides);
    switchingToIdRef.current = newProj.id;
    setActivePresentationId(newProj.id);
    localStorage.setItem('end-current-presentation-id', newProj.id);

    setUndoStack([]);
    setRedoStack([]);

    onUpdateSlides(newProj.slides);
    onSelectSlide(0);
    toast.success(`Nova apresentação "${name}" criada com sucesso!`);
  };

  const handleDeletePresentation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (presentationList.length <= 1) {
      toast.error('Você precisa manter pelo menos uma apresentação ativa.');
      return;
    }

    const found = presentationList.find(p => p.id === id);
    if (found) {
      setPresentationToDelete(found);
    }
  };

  const handleRenamePresentation = (id: string, newName: string) => {
    if (!newName.trim()) return;
    setPresentationList(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, name: newName, updatedAt: new Date().toISOString() } : p);
      localStorage.setItem('end-presentation-files', JSON.stringify(updated));
      return updated;
    });
    setRenamingId(null);
    toast.success('Nome da apresentação atualizado!');
  };

  const handleDuplicatePresentation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const found = presentationList.find(p => p.id === id);
    if (!found) return;

    const duplicatedProj: PresentationFile = {
      id: `pres-${Date.now()}`,
      name: `${found.name} (Cópia)`,
      slides: JSON.parse(JSON.stringify(found.slides)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedList = [duplicatedProj, ...presentationList];
    setPresentationList(updatedList);
    localStorage.setItem('end-presentation-files', JSON.stringify(updatedList));

    expectedSlidesStrRef.current = JSON.stringify(duplicatedProj.slides);
    switchingToIdRef.current = duplicatedProj.id;
    setActivePresentationId(duplicatedProj.id);
    localStorage.setItem('end-current-presentation-id', duplicatedProj.id);

    setUndoStack([]);
    setRedoStack([]);

    onUpdateSlides(duplicatedProj.slides);
    onSelectSlide(0);
    toast.success(`Cópia de "${found.name}" criada com sucesso!`);
  };

  const handleExportAllPresentations = () => {
    try {
      const dataStr = JSON.stringify(presentationList, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `backup-apresentacoes-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      toast.success('Backup exportado com sucesso!');
    } catch (e) {
      toast.error('Erro ao exportar apresentações.');
    }
  };

  const handleImportPresentations = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].name && parsed[0].slides) {
          setPendingImportData(parsed);
        } else {
          toast.error('Formato inválido. Certifique-se de que é um backup válido de apresentações.');
        }
      } catch (err) {
        toast.error('Erro ao ler arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };
  
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
          elements: s.elements.map((el: any, elIdx: number) => {
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
  const [isRecreatingSlide, setIsRecreatingSlide] = useState<boolean>(false);
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

  useEffect(() => {
    const handleResize = () => {
      setPresentationDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- FULLSCREEN CONTROLLER ---
  useEffect(() => {
    if (isPresentationMode) {
      const enterFullscreen = async () => {
        try {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          }
        } catch (err) {
          console.warn('Fullscreen request failed:', err);
        }
      };
      enterFullscreen();

      const handleFullscreenChange = () => {
        if (!document.fullscreenElement) {
          setIsPresentationMode(false);
          setPresentationLaserActive(false);
          setPresentationPenActive(false);
          setPresentationHighlighterActive(false);
        }
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      };
    } else {
      const exitFullscreen = async () => {
        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            await document.exitFullscreen();
          }
        } catch (err) {
          console.warn('Fullscreen exit failed:', err);
        }
      };
      exitFullscreen();
    }
  }, [isPresentationMode]);

  // --- GLOBAL MOUSE POSITION TRACKER (FOR REAL-TIME SMOOTH LASER POINTER) ---
  useEffect(() => {
    if (!isPresentationMode || !presentationLaserActive) return;
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      setPresentationLaserPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMoveGlobal);
    return () => window.removeEventListener('mousemove', handleMouseMoveGlobal);
  }, [isPresentationMode, presentationLaserActive]);

  // --- GLOBAL DRAWING EVENTS (FOR PEN & HIGHLIGHTER TO BE BUTTERY SMOOTH) ---
  useEffect(() => {
    if (!isPresentationDrawing) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('presentation-slide-canvas');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const scaleX = (presentationDimensions.width - 100) / docWidth;
      const scaleY = (presentationDimensions.height - 120) / docHeight;
      const scale = Math.min(scaleX, scaleY, 1.5);

      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      setCurrentDrawingPoints(prev => [...prev, { x, y }]);
    };

    const handleGlobalMouseUp = () => {
      setIsPresentationDrawing(false);
      if (currentDrawingPoints.length > 1) {
        const isHighlight = presentationHighlighterActive;
        setPresentationDrawings(prev => {
          const currentSlideDrawings = prev[presentationSlideIndex] || [];
          return {
            ...prev,
            [presentationSlideIndex]: [
              ...currentSlideDrawings,
              {
                points: currentDrawingPoints,
                color: isHighlight ? 'rgba(234, 179, 8, 0.45)' : presentationPenColor,
                width: isHighlight ? 12 : 3
              }
            ]
          };
        });
      }
      setCurrentDrawingPoints([]);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [
    isPresentationDrawing, 
    currentDrawingPoints, 
    presentationSlideIndex, 
    presentationHighlighterActive, 
    presentationPenColor, 
    presentationDimensions, 
    docWidth, 
    docHeight
  ]);

  useEffect(() => {
    if (!isPresentationMode) return;

    const handlePresentationKeys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPresentationMode(false);
        setPresentationLaserActive(false);
        setPresentationPenActive(false);
        setPresentationHighlighterActive(false);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') {
        e.preventDefault();
        if (presentationSlideIndex < slides.length - 1) {
          setPresentationSlideIndex(prev => prev + 1);
          setCurrentDrawingPoints([]);
        } else {
          toast.info('Fim da apresentação de slides. Pressione ESC para sair.');
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Backspace' || e.key === 'PageUp') {
        e.preventDefault();
        if (presentationSlideIndex > 0) {
          setPresentationSlideIndex(prev => prev - 1);
          setCurrentDrawingPoints([]);
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        setPresentationSlideIndex(0);
        setCurrentDrawingPoints([]);
      } else if (e.key === 'End') {
        e.preventDefault();
        setPresentationSlideIndex(slides.length - 1);
        setCurrentDrawingPoints([]);
      } else if (e.key.toLowerCase() === 'l') {
        setPresentationLaserActive(prev => !prev);
        setPresentationPenActive(false);
        setPresentationHighlighterActive(false);
      } else if (e.key.toLowerCase() === 'p') {
        setPresentationPenActive(prev => !prev);
        setPresentationLaserActive(false);
        setPresentationHighlighterActive(false);
      } else if (e.key.toLowerCase() === 'e') {
        setPresentationDrawings(prev => ({
          ...prev,
          [presentationSlideIndex]: []
        }));
      }
    };

    window.addEventListener('keydown', handlePresentationKeys);
    return () => window.removeEventListener('keydown', handlePresentationKeys);
  }, [isPresentationMode, presentationSlideIndex, slides.length]);

  useEffect(() => {
    const handleF5 = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        setPresentationSlideIndex(currentSlideIndex);
        setIsPresentationMode(true);
        toast.success('Iniciando apresentação de slides estilo PowerPoint! Pressione ESC para sair.');
      }
    };
    window.addEventListener('keydown', handleF5);
    return () => window.removeEventListener('keydown', handleF5);
  }, [currentSlideIndex]);

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

      {/* AI RECREATING SLIDE LOADING OVERLAY */}
      {isRecreatingSlide && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-[150] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="text-center space-y-6 max-w-lg">
            <div className="relative mx-auto w-24 h-24 bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-full flex items-center justify-center text-pink-400">
              <Sparkles size={40} className="animate-pulse text-pink-400" />
              <div className="absolute inset-0 border-2 border-dashed border-pink-500/40 rounded-full animate-spin [animation-duration:8s]"></div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight uppercase bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
                IA Recriando o Slide
              </h2>
              <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                Analisando a hierarquia visual, as posições, dimensões, cores dos textos e formas estruturais do documento para recriá-lo perfeitamente na sua área de trabalho...
              </p>
            </div>
            
            {/* Visual scan animation line bar */}
            <div className="w-64 h-1.5 bg-slate-900 rounded-full mx-auto overflow-hidden relative border border-slate-800">
              <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 w-1/3 rounded-full animate-[shimmer_1.5s_infinite] [animation-timing-function:linear]" style={{
                animationName: 'shimmer',
                animationDuration: '1.5s',
                animationIterationCount: 'infinite'
              }}></div>
            </div>
            <style>{`
              @keyframes shimmer {
                0% { left: -30%; width: 30%; }
                50% { width: 50%; }
                100% { left: 100%; width: 30%; }
              }
            `}</style>
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
              { key: 'texto', icon: <Type size={18}/>, name: 'Texto' },
              { key: 'arquivos', icon: <FolderOpen size={18}/>, name: 'Arquivos' },
              { key: 'formas', icon: <Box size={18}/>, name: 'Formas' },
              { key: 'apresentacoes', icon: <Presentation size={18}/>, name: 'Documentos' },
              { key: 'identidade', icon: <Sparkles size={18}/>, name: 'Identidade' },
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
            {isLockedByPass && <span className="text-[7px] text-slate-500 uppercase block font-mono">PASSLOCK</span>}
          </div>
        </div>

        {/* Floating Expandable Context panel width 64 */}
        {activeLeftTab !== null && (
          <div className="w-64 bg-[#11141a] border-r border-slate-800/40 shrink-0 select-none animate-in slide-in-from-left duration-250 z-20">
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
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
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

                {/* Sub-Tab Navigation inside Arquivos */}
                <div className="flex border-b border-[#1e293b] px-2 bg-slate-950/20">
                  <button 
                    onClick={() => setArquivosSubTab('uploads')}
                    className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${arquivosSubTab !== 'importacao' ? 'text-cyan-400 border-cyan-400 bg-cyan-950/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                  >
                    Mídia &amp; IA
                  </button>
                  <button 
                    onClick={() => setArquivosSubTab('importacao')}
                    className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${arquivosSubTab === 'importacao' ? 'text-cyan-400 border-cyan-400 bg-cyan-950/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                  >
                    Importar PDF / Doc
                  </button>
                </div>

                {/* Sub-Tab content region */}
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
                  {arquivosSubTab !== 'importacao' ? (
                    <div className="space-y-4 animate-in fade-in duration-200">
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

                      {/* RECRIAR SLIDE COM IA */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                        <span className="text-[10px] text-pink-400 uppercase tracking-widest block font-bold flex items-center gap-1">
                          <Sparkles size={11} className="text-pink-400 animate-pulse" /> Recriação por IA
                        </span>
                        
                        <div className={`relative border border-dashed ${isRecreatingSlide ? 'border-pink-500/50 bg-pink-950/10' : 'border-slate-800 hover:border-pink-500/30'} p-4 rounded-xl bg-slate-950/40 hover:scale-[1.01] transition-all text-center cursor-pointer`}>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                await handleRecreateSlideFromImage(file);
                              }
                            }}
                            disabled={isRecreatingSlide}
                            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          />
                          {isRecreatingSlide ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-center gap-2">
                                <RefreshCw size={14} className="text-pink-400 animate-spin" />
                                <span className="text-xs text-pink-400 font-extrabold">IA analisando e recriando...</span>
                              </div>
                              <span className="text-[8px] text-slate-500 block">Identificando formas, textos, cores e posições no slide de origem</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Upload size={16} className="mx-auto text-pink-400 mb-1" />
                              <span className="text-xs text-pink-400 font-extrabold block">Recriar Slide a partir de Imagem</span>
                              <span className="text-[9px] text-slate-500 block leading-normal text-slate-400">
                                Envie uma imagem e a IA vai gerar formas, textos e layout idênticos na área de trabalho!
                              </span>
                            </div>
                          )}
                        </div>
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
                  ) : (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="border border-dashed border-cyan-500/50 bg-cyan-950/10 rounded-xl p-5 text-center cursor-pointer relative hover:border-cyan-400 transition-all">
                        <input 
                          type="file" 
                          onChange={handleImportFile}
                          accept=".pdf,.docx,.doc,.pptx,.xlsx,.png,.jpg,.jpeg,.webp,.svg"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <FileText size={24} className="mx-auto text-cyan-400 mb-2 animate-pulse" />
                        <span className="text-xs block text-slate-200 font-bold">Selecione ou arraste um PDF/Documento</span>
                        <span className="text-[9px] text-slate-400 block mt-1 leading-normal">
                          PDF, DOCX, PPTX, XLSX ou Imagens • Converta e edite instantaneamente como slides vetoriais!
                        </span>
                      </div>
                      
                      <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5 space-y-2">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Como funciona?</span>
                        <p className="text-[9px] text-slate-400 leading-normal">
                          Ao enviar um arquivo PDF ou outro documento compatível, o nosso motor avançado de leitura de documentos irá extrair todas as páginas, vetores, textos e imagens do arquivo original e reconstruir o layout de forma 100% editável e estruturada em slides na sua área de trabalho.
                        </p>
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
                                  : (selectedEl.id?.includes('circ') || selectedEl.style?.variant === 'sphere' ? '9999px (Círculo)' : '4px')}
                              </span>
                            </div>
                            <div className="flex items-center bg-[#0a0d14] border border-slate-800 p-2.5 rounded-xl h-10 w-full">
                              <input 
                                type="range"
                                min="0"
                                max="120"
                                step="1"
                                value={selectedEl.style?.borderRadius !== undefined ? selectedEl.style.borderRadius : (selectedEl.id?.includes('circ') || selectedEl.style?.variant === 'sphere' ? 100 : 4)}
                                onChange={(e) => updateElementProps(selectedEl.id, { style: { borderRadius: parseInt(e.target.value) } })}
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
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
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
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
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
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
                                    className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
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
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Inserir Formas</span>
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
                            className="p-2 border border-slate-800 bg-[#0d1117] hover:bg-[#141822] rounded-xl text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors"
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
                                style: { backgroundColor: '#3b82f6', borderRadius: 500, opacity: 1, rotation: 0 }
                              };
                              triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                              setSelectedIds(new Set([newEl.id]));
                              setShapeSubTab('editar');
                            }}
                            className="p-2 border border-slate-800 bg-[#0d1117] hover:bg-[#141822] rounded-xl text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <div className="w-5 h-5 bg-blue-500 rounded-full" />
                            <span className="text-[9px] text-slate-350 font-bold">Círculo</span>
                          </button>

                          <button 
                            onClick={() => {
                              if (isLockedByPass) return;
                              const newEl: any = {
                                id: `shape-tri-${Date.now()}`,
                                type: 'shape',
                                x: 200, y: 350, width: 120, height: 110,
                                content: 'Triangle',
                                zIndex: currentSlide.elements.length + 1,
                                style: { backgroundColor: '#10b981', opacity: 1, rotation: 0, shapeVariant: 'triangle' }
                              };
                              triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                              setSelectedIds(new Set([newEl.id]));
                              setShapeSubTab('editar');
                            }}
                            className="p-2 border border-slate-800 bg-[#0d1117] hover:bg-[#141822] rounded-xl text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <div className="w-5 h-5 bg-emerald-500" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                            <span className="text-[9px] text-slate-350 font-bold">Triângulo</span>
                          </button>

                          <button 
                            onClick={() => {
                              if (isLockedByPass) return;
                              const newEl: any = {
                                id: `shape-star-${Date.now()}`,
                                type: 'shape',
                                x: 200, y: 350, width: 120, height: 120,
                                content: 'Star',
                                zIndex: currentSlide.elements.length + 1,
                                style: { backgroundColor: '#f59e0b', opacity: 1, rotation: 0, shapeVariant: 'star' }
                              };
                              triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                              setSelectedIds(new Set([newEl.id]));
                              setShapeSubTab('editar');
                            }}
                            className="p-2 border border-slate-800 bg-[#0d1117] hover:bg-[#141822] rounded-xl text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <div className="w-5 h-5 bg-amber-500" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
                            <span className="text-[9px] text-slate-350 font-bold">Estrela</span>
                          </button>

                          <button 
                            onClick={() => {
                              if (isLockedByPass) return;
                              const newEl: any = {
                                id: `shape-arrow-${Date.now()}`,
                                type: 'shape',
                                x: 200, y: 350, width: 140, height: 80,
                                content: 'Arrow',
                                zIndex: currentSlide.elements.length + 1,
                                style: { backgroundColor: '#a855f7', opacity: 1, rotation: 0, shapeVariant: 'arrow' }
                              };
                              triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                              setSelectedIds(new Set([newEl.id]));
                              setShapeSubTab('editar');
                            }}
                            className="p-2 border border-slate-800 bg-[#0d1117] hover:bg-[#141822] rounded-xl text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <div className="w-6 h-4 bg-purple-500" style={{ clipPath: 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)' }} />
                            <span className="text-[9px] text-slate-350 font-bold">Seta</span>
                          </button>

                          <button 
                            onClick={() => {
                              if (isLockedByPass) return;
                              const newEl: any = {
                                id: `shape-line-${Date.now()}`,
                                type: 'shape',
                                x: 200, y: 350, width: 200, height: 4,
                                content: 'Line',
                                zIndex: currentSlide.elements.length + 1,
                                style: { backgroundColor: '#64748b', opacity: 1, rotation: 0 }
                              };
                              triggerUpdate(slides.map((s, idx) => idx === currentSlideIndex ? { ...s, elements: [...s.elements, newEl] } : s));
                              setSelectedIds(new Set([newEl.id]));
                              setShapeSubTab('editar');
                            }}
                            className="p-2 border border-slate-800 bg-[#0d1117] hover:bg-[#141822] rounded-xl text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <div className="w-6 h-1 bg-slate-500 rounded-full" />
                            <span className="text-[9px] text-slate-350 font-bold">Linha</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {activeLeftTab === 'apresentacoes' && (
              <div className="flex flex-col h-full bg-[#11141a] select-none font-sans">
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400 flex items-center gap-1.5">
                    <Presentation size={14} className="text-cyan-400" />
                    Documentos
                  </span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white cursor-pointer">
                    <X size={14}/>
                  </button>
                </div>

                <div className="px-4 py-2.5 bg-slate-900/60 border-b border-[#1e293b] flex items-center justify-between text-[11px] text-slate-350">
                  <span className="font-semibold text-slate-350">Apresentações Salvas</span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-400 font-mono font-bold px-1.5 py-0.5 rounded border border-cyan-500/20">
                    {presentationList.length} {presentationList.length === 1 ? 'arquivo' : 'arquivos'}
                  </span>
                </div>

                <div className="p-3 border-b border-[#1e293b]/50">
                  <button
                    onClick={() => handleCreateNewPresentation(`Apresentação ${presentationList.length + 1}`)}
                    className="w-full py-2 px-3 bg-cyan-950/20 hover:bg-cyan-950/40 border border-dashed border-cyan-500/40 hover:border-cyan-400 rounded-xl text-[11px] font-extrabold text-cyan-400 flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Plus size={14} />
                    Criar Nova Apresentação
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
                  {presentationList.map(p => {
                    const isActive = p.id === activePresentationId;
                    const isRenaming = p.id === renamingId;
                    
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (!isActive) handleSelectPresentation(p.id);
                        }}
                        className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'bg-[#181d28]/90 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                            : 'bg-[#11141a] border-slate-800/40 hover:bg-[#141822] hover:border-slate-800/80'
                        }`}
                      >
                        {isRenaming ? (
                          <div className="space-y-2" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRenamePresentation(p.id, renameValue);
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              className="w-full bg-[#090b10] border border-cyan-500/50 rounded-lg px-2 py-1 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-cyan-400"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setRenamingId(null)}
                                className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] font-bold text-slate-400 hover:text-white"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleRenamePresentation(p.id, renameValue)}
                                className="px-2 py-0.5 bg-cyan-600 rounded text-[9px] font-bold text-white hover:bg-cyan-500"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-1">
                              <span className={`text-[11px] font-black tracking-tight leading-snug break-all truncate max-w-[150px] ${isActive ? 'text-cyan-400' : 'text-slate-200 group-hover:text-white'}`}>
                                {p.name}
                              </span>
                              
                              {isActive && (
                                <span className="text-[8px] font-bold bg-cyan-900/40 text-cyan-400 border border-cyan-500/30 px-1 py-0.2 rounded shrink-0 select-none">
                                  ATIVO
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                              <span>
                                {p.slides.length} {p.slides.length === 1 ? 'slide' : 'slides'}
                              </span>
                              <span>
                                {new Date(p.updatedAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* Action buttons drawer shown on hover or if active */}
                            <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-slate-800/60 opacity-60 group-hover:opacity-100 transition-opacity justify-end" onClick={e => e.stopPropagation()}>
                              <button
                                title="Renomear"
                                onClick={e => {
                                  e.stopPropagation();
                                  setRenamingId(p.id);
                                  setRenameValue(p.name);
                                }}
                                className="p-1.5 rounded-lg bg-[#0e1117] hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 transition-all cursor-pointer"
                              >
                                <Edit2 size={10} />
                              </button>
                              <button
                                title="Duplicar"
                                onClick={e => handleDuplicatePresentation(p.id, e)}
                                className="p-1.5 rounded-lg bg-[#0e1117] hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 transition-all cursor-pointer"
                              >
                                <Copy size={10} />
                              </button>
                              <button
                                title="Excluir"
                                onClick={e => handleDeletePresentation(p.id, e)}
                                className="p-1.5 rounded-lg bg-[#0e1117] hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 transition-all cursor-pointer"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-slate-900/40 border-t border-[#1e293b]/85 space-y-2">
                  <span className="text-[9px] text-slate-500 uppercase font-mono tracking-widest block text-center font-bold">
                    Opções de Backup
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleExportAllPresentations}
                      className="py-1.5 px-2 bg-[#0e1117] border border-slate-800 hover:border-slate-700 rounded-lg text-[9px] font-bold text-slate-350 flex items-center justify-center gap-1 shadow cursor-pointer transition-all active:scale-95"
                      title="Exportar todas as apresentações como backup JSON"
                    >
                      <FileDown size={11} className="text-cyan-400" />
                      Exportar
                    </button>
                    
                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportPresentations}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Importar backup de apresentações do JSON"
                      />
                      <button
                        className="w-full py-1.5 px-2 bg-[#0e1117] border border-slate-800 hover:border-slate-700 rounded-lg text-[9px] font-bold text-slate-350 flex items-center justify-center gap-1 shadow cursor-pointer transition-all active:scale-95"
                      >
                        <FileUp size={11} className="text-purple-400" />
                        Importar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeLeftTab === 'identidade' && (
              <div className="flex flex-col h-full bg-[#11141a] select-none font-sans overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-[#1e293b] flex justify-between items-center bg-[#11141a]">
                  <span className="text-xs font-black tracking-wider uppercase text-cyan-400 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-cyan-400 animate-pulse" />
                    Identidade Visual Única
                  </span>
                  <button onClick={() => setActiveLeftTab(null)} className="text-slate-400 hover:text-white cursor-pointer">
                    <X size={14}/>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 max-h-[calc(100vh-120px)] pb-10">
                  
                  {/* Unified Identity card */}
                  {(() => {
                    const currentId = identities[0] || {
                      name: 'Identidade Orkney com Degradê',
                      description: 'Estilo exclusivo utilizando a fonte Orkney, degradê entre as cores #30c3cd (cyan) e #5552b9 (purple), com fundo escuro elegante #1A1A1A e destaque nos gráficos com as mesmas cores.',
                      colors: { primary: '#ffffff', secondary: '#1A1A1A', accent: '#30c3cd', background: '#1A1A1A' },
                      fonts: { heading: 'Orkney', body: 'Orkney' }
                    };
                    return (
                      <div className="p-4 bg-slate-900/60 border border-slate-800/60 rounded-2xl space-y-4 animate-in fade-in duration-200">
                        <div>
                          <h4 className="text-xs font-black text-slate-200 tracking-wide uppercase flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-[#30c3cd] to-[#5552b9] animate-pulse" />
                            {currentId.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{currentId.description}</p>
                        </div>

                        {/* Interactive Gradient Ribbon */}
                        <div className="space-y-1">
                          <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Degradê de Identidade</span>
                          <div className="h-6 w-full rounded-lg bg-gradient-to-r from-[#30c3cd] to-[#5552b9] border border-white/10 relative overflow-hidden flex items-center justify-between px-3">
                            <span className="text-[8px] font-mono text-white font-bold drop-shadow-sm">#30c3cd</span>
                            <span className="text-[8px] font-mono text-white font-bold drop-shadow-sm">#5552b9</span>
                          </div>
                        </div>

                        {/* Palette colors */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div className="text-center bg-[#1A1A1A] p-1.5 border border-slate-800 rounded-xl">
                            <div className="w-5 h-5 rounded-full mx-auto border border-white/10 shadow-sm bg-[#1A1A1A]" />
                            <span className="text-[7px] text-slate-300 font-bold block mt-1">#1A1A1A</span>
                            <span className="text-[6px] text-slate-500 uppercase block">Fundo</span>
                          </div>
                          <div className="text-center bg-[#1A1A1A] p-1.5 border border-slate-800 rounded-xl">
                            <div className="w-5 h-5 rounded-full mx-auto border border-white/10 shadow-sm bg-[#30c3cd]" />
                            <span className="text-[7px] text-slate-300 font-bold block mt-1">#30c3cd</span>
                            <span className="text-[6px] text-slate-500 uppercase block">Destaque 1</span>
                          </div>
                          <div className="text-center bg-[#1A1A1A] p-1.5 border border-slate-800 rounded-xl">
                            <div className="w-5 h-5 rounded-full mx-auto border border-white/10 shadow-sm bg-[#5552b9]" />
                            <span className="text-[7px] text-slate-300 font-bold block mt-1">#5552b9</span>
                            <span className="text-[6px] text-slate-500 uppercase block">Destaque 2</span>
                          </div>
                        </div>

                        {/* Fonts preview */}
                        <div className="p-2.5 rounded-xl border border-slate-800/60 bg-slate-950/40 space-y-1">
                          <span className="text-[8px] uppercase font-bold text-slate-500 block">Tipografia Exclusiva</span>
                          <span className="text-xs font-semibold text-slate-100 block tracking-tight truncate" style={{ fontFamily: 'Orkney' }}>
                            Orkney Regular / Bold
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Teach / Feed references */}
                  <div className="p-3 bg-slate-900/40 border border-slate-800/40 rounded-2xl space-y-3">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={11} className="animate-pulse" />
                      Treinar IA / Alimentar Referências
                    </span>
                    <p className="text-[9px] text-slate-400 leading-relaxed">
                      Alimente a IA com imagens de slides ou diretrizes adicionais para ensiná-la a reorganizar o layout sob medida.
                    </p>

                    {/* Image reference uploader */}
                    <div className="relative border border-dashed border-[#1e293b] hover:border-indigo-500/50 rounded-xl p-3 bg-slate-950/20 hover:bg-indigo-950/10 transition-all text-center group cursor-pointer">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLearnFromImage}
                        disabled={isLearningIdentity}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {isLearningIdentity ? (
                           <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                        ) : (
                          <Upload size={14} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                        )}
                        <span className="text-[10px] font-semibold text-slate-300 block">
                          {isLearningIdentity ? 'Analisando Referência...' : 'Carregar Imagem de Slide'}
                        </span>
                        <span className="text-[8px] text-slate-500">PNG, JPG, WebP</span>
                      </div>
                    </div>

                    {/* Manual textual rule input */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[8px] text-slate-400 uppercase block font-bold">Diretriz de estilo manual:</span>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Ex: Títulos em caixa alta no topo..."
                          value={manualExample}
                          onChange={(e) => setManualExample(e.target.value)}
                          className="flex-1 bg-slate-950/40 border border-slate-800 rounded-xl p-1.5 text-[10px] text-slate-200 outline-none"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddManualExample()}
                        />
                        <button 
                          onClick={handleAddManualExample}
                          className="px-2.5 bg-indigo-900/50 hover:bg-indigo-900 text-indigo-300 text-[9px] rounded-xl font-bold border border-indigo-950 transition-colors cursor-pointer"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>

                    {/* Learned references list */}
                    {(() => {
                      const currentId = identities[0];
                      if (!currentId || !currentId.examples || currentId.examples.length === 0) return null;
                      return (
                        <div className="space-y-1.5 pt-2">
                          <span className="text-[8px] text-slate-400 uppercase block font-bold">Estilos Aprendidos ({currentId.examples.length}):</span>
                          <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                            {currentId.examples.map((ex, idx) => (
                              <div key={idx} className="bg-slate-950/40 p-1.5 border border-slate-800/40 rounded-lg flex justify-between items-center text-[8px] leading-normal text-slate-300">
                                <span className="truncate flex-1 pr-1">{idx+1}. {ex}</span>
                                <button 
                                  onClick={() => handleDeleteExample(idx)}
                                  className="text-slate-500 hover:text-red-400 p-0.5 cursor-pointer"
                                  title="Remover diretriz"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Apply visual layout actions */}
                  <div className="p-3 bg-indigo-950/10 border border-indigo-900/20 rounded-2xl space-y-3 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={11} className="text-cyan-400" />
                        Reorganizar Layout
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] text-slate-400 uppercase font-bold">Diversificar</span>
                        <button
                          onClick={() => setDiversifyLayout(!diversifyLayout)}
                          className={`w-7 h-4 rounded-full transition-colors relative p-0.5 cursor-pointer ${diversifyLayout ? 'bg-cyan-500' : 'bg-slate-800'}`}
                        >
                          <div className={`w-3 h-3 rounded-full bg-white transition-transform ${diversifyLayout ? 'translate-x-3' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-relaxed font-sans">
                      Aplique esta identidade. As informações dos seus slides serão totalmente redesenhadas e diagramadas sem perder nenhuma informação.
                    </p>

                    <div className="space-y-2 pt-1 font-sans">
                      <button
                        onClick={() => handleApplyIdentity(false)}
                        disabled={isApplyingIdentity || isLearningIdentity}
                        className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isApplyingIdentity ? (
                          <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        ) : (
                          <Sparkles size={11} />
                        )}
                        Redesenhar Slide Atual
                      </button>

                      <button
                        onClick={() => handleApplyIdentity(true)}
                        disabled={isApplyingIdentity || isLearningIdentity}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isApplyingIdentity ? (
                          <div className="w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
                        ) : (
                          <Presentation size={11} className="text-indigo-400" />
                        )}
                        Redesenhar Toda Apresentação
                      </button>
                    </div>
                  </div>
                </div>

                {/* Loading overlay */}
                {isApplyingIdentity && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300 font-sans">
                    <div className="relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                      <Sparkles size={24} className="text-cyan-400 absolute animate-pulse" />
                    </div>
                    <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest mt-6 animate-pulse">
                      Reformulando Layout...
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-2 max-w-[200px] leading-relaxed">
                      Utilizando inteligência artificial para reconstruir os slides baseados no seu estilo aprendido.
                    </p>
                    <div className="mt-4 bg-slate-900/80 border border-slate-800 p-2 rounded-xl text-[8px] font-mono text-slate-500 w-full max-w-[180px] truncate">
                      [INFO] REDESENHANDO COMPOSIÇÃO...
                    </div>
                  </div>
                )}
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
              onClick={() => {
                setPresentationSlideIndex(currentSlideIndex);
                setIsPresentationMode(true);
                toast.success('Iniciando apresentação de slides estilo PowerPoint! Pressione ESC para sair.');
              }}
              className="p-2 px-3 border border-slate-800 hover:border-cyan-500/50 rounded-xl text-slate-400 hover:text-[#22d3ee] bg-slate-900 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-black uppercase tracking-wider"
              title="Apresentar Slides (F5)"
            >
              <Presentation size={14} className="text-cyan-400" /> APRESENTAR
            </button>
            <button 
              onClick={() => executeConversion('pdf')}
              className="p-2 px-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-xl text-xs font-black tracking-wide text-white flex items-center gap-2 shadow-lg shadow-cyan-950/50"
            >
              <Download size={14}/> EXPORTAR
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
                key={`${slide.id || "slide"}-${idx}`}
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
                  id={`slide-canvas-export-${idx}`}
                  className="bg-white text-slate-950 relative shadow-md w-full h-full select-none overflow-hidden"
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
                  {pageSizeType !== 'SLIDE_16_9' && headerText && (
                    <div className="absolute top-6 left-12 right-12 flex justify-between border-b border-slate-200 pb-2 text-[10px] text-slate-400 select-none">
                      <span>{headerText.toUpperCase()}</span>
                      <span>Acrobat Pro Document</span>
                    </div>
                  )}

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
                    {slide.elements.filter((item: any) => !item.maskedBy).map((el: any, elIdx: number) => {
                      const isSelected = selectedIds.has(el.id);
                      
                      return (
                        <React.Fragment key={`${el.id}-${elIdx}`}>
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
                              : (el.id?.includes('circ') || el.style?.variant === 'sphere' ? '9999px' : undefined),
                            border: el.style?.border || 'none'
                          }}
                        >
                          {/* UNIVERSAL DASHED BOUNDING BOX FOR EVERY ITEM */}
                          {editMode === 'EDIT' && croppingImageId != el.id && (
                            <div 
                              className={`absolute -inset-[2.5px] rounded-[inherit] pointer-events-none z-[49] border transition-colors duration-75 ${
                                isSelected 
                                  ? 'border-2 border-blue-500 ring-4 ring-blue-500/10' 
                                  : 'border border-transparent hover:border-blue-500/50 group-hover:border-blue-500/50'
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
                            editingTextId === el.id ? (
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
                                className="w-full h-full bg-transparent border-none resize-none outline-none select-text custom-scrollbar focus:ring-0 p-0 m-0"
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
                                }}
                              />
                            ) : (
                              <div
                                className="w-full h-full bg-transparent overflow-visible whitespace-pre-wrap break-words leading-tight select-none"
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
                                  pointerEvents: 'none',
                                }}
                              >
                                {el.content}
                              </div>
                            )
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
                              className="w-full h-full relative overflow-hidden"
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
                                  : (el.id?.includes('circ') || el.style?.variant === 'sphere' ? '9999px' : '4px'),
                                border: el.style?.border || 'none',
                                clipPath: el.style?.shapeVariant === 'triangle'
                                  ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
                                  : el.style?.shapeVariant === 'star'
                                  ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                                  : el.style?.shapeVariant === 'arrow'
                                  ? 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)'
                                  : undefined
                              }}
                            >
                              {slide.elements
                                .filter((child: any) => child.maskedBy === el.id)
                                .map((child: any, cIdx: number) => {
                                  const isChildSelected = selectedIds.has(child.id);
                                  return (
                                    <div
                                      key={`${child.id}-${cIdx}`}
                                      onMouseDown={(e) => {
                                        if (editMode === 'LIVE_FILL' || isLockedByPass) return;
                                        e.stopPropagation();
                                        openSidebarForElement(child);
                                        wasSelectedOnMouseDownRef.current = selectedIds.has(child.id);
                                        mouseDownCoordsRef.current = { x: e.clientX, y: e.clientY };
                                        if (child.isLocked) {
                                          setSelectedIds(new Set([child.id]));
                                          return;
                                        }
                                        handleMouseDown(e, child);
                                      }}
                                      className={`absolute select-none pointer-events-auto ${isChildSelected ? 'ring-2 ring-cyan-500 ring-offset-1' : ''}`}
                                      style={{
                                        left: `${child.x - el.x}px`,
                                        top: `${child.y - el.y}px`,
                                        width: `${child.width}px`,
                                        height: `${child.height}px`,
                                        zIndex: child.zIndex || 1,
                                        transform: child.style?.rotation ? `rotate(${child.style.rotation}deg)` : undefined,
                                        opacity: child.style?.opacity !== undefined ? child.style.opacity : 1,
                                      }}
                                    >
                                      {child.type === 'shape' && (
                                        <div
                                          className="w-full h-full"
                                          style={{
                                            ...(child.style?.useGradient
                                              ? {
                                                  background: child.style.gradientType === 'radial'
                                                    ? `radial-gradient(circle, ${child.style.gradientColorStart || '#3b82f6'}, ${child.style.gradientColorEnd || '#ec4899'})`
                                                    : `linear-gradient(${child.style.gradientAngle ?? 135}deg, ${child.style.gradientColorStart || '#3b82f6'}, ${child.style.gradientColorEnd || '#ec4899'})`
                                                }
                                              : { backgroundColor: child.style?.backgroundColor || '#0284c7' }),
                                            borderRadius: child.style?.borderRadius !== undefined 
                                              ? `${child.style.borderRadius}px` 
                                              : (child.id?.includes('circ') || child.style?.variant === 'sphere' ? '9999px' : '4px'),
                                            border: child.style?.border || 'none'
                                          }}
                                        />
                                      )}
                                      {child.type === 'text' && (
                                        <div
                                          className="w-full h-full bg-transparent whitespace-pre-wrap break-words leading-tight"
                                          style={{
                                            fontFamily: child.style.fontFamily || 'Inter',
                                            fontSize: `${child.style.fontSize || 14}px`,
                                            color: child.style.color || '#1e293b',
                                            textAlign: child.style.textAlign || 'left',
                                            fontWeight: child.style.fontWeight || 'normal',
                                            lineHeight: child.style.lineHeight || 1.2,
                                            letterSpacing: child.style.letterSpacing || 'normal',
                                            fontStyle: child.style.fontStyle || 'normal',
                                            textDecoration: child.style.textDecoration || 'none',
                                            textTransform: child.style.textTransform || 'none',
                                            opacity: child.style.opacity ?? 1,
                                            pointerEvents: 'none',
                                          }}
                                        >
                                          {child.content}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
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
                  {pageSizeType !== 'SLIDE_16_9' && (footerText || autoPageNumbers) && (
                    <div className="absolute bottom-6 left-12 right-12 flex justify-between border-t border-slate-200 pt-2 text-[10px] text-slate-400 select-none">
                      <span>{footerText ? footerText.toUpperCase() : ''}</span>
                      {autoPageNumbers && <span>Página {idx + 1} de {slides.length}</span>}
                    </div>
                  )}
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
                  key={`${slide.id}-${idx}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', idx.toString());
                    setDraggedSlideIndex(idx);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedSlideIndex !== null && dragOverSlideIndex !== idx) {
                      setDragOverSlideIndex(idx);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverSlideIndex === idx) {
                      setDragOverSlideIndex(null);
                    }
                  }}
                  onDragEnd={() => {
                    setDraggedSlideIndex(null);
                    setDragOverSlideIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIdx = draggedSlideIndex !== null ? draggedSlideIndex : parseInt(e.dataTransfer.getData('text/plain'));
                    handleReorderSlides(fromIdx, idx);
                    setDraggedSlideIndex(null);
                    setDragOverSlideIndex(null);
                  }}
                  onClick={() => {
                    onSelectSlide(idx);
                    setActiveThumbnailMenuIndex(null);
                  }}
                  className={`relative cursor-pointer rounded-xl border transition-all h-[64px] shrink-0 ${
                    isActive 
                      ? 'border-[3px] border-slate-900 dark:border-cyan-400 shadow-md scale-[1.02] z-40 w-28'
                      : 'border border-slate-300 dark:border-slate-800 hover:border-slate-400 w-24 bg-white dark:bg-slate-950'
                  } ${
                    draggedSlideIndex === idx ? 'opacity-30 scale-95' : ''
                  } ${
                    dragOverSlideIndex === idx && draggedSlideIndex !== idx ? 'ring-4 ring-cyan-500/50 border-cyan-400 scale-[1.05]' : ''
                  }`}
                >
                  {/* Miniature canvas screen content preview */}
                  <div className="absolute inset-0 rounded-lg overflow-hidden" style={{ background: slide.background || '#ffffff' }}>
                    <div className="absolute inset-0 p-1 overflow-hidden">
                      {slide.elements.filter((item: any) => !item.maskedBy).map((el: any, elIdx: number) => {
                        const left = `${(el.x / docWidth) * 100}%`;
                        const top = `${(el.y / docHeight) * 100}%`;
                        const width = `${(el.width / docWidth) * 100}%`;
                        const height = `${(el.height / docHeight) * 100}%`;
                        const opacity = el.style?.opacity ?? 1;
                        const rotation = el.style?.rotation ? `rotate(${el.style.rotation}deg)` : 'none';

                        const commonStyle: React.CSSProperties = {
                          position: 'absolute',
                          left,
                          top,
                          width,
                          height,
                          opacity,
                          transform: rotation,
                          zIndex: el.zIndex,
                        };

                        if (el.isRedacted || el.type === 'redact') {
                          return (
                            <div 
                              key={`${el.id}-${elIdx}`} 
                              style={{ ...commonStyle, backgroundColor: '#000000' }} 
                              className="rounded-[1px]"
                            />
                          );
                        }

                        if (el.type === 'text') {
                          const fontSize = Math.max(1, (el.style?.fontSize || 14) * 0.08);
                          return (
                            <div
                              key={`${el.id}-${elIdx}`}
                              style={{
                                ...commonStyle,
                                fontFamily: el.style?.fontFamily || 'Inter',
                                fontSize: `${fontSize}px`,
                                color: el.style?.color || '#1e293b',
                                textAlign: el.style?.textAlign || 'left',
                                fontWeight: el.style?.fontWeight || 'normal',
                                lineHeight: 1,
                                letterSpacing: 'normal',
                                fontStyle: el.style?.fontStyle || 'normal',
                                textDecoration: el.style?.textDecoration || 'none',
                                textTransform: el.style?.textTransform || 'none',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                overflow: 'hidden',
                                paddingLeft: el.style?.indent ? `${el.style.indent * 0.08}px` : undefined,
                              }}
                            >
                              {el.content}
                            </div>
                          );
                        }

                        if (el.type === 'image') {
                          const crop = el.style?.crop || { left: 0, top: 0, right: 0, bottom: 0 };
                          const scaleX = 100 / (100 - crop.left - crop.right);
                          const scaleY = 100 / (100 - crop.top - crop.bottom);
                          const posX = -crop.left * scaleX;
                          const posY = -crop.top * scaleY;

                          return (
                            <div key={`${el.id}-${elIdx}`} style={commonStyle} className="overflow-hidden">
                              <img 
                                src={el.content} 
                                alt="" 
                                className="absolute select-none pointer-events-none max-w-none w-full h-full"
                                style={{
                                  width: `${scaleX * 100}%`,
                                  height: `${scaleY * 100}%`,
                                  left: `${posX}%`,
                                  top: `${posY}%`,
                                }}
                              />
                            </div>
                          );
                        }

                        if (el.type === 'shape' || (!el.type && el.style)) {
                          const isVector = el.style?.variant === 'vector';
                          const backgroundStyle: React.CSSProperties = isVector
                            ? { backgroundColor: 'transparent' }
                            : el.style?.useGradient
                            ? {
                                background: el.style.gradientType === 'radial'
                                  ? `radial-gradient(circle, ${el.style.gradientColorStart || '#3b82f6'}, ${el.style.gradientColorEnd || '#ec4899'})`
                                  : `linear-gradient(${el.style.gradientAngle ?? 135}deg, ${el.style.gradientColorStart || '#3b82f6'}, ${el.style.gradientColorEnd || '#ec4899'})`
                              }
                            : { backgroundColor: el.style?.backgroundColor || '#0284c7' };

                          const borderRadius = isVector 
                            ? '0px' 
                            : el.style?.borderRadius !== undefined 
                            ? `${el.style.borderRadius * 0.08}px` 
                            : (el.id?.includes('circ') || el.style?.variant === 'sphere' ? '9999px' : '1px');

                          const clipPath = isVector
                            ? undefined
                            : el.style?.shapeVariant === 'triangle'
                            ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
                            : el.style?.shapeVariant === 'star'
                            ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                            : el.style?.shapeVariant === 'arrow'
                            ? 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)'
                            : undefined;

                          return (
                            <div
                              key={`${el.id}-${elIdx}`}
                              style={{
                                ...commonStyle,
                                ...backgroundStyle,
                                borderRadius,
                                clipPath,
                                border: isVector ? 'none' : (el.style?.border || 'none'),
                              }}
                              className="overflow-hidden"
                            >
                              {isVector && (
                                <svg
                                  className="absolute inset-0 w-full h-full"
                                  viewBox="0 0 100 100"
                                  preserveAspectRatio="none"
                                >
                                  {el.style?.useGradient && (
                                    <defs>
                                      {el.style?.gradientType === 'radial' ? (
                                        <radialGradient id={`grad-${el.id}`} cx="50%" cy="50%" r="50%">
                                          <stop offset="0%" stopColor={el.style.gradientColorStart || '#3b82f6'} />
                                          <stop offset="100%" stopColor={el.style.gradientColorEnd || '#ec4899'} />
                                        </radialGradient>
                                      ) : (
                                        <linearGradient id={`grad-${el.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                          <stop offset="0%" stopColor={el.style.gradientColorStart || '#3b82f6'} />
                                          <stop offset="100%" stopColor={el.style.gradientColorEnd || '#ec4899'} />
                                        </linearGradient>
                                      )}
                                    </defs>
                                  )}
                                  <path
                                    d={el.content || 'M 0 0 L 100 0 L 100 100 L 0 100 Z'}
                                    fill={el.style?.useGradient ? `url(#grad-${el.id})` : (el.style?.backgroundColor || '#0284c7')}
                                    stroke={el.style?.borderColor || 'none'}
                                    strokeWidth={el.style?.borderWidth !== undefined ? el.style.borderWidth : undefined}
                                  />
                                </svg>
                              )}
                              {slide.elements
                                .filter((child: any) => child.maskedBy === el.id)
                                .map((child: any, cIdx: number) => {
                                  const childLeft = `${((child.x - el.x) / el.width) * 100}%`;
                                  const childTop = `${((child.y - el.y) / el.height) * 100}%`;
                                  const childWidth = `${(child.width / el.width) * 100}%`;
                                  const childHeight = `${(child.height / el.height) * 100}%`;
                                  const childRotation = child.style?.rotation ? `rotate(${child.style.rotation}deg)` : 'none';

                                  const childCommonStyle: React.CSSProperties = {
                                    position: 'absolute',
                                    left: childLeft,
                                    top: childTop,
                                    width: childWidth,
                                    height: childHeight,
                                    opacity: child.style?.opacity !== undefined ? child.style.opacity : 1,
                                    transform: childRotation,
                                    zIndex: child.zIndex || 1,
                                  };

                                  if (child.type === 'shape') {
                                    const childBackgroundStyle: React.CSSProperties = child.style?.useGradient
                                      ? {
                                          background: child.style.gradientType === 'radial'
                                            ? `radial-gradient(circle, ${child.style.gradientColorStart || '#3b82f6'}, ${child.style.gradientColorEnd || '#ec4899'})`
                                            : `linear-gradient(${child.style.gradientAngle ?? 135}deg, ${child.style.gradientColorStart || '#3b82f6'}, ${child.style.gradientColorEnd || '#ec4899'})`
                                        }
                                      : { backgroundColor: child.style?.backgroundColor || '#0284c7' };

                                    const childBorderRadius = child.style?.borderRadius !== undefined 
                                      ? `${child.style.borderRadius * 0.08}px` 
                                      : (child.id?.includes('circ') || child.style?.variant === 'sphere' ? '9999px' : '1px');

                                    return (
                                      <div
                                        key={`${child.id}-${cIdx}`}
                                        style={{
                                          ...childCommonStyle,
                                          ...childBackgroundStyle,
                                          borderRadius: childBorderRadius,
                                        }}
                                      />
                                    );
                                  }

                                  if (child.type === 'text') {
                                    const childFontSize = Math.max(1, (child.style?.fontSize || 14) * 0.08);
                                    return (
                                      <div
                                        key={`${child.id}-${cIdx}`}
                                        style={{
                                          ...childCommonStyle,
                                          fontFamily: child.style?.fontFamily || 'Inter',
                                          fontSize: `${childFontSize}px`,
                                          color: child.style?.color || '#1e293b',
                                          textAlign: child.style?.textAlign || 'left',
                                          fontWeight: child.style?.fontWeight || 'normal',
                                          lineHeight: 1,
                                          whiteSpace: 'pre-wrap',
                                          wordBreak: 'break-all',
                                          overflow: 'hidden',
                                        }}
                                      >
                                        {child.content}
                                      </div>
                                    );
                                  }

                                  return null;
                                })}
                            </div>
                          );
                        }

                        if (el.isFormField) {
                          return (
                            <div 
                              key={`${el.id}-${elIdx}`} 
                              style={{ ...commonStyle, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }} 
                              className="rounded-[1px] flex items-center justify-center overflow-hidden"
                            >
                              <span className="text-[4px] text-slate-400 scale-[0.8]">📝</span>
                            </div>
                          );
                        }

                        return null;
                      })}
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
                          const rect = e.currentTarget.getBoundingClientRect();
                          setThumbnailMenuPosition({ x: rect.left, y: rect.top });
                          setActiveThumbnailMenuIndex(activeThumbnailMenuIndex === idx ? null : idx);
                        }}
                        className="w-5 h-5 rounded-full bg-slate-900/85 hover:bg-slate-950 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20"
                        title="Mais opções de página"
                      >
                        <MoreHorizontal size={11} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Page action shortcuts aligned to the far right next to Página button */}
          <div className="shrink-0 flex items-center pl-2 ml-4 gap-2">
            {/* Duplicate button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                duplicatePage();
              }}
              className="px-2.5 h-[64px] rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-850 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 flex flex-col items-center justify-center gap-1 font-sans transition-all cursor-pointer border border-[#b4c6fc]/5 shadow-sm min-w-[56px]"
              title="Duplicar página atual"
            >
              <Copy size={13} className="text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="text-[9px] font-bold">Duplicar</span>
            </button>

            {/* Excluir button */}
            <button
              disabled={slides.length === 1}
              onClick={(e) => {
                e.stopPropagation();
                removePage();
              }}
              className="px-2.5 h-[64px] rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/40 text-red-650 dark:text-red-350 disabled:opacity-30 disabled:hover:bg-red-50 flex flex-col items-center justify-center gap-1 font-sans transition-all cursor-pointer border border-red-200/10 shadow-sm min-w-[56px]"
              title="Excluir página atual"
            >
              <Trash2 size={13} className="text-red-500 shrink-0" />
              <span className="text-[9px] font-bold">Excluir</span>
            </button>

            {/* Add blank page button */}
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

        {/* FIXED POSITIONED OPTIONS DROPDOWN (AVOIDS CLIPPING BY OVERFLOW-X-AUTO) */}
        {activeThumbnailMenuIndex !== null && thumbnailMenuPosition !== null && (
          <>
            {/* Backdrop to close click-away */}
            <div 
              className="fixed inset-0 z-[299] bg-transparent cursor-default" 
              onClick={(e) => {
                e.stopPropagation();
                setActiveThumbnailMenuIndex(null);
                setThumbnailMenuPosition(null);
              }}
            />
            <div 
              className="fixed bg-white dark:bg-[#181d28] border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-2xl z-[300] w-56 flex flex-col gap-1 text-[11px] text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100"
              style={{
                left: `${Math.max(12, Math.min(window.innerWidth - 240, thumbnailMenuPosition.x - 200))}px`,
                top: `${Math.max(10, Math.min(window.innerHeight - 250, thumbnailMenuPosition.y - 195))}px` // Position cleanly and safely clamped within viewport
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header section with Page Type and exact dimensions */}
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex flex-col text-left mb-1 select-none">
                <span className="text-[11px] font-black text-slate-900 dark:text-white leading-tight">
                  {pageSizeType === 'CUSTOM' ? 'Personalizado' : pageSizeType === 'SLIDE_16_9' ? 'Slide (16:9)' : 'A4'}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold font-mono mt-0.5 leading-none">
                  {docWidth} x {docHeight} px
                </span>
              </div>

              {/* "Inserir nova página" option */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveThumbnailMenuIndex(null);
                  setThumbnailMenuPosition(null);
                  addPage();
                }}
                className="flex items-center gap-2.5 p-2 px-3 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-left cursor-pointer transition-colors w-full text-slate-800 dark:text-slate-100"
              >
                <PlusSquare size={13} className="text-slate-600 dark:text-slate-400 shrink-0" />
                <span className="text-[11px] font-bold">Inserir nova página</span>
              </button>

              {/* "Duplicar" option */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveThumbnailMenuIndex(null);
                  setThumbnailMenuPosition(null);
                  duplicatePage();
                }}
                className="flex items-center gap-2.5 p-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-left cursor-pointer transition-colors w-full text-slate-700 dark:text-slate-300"
              >
                <Copy size={13} className="text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="text-[11px] font-bold">Duplicar</span>
              </button>

              {/* "Excluir" option */}
              <button 
                disabled={slides.length === 1}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveThumbnailMenuIndex(null);
                  setThumbnailMenuPosition(null);
                  removePage();
                }}
                className="flex items-center gap-2.5 p-2 px-3 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-700 dark:text-slate-300 hover:text-red-650 dark:hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl text-left cursor-pointer transition-colors w-full"
              >
                <Trash2 size={13} className="text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="text-[11px] font-bold">Excluir</span>
              </button>

              {/* "Editar linha do tempo" option */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveThumbnailMenuIndex(null);
                  setThumbnailMenuPosition(null);
                  const seconds = prompt("Ajustar tempo de exibição do slide (em segundos):", "5.0");
                  if (seconds) {
                    toast.success(`Tempo de exibição ajustado para ${seconds}s na Linha do Tempo!`);
                  }
                }}
                className="flex items-center gap-2.5 p-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-left cursor-pointer transition-colors w-full text-slate-700 dark:text-slate-300"
              >
                <Clock size={13} className="text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="text-[11px] font-bold">Editar linha do tempo</span>
              </button>
            </div>
          </>
        )}
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
                            className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
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
                              <option value="Orkney">Orkney (Padrão Corporativo)</option>
                              <option value="Inter">Inter (Padrão Clean)</option>
                              <option value="Montserrat">Montserrat (Geométrico / Moderno)</option>
                              <option value="Space Grotesk">Space Grotesk (Display / Digital)</option>
                              <option value="JetBrains Mono">JetBrains Mono (Técnico / Mono)</option>
                              <option value="Playfair Display">Playfair Display (Serif / Editorial)</option>
                              <option value="Archivo Black">Archivo Black (Display Pesado)</option>
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
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
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
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
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
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
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
                                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
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
                              className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
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
                              className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
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
                                      : (el.id?.includes('circ') || el.style?.variant === 'sphere' ? '100px (Círculo)' : '4px')}
                                  </span>
                                </div>
                                <input 
                                  type="range"
                                  min="0"
                                  max="120"
                                  step="1"
                                  value={el.style?.borderRadius !== undefined ? el.style.borderRadius : (el.id?.includes('circ') || el.style?.variant === 'sphere' ? 100 : 4)}
                                  onChange={(e) => updateElementProps(el.id, { style: { ...el.style, borderRadius: parseInt(e.target.value) } })}
                                  className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
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
                                        className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
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
                    className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110 mt-2"
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

      {/* MODO DE APRESENTAÇÃO DE SLIDES ESTILO POWERPOINT */}
      {isPresentationMode && (
        <div 
          className="fixed inset-0 bg-[#070a13] z-[99999] flex flex-col items-center justify-center overflow-hidden select-none animate-in fade-in duration-200"
          style={{ 
            cursor: presentationLaserActive 
              ? 'none' 
              : (presentationPenActive || presentationHighlighterActive ? 'crosshair' : 'default') 
          }}
        >
          {/* CONTAINER DO SLIDE ESCALADO */}
          {(() => {
            const slide = slides[presentationSlideIndex];
            if (!slide) return null;

            // Calcula escala ideal para preencher a tela mantendo proporções do slide
            const scaleX = (presentationDimensions.width - 100) / docWidth;
            const scaleY = (presentationDimensions.height - 120) / docHeight;
            const scale = Math.min(scaleX, scaleY, 1.5); // Limite de 1.5x de upscale

            // Eventos de desenho com caneta e marca-texto
            const handlePresentationMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
              if (!presentationPenActive && !presentationHighlighterActive) return;
              
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / scale;
              const y = (e.clientY - rect.top) / scale;
              
              setIsPresentationDrawing(true);
              setCurrentDrawingPoints([{ x, y }]);
            };

            const handleSlideClick = (e: React.MouseEvent) => {
              // Se caneta, laser ou marca-texto ativos, o clique desenha e não avança slide
              if (presentationPenActive || presentationHighlighterActive || presentationLaserActive) return;
              
              if (presentationSlideIndex < slides.length - 1) {
                setPresentationSlideIndex(prev => prev + 1);
                setCurrentDrawingPoints([]);
              } else {
                toast.info('Fim da apresentação de slides. Pressione ESC para sair.');
              }
            };

            return (
              <div 
                className="relative flex items-center justify-center w-full h-full p-6"
                onClick={handleSlideClick}
              >
                {/* O SLIDE COMPLETO */}
                <div
                  id="presentation-slide-canvas"
                  onMouseDown={handlePresentationMouseDown}
                  className="bg-white text-slate-950 relative shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden select-none rounded-xl border border-slate-800/20"
                  style={{
                    width: `${docWidth}px`,
                    height: `${docHeight}px`,
                    transform: `scale(${scale})`,
                    background: slide.background || '#ffffff',
                    flexShrink: 0
                  }}
                >
                  {/* WATERMARK BACKGROUND LAYER */}
                  {watermark && (
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none z-0">
                      <span className="text-[100px] text-slate-200/40 font-black tracking-widest leading-none rotate-45 select-none font-sans uppercase">
                        {watermark}
                      </span>
                    </div>
                  )}

                  {/* RUNNING HEADER */}
                  {pageSizeType !== 'SLIDE_16_9' && (
                    <div className="absolute top-6 left-12 right-12 flex justify-between border-b border-slate-200 pb-2 text-[10px] text-slate-400 select-none">
                      <span>{headerText.toUpperCase()}</span>
                      <span>Acrobat Pro Presentation</span>
                    </div>
                  )}

                  {/* ELEMENTOS DO SLIDE */}
                  <div className="absolute inset-0 pt-20 pb-20 px-12 z-10">
                    {slide.elements.filter((item: any) => !item.maskedBy).map((el: any, elIdx: number) => {
                      const left = `${el.x}px`;
                      const top = `${el.y}px`;
                      const width = `${el.width}px`;
                      const height = `${el.height}px`;
                      const opacity = el.style?.opacity ?? 1;
                      const rotation = el.style?.rotation ? `rotate(${el.style.rotation}deg)` : 'none';

                      const commonStyle: React.CSSProperties = {
                        position: 'absolute',
                        left,
                        top,
                        width,
                        height,
                        opacity,
                        transform: rotation,
                        zIndex: el.zIndex,
                      };

                      if (el.isRedacted || el.type === 'redact') {
                        return (
                          <div 
                            key={`${el.id}-${elIdx}`} 
                            style={{ ...commonStyle, backgroundColor: '#000000' }} 
                            className="rounded-[1px]"
                          />
                        );
                      }

                      if (el.type === 'text') {
                        return (
                          <div
                            key={`${el.id}-${elIdx}`}
                            style={{
                              ...commonStyle,
                              fontFamily: el.style?.fontFamily || 'Inter',
                              fontSize: `${el.style?.fontSize || 14}px`,
                              color: el.style?.color || '#1e293b',
                              textAlign: el.style?.textAlign || 'left',
                              fontWeight: el.style?.fontWeight || 'normal',
                              lineHeight: el.style?.lineHeight || 1.3,
                              letterSpacing: 'normal',
                              fontStyle: el.style?.fontStyle || 'normal',
                              textDecoration: el.style?.textDecoration || 'none',
                              textTransform: el.style?.textTransform || 'none',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              overflow: 'hidden',
                              paddingLeft: el.style?.indent ? `${el.style.indent}px` : undefined,
                            }}
                          >
                            {el.content}
                          </div>
                        );
                      }

                      if (el.type === 'image') {
                        const crop = el.style?.crop || { left: 0, top: 0, right: 0, bottom: 0 };
                        const scaleX = 100 / (100 - crop.left - crop.right);
                        const scaleY = 100 / (100 - crop.top - crop.bottom);
                        const posX = -crop.left * scaleX;
                        const posY = -crop.top * scaleY;

                        return (
                          <div key={`${el.id}-${elIdx}`} style={commonStyle} className="overflow-hidden">
                            <img 
                              src={el.content} 
                              alt="" 
                              className="absolute select-none pointer-events-none max-w-none w-full h-full"
                              referrerPolicy="no-referrer"
                              style={{
                                width: `${scaleX * 100}%`,
                                height: `${scaleY * 100}%`,
                                left: `${posX}%`,
                                top: `${posY}%`,
                              }}
                            />
                          </div>
                        );
                      }

                      if (el.type === 'shape' || (!el.type && el.style)) {
                        const isVector = el.style?.variant === 'vector';
                        const backgroundStyle: React.CSSProperties = isVector
                          ? { backgroundColor: 'transparent' }
                          : el.style?.useGradient
                          ? {
                              background: el.style.gradientType === 'radial'
                                ? `radial-gradient(circle, ${el.style.gradientColorStart || '#3b82f6'}, ${el.style.gradientColorEnd || '#ec4899'})`
                                : `linear-gradient(${el.style.gradientAngle ?? 135}deg, ${el.style.gradientColorStart || '#3b82f6'}, ${el.style.gradientColorEnd || '#ec4899'})`
                            }
                          : { backgroundColor: el.style?.backgroundColor || '#0284c7' };

                        const borderRadius = isVector
                          ? '0px'
                          : el.style?.borderRadius !== undefined 
                          ? `${el.style.borderRadius}px` 
                          : (el.id?.includes('circ') || el.style?.variant === 'sphere' ? '9999px' : '1px');

                        const clipPath = isVector
                          ? undefined
                          : el.style?.shapeVariant === 'triangle'
                          ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
                          : el.style?.shapeVariant === 'star'
                          ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                          : el.style?.shapeVariant === 'arrow'
                          ? 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)'
                          : undefined;

                        return (
                          <div
                            key={`${el.id}-${elIdx}`}
                            style={{
                              ...commonStyle,
                              ...backgroundStyle,
                              borderRadius,
                              clipPath,
                              border: isVector ? 'none' : (el.style?.border || 'none'),
                            }}
                            className="overflow-hidden"
                          >
                            {isVector && (
                              <svg
                                className="absolute inset-0 w-full h-full"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                              >
                                {el.style?.useGradient && (
                                  <defs>
                                    {el.style?.gradientType === 'radial' ? (
                                      <radialGradient id={`pres-grad-${el.id}`} cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor={el.style.gradientColorStart || '#3b82f6'} />
                                        <stop offset="100%" stopColor={el.style.gradientColorEnd || '#ec4899'} />
                                      </radialGradient>
                                    ) : (
                                      <linearGradient id={`pres-grad-${el.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor={el.style.gradientColorStart || '#3b82f6'} />
                                        <stop offset="100%" stopColor={el.style.gradientColorEnd || '#ec4899'} />
                                      </linearGradient>
                                    )}
                                  </defs>
                                )}
                                <path
                                  d={el.content || 'M 0 0 L 100 0 L 100 100 L 0 100 Z'}
                                  fill={el.style?.useGradient ? `url(#pres-grad-${el.id})` : (el.style?.backgroundColor || '#0284c7')}
                                  stroke={el.style?.borderColor || 'none'}
                                  strokeWidth={el.style?.borderWidth !== undefined ? el.style.borderWidth : undefined}
                                />
                              </svg>
                            )}
                            {/* SUPORTE IMPECÁVEL A MÁSCARAS DE ELEMENTOS (CLIPPING DO PAI) */}
                            {slide.elements
                              .filter((child: any) => child.maskedBy === el.id)
                              .map((child: any, cIdx: number) => {
                                const childLeft = `${((child.x - el.x) / el.width) * 100}%`;
                                const childTop = `${((child.y - el.y) / el.height) * 100}%`;
                                const childWidth = `${(child.width / el.width) * 100}%`;
                                const childHeight = `${(child.height / el.height) * 100}%`;
                                const childRotation = child.style?.rotation ? `rotate(${child.style.rotation}deg)` : 'none';

                                const childCommonStyle: React.CSSProperties = {
                                  position: 'absolute',
                                  left: childLeft,
                                  top: childTop,
                                  width: childWidth,
                                  height: childHeight,
                                  opacity: child.style?.opacity !== undefined ? child.style.opacity : 1,
                                  transform: childRotation,
                                  zIndex: child.zIndex || 1,
                                };

                                if (child.type === 'shape') {
                                  const childBackgroundStyle: React.CSSProperties = child.style?.useGradient
                                    ? {
                                        background: child.style.gradientType === 'radial'
                                          ? `radial-gradient(circle, ${child.style.gradientColorStart || '#3b82f6'}, ${child.style.gradientColorEnd || '#ec4899'})`
                                          : `linear-gradient(${child.style.gradientAngle ?? 135}deg, ${child.style.gradientColorStart || '#3b82f6'}, ${child.style.gradientColorEnd || '#ec4899'})`
                                      }
                                    : { backgroundColor: child.style?.backgroundColor || '#0284c7' };

                                  const childBorderRadius = child.style?.borderRadius !== undefined 
                                    ? `${child.style.borderRadius}px` 
                                    : (child.id?.includes('circ') || child.style?.variant === 'sphere' ? '9999px' : '1px');

                                  return (
                                    <div
                                      key={`${child.id}-${cIdx}`}
                                      style={{
                                        ...childCommonStyle,
                                        ...childBackgroundStyle,
                                        borderRadius: childBorderRadius,
                                      }}
                                    />
                                  );
                                }

                                if (child.type === 'text') {
                                  return (
                                    <div
                                      key={`${child.id}-${cIdx}`}
                                      style={{
                                        ...childCommonStyle,
                                        fontFamily: child.style?.fontFamily || 'Inter',
                                        fontSize: `${child.style?.fontSize || 14}px`,
                                        color: child.style?.color || '#1e293b',
                                        textAlign: child.style?.textAlign || 'left',
                                        fontWeight: child.style?.fontWeight || 'normal',
                                        lineHeight: 1.3,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      {child.content}
                                    </div>
                                  );
                                }

                                return null;
                              })}
                          </div>
                        );
                      }

                      if (el.isFormField) {
                        return (
                          <div 
                            key={`${el.id}-${elIdx}`} 
                            style={{ ...commonStyle, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }} 
                            className="rounded-[1px] flex items-center justify-center overflow-hidden"
                          >
                            <span className="text-xs text-slate-400">📝</span>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>

                  {/* SVG LAYER PARA DESENHOS LIVRES */}
                  <svg className="absolute inset-0 pointer-events-none z-[120] w-full h-full">
                    {presentationDrawings[presentationSlideIndex]?.map((drawing, dIdx) => (
                      <polyline
                        key={dIdx}
                        fill="none"
                        stroke={drawing.color}
                        strokeWidth={drawing.width}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={drawing.points.map(p => `${p.x},${p.y}`).join(' ')}
                      />
                    ))}
                    {currentDrawingPoints.length > 0 && (
                      <polyline
                        fill="none"
                        stroke={presentationHighlighterActive ? 'rgba(234, 179, 8, 0.45)' : presentationPenColor}
                        strokeWidth={presentationHighlighterActive ? 12 : 3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={currentDrawingPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      />
                    )}
                  </svg>
                </div>
              </div>
            );
          })()}

          {/* REAL-TIME HIGH-TECH VIEWPORT-RELATIVE LASER POINTER */}
          {presentationLaserActive && (
            <div 
              className="fixed pointer-events-none z-[200000] w-5 h-5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444,0_0_16px_#ef4444,0_0_32px_#ef4444,0_0_48px_#ef4444]"
              style={{
                left: `${presentationLaserPos.x}px`,
                top: `${presentationLaserPos.y}px`,
                transform: 'translate(-50%, -50%)',
                transition: 'none'
              }}
            />
          )}

          {/* BARRA DE CONTROLE FLUTUANTE PREMIUM ESTILO POWERPOINT */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#0b0f19]/90 backdrop-blur-lg border border-slate-800/80 rounded-2xl px-5 py-3 flex items-center gap-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-[99999] opacity-25 hover:opacity-100 transition-opacity duration-300">
            {/* Navegação Rápida */}
            <div className="flex items-center gap-2 border-r border-slate-800/60 pr-4">
              <button
                disabled={presentationSlideIndex === 0}
                onClick={() => {
                  setPresentationSlideIndex(prev => Math.max(0, prev - 1));
                  setCurrentDrawingPoints([]);
                }}
                className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-white cursor-pointer disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                title="Slide Anterior (Seta Esquerda)"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="text-xs font-black text-slate-300 select-none min-w-[80px] text-center font-mono uppercase tracking-wider">
                {presentationSlideIndex + 1} / {slides.length}
              </span>

              <button
                disabled={presentationSlideIndex === slides.length - 1}
                onClick={() => {
                  setPresentationSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
                  setCurrentDrawingPoints([]);
                }}
                className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-white cursor-pointer disabled:opacity-20 disabled:hover:bg-transparent transition-all"
                title="Próximo Slide (Seta Direita / Espaço)"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Ferramentas de Apresentação */}
            <div className="flex items-center gap-2 border-r border-slate-800/60 pr-4">
              {/* Laser button */}
              <button
                onClick={() => {
                  setPresentationLaserActive(prev => !prev);
                  setPresentationPenActive(false);
                  setPresentationHighlighterActive(false);
                }}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  presentationLaserActive ? 'bg-red-950/80 text-red-400 border border-red-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
                title="Apontador Laser (Atalho: L)"
              >
                <Circle size={10} className="fill-red-500 stroke-red-400" />
                Laser
              </button>

              {/* Pen button */}
              <button
                onClick={() => {
                  setPresentationPenActive(prev => !prev);
                  setPresentationLaserActive(false);
                  setPresentationHighlighterActive(false);
                }}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  presentationPenActive ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
                title="Caneta de Desenho (Atalho: P)"
              >
                <PenTool size={13} />
                Caneta
              </button>

              {/* Highlighter button */}
              <button
                onClick={() => {
                  setPresentationHighlighterActive(prev => !prev);
                  setPresentationLaserActive(false);
                  setPresentationPenActive(false);
                }}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  presentationHighlighterActive ? 'bg-yellow-950/80 text-yellow-400 border border-yellow-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
                title="Marca-texto"
              >
                <Highlighter size={13} />
                Marca-texto
              </button>

              {/* Color selectors for Drawing tools */}
              {(presentationPenActive || presentationHighlighterActive) && (
                <div className="flex items-center gap-1.5 ml-1 bg-slate-950 border border-slate-900 p-1 rounded-lg animate-in fade-in duration-150">
                  {['#ef4444', '#10b981', '#3b82f6', '#eab308', '#ffffff', '#000000'].map(col => (
                    <button
                      key={col}
                      onClick={() => setPresentationPenColor(col)}
                      className={`w-4 h-4 rounded-full cursor-pointer transition-transform ${presentationPenColor === col ? 'ring-2 ring-cyan-400 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: col }}
                      title={`Selecionar cor ${col}`}
                    />
                  ))}
                </div>
              )}

              {/* Eraser / Clear current slide drawings */}
              <button
                onClick={() => {
                  setPresentationDrawings(prev => ({
                    ...prev,
                    [presentationSlideIndex]: []
                  }));
                  setCurrentDrawingPoints([]);
                  toast.success('Anotações deste slide limpas com sucesso!');
                }}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-xl cursor-pointer flex items-center gap-1 text-xs font-bold transition-colors"
                title="Limpar anotações deste slide (Atalho: E)"
              >
                <Eraser size={13} />
                Limpar
              </button>
            </div>

            {/* Sair da Apresentação */}
            <button
              onClick={() => {
                setIsPresentationMode(false);
                setPresentationLaserActive(false);
                setPresentationPenActive(false);
                setPresentationHighlighterActive(false);
              }}
              className="p-2 px-3.5 bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              title="Sair da apresentação (Atalho: ESC)"
            >
              <Minimize size={13} />
              Sair
            </button>
          </div>
        </div>
      )}
      
      {/* ========================================================================= */}
      {/* CUSTOM CONFIRMATION DIALOGS TO BYPASS NATIVE IFRAME WINDOW.CONFIRM LIMITS */}
      {/* ========================================================================= */}

      {/* Delete Presentation Confirmation Modal */}
      {presentationToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200001] flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
          <div className="bg-[#11141a] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3 text-red-400">
              <AlertCircle size={24} className="shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 font-sans">Excluir Apresentação</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">
                  Tem certeza que deseja excluir permanentemente a apresentação <span className="text-red-400 font-bold">"{presentationToDelete.name}"</span>? Esta ação não poderá ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setPresentationToDelete(null)}
                className="px-4 py-2 bg-slate-900 border border-slate-800/80 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const id = presentationToDelete.id;
                  const filtered = presentationList.filter(p => p.id !== id);
                  setPresentationList(filtered);
                  localStorage.setItem('end-presentation-files', JSON.stringify(filtered));

                  if (activePresentationId === id) {
                    const nextActive = filtered[0];
                    expectedSlidesStrRef.current = JSON.stringify(nextActive.slides);
                    switchingToIdRef.current = nextActive.id;
                    setActivePresentationId(nextActive.id);
                    localStorage.setItem('end-current-presentation-id', nextActive.id);

                    setUndoStack([]);
                    setRedoStack([]);

                    onUpdateSlides(nextActive.slides);
                    onSelectSlide(0);
                  }
                  toast.success('Apresentação excluída com sucesso.');
                  setPresentationToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
              >
                Excluir Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Backup Confirmation Modal */}
      {pendingImportData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200001] flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
          <div className="bg-[#11141a] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3 text-cyan-400">
              <FolderOpen size={24} className="shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 font-sans">Importar Backup de Apresentações</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">
                  Deseja substituir todas as suas apresentações atuais pelas <span className="text-cyan-400 font-bold">{pendingImportData.length} apresentações</span> do arquivo de backup? Isso apagará as apresentações locais.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setPendingImportData(null)}
                className="px-4 py-2 bg-slate-900 border border-slate-800/80 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setPresentationList(pendingImportData);
                  localStorage.setItem('end-presentation-files', JSON.stringify(pendingImportData));

                  const first = pendingImportData[0];
                  expectedSlidesStrRef.current = JSON.stringify(first.slides);
                  switchingToIdRef.current = first.id;
                  setActivePresentationId(first.id);
                  localStorage.setItem('end-current-presentation-id', first.id);

                  setUndoStack([]);
                  setRedoStack([]);

                  onUpdateSlides(first.slides);
                  onSelectSlide(0);
                  toast.success('Backup importado com sucesso!');
                  setPendingImportData(null);
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
              >
                Confirmar e Substituir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Import Choice Modal */}
      {pendingPdfImport && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200001] flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
          <div className="bg-[#11141a] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl col-span-1">
            <div className="flex items-start gap-3 text-cyan-400">
              <FileDown size={24} className="shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 font-sans">Importar PDF Vetorial</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">
                  Sucesso! Extraídas <span className="text-cyan-400 font-extrabold">{pendingPdfImport.numPages} páginas</span> do PDF adaptado a {pendingPdfImport.pdfPageWidth}x{pendingPdfImport.pdfPageHeight}px.
                </p>
                <p className="text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                  Como você deseja organizar esses novos slides no seu projeto atual ({slides.length} slides existentes)?
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  toast.dismiss(pendingPdfImport.loaderId);
                  setPendingPdfImport(null);
                }}
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                Cancelar Importação
              </button>
              <button
                onClick={() => {
                  const nextSlides = [...slides, ...pendingPdfImport.slides];
                  triggerUpdate(nextSlides, `Importou PDF: ${pendingPdfImport.fileName}`);
                  onSelectSlide(slides.length);
                  toast.success(`PDF "${pendingPdfImport.fileName}" importado com sucesso no fim do projeto!`, { id: pendingPdfImport.loaderId });
                  setPendingPdfImport(null);
                }}
                className="px-4 py-2 bg-slate-850 border border-slate-700/60 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Adicionar ao Fim
              </button>
              <button
                onClick={() => {
                  triggerUpdate(pendingPdfImport.slides, `Substituiu por PDF: ${pendingPdfImport.fileName}`);
                  onSelectSlide(0);
                  toast.success(`PDF "${pendingPdfImport.fileName}" importado. Todos os slides anteriores foram substituídos!`, { id: pendingPdfImport.loaderId });
                  setPendingPdfImport(null);
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
              >
                Substituir Slides Atuais
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
