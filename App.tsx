

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Employee, ViewMode, TemplateType, CanvasConfig, Orientation, Language, Slide, ProviderFormat, ProviderGridConfig } from './types';
import { generateCardCanvas } from './services/emailTemplate'; 
import { supabase, fetchEmployees, upsertEmployee, deleteEmployee } from './services/supabase';
import { EmployeeManager } from './components/EmployeeManager';
import { SalsaLogo } from './components/SalsaLogo';
import { SlideEditor } from './components/SlideEditor';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import PptxGenJS from 'pptxgenjs'; // Import PPTX Library
import { 
  Layout, 
  Trash2, 
  Image as ImageIcon,
  Upload,
  FileSpreadsheet,
  Users,
  Palette,
  Calendar,
  Briefcase,
  User,
  Download,
  PartyPopper,
  Medal,
  Hand,
  Mail,
  Clock,
  Rocket,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  TrendingUp,
  Move,
  RectangleHorizontal,
  RectangleVertical,
  SlidersHorizontal,
  GripHorizontal,
  Search, 
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Code,
  Link as LinkIcon,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronUp,
  ChevronDown,
  Presentation, // Import Icon
  Link2,
  Linkedin,
  Instagram,
  Globe,
  MessageCircle, // Using MessageCircle for WhatsApp visualization
  Plus,
  Gamepad2,
  List,
  Maximize, // Added Maximize import
  ArrowLeftRight,
  ArrowUpDown,
  Grid,
  Rotate3D,
  Type,
  Settings, // Added Settings Icon
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';

// --- DATA INITIALIZATION ---

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: '1',
    name: 'Peter Nolte',
    role: 'CEO',
    previousRole: 'COO',
    photoUrl: 'https://pikaso.cdnpk.net/private/production/3006849673/upload.png?token=exp=1768521600~hmac=43a424e5cff51c6818bd0d7158ccdb33f8c97986bcf2f179b196637e82ac0363&',
    photoScale: 1,
    photoPosition: { x: 0, y: 0 },
    dateStr: '15/05', 
    admissionDate: '24/10/2021',
    tenure: '3 ANOS'
  },
  {
    id: '2',
    name: 'Sarah Connor',
    role: 'Lead Developer',
    previousRole: 'Senior Developer',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
    photoScale: 1,
    photoPosition: { x: 0, y: 0 },
    dateStr: '20/05', 
    admissionDate: '10/07/2019',
    tenure: '5 ANOS', 
  },
  {
    id: '3',
    name: 'John Doe',
    role: 'Designer',
    previousRole: 'Junior Designer',
    photoUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
    photoScale: 1,
    photoPosition: { x: 0, y: 0 },
    dateStr: '05/05', 
    admissionDate: '01/01/2020',
    tenure: '5 ANOS'
  }
];

const INITIAL_CONFIG: CanvasConfig = {
  primaryColor: '#06b6d4', 
  secondaryColor: '#9333ea', 
  companyLogo: ''
};

const MONTHS = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
];

const INITIAL_SLIDES: Slide[] = [{
  id: 'slide-1',
  background: '#f1f1f1',
  elements: [
    {
       id: 'title',
       type: 'text',
       x: 50,
       y: 50,
       width: 860,
       height: 100,
       content: 'PRESENTATION TITLE',
       zIndex: 1,
       style: {
          fontFamily: 'AkiraExpanded-SuperBold',
          fontSize: 48,
          color: '#000000',
          textAlign: 'left'
       }
    },
    {
       id: 'subtitle',
       type: 'text',
       x: 50,
       y: 150,
       width: 860,
       height: 50,
       content: 'Subtitle goes here',
       zIndex: 1,
       style: {
          fontFamily: 'Mont Regular',
          fontSize: 24,
          color: '#666666',
          textAlign: 'left'
       }
    }
  ]
}];

type EditorTab = 'DATA' | 'TEMPLATES' | 'IMPORT';

// --- CONFIG FOR SOCIAL NETWORKS ---
const SOCIAL_NETWORKS = [
    { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: 'text-blue-400', borderFocus: 'focus:border-blue-500/50', placeholder: 'linkedin.com/in/username' },
    { id: 'instagram', icon: Instagram, label: 'Instagram', color: 'text-pink-400', borderFocus: 'focus:border-pink-500/50', placeholder: 'instagram.com/username' },
    { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', color: 'text-green-400', borderFocus: 'focus:border-green-500/50', placeholder: 'wa.me/number' },
    { id: 'website', icon: Globe, label: 'Website', color: 'text-emerald-400', borderFocus: 'focus:border-emerald-500/50', placeholder: 'www.website.com' },
];

// --- UTILS ---

const calculateTenure = (dateStr: string): string => {
  if (!dateStr || dateStr === 'TBD') return '';
  let start: Date | null = null;
  const parts = dateStr.trim().split(/[\/\-\.]/);
  if (parts.length === 3) {
     if (parseInt(parts[1]) > 12) {
         // handle MM/DD/YYYY or similar errors, basic fallback
     }
     if (parseInt(parts[0]) > 1000) {
        start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
     } else {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) { year += (year > 50 ? 1900 : 2000); }
        start = new Date(year, month, day);
     }
  } else {
     const d = new Date(dateStr);
     if (!isNaN(d.getTime())) start = d;
  }
  if (!start || isNaN(start.getTime())) return '';
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const m = now.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < start.getDate())) { years--; }
  if (years > 80 || years < 0) return ''; 
  if (years < 1) return 'RECÉM-CHEGADO';
  return `${years} ${years === 1 ? 'ANO' : 'ANOS'}`;
};

const calculateAge = (birthDate: string): number | null => {
  if (!birthDate) return null;
  try {
    let birth: Date;
    if (birthDate.includes('/')) {
      const parts = birthDate.split('/');
      if (parts.length === 3) {
        let [day, month, year] = parts.map(Number);
        if (year < 100) {
          const currentYear = new Date().getFullYear() % 100;
          year += (year > currentYear + 1 ? 1900 : 2000);
        }
        birth = new Date(year, month - 1, day);
      } else if (parts.length === 2) {
        // Just DD/MM, can't calculate age
        return null;
      } else {
        return null;
      }
    } else {
      birth = new Date(birthDate);
    }
    
    if (isNaN(birth.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    return null;
  }
};

// --- ANIMATED SWITCH COMPONENT ---
const ThemeSwitch = React.memo(({ isDarkMode, toggle }: { isDarkMode: boolean, toggle: () => void }) => {
  return (
    <div className="theme-switch-wrapper drop-shadow-md">
      <style>{`
        .theme-switch-wrapper {
          --hue: 189; 
          --primary: hsl(var(--hue),90%,50%);
          --trans-dur: 0.6s;
          --trans-timing: cubic-bezier(0.65,0,0.35,1);
          font-size: 16px; 
        }
        .switch, .switch__input { display: block; -webkit-tap-highlight-color: transparent; }
        .switch { margin: auto; position: relative; -webkit-user-select: none; -moz-user-select: none; user-select: none; }
        .switch__icon { color: hsla(var(--hue),10%,80%); pointer-events: none; position: absolute; top: 0.375em; left: 0.375em; width: 0.75em; height: 0.75em; transition: color var(--trans-dur), transform var(--trans-dur) var(--trans-timing); }
        .switch__icon:nth-of-type(2) { right: 0.375em; left: auto; }
        .switch__inner, .switch__inner-icons { border-radius: 0.5em; display: block; overflow: hidden; position: absolute; top: 0.25em; left: 0.25em; width: 2.25em; height: 1em; }
        .switch__inner:before, .switch__inner-icons { transition: transform var(--trans-dur) var(--trans-timing); transform: translateX(-1.25em); }
        .switch__inner:before { background-color: var(--primary); border-radius: inherit; content: ""; display: block; width: 100%; height: 100%; }
        .switch__inner-icons { pointer-events: none; }
        .switch__inner-icons .switch__icon { color: hsl(0,0%,100%); top: 0.125em; left: 0.125em; transform: translateX(1.25em); }
        .switch__inner-icons .switch__icon:nth-child(2) { right: 0.125em; left: auto; }
        .switch__input { background-color: hsl(0,0%,100%); border-radius: 0.75em; box-shadow: 0 0 0 0.0625em hsla(var(--hue),90%,50%,0), 0 0.125em 0.5em hsla(var(--hue),10%,10%,0.1); outline: transparent; width: 2.75em; height: 1.5em; -webkit-appearance: none; appearance: none; transition: background-color var(--trans-dur), box-shadow var(--trans-dur); cursor: pointer; }
        .switch__input:checked { background-color: hsl(var(--hue),10%,10%); }
        .switch__input:checked ~ .switch__icon { color: hsla(var(--hue),10%,40%); }
        .switch__input:checked ~ .switch__inner:before, .switch__input:checked ~ .switch__inner-icons { transform: translateX(1.25em); }
        .switch__input:not(:checked) ~ .switch__icon:first-of-type, .switch__input:checked ~ .switch__icon:nth-of-type(2) { transform: rotate(360deg); }
        .switch__input:checked ~ .switch__inner-icons .switch__icon:first-of-type { transform: translateX(-1.25em) rotate(-360deg); }
        .switch__input:checked ~ .switch__inner-icons .switch__icon:nth-of-type(2) { transform: translateX(-1.25em) rotate(360deg); }
      `}</style>
      <label className="switch">
        <input className="switch__input" type="checkbox" role="switch" name="dark" checked={isDarkMode} onChange={toggle} />
        <svg className="switch__icon" width="24px" height="24px" aria-hidden="true"><use href="#light" /></svg>
        <svg className="switch__icon" width="24px" height="24px" aria-hidden="true"><use href="#dark" /></svg>
        <span className="switch__inner"></span>
        <span className="switch__inner-icons">
          <svg className="switch__icon" width="24px" height="24px" aria-hidden="true"><use href="#light" /></svg>
          <svg className="switch__icon" width="24px" height="24px" aria-hidden="true"><use href="#dark" /></svg>
        </span>
        <span className="sr-only">Dark Mode</span>
      </label>
    </div>
  );
});

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [isManagementMode, setIsManagementMode] = useState(false);

  // Fetch from Supabase on mount
  useEffect(() => {
    fetchEmployees().then(data => {
      if (data && data.length > 0) {
        setEmployees(data);
      }
    });
  }, []);

  const handleUpdateEmployeeDB = async (id: string, updates: Partial<Employee>) => {
      setEmployees(prev => prev.map(e => {
          if (e.id === id) {
              const updated = { ...e, ...updates };
              if (updates.admissionDate) {
                  const newTenure = calculateTenure(updates.admissionDate);
                  if (newTenure) updated.tenure = newTenure;
              }
              upsertEmployee(updated); // Fire and forget
              return updated;
          }
          return e;
      }));
  };

  const handleDeleteEmployeeDB = async (id: string) => {
      setEmployees(prev => prev.filter(e => e.id !== id));
      deleteEmployee(id); // Fire and forget
  };

  const handleAddEmployeeDB = async () => {
      const newEmp: Employee = {
          id: `emp-${Date.now()}`,
          name: 'New Employee',
          role: 'Role',
          previousRole: '',
          photoUrl: '',
          dateStr: '01/01',
          admissionDate: '',
          tenure: '',
          photoScale: 1,
          photoPosition: { x: 0, y: 0 }
      };
      setEmployees(prev => [newEmp, ...prev]);
      upsertEmployee(newEmp);
  };
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(TemplateType.BIRTHDAY);
  const [activeTab, setActiveTab] = useState<EditorTab>('TEMPLATES');
  
  const viewMode = activeTab === 'IMPORT' ? ViewMode.IMPORT : ViewMode.EDITOR;

  const [config, setConfig] = useState<CanvasConfig>(INITIAL_CONFIG);
  // Removed isDarkMode state, enforcing dark mode by default
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [providerFormat, setProviderFormat] = useState<ProviderFormat>('post-sq');
  const [language, setLanguage] = useState<Language>('en'); 
  const [welcomeTextAlignment, setWelcomeTextAlignment] = useState<'left' | 'center' | 'right'>('center');

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(INITIAL_EMPLOYEES[0].id);
  const [sidebarDataView, setSidebarDataView] = useState<'LIST' | 'DETAIL'>('LIST');

  // --- SEPARATE PROVIDER STATE ---
  const [providerData, setProviderData] = useState<{
      name: string;
      logo: string;
      logoScale: number;
      thumbnails: string[];
      // CHANGED: Store configs per format to isolate changes
      gridConfigs: Record<string, ProviderGridConfig>; 
  }>({
      name: '',
      logo: '',
      logoScale: 1,
      thumbnails: ['', '', '', '', '', ''],
      gridConfigs: {} // Initialize empty
  });

  const [isMonthView, setIsMonthView] = useState<boolean>(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(new Date().getMonth());
  const [showImageControls, setShowImageControls] = useState<boolean>(false);
  
  // SIGNATURE CONTROL STATE
  const [showSignatureControls, setShowSignatureControls] = useState<boolean>(false); // Changed to false to hide on load
  const [signaturePopupLeft, setSignaturePopupLeft] = useState<number>(0);
  const signatureButtonRef = useRef<HTMLButtonElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');

  const [popupPosition, setPopupPosition] = useState({ x: 20, y: 20 });
  const popupRef = useRef<HTMLDivElement>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) || employees[0];

  // Define Theme based on selectedTemplate
  const theme = useMemo(() => {
    switch(selectedTemplate) {
        case TemplateType.NEW_PROVIDER: return { bg: 'bg-gradient-to-br from-[#0a261f] to-black' };
        case TemplateType.PRESENTATION: return { bg: 'bg-[#1e1e1e]' };
        default: return { bg: 'bg-gradient-to-br from-slate-900 to-black' };
    }
  }, [selectedTemplate]);

  // --- SIGNATURE HTML GEN STATES ---
  const [signatureLinks, setSignatureLinks] = useState<Record<string, string>>({
    linkedin: '',
    instagram: '',
    website: '',
    whatsapp: ''
  });
  
  // Track which socials are active in the UI
  const [activeSocials, setActiveSocials] = useState<string[]>(['linkedin', 'instagram', 'website']);
  const [editingSocialId, setEditingSocialId] = useState<string | null>(null);

  const [hostedImageUrl, setHostedImageUrl] = useState('');
  const [hideIconsForExport, setHideIconsForExport] = useState(true); 
  const [includeInfoInHtml, setIncludeInfoInHtml] = useState(true); // NEW Toggle for text info
  const [hasCopied, setHasCopied] = useState<string | null>(null); 
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isDepartmentSignature, setIsDepartmentSignature] = useState(false);
  const [departmentName, setDepartmentName] = useState('');

  // --- SLIDE PRESENTATION STATE ---
  const [slides, setSlides] = useState<Slide[]>(INITIAL_SLIDES);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Reference for the Right Grid Area to constrain popup
  const controlsAreaRef = useRef<HTMLDivElement>(null);

  // --- IMAGE UPLOAD STATE ---
  // Allow ID to be 'PROVIDER' for special provider uploads
  const [uploadTarget, setUploadTarget] = useState<{ id: string, field: string, index?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- JOYSTICK STATE ---
  const [joystickUiPos, setJoystickUiPos] = useState({ x: 0, y: 0 });
  const [isJoystickDragging, setIsJoystickDragging] = useState(false);
  const joystickVelocityRef = useRef({ x: 0, y: 0 });
  const joystickIntervalRef = useRef<number | null>(null);

  // --- NEW PROVIDER GRID DRAG STATE ---
  const [isDraggingProviderGrid, setIsDraggingProviderGrid] = useState(false);
  const providerDragRefs = useRef({ startX: 0, startY: 0, initialGridX: 0, initialGridY: 0 });

  // Clean up interval
  useEffect(() => {
      return () => {
          if (joystickIntervalRef.current) {
              window.clearInterval(joystickIntervalRef.current);
          }
      };
  }, []);

  const handleJoystickStart = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsJoystickDragging(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const container = e.currentTarget.getBoundingClientRect();
      const centerX = container.left + container.width / 2;
      const centerY = container.top + container.height / 2;
      // Container is w-32 (128px). Radius is 64px. Stick is w-14 (56px).
      // Max travel = 64 - (56/2) = 64 - 28 = 36px.
      const maxRadius = 36; 

      const updatePosition = (clientX: number, clientY: number) => {
          let dx = clientX - centerX;
          let dy = clientY - centerY;
          const distance = Math.sqrt(dx*dx + dy*dy);
          
          if (distance > maxRadius) {
              const angle = Math.atan2(dy, dx);
              dx = Math.cos(angle) * maxRadius;
              dy = Math.sin(angle) * maxRadius;
          }
          
          setJoystickUiPos({ x: dx, y: dy });
          
          const vx = dx / maxRadius;
          const vy = dy / maxRadius;
          joystickVelocityRef.current = { x: vx, y: vy };
      };
      
      updatePosition(startX, startY);

      if (!joystickIntervalRef.current) {
          joystickIntervalRef.current = window.setInterval(() => {
              const v = joystickVelocityRef.current;
              if (Math.abs(v.x) < 0.1 && Math.abs(v.y) < 0.1) return; // Deadzone
              
              const speed = 4; // REDUCED SENSITIVITY

              // Only for employees now, New Provider logic removed
              setEmployees(prev => {
                  const emp = prev.find(p => p.id === selectedEmployeeId);
                  if (!emp) return prev;
                  
                  const currentPos = emp.photoPosition || { x: 0, y: 0 };
                  const newX = currentPos.x + (v.x * speed);
                  const newY = currentPos.y + (v.y * speed);
                  
                  return prev.map(p => p.id === selectedEmployeeId ? { ...p, photoPosition: { x: newX, y: newY } } : p);
              });
          }, 20); // 50fps
      }

      const onMove = (ev: MouseEvent) => {
          updatePosition(ev.clientX, ev.clientY);
      };

      const onUp = () => {
          setIsJoystickDragging(false);
          setJoystickUiPos({ x: 0, y: 0 });
          joystickVelocityRef.current = { x: 0, y: 0 };
          if (joystickIntervalRef.current) {
              window.clearInterval(joystickIntervalRef.current);
              joystickIntervalRef.current = null;
          }
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
  };

  // --- OPTIMIZED HANDLERS ---
  
  const handleOrientationChange = useCallback((newOrientation: Orientation) => {
    if (orientation === newOrientation) return;
    setOrientation(newOrientation);
  }, [orientation]);

  // Helper to get current config safely
  const getCurrentProviderConfig = useCallback(() => {
     return providerData.gridConfigs[providerFormat] || {
          columns: 0,
          x: 0,
          y: 0,
          rotateX: 0,
          rotateY: 0,
          rotateZ: 0,
          scale: 1,
          textScale: 1,
          textX: 0,
          textY: 0
     };
  }, [providerData.gridConfigs, providerFormat]);

  const getCanvasData = useCallback(() => {
    if (selectedTemplate === TemplateType.NEW_PROVIDER) {
        // Construct a mock employee object for the template generator using independent provider data
        // Inject the specific config for the CURRENT format
        const specificConfig = getCurrentProviderConfig();

        return {
            id: 'provider-mock',
            name: providerData.name,
            role: '',
            photoUrl: '',
            dateStr: '',
            providerLogo: providerData.logo,
            providerLogoScale: providerData.logoScale,
            photoPosition: { x: 0, y: 0 },
            gameThumbnails: providerData.thumbnails,
            providerGridConfig: specificConfig
        } as Employee;
    }

    if (isMonthView && selectedTemplate === TemplateType.BIRTHDAY) {
       const targetMonth = String(selectedMonthIndex + 1).padStart(2, '0');
       return employees.filter(e => {
           if (!e.dateStr) return false;
           const parts = e.dateStr.trim().split(/[\/\-\.]/);
           if (parts.length >= 2) {
               return parts[1] === targetMonth;
           }
           return false;
       });
    }
    const emp = employees.find(e => e.id === selectedEmployeeId);
    return emp || employees[0];
  }, [employees, isMonthView, selectedTemplate, selectedMonthIndex, selectedEmployeeId, providerData, getCurrentProviderConfig]);

  const currentCanvasData = getCanvasData();
  const [previewHtml, setPreviewHtml] = useState<string>('');
  
  const filteredEmployees = useMemo(() => employees.filter(emp => 
     emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     emp.role.toLowerCase().includes(searchQuery.toLowerCase())
  ), [employees, searchQuery]);

  useEffect(() => {
    // Only generate HTML for non-presentation templates
    // Filter signatureLinks to only include active ones that have content or are active in UI
    const activeLinksObj: Record<string, string> = {};
    activeSocials.forEach(key => {
        if (signatureLinks[key]) {
            activeLinksObj[key] = signatureLinks[key];
        }
    });

    if (currentCanvasData && !isBulkMode && selectedTemplate !== TemplateType.PRESENTATION) {
      setPreviewHtml(generateCardCanvas(currentCanvasData, config, selectedTemplate, orientation, language, hideIconsForExport, activeLinksObj, providerFormat, welcomeTextAlignment, isDepartmentSignature, departmentName));
    }
  }, [currentCanvasData, config, selectedTemplate, orientation, language, hideIconsForExport, isBulkMode, isMonthView, selectedMonthIndex, signatureLinks, activeSocials, providerFormat, welcomeTextAlignment, isDepartmentSignature, departmentName]);

  const [isDownloading, setIsDownloading] = useState(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false); 
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isSignature = selectedTemplate === TemplateType.NEWSLETTER;
  const isPresentation = selectedTemplate === TemplateType.PRESENTATION;
  const isNewProvider = selectedTemplate === TemplateType.NEW_PROVIDER;
  
  const activeGridConfig = getCurrentProviderConfig();

  // Optimized useMemo for dimensions: Does NOT depend on currentCanvasData directly
  const canvasDataIsArray = Array.isArray(currentCanvasData);
  const canvasDataLength = canvasDataIsArray ? (currentCanvasData as Employee[]).length : 0;

  const previewDimensions = useMemo(() => {
      let previewWidth = 360;
      let previewHeight = 540;

      if (isPresentation) {
          previewWidth = 960;
          previewHeight = 540;
      } else if (isSignature) {
          previewWidth = 600;
          previewHeight = 150;
      } else if (isNewProvider) {
         // Map format to pixels
         const dimMap = {
             'pr-small': { w: 600, h: 400 },
             'pr-large': { w: 900, h: 500 },
             'post-sq': { w: 1080, h: 1080 },
             'post-story': { w: 1080, h: 1920 },
             'banner-small': { w: 1400, h: 480 },
             'banner-large': { w: 2160, h: 330 },
         };
         const d = dimMap[providerFormat];
         previewWidth = d.w;
         previewHeight = d.h;
      } else if (canvasDataIsArray) {
          // Dynamic height for Month View
          const count = canvasDataLength;
          if (orientation === 'landscape') {
              previewWidth = 740;
              let cols = 4;
              if (count <= 3) cols = 3;
              if (count > 8) cols = 5;
              const gap = 15;
              const paddingX = 30;
              const availableWidth = 740 - (paddingX * 2);
              const itemSize = (availableWidth - ((cols - 1) * gap)) / cols;
              const rows = Math.ceil(count / cols);
              const headerH = 120;
              const paddingY = 40;
              let h = headerH + paddingY + (rows * itemSize);
              if (rows > 1) h += (rows - 1) * gap;
              previewHeight = Math.max(360, Math.ceil(h));
          } else {
              const columns = count > 4 ? 3 : 2;
              const rows = Math.ceil(count / columns);
              if (rows > 3) {
                  const extraRows = rows - 3;
                  previewHeight = 540 + (extraRows * 125);
              }
          }
      } else if (orientation === 'landscape') {
          previewWidth = 740;
          previewHeight = 360;
      }
      return { width: previewWidth, height: previewHeight };
  }, [isSignature, isPresentation, isNewProvider, providerFormat, canvasDataIsArray, canvasDataLength, orientation]);

  // 1. Zoom Initialization Logic
  useEffect(() => {
      if (selectedTemplate === TemplateType.NEW_PROVIDER) {
          setZoomLevel(0.45);
      } else {
          setZoomLevel(1);
      }
  }, [selectedTemplate]);

  // 2. Centering Logic (Separate from Zoom Logic)
  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = previewDimensions;
      const { clientWidth, clientHeight } = containerRef.current;
      
      const scaledW = width * zoomLevel;
      const scaledH = height * zoomLevel;
      
      // Sidebar Offset Calculation
      const sidebarOffset = 140;

      const centerX = ((clientWidth - scaledW) / 2) + sidebarOffset;
      const centerY = (clientHeight - scaledH) / 2;
      setPosition({ x: centerX, y: Math.max(0, centerY) });
    }
  }, [previewDimensions.width, previewDimensions.height, selectedTemplate, isMonthView]); // Re-center only on layout change

  // ... (keeping existing functions: updateEmployee, updatePhotoPosition, removeEmployee, handleZoom, handleWheel, handleCanvasMouseDown, handleMouseMove, handleMouseUp) ...
  const updateEmployee = useCallback((id: string, field: keyof Employee, value: any) => {
    setEmployees(prev => prev.map(e => {
        if (e.id === id) {
            const updated = { ...e, [field]: value };
            if (field === 'admissionDate') {
                const newTenure = calculateTenure(value);
                if (newTenure) updated.tenure = newTenure;
            }
            if (field === 'birthDate' && value) {
                // Keep dateStr (DD/MM) in sync with birthDate (YYYY-MM-DD)
                try {
                    const date = new Date(value);
                    const day = String(date.getDate() + 1).padStart(2, '0'); // Fix for local date offset
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    updated.dateStr = `${day}/${month}`;
                } catch (err) {
                    console.error("Error syncing dateStr:", err);
                }
            }
            return updated;
        }
        return e;
    }));
  }, []);

  const updatePhotoPosition = useCallback((axis: 'x' | 'y', value: number) => {
      setEmployees(prev => {
          const emp = prev.find(e => e.id === selectedEmployeeId);
          if (!emp) return prev;
          const current = emp.photoPosition || { x: 0, y: 0 };
          const newPos = { ...current, [axis]: value };
          return prev.map(e => e.id === selectedEmployeeId ? { ...e, photoPosition: newPos } : e);
      });
  }, [selectedEmployeeId]);

  const removeEmployee = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmployees(prev => {
        const newList = prev.filter(emp => emp.id !== id);
        if (newList.length > 0 && selectedEmployeeId === id) {
             setSelectedEmployeeId(newList[0].id);
             setSidebarDataView('LIST');
        }
        return newList;
    });
  }, [selectedEmployeeId]);

  const handleZoom = useCallback((delta: number) => {
    setZoomLevel(prev => {
        const next = Math.max(0.1, Math.min(3, prev + delta));
        return Math.round(next * 100) / 100;
    });
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    // Prevent zoom if scrolling inside popups or sidebars
    if ((e.target as HTMLElement).closest('.signature-controls') || 
        (e.target as HTMLElement).closest('.custom-scrollbar')) {
      return;
    }
    const step = 0.1;
    const delta = e.deltaY < 0 ? step : -step;
    handleZoom(delta);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.image-controls') || (e.target as HTMLElement).closest('.signature-controls') || (e.target as HTMLElement).closest('.slide-editor-ui')) return; 
    
    // NEW LOGIC FOR PROVIDER GRID DRAG (Middle Click Only)
    if (isNewProvider && e.button === 1) { 
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingProviderGrid(true);
        providerDragRefs.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialGridX: activeGridConfig.x || 0,
            initialGridY: activeGridConfig.y || 0
        };
        return;
    }

    // Standard Pan Logic (Left Click Only)
    if (e.button === 0) {
        e.preventDefault();
        setIsDraggingCanvas(true);
        setDragOffset({
          x: e.clientX - position.x,
          y: e.clientY - position.y
        });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // NEW LOGIC FOR PROVIDER GRID DRAG
    if (isDraggingProviderGrid) {
        e.preventDefault();
        const dx = (e.clientX - providerDragRefs.current.startX) / zoomLevel;
        const dy = (e.clientY - providerDragRefs.current.startY) / zoomLevel;

        const newX = Math.round(providerDragRefs.current.initialGridX + dx);
        const newY = Math.round(providerDragRefs.current.initialGridY + dy);

        setProviderData(prev => {
            const currentConfig = prev.gridConfigs[providerFormat] || {
                columns: 0, x: 0, y: 0, rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1, textScale: 1, textX: 0, textY: 0
            };
            return {
                ...prev,
                gridConfigs: {
                    ...prev.gridConfigs,
                    [providerFormat]: {
                        ...currentConfig,
                        x: newX,
                        y: newY
                    }
                }
            };
        });
        return;
    }

    if (isDraggingCanvas && containerRef.current) {
        e.preventDefault();
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingProviderGrid(false);
    setIsDraggingCanvas(false);
  };

  // ... (keeping existing functions: toggleSignatureControls, handleImageUploadTrigger, handleAddThumbnail, handleRemoveThumbnail) ...
  const toggleSignatureControls = () => {
      const nextState = !showSignatureControls;
      if (nextState && signatureButtonRef.current && controlsAreaRef.current) {
          const btnRect = signatureButtonRef.current.getBoundingClientRect();
          const containerRect = controlsAreaRef.current.getBoundingClientRect();
          // Calculate center X of the button relative to the container
          // left position relative to container = (btnLeft - containerLeft) + (half width)
          const relativeLeft = btnRect.left - containerRect.left + (btnRect.width / 2);
          setSignaturePopupLeft(relativeLeft);
      }
      setShowSignatureControls(nextState);
  };

  // --- IMAGE UPLOAD LOGIC ---
  const handleImageUploadTrigger = (id: string, field: string, index?: number) => {
      setUploadTarget({ id, field, index });
      fileInputRef.current?.click();
  };

  const handleAddThumbnail = () => {
    setProviderData(prev => ({
        ...prev,
        thumbnails: [...prev.thumbnails, '']
    }));
  };

  const handleRemoveThumbnail = (index: number) => {
    setProviderData(prev => {
        const newThumbs = [...prev.thumbnails];
        newThumbs.splice(index, 1);
        return { ...prev, thumbnails: newThumbs };
    });
  };

  // ... (keeping rest of file structure, focusing on the Provider UI update) ...
  
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !uploadTarget) return;
      
      const reader = new FileReader();
      reader.onload = (evt) => {
          const result = evt.target?.result as string;
          
          if (uploadTarget.id === 'PROVIDER') {
              if (uploadTarget.field === 'logo') {
                  setProviderData(prev => ({ ...prev, logo: result }));
              } else if (uploadTarget.field === 'thumbnails' && uploadTarget.index !== undefined) {
                  setProviderData(prev => {
                      const newThumbs = [...prev.thumbnails];
                      newThumbs[uploadTarget.index!] = result;
                      return { ...prev, thumbnails: newThumbs };
                  });
              }
          } else {
              if (uploadTarget.index !== undefined && uploadTarget.field === 'gameThumbnails') {
                  const emp = employees.find(e => e.id === uploadTarget.id);
                  if (emp) {
                      const newThumbs = [...(emp.gameThumbnails || [])];
                      newThumbs[uploadTarget.index] = result;
                      updateEmployee(uploadTarget.id, 'gameThumbnails' as keyof Employee, newThumbs);
                  }
              } else {
                  updateEmployee(uploadTarget.id, uploadTarget.field as keyof Employee, result);
              }
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          setUploadTarget(null);
      };
      reader.readAsDataURL(file);
  };

  const handleDownloadImage = async () => {
    setIsDownloading(true);
    try {
        const node = document.getElementById('capture-target');
        if (!node) throw new Error("Capture target not found");

        const clone = node.cloneNode(true) as HTMLElement;
        clone.style.transform = 'none'; // Reset scale for capture
        
        // REMOVE SIGNATURE TEXT ONLY FOR EXPORT
        if (selectedTemplate === TemplateType.NEWSLETTER) {
             const textElements = clone.querySelectorAll('.signature-text-remove');
             textElements.forEach(el => {
                 (el as HTMLElement).style.opacity = '0';
             });
        }

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.zIndex = '-1';
        container.appendChild(clone);
        document.body.appendChild(container);

        // --- INLINE IMAGES (Robust CORS Handling) ---
        // 1. Process <img> tags
        const imgElements = Array.from(clone.querySelectorAll('img'));
        const imgPromises = imgElements.map(async (img) => {
            if (img.src && !img.src.startsWith('data:')) {
                try {
                    // Force fetch with CORS
                    const res = await fetch(img.src, { mode: 'cors', cache: 'no-cache' });
                    const blob = await res.blob();
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            img.src = reader.result as string;
                            img.srcset = ''; 
                            resolve(null);
                        };
                        reader.onerror = () => resolve(null); // Resolve even on error to keep going
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.warn('Failed to inline img:', img.src, e);
                    img.crossOrigin = "anonymous"; // Fallback
                    return Promise.resolve();
                }
            }
            return Promise.resolve();
        });

        // 2. Process background-images (Crucial for New Provider template)
        const divElements = Array.from(clone.querySelectorAll('div'));
        const bgPromises = divElements.map(async (div) => {
             const style = div.getAttribute('style') || '';
             // Look for url(...)
             const match = style.match(/url\(['"]?(http[^'"]+)['"]?\)/);
             if (match && match[1]) {
                 const url = match[1];
                 try {
                     const res = await fetch(url, { mode: 'cors', cache: 'no-cache' });
                     const blob = await res.blob();
                     return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const newDataUrl = reader.result as string;
                            // Replace only the specific URL found, preserving other style props
                            div.style.backgroundImage = `url('${newDataUrl}')`;
                            resolve(null);
                        };
                        reader.onerror = () => resolve(null);
                        reader.readAsDataURL(blob);
                     });
                 } catch (e) {
                     console.warn('Failed to inline bg:', url, e);
                     return Promise.resolve();
                 }
             }
             return Promise.resolve();
        });

        await Promise.all([...imgPromises, ...bgPromises]);

        await document.fonts.ready;
        // Wait a tick for DOM updates
        await new Promise(resolve => setTimeout(resolve, 500));

        const dataUrl = await toPng(clone, {
             quality: 1.0,
             pixelRatio: 2,
             cacheBust: false,
             skipAutoScale: true
        });

        const link = document.createElement('a');
        const filename = isMonthView 
            ? `endo-month-${MONTHS[selectedMonthIndex].toLowerCase()}-${Date.now()}.png`
            : `endo-canvas-${selectedTemplate.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
            
        link.download = filename;
        link.href = dataUrl;
        link.click();

        document.body.removeChild(container);
    } catch (err) {
      console.error("Download failed:", err);
      // More helpful error message
      alert("Não foi possível gerar a imagem. Se estiver usando imagens externas (como Unsplash ou Pikaso), tente salvá-las e fazer upload manualmente se o erro persistir.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownload = async () => {
     if (isPresentation) {
         handleDownloadPPT();
     } else {
         handleDownloadImage();
     }
  };

  const handleDownloadPPT = async () => {
     setIsDownloading(true);
     try {
         const pptx = new PptxGenJS();
         pptx.layout = 'LAYOUT_16x9';

         slides.forEach((slideData) => {
             const slide = pptx.addSlide();
             slide.background = { color: 'F1F1F1' };

             slideData.elements.forEach(el => {
                const xPct = (el.x / 960) * 100;
                const yPct = (el.y / 540) * 100;
                const wPct = (el.width / 960) * 100;
                const hPct = (el.height / 540) * 100;

                if (el.type === 'text') {
                    if (el.content.includes('<i class')) return;

                    slide.addText(el.content, {
                        x: `${xPct}%`,
                        y: `${yPct}%`,
                        w: `${wPct}%`,
                        h: `${hPct}%`,
                        fontFace: el.style.fontFamily?.includes('Akira') ? 'Arial Black' : 'Arial',
                        fontSize: (el.style.fontSize || 16) * 0.75,
                        color: el.style.color?.replace('#', '') || '000000',
                        align: el.style.textAlign || 'left',
                        valign: 'top',
                        isTextBox: true
                    });
                } else if (el.type === 'image') {
                    slide.addImage({
                        path: el.content,
                        x: `${xPct}%`,
                        y: `${yPct}%`,
                        w: `${wPct}%`,
                        h: `${hPct}%`
                    });
                } else if (el.type === 'shape') {
                    if (el.style.variant === 'sphere') {
                         slide.addShape(pptx.ShapeType.ellipse, {
                             x: `${xPct}%`,
                             y: `${yPct}%`,
                             w: `${wPct}%`,
                             h: `${hPct}%`,
                             fill: { type: 'solid', color: '22d3ee', alpha: 50 } 
                         });
                    }
                }
             });
         });

         await pptx.writeFile({ fileName: "endo_presentation.pptx" });

     } catch (err) {
         console.error(err);
         alert("Failed to generate PPTX");
     } finally {
         setIsDownloading(false);
     }
  };

  // ... (Signature generation and copy handlers same) ...
  const generateSignatureHtmlString = (
    targetEmployee: Employee, 
    url: string, 
    hideIcons: boolean, 
    showInfo: boolean,
    linksMap: Record<string, string> = signatureLinks,
    activeKeys: string[] = activeSocials,
    isDept: boolean = isDepartmentSignature,
    deptName: string = departmentName
  ) => {
    // Prepare Data
    const bannerUrl = url || 'https://salsa-tech.com/wp-content/uploads/2022/assinatura/email-signature_background.png';
    
    // Icons (Hosted versions for email compatibility - White)
    const icons: Record<string, string> = {
        linkedin: 'https://img.icons8.com/ios-filled/50/ffffff/linkedin.png',
        instagram: 'https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png',
        website: 'https://img.icons8.com/ios-filled/50/ffffff/internet.png',
        whatsapp: 'https://img.icons8.com/ios-filled/50/ffffff/whatsapp.png'
    };

    // Build Icons HTML (Table cells)
    let iconsCellsHtml = '';
    
    activeKeys.forEach(key => {
        if (linksMap[key] && icons[key]) {
            iconsCellsHtml += `
                <td style="padding: 0 5px;">
                    <a href="${linksMap[key]}" target="_blank" style="text-decoration: none; display: block;">
                        <img src="${icons[key]}" alt="${key}" width="20" height="20" style="display: block; border: 0;" />
                    </a>
                </td>
            `;
        }
    });

    // Info HTML (Name/Role)
    let contentHtml = '';
    
    if (showInfo) {
        let displayName = '';
        let displayRole = '';

        if (isDept) {
            const nameParts = deptName.split(' ');
            const firstName = nameParts[0];
            const restName = nameParts.slice(1).join(' ');
            displayName = restName ? `${firstName}<br/>${restName}` : firstName;
            displayRole = ''; // Hide role for department signature
        } else {
            // Split name only at the first space to match the user's "Vitor<br>Gonzalez" style
            const nameParts = targetEmployee.name.split(' ');
            const firstName = nameParts[0];
            const restName = nameParts.slice(1).join(' ');
            displayName = restName ? `${firstName}<br/>${restName}` : firstName;
            displayRole = targetEmployee.role;
        }

        contentHtml += `
            <p style="font-family: 'Arial Black', Arial, sans-serif; font-size: 24px; font-weight: 900; text-transform: uppercase; color: #ffffff; margin: 0; line-height: 1; mso-line-height-rule: exactly;">
                ${displayName}
            </p>
            ${displayRole ? `
            <p style="font-family: Arial, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #ffffff; margin: 5px 0 10px 0;">
                ${displayRole}
            </p>` : ''}
        `;
    }

    if (iconsCellsHtml) {
        contentHtml += `
            <table align="right" border="0" cellspacing="0" cellpadding="0" style="display: inline-table;">
                <tr>
                    ${iconsCellsHtml}
                </tr>
            </table>
        `;
    }

    // Bulletproof Background HTML with VML
    return `
<table width="600" border="0" cellspacing="0" cellpadding="0" style="width: 600px; min-width: 600px; max-width: 600px; table-layout: fixed; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
  <tr>
    <td background="${bannerUrl}" valign="middle" height="150" style="background-image: url('${bannerUrl}'); background-repeat: no-repeat; background-size: cover; background-position: center; width: 600px; min-width: 600px; max-width: 600px; height: 150px; text-align: right; vertical-align: middle; padding-right: 40px;">
      <!--[if gte mso 9]>
      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:150px;">
        <v:fill type="tile" src="${bannerUrl}" color="#333333" />
        <v:textbox inset="0,0,0,0">
      <![endif]-->
      <div style="text-align: right;">
        ${contentHtml}
      </div>
      <!--[if gte mso 9]>
        </v:textbox>
      </v:rect>
      <![endif]-->
    </td>
  </tr>
  <tr>
    <td height="1" style="line-height: 1px; font-size: 1px; height: 1px; padding: 0;">
      <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" width="600" height="1" style="display: block; width: 600px; min-width: 600px; max-width: 600px; height: 1px; border: 0;" alt="" />
    </td>
  </tr>
</table>`;
  };

  const handleCopyHtml = async () => {
    const code = generateSignatureHtmlString(selectedEmployee, hostedImageUrl, hideIconsForExport, includeInfoInHtml);
    try {
      await navigator.clipboard.writeText(code);
      setHasCopied('COPIED!');
      setTimeout(() => setHasCopied(null), 2000);
    } catch (err) {
      alert('Failed to copy');
    }
  };

  const handleCopyAllHtml = async () => {
    const fixedLinks = {
        linkedin: 'https://www.linkedin.com/company/salsa-technology/',
        instagram: 'https://www.instagram.com/salsatechnology/',
        website: 'https://salsatechnology.com'
    };
    const fixedActive = ['linkedin', 'instagram', 'website'];
    
    let allHtml = '';
    
    employees.forEach(emp => {
        const html = generateSignatureHtmlString(emp, hostedImageUrl, hideIconsForExport, includeInfoInHtml, fixedLinks, fixedActive);
        allHtml += `NOME: ${emp.name}\nCARGO: ${emp.role}\n--------------------------------------------------\n${html}\n\n==================================================\n\n`;
    });

    try {
      await navigator.clipboard.writeText(allHtml);
      setHasCopied('ALL COPIED!');
      setTimeout(() => setHasCopied(null), 2000);
    } catch (err) {
      alert('Failed to copy list');
    }
  };

  // ... (handleFileUpload same) ...
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = XLSX.utils.sheet_to_json(ws);

              if (data && data.length > 0) {
                  const mappedEmployees: Employee[] = data.map((row: any, idx) => {
                      let fullName = row['Name'] || row['Nome'] || 'Unknown';
                      if (row['Social/Professional Name']) {
                          const first = row['Social/Professional Name'];
                          const last = row['Social/Professional Surname'] || '';
                          fullName = `${first} ${last}`.trim();
                      }

                      const role = row['Job Position'] || row['Role'] || row['Cargo'] || 'Employee';
                      const admission = row['Start Date'] || row['Admission'] || row['Admissão'] || row['Admission Date'] || '';
                      const birthday = row['Birthday'] || row['Aniversário'] || row['Birth Date'] || '01/01';

                      return {
                          id: `imported-${Date.now()}-${idx}`,
                          name: fullName,
                          role: role,
                          previousRole: row['Previous Role'] || row['Cargo Anterior'] || '',
                          photoUrl: row['Photo'] || row['Foto'] || 'https://via.placeholder.com/150',
                          dateStr: birthday,
                          birthDate: (birthday.length > 5) ? birthday : '', // If it looks like a full date
                          admissionDate: admission,
                          tenure: calculateTenure(admission),
                          photoScale: 1,
                          photoPosition: { x: 0, y: 0 }
                      };
                  });
                  setEmployees(mappedEmployees);
                  setSelectedEmployeeId(mappedEmployees[0].id);
                  setActiveTab('DATA'); // Switch to Data tab after import
                  
                  // Sync to Supabase
                  mappedEmployees.forEach(emp => upsertEmployee(emp));
              }
          } catch (error) {
              console.error("Import Error:", error);
              alert("Failed to parse Excel file. Please ensure it has valid columns.");
          }
      };
      reader.readAsBinaryString(file);
  }, []);

  const changeMonth = (delta: number) => {
      setSelectedMonthIndex(prev => {
          const next = prev + delta;
          if (next > 11) return 0;
          if (next < 0) return 11;
          return next;
      });
  };
  
  const toggleSocial = (id: string) => {
      setActiveSocials(prev => {
          if (prev.includes(id)) {
              return prev.filter(k => k !== id);
          } else {
              return [...prev, id];
          }
      });
  };

  // Helper to update grid config for the SPECIFIC format
  const updateGridConfig = (field: keyof ProviderGridConfig, value: number) => {
      setProviderData(prev => {
          // Get config for current format OR default
          const currentConfig = prev.gridConfigs[providerFormat] || {
              columns: 0, x: 0, y: 0, rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1, textScale: 1, textX: 0, textY: 0
          };
          
          return {
              ...prev,
              gridConfigs: {
                  ...prev.gridConfigs,
                  [providerFormat]: {
                      ...currentConfig,
                      [field]: value
                  }
              }
          };
      });
  };
  
  // --- MEMOIZED UI COMPONENTS ---
  
  const HeaderContent = useMemo(() => (
      // ... (Same as before) ...
      <header className="px-6 h-[72px] flex justify-between items-center z-50 shrink-0 sticky top-0 header-gradient">
        <div className="flex items-center h-full gap-6">
           <div className="">
              <SalsaLogo variant="light" className="h-11 w-32" />
           </div>
           <div className="h-10 w-px bg-white/40 rounded-full shadow-sm"></div>
           
           <div className="pt-1">
             <svg viewBox="0 0 1850 580" className="h-12 w-auto fill-white overflow-visible" xmlns="http://www.w3.org/2000/svg">
                <g id="Camada_1-2" data-name="Camada 1">
                    <path className="cls-1" d="M1289.09,434.7c-37.09-25.82-38.22-82.43-35.93-123.11,1.06-21.24,8.5-69.53-15.63-79.78-38.5-16.37-61.29,40.52-73.52,64.51-.11-13.16,1.45-52.17-9.3-58.27-49.11-27.9-59.44,88.87-77.12,114.55-17.09,24.82-27.28,6.5-27.47-11.27-.33-21.09,7.18-36.83,9.08-56.6-10.17-24.78-31.49-9.71-35.97,10.69-4.49,20.41-14.31,60.83-34.09,71.52-4.61,2.52-10.06,3.01-15.05,1.35-32.33-10.74,3.39-91.73,29.41-100.1,17.69-5.69,37.02-1.49,44.83-17.83,6.35-11.57-1.66-27.3-14.49-30.15-39.86-9.05-76.06,36.38-91.86,66.44-16.97,32.3-23.2,80.34-61.9,94.45-61.18,20.08-60.41-59.7-45.52-95.93,5.51-13.4,18.59-40.59,36.51-35.57,16.2,4.54-9.62,37.43,5.37,44.91,13.99,7.13,29.84-2.38,36.43-15.02,20.47-39.3-19.14-76.53-57.06-58.42-40.27,19.24-43.97,52.73-92.5,66.74-2.54-32-18-73.48-57.23-71.07-46.17,8.52-42.05,64.44-8.44,85.66,13,8.2,21.56,10.36,36.62,12.15-2,19.91-7.59,39.99-23.18,53.59-11.12,9.7-27.25,10.31-36.09-2.43-12.68-18.25-6.31-44.37-.14-63.63-4.24-5.53-14.25-21.89-19.04-22.89-4.68,1.8-7.37,5.96-9.91,10.13-18.49,30.38-24.89,70.78-12.32,104.44,10.69,28.65,39.97,44.73,68.92,32.47,41.83-17.71,58-73.81,60.4-114.67,13.21-4.08,19.46-7.23,31.62-13.97-11.66,30.31-16.41,67.45-3.01,98.07,14.47,33.08,50.86,41.53,81.77,26.51,19.9-9.68,32.57-25.39,45.49-42.81,3.73,25.98,15.68,53.33,47.96,48.24,26.77-4.22,43.41-33.74,54.55-55.98,1.53,11.09,6.08,28.19,15.78,33.46,48.56,26.42,64.91-71.01,78.85-99,2.16-4.33,5.26-6.87,8.72-8.8,3.83-.24,2.17-.73,5.21,1.42,11.16,20.38-18.31,85.37-14.28,103.66,1.38,6.24,6.97,10.53,12.84,12.22,4.7,1.35,9.49.8,13.74-1.64,27.1-15.51,25.26-101.53,55.78-129.39,3.24-2.95,7.04-5.68,11.65-4.13,3.36,1.14,6.29,4.13,7.61,7.39,5.18,12.82-3.35,43.55-5.24,57.28-5.31,38.71-9.02,104.82,33.5,125.26,10.8,5.19,22.65,6.37,34,2.15,6.79-2.53,12.31-6.51,17.26-11.74,11.89-17.58,3.74-17.16-7.61-25.06ZM733.43,288.17l-2.89-.44c-15.51-5.25-43.2-25.32-21.92-40.36,5.31.11,6.17.21,10.91,2.53,9.1,4.46,19.31,29.51,13.9,38.27Z"/>
                    <path className="cls-1" d="M368.85,50.03c-1.58,43.16-46.12,94.19-91.05,94.21-23.43-.68-46.34-20.94-19.87-39.31,17.38-12.06,43.87-21.16,50.51-43.74,2.84-9.68-8.27-17.26-17.2-16.94-34.56.85-70.89,28.84-95.27,51.34-23.03,21.25-54.02,59.35-55.21,91.68-1.36,36.79,46.57,31.43,69.49,24.8,18.75-5.42,60.41-25.97,62.09,7.08.48,7.59-7.28,17.88-13.03,22.2-16.81,12.97-38.89,21.89-57.36,32.77-55.22,32.87-111.59,85.48-119.04,152.64-2.48,22.31,2.56,49.69,17.5,66.54,39.15,44.16,111.47,23.35,149.51-11.5,9.26-8.49,15.79-15.4,23.62-24.99,5.76-7.94,12.24-15.45,18.1-23.46,7.34.35,11.98,3.2,18.49,6.62,3.98.82,4.73,1.53,8.31,3.67,1.99,6.74-.95,12.7-4.56,18.68-31.29,51.96-77.34,90.05-134.86,108.48-66.9,21.44-155.4.52-174.51-74.57-25.27-99.26,60.57-180.79,137.78-226.78,7.93-4.72,18.31-10.4,24.79-16.37-37.08,1.5-88.06-2.01-88.67-53.23-.45-37.95,31.1-78.27,56.04-104.44C181.22,49.96,245.66,2.79,312.95.05c28.82-1.17,57.02,19.18,55.89,49.98Z"/>
                    <path className="cls-1" d="M310.12,439.97c-2.53-.29-4.94-.56-7.47-.95l-1.67,2.83c-2.6.58-6.88-1.23-9.67-2.14l-.26-2.12c-4.88,6.13-3.11,12.43-8.62,13.31-2.27.36-3.13,1.33-4.75,2.99-.04,2.54.11,2.42.64,4.97l-.58.41c-1.67-1.7-1.75-2.21-4.21-2.46,5.76-7.94,12.24-15.45,18.1-23.46,7.34.35,11.98,3.2,18.49,6.62Z"/>
                    <path className="cls-1" d="M1667.66,301.18c-.26-.25-.51-.51-.76-.76,13.57-22.25,26.55-45.8,32.38-71.42,5.93-26.03-1.63-59.54-35.22-57.14-41.19,6.4-59.96,49.7-53.37,87.48,3.45,19.8,10.43,35.53,19.61,53.19-7.82,16-56.91,84.78-75.48,40.48-5.94-14.16,1.19-38.71,4.67-52.89,9.3-28.57-16.9-38.62-30.12-15.34-5.25,9.25-6.46,26.81-10.28,37.08-4.2,16.96-21.27,56.63-44.29,46.06-19.02-8.75-7.68-50.94.49-65.07,8.69-15.04,18.54-29.81,35.74-36.36,17.41-4.47,48.41-.75,40.16-32.68-6.95-18.72-31.6-17.02-45.92-10.27-34.97,16.47-55.28,48.56-70.45,83.26-13.95,31.88-28.47,101.35,14.64,119.29,32.97,13.71,61.78-27.31,73.77-54.27,2.52,12.52,5.38,26.54,17.06,33.55,24.33,14.59,52.76-12.01,67.58-27.37,16.25-17.95,22.42-27.59,36.59-46.15,24.79,30.83,62.79,78.97,57.85,119.16-2.14,17.46-9.23,33.76-23.09,45.04-13.24,10.6-30.15,15.49-47.01,13.6-13.12-1.5-26.48-7.75-34.39-18.6-5.7-7.74-8.09-17.43-6.66-26.93,1.84-11.7,18.54-31.47-6.06-33.43-30.64-2.44-54.15,22.84-55.7,52.38-3,57.15,53.78,91.54,105.28,91.65,34.33.84,67.47-10.32,92.65-34.55,20.79-20.01,36.32-49.53,36.43-80.43.22-65.89-58.09-111.53-96.1-158.56ZM1663.14,207.57c24.29,6.82-3.45,60.5-10.18,72.34-11.19-21.12-19.65-62.81,10.18-72.34Z"/>
                    <path className="cls-1" d="M537.81,501.4c-19.6,30.22-65.58,33.98-93.54,13.6-24.17-17.64-34.65-46.37-39.04-74.93-4.79-30.17-2.63-60.55,2-90.53.6-9.06,11.11-50.1.32-55.27-20.67-9.9-37.56,37.87-43.24,51.22-9.74,22.85-16.64,49.08-27.85,71.52-2.71,5.44-4.45,8.18-10.01,11.17-14.98.5-21.26-2.68-24.6-17.55,7.29-29.26,23.01-74.76,13.42-104.58-2.65-8.26-14.51-4.3-19.47.41-14.6,13.89-23.23,33.68-30.27,52.25-10.91,26.73-16.23,77.02-54.55,76.35-15.36-.27-26.43-18.82-23.56-33.37,9.39-47.58,54.8-90.91,90.62-120.86,14.27-11.94,52.62-38.9,67.51-18.11,8.86,12.28,6.55,34.66,6.61,49.5l.73-1.27c13.11-22.98,41.6-103.51,87.92-84.15,6.33,2.64,11.49,15,12.34,21.1,2.84,19.19-1.67,42.61-4.09,62.14-5.98,48.18-10.27,115.69,34.23,147.76,11.71,8.22,25.84,11.62,40.02,10.54,4.07,0,11.34-1.53,15.15-.41,15.48,4.56,4.91,24.96-.62,33.47Z"/>
                    <path className="cls-1" d="M542.2,28.9c92.97-5.62,88.81,205.43,74.72,264.75-11.35,47.79-22.73,125.36-79.96,141.38-31.63,8.86-57.55-19.74-61.94-48.04-6.5-37.86,1.23-77.77,22.49-110.06,11.98-16.32,40.6-48.22,67.23-37.8,3.31,1.71,7.01,6.88,7.48,10.59,3.67,28.53-30.11,19.9-42.71,47.56-9.33,20.5-18.06,39.19-12.48,61.78,6.96,28.2,32.94,20.37,43.93.94,9.39-15.29,14.34-28.67,18.45-45.69,17.65-73.2,2.99-158.68-43.07-219.05-6.7-9.96-16.35-19.33-19.48-31.2-5.15-19.55,8.1-31.38,25.32-35.16Z"/>
                    <path className="cls-1" d="M1517.17,117.88c29.11-2.06,58.52,14.07,51.78,49.27-1.32,6.89-8.8,11.51-14.88,14.25-13.76-.84-24.8-4.15-39.04.02-65.89,21.26-99.8,97.5-123.04,157.17-9.57,24.57-22.97,84.28-50.71,90.76-5.99,1.37-12.27.17-17.32-3.33-21.41-14.63-18.79-57.01-21.16-80.61-1.64-16.45-1.71-25.48-5.38-42.62-2.22-10.36-7.58-29.14-13.76-37.66-9.83-13.55-26.18-30.04-2.73-42.5,8.2-4.35,17.83-5.09,26.6-2.05,54.78,19.26,12.82,142.79,37.33,150.33,28.83-8.78,47.78-233.12,172.31-253.02Z"/>
                </g>
             </svg>
          </div>
        </div>

        <div className="flex items-center gap-3">
           {/* Light Mode Switch Removed */}
        </div>
      </header>
  ), [isSignature, hasCopied, handleCopyHtml, handleCopyAllHtml, isNewProvider, employees.length]);

  // Redesigned Floating Sidebar
  const SidebarContent = useMemo(() => (
    <div className={`absolute top-24 left-6 w-[340px] bottom-8 rounded-[2.5rem] bg-[#121212] border border-white/10 z-30 shadow-2xl flex flex-col overflow-hidden`}>
       
       {/* 1. Header Tabs */}
       <div className="p-4 shrink-0">
          <div className="flex bg-white/10 rounded-full p-1 h-14">
             <button 
                onClick={() => { setActiveTab('DATA'); setSidebarDataView('LIST'); }} 
                className={`flex-1 flex items-center justify-center rounded-full transition-all duration-300 ${activeTab === 'DATA' ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                title="Employee Data"
             >
                {selectedTemplate === TemplateType.NEW_PROVIDER ? <Settings size={22} /> : <Users size={22} />}
             </button>
             <button 
                onClick={() => setActiveTab('TEMPLATES')} 
                className={`flex-1 flex items-center justify-center rounded-full transition-all duration-300 ${activeTab === 'TEMPLATES' ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                title="Templates"
             >
                <Palette size={22} />
             </button>
             <button 
                onClick={() => setActiveTab('IMPORT')} 
                className={`flex-1 flex items-center justify-center rounded-full transition-all duration-300 ${activeTab === 'IMPORT' ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                title="Import Excel"
             >
                <FileSpreadsheet size={22} />
             </button>
          </div>
       </div>

       {/* 2. Middle Content (Scrollable) */}
       <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
          {activeTab === 'DATA' && (
            <div className="space-y-4 animate-in slide-in-from-left-4 duration-300 pt-2">
               {/* Data Sidebar Content */}
               {isNewProvider ? (
                   <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                        {/* Title */}
                        <h3 className="text-sm font-bold text-cyan-300 uppercase mb-2 flex items-center gap-2"><Gamepad2 size={16}/> Provider Details</h3>
                        
                        {/* Name Input */}
                        <div className={`flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10`}>
                           <User size={16} className="opacity-40 mr-3 text-white" />
                           <input 
                             value={providerData.name} 
                             onChange={(e) => setProviderData({...providerData, name: e.target.value})} 
                             className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" 
                             placeholder="Provider Name" 
                           />
                        </div>

                        {/* Logo Input */}
                        <div className={`flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10 gap-2`}>
                           <ImageIcon size={16} className="opacity-40 text-white shrink-0" />
                           <input 
                             value={providerData.logo} 
                             onChange={(e) => setProviderData({...providerData, logo: e.target.value})} 
                             className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" 
                             placeholder="Provider Logo URL" 
                           />
                           <button 
                              onClick={() => handleImageUploadTrigger('PROVIDER', 'logo')} 
                              className="p-1.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white shrink-0 shadow-lg"
                              title="Upload Logo"
                           >
                              <Upload size={14} />
                           </button>
                        </div>
                        
                        {/* Logo Scale */}
                        <div className="px-1">
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                <span>Logo Size</span>
                                <span>{Math.round((providerData.logoScale || 1) * 100)}%</span>
                            </div>
                            <input 
                                type="range" min="0.2" max="2.0" step="0.1" 
                                value={providerData.logoScale || 1} 
                                onChange={(e) => setProviderData({...providerData, logoScale: parseFloat(e.target.value)})}
                                className="styled-slider w-full"
                            />
                        </div>

                        {/* TEXT & LAYOUT ADJUSTMENTS */}
                        <div className="mt-6 border-t border-white/10 pt-4">
                            <h3 className="text-sm font-bold text-cyan-300 uppercase mb-3 flex items-center gap-2"><Type size={16}/> Text & Layout</h3>
                            
                            {/* Text Size */}
                            <div className="mb-4 px-1">
                                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                    <span>Text Size</span>
                                    <span>{Math.round((activeGridConfig.textScale || 1) * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0.5" max="3.0" step="0.1" 
                                    value={activeGridConfig.textScale || 1} 
                                    onChange={(e) => updateGridConfig('textScale', parseFloat(e.target.value))}
                                    className="styled-slider w-full"
                                />
                            </div>

                            {/* Text Position */}
                            <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-slate-400 flex items-center gap-1"><Move size={12}/> Text X</label>
                                    <span className="text-[10px] font-mono text-white/50">{activeGridConfig.textX}px</span>
                                </div>
                                <input 
                                    type="range" min="-300" max="300" step="5"
                                    value={activeGridConfig.textX || 0}
                                    onChange={(e) => updateGridConfig('textX', parseInt(e.target.value))}
                                    className="styled-slider w-full"
                                />
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-slate-400 flex items-center gap-1"><Move size={12} className="rotate-90"/> Text Y</label>
                                    <span className="text-[10px] font-mono text-white/50">{activeGridConfig.textY}px</span>
                                </div>
                                <input 
                                    type="range" min="-300" max="300" step="5"
                                    value={activeGridConfig.textY || 0}
                                    onChange={(e) => updateGridConfig('textY', parseInt(e.target.value))}
                                    className="styled-slider w-full"
                                />
                            </div>
                        </div>

                        {/* GRID ADJUSTMENTS */}
                        <div className="mt-2 border-t border-white/10 pt-4">
                            <h3 className="text-sm font-bold text-cyan-300 uppercase mb-3 flex items-center gap-2"><Grid size={16}/> Grid Settings</h3>
                            
                            {/* Grid Scale */}
                             <div className="mb-4 px-1">
                                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                    <span>Grid Scale</span>
                                    <span>{Math.round((activeGridConfig.scale || 1) * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0.5" max="2.0" step="0.05" 
                                    value={activeGridConfig.scale || 1} 
                                    onChange={(e) => updateGridConfig('scale', parseFloat(e.target.value))}
                                    className="styled-slider w-full"
                                />
                            </div>

                            {/* Columns */}
                            <div className="mb-4">
                                <label className="text-xs text-slate-400 mb-2 block">Columns</label>
                                <div className="flex gap-1">
                                    {[0, 2, 3, 4, 5, 6].map(num => (
                                        <button 
                                            key={num}
                                            onClick={() => updateGridConfig('columns', num)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeGridConfig.columns === num ? 'bg-cyan-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                                        >
                                            {num === 0 ? 'Auto' : num}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Position */}
                            <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-slate-400 flex items-center gap-1"><Move size={12}/> Position X</label>
                                    <span className="text-[10px] font-mono text-white/50">{activeGridConfig.x}px</span>
                                </div>
                                <input 
                                    type="range" min="-300" max="300" step="5"
                                    value={activeGridConfig.x}
                                    onChange={(e) => updateGridConfig('x', parseInt(e.target.value))}
                                    className="styled-slider w-full"
                                />
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-slate-400 flex items-center gap-1"><Move size={12} className="rotate-90"/> Position Y</label>
                                    <span className="text-[10px] font-mono text-white/50">{activeGridConfig.y}px</span>
                                </div>
                                <input 
                                    type="range" min="-300" max="300" step="5"
                                    value={activeGridConfig.y}
                                    onChange={(e) => updateGridConfig('y', parseInt(e.target.value))}
                                    className="styled-slider w-full"
                                />
                            </div>

                            {/* Rotation */}
                            <div className="space-y-3">
                                <label className="text-xs text-slate-400 flex items-center gap-1 mb-2"><Rotate3D size={12}/> 3D Rotation</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <div className="text-[10px] text-center text-slate-500 mb-1">X</div>
                                        <input 
                                            type="range" min="-180" max="180" step="1"
                                            value={activeGridConfig.rotateX}
                                            onChange={(e) => updateGridConfig('rotateX', parseInt(e.target.value))}
                                            className="styled-slider w-full"
                                        />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-center text-slate-500 mb-1">Y</div>
                                        <input 
                                            type="range" min="-180" max="180" step="1"
                                            value={activeGridConfig.rotateY}
                                            onChange={(e) => updateGridConfig('rotateY', parseInt(e.target.value))}
                                            className="styled-slider w-full"
                                        />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-center text-slate-500 mb-1">Z</div>
                                        <input 
                                            type="range" min="-180" max="180" step="1"
                                            value={activeGridConfig.rotateZ}
                                            onChange={(e) => updateGridConfig('rotateZ', parseInt(e.target.value))}
                                            className="styled-slider w-full"
                                        />
                                    </div>
                                </div>
                                <button 
                                    onClick={() => updateGridConfig('scale', 1) /* Reset logic simplified for just one field as example, full reset needs setProviderData */}
                                    className="w-full text-[10px] text-slate-500 hover:text-white py-1 mt-2 text-center"
                                >
                                    Reset Grid
                                </button>
                            </div>
                        </div>

                        {/* Thumbnails */}
                        <div className="flex items-center justify-between mt-4 mb-2 border-t border-white/10 pt-4">
                           <h3 className="text-sm font-bold text-cyan-300 uppercase flex items-center gap-2"><ImageIcon size={16}/> Game Thumbnails</h3>
                           <button onClick={handleAddThumbnail} className="text-xs text-white bg-cyan-600 hover:bg-cyan-500 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors">
                              <Plus size={12}/> Add
                           </button>
                        </div>
                        <div className="space-y-2">
                            {providerData.thumbnails.map((thumb, i) => (
                                <div key={i} className={`flex items-center px-4 py-2 rounded-xl border bg-white/5 border-white/5 gap-2 group hover:bg-white/10 transition-colors`}>
                                    <span className="text-[10px] text-white/40 font-mono w-4">{i + 1}</span>
                                    <input 
                                      value={thumb} 
                                      onChange={(e) => {
                                          const newThumbs = [...providerData.thumbnails];
                                          newThumbs[i] = e.target.value;
                                          setProviderData({...providerData, thumbnails: newThumbs});
                                      }} 
                                      className="bg-transparent outline-none w-full text-xs font-medium text-white placeholder:text-white/30" 
                                      placeholder={`Game ${i + 1} URL`} 
                                    />
                                    <button 
                                        onClick={() => handleImageUploadTrigger('PROVIDER', 'thumbnails', i)} 
                                        className="p-1.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                                        title="Upload Thumbnail"
                                    >
                                        <Upload size={12} />
                                    </button>
                                    <button 
                                        onClick={() => handleRemoveThumbnail(i)}
                                        className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white shrink-0 opacity-60 group-hover:opacity-100 transition-all"
                                        title="Remove"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                   </div>
               ) : (
                   /* Standard Employee List/Detail Logic */
                   sidebarDataView === 'LIST' ? (
                     <>
                        {/* UPDATED SEARCH BAR - Fully Rounded & Larger */}
                        <div className={`relative flex items-center px-6 py-4 rounded-full border transition-all bg-white/5 border-white/10 focus-within:bg-white/10 shadow-inner`}>
                            <Search size={20} className="opacity-50 mr-3 text-white" />
                            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="bg-transparent outline-none w-full text-base font-medium placeholder:text-white/30 text-white" />
                        </div>
                        {/* UPDATED GRID with animated gradient backgrounds */}
                        <div className="grid grid-cols-2 gap-2 pb-2">
                            {filteredEmployees.map((emp, index) => (
                                <div 
                                    key={emp.id} 
                                    onClick={() => { setSelectedEmployeeId(emp.id); setSidebarDataView('DETAIL'); }} 
                                    className={`aspect-square relative overflow-hidden cursor-pointer rounded-2xl border ${selectedEmployeeId === emp.id ? 'border-cyan-400 ring-2 ring-cyan-400/20' : 'border-white/10 opacity-70 hover:opacity-100'}`}
                                >
                                    <img src={emp.photoUrl || 'https://via.placeholder.com/150'} className="absolute inset-0 w-full h-full object-cover" />
                                    
                                    {/* New Employee Tag */}
                                    {(() => {
                                        if (!emp.admissionDate) return null;
                                        try {
                                            let date: Date;
                                            if (emp.admissionDate.includes('/')) {
                                                const [day, month, year] = emp.admissionDate.split('/');
                                                date = new Date(`${year}-${month}-${day}`);
                                            } else {
                                                date = new Date(emp.admissionDate);
                                            }
                                            
                                            const diffTime = Math.abs(new Date().getTime() - date.getTime());
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                                            
                                            if (diffDays <= 15) {
                                                return (
                                                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1.5 shadow-md z-10 rounded-bl-xl">
                                                        NOVO
                                                    </div>
                                                );
                                            }
                                        } catch (e) {
                                            return null;
                                        }
                                        return null;
                                    })()}

                                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                        <div className="text-white text-xs font-bold truncate">{emp.name}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </>
                   ) : (
                      // Detail View 
                      <div>
                          <button onClick={() => setSidebarDataView('LIST')} className="flex items-center gap-2 text-xs font-bold mb-6 text-slate-400 hover:text-white bg-white/5 px-4 py-2 rounded-full w-fit"><ArrowLeft size={14}/> Back to List</button>
                          
                          <div className="space-y-3">
                                <div className={`flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10`}><User size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.name} onChange={(e) => updateEmployee(selectedEmployee.id, 'name', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Full Name" /></div>
                                <div className={`flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10`}><Briefcase size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.role} onChange={(e) => updateEmployee(selectedEmployee.id, 'role', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Role" /></div>
                                
                                  <div className={`flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10`}>
                                      <Calendar size={16} className="opacity-40 mr-3 text-white" />
                                      <div className="flex-1 flex items-center justify-between">
                                          <input 
                                              value={selectedEmployee.dateStr} 
                                              onChange={(e) => updateEmployee(selectedEmployee.id, 'dateStr', e.target.value)} 
                                              className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" 
                                              placeholder="Birthday (DD/MM/YY)" 
                                          />
                                          {calculateAge(selectedEmployee.dateStr) !== null && (
                                              <span className="text-[10px] font-bold text-white/40 whitespace-nowrap ml-2">
                                                  {calculateAge(selectedEmployee.dateStr)} ANOS
                                              </span>
                                          )}
                                      </div>
                                  </div>
                                
                                <div className={`flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10`}><Clock size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.admissionDate || ''} onChange={(e) => updateEmployee(selectedEmployee.id, 'admissionDate', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Admission Date" /></div>

                                <div className={`flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10`}><TrendingUp size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.previousRole || ''} onChange={(e) => updateEmployee(selectedEmployee.id, 'previousRole', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Previous Role (Job Change)" /></div>

                                <div className={`flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10`}><ImageIcon size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.photoUrl} onChange={(e) => updateEmployee(selectedEmployee.id, 'photoUrl', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Photo URL" /></div>
                          </div>
                          
                          <button onClick={(e) => removeEmployee(selectedEmployee.id, e)} className="w-full py-3 rounded-2xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all mt-4">Remove Employee</button>
                      </div>
                   )
               )}
            </div>
          )}

          {activeTab === 'TEMPLATES' && (
            <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-3 pt-2">
                {[
                  { id: TemplateType.BIRTHDAY, label: 'Happy Birthday', desc: 'Classic celebration card', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1f03c89654a2a47ae.png' },
                  { id: TemplateType.ANNIVERSARY, label: 'Work Anniversary', desc: 'Celebrate tenure milestones', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f0f03c89654a2a47ad.png' },
                  { id: TemplateType.WELCOME, label: 'Welcome Aboard', desc: 'For new hires', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1187dda7445a894d8.png' },
                  { id: TemplateType.JOB_CHANGE, label: 'Job Change', desc: 'New Role / Promotion', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1187dda7445a894d7.png' },
                  { id: TemplateType.FAREWELL, label: 'See You Soon', desc: 'Farewell card', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e7625f6fc09c7fb545a11.png' },
                  { id: TemplateType.NEWSLETTER, label: 'Email Signature', desc: 'Professional signature', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1bf95d83f4c272549.png' },
                  { id: TemplateType.NEW_PROVIDER, label: 'New Provider', desc: 'Casino Game Launch', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1318a761a56ead72c.png' },
                  { id: TemplateType.PRESENTATION, label: 'Slide Deck', desc: 'AI Powered Presentation', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f0318a761a56ead72a.png' }, 
                ].map((t, index) => {
                  return (
                    <button 
                       key={t.id} 
                       onClick={() => { 
                           setSelectedTemplate(t.id as TemplateType); 
                           if (t.id !== TemplateType.BIRTHDAY) setIsMonthView(false); 
                           if (t.id === TemplateType.PRESENTATION) {
                              setOrientation('landscape'); 
                           }
                           // Removed auto-navigation logic for NEW_PROVIDER here
                       }} 
                       className={`relative h-[140px] rounded-2xl text-left transition-all duration-300 group overflow-hidden border
                         ${selectedTemplate === t.id ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] scale-[1.02]' : 'border-white/10 opacity-80 hover:opacity-100 hover:border-white/30'}
                       `}
                    >
                       {/* Background Image */}
                       <div 
                         className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                         style={{ backgroundImage: `url('${t.image}')` }}
                       ></div>
                       
                       {/* Overlay Gradient (Darker at bottom for text) */}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent"></div>

                       {/* Text Content */}
                       <div className="absolute bottom-4 left-5 z-10">
                          <div className="font-sans text-xl text-white font-bold mb-0.5 shadow-black drop-shadow-md">{t.label}</div>
                          <div className="text-[10px] text-cyan-200 font-medium uppercase tracking-wide drop-shadow-md">{t.desc}</div>
                       </div>
                    </button>
                  );
                })}
            </div>
          )}

          {activeTab === 'IMPORT' && (
             <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 pt-2">
                 <h3 className="text-sm font-bold text-cyan-300 uppercase mb-2 flex items-center gap-2"><FileSpreadsheet size={16}/> Import Data</h3>
                 
                 <button 
                     onClick={() => setIsManagementMode(true)}
                     className="w-full mb-4 p-4 rounded-3xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg transition-all flex items-center justify-center gap-3 group"
                  >
                      <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition-transform">
                          <Users size={20} />
                      </div>
                      <span>Gerenciamento</span>
                  </button>

                  <div className="p-4 rounded-3xl border border-white/10 bg-white/5 text-center">
                      <FileSpreadsheet size={48} className="text-green-500 mx-auto mb-4" />
                      <h2 className="text-lg font-bold text-white mb-2">Upload Excel</h2>
                      <p className="text-xs text-slate-400 mb-6">Upload an .xlsx file to bulk generate cards.</p>
                      
                      <label className="block w-full cursor-pointer group">
                          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                          <div className="border-2 border-dashed border-white/20 rounded-2xl p-6 group-hover:border-cyan-500 group-hover:bg-cyan-500/10 transition-all">
                              <span className="text-cyan-400 font-bold group-hover:underline text-sm">Click to upload</span>
                          </div>
                      </label>
                 </div>
                 
                 <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                     <h4 className="text-xs font-bold text-white mb-2">Instructions</h4>
                     <ul className="text-[10px] text-slate-400 list-disc pl-4 space-y-1">
                         <li>File must be .xlsx format</li>
                         <li>Columns: Name, Role, Birthday, Admission, Photo</li>
                         <li>Dates should be formatted as text</li>
                         <li>Photo should be a direct URL</li>
                     </ul>
                 </div>
             </div>
          )}
       </div>

       {/* 3. Bottom Actions */}
       <div className="p-4 pt-2 shrink-0 flex gap-2 border-t border-white/5 bg-[#121212]">
           <button 
              className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-full shadow-lg transition-all font-bold text-white text-base ${isDownloading ? 'bg-cyan-700 cursor-wait' : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-purple-500/20'}`} 
              onClick={handleDownload} 
              disabled={isDownloading}
           >
               {isPresentation ? (isDownloading ? '...' : 'Download PPT') : (isDownloading ? 'Generating...' : 'Download image')}
           </button>
           
           <button 
              onClick={() => setActiveTab('IMPORT')}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white border border-white/10 transition-all ${activeTab === 'IMPORT' ? 'bg-cyan-600 border-cyan-500' : 'bg-white/10 hover:bg-white/20'}`}
              title="Import Data"
           >
              <Upload size={20} />
           </button>
       </div>

    </div>
  ), [activeTab, sidebarDataView, filteredEmployees, selectedEmployeeId, selectedTemplate, searchQuery, selectedEmployee, updateEmployee, removeEmployee, isSignature, hasCopied, handleCopyHtml, handleCopyAllHtml, isNewProvider, providerData, activeGridConfig, updateGridConfig, isDownloading, isPresentation, handleDownload]);

  return (
    <div className={`w-full h-screen flex flex-col overflow-hidden ${theme.bg} dark text-slate-900 dark:text-white transition-colors duration-300`}>
        {/* REMOVED ViewMode.IMPORT conditional rendering completely */}
        
        {HeaderContent}
        
        <div className="flex-1 relative overflow-hidden">
            {isManagementMode && (
                <div className="absolute inset-0 z-30 bg-gray-100 animate-in fade-in duration-500">
                    <EmployeeManager 
                        employees={employees}
                        onClose={() => setIsManagementMode(false)}
                        onUpdateEmployee={handleUpdateEmployeeDB}
                        onDeleteEmployee={handleDeleteEmployeeDB}
                        onAddEmployee={handleAddEmployeeDB}
                    />
                </div>
            )}
            <div className={`absolute inset-0 flex transition-all duration-500 ease-in-out transform ${isManagementMode ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
            
            {SidebarContent}

            {selectedTemplate === TemplateType.PRESENTATION ? (
                <SlideEditor 
                    slides={slides}
                    currentSlideIndex={currentSlideIndex}
                    onUpdateSlides={setSlides}
                    onSelectSlide={setCurrentSlideIndex}
                />
            ) : (
                <div 
                    className="flex-1 relative overflow-hidden cursor-move bg-slate-200/50 dark:bg-black/50"
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                >
                    <div className="absolute inset-0 opacity-10 pointer-events-none" 
                         style={{ 
                             backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, 
                             backgroundSize: '20px 20px' 
                         }}
                    ></div>

                    <div ref={containerRef} className="w-full h-full relative">
                       <div 
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                                transformOrigin: 'top left',
                                transition: isDraggingCanvas ? 'none' : 'transform 0.1s ease-out',
                                width: 'fit-content',
                                height: 'fit-content',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                // REMOVED pointerEvents restriction here to allow clicks to propagate for dragging
                            }}
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                       />
                    </div>

                    <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-20">
                        <button onClick={() => handleZoom(0.1)} className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><ZoomIn size={20}/></button>
                        <button onClick={() => handleZoom(-0.1)} className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><ZoomOut size={20}/></button>
                        <button onClick={() => { setZoomLevel(1); }} className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><RotateCcw size={20}/></button>
                    </div>
                    
                    {isMonthView && selectedTemplate === TemplateType.BIRTHDAY && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center gap-4 z-20 shadow-xl">
                            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white/10 rounded-full text-white"><ChevronLeft size={20}/></button>
                            <span className="text-white font-bold uppercase min-w-[100px] text-center">{MONTHS[selectedMonthIndex]}</span>
                            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white/10 rounded-full text-white"><ChevronRight size={20}/></button>
                        </div>
                    )}
                    
                    {isSignature && (
                        <div className="absolute top-6 right-8 z-30 flex items-start gap-3" ref={controlsAreaRef}>
                            {employees.length > 1 && (
                                <button className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold shadow-lg transition-all border bg-white dark:bg-slate-800 text-purple-600 border-slate-200 dark:border-white/10 hover:bg-purple-50" onClick={handleCopyAllHtml}>
                                    {hasCopied === 'ALL COPIED!' ? <CheckCircle2 size={18} /> : <List size={18} />}
                                    <span>{hasCopied === 'ALL COPIED!' ? 'List Copied!' : 'Copy List'}</span>
                                </button>
                            )}
                            <button className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold shadow-lg transition-all border bg-white dark:bg-slate-800 text-cyan-600 border-slate-200 dark:border-white/10 hover:bg-cyan-50" onClick={handleCopyHtml}>
                                {hasCopied === 'COPIED!' ? <CheckCircle2 size={18} /> : <Code size={18} />}
                                    <span>{hasCopied === 'COPIED!' ? 'Copied!' : 'Copy HTML'}</span>
                            </button>

                            <div className="relative">
                                <button 
                                    ref={signatureButtonRef}
                                    onClick={toggleSignatureControls} 
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold shadow-lg transition-all border ${showSignatureControls ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10'}`}
                                >
                                    <SlidersHorizontal size={18} />
                                    <span>Signature Options</span>
                                </button>
                                
                                {showSignatureControls && (
                                    <div 
                                        ref={popupRef}
                                        className="signature-controls absolute mt-4 w-[340px] bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                                        style={{ right: 0 }}
                                    >
                                        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Link2 size={18} className="text-cyan-500"/> Social Links</h3>
                                            <button onClick={() => setShowSignatureControls(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={18}/></button>
                                        </div>
                                        <div className="p-2 overflow-y-auto max-h-[60vh] custom-scrollbar">
                                            {SOCIAL_NETWORKS.map((net) => {
                                                const isActive = activeSocials.includes(net.id);
                                                const Icon = net.icon;
                                                return (
                                                    <div key={net.id} className={`mb-2 rounded-2xl border transition-all duration-200 ${isActive ? 'bg-white dark:bg-white/5 border-cyan-500/30 shadow-sm' : 'bg-slate-50 dark:bg-white/5 border-transparent opacity-60'}`}>
                                                        <div className="flex items-center p-3 cursor-pointer" onClick={() => toggleSocial(net.id)}>
                                                            <div className={`w-5 h-5 rounded flex items-center justify-center mr-3 ${isActive ? 'text-cyan-500' : 'text-slate-400'}`}>
                                                                {isActive ? <CheckCircle2 size={18} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>}
                                                            </div>
                                                            <Icon size={18} className={`mr-3 ${isActive ? net.color : 'text-slate-400'}`} />
                                                            <span className={`text-sm font-medium flex-1 ${isActive ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>{net.label}</span>
                                                        </div>
                                                        
                                                        {isActive && (
                                                            <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2 duration-200">
                                                                <input 
                                                                    type="text" 
                                                                    placeholder={net.placeholder}
                                                                    value={signatureLinks[net.id] || ''}
                                                                    onChange={(e) => setSignatureLinks({...signatureLinks, [net.id]: e.target.value})}
                                                                    className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500/50 text-slate-700 dark:text-white transition-colors"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                            
                                            <div className="mt-4 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-4">
                                                <label className="flex items-center justify-between cursor-pointer">
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Show Info in HTML</span>
                                                    <ThemeSwitch isDarkMode={includeInfoInHtml} toggle={() => setIncludeInfoInHtml(!includeInfoInHtml)} />
                                                </label>
                                                <p className="text-[10px] text-slate-400 leading-relaxed border-b border-white/5 pb-4">
                                                    Turn OFF if your image already includes Name/Role text to prevent duplication.
                                                </p>

                                                <label className="flex items-center justify-between cursor-pointer">
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Hide Icons in Export</span>
                                                    <ThemeSwitch isDarkMode={!hideIconsForExport} toggle={() => setHideIconsForExport(!hideIconsForExport)} />
                                                </label>
                                                <p className="text-[10px] text-slate-400 leading-relaxed border-b border-white/5 pb-4">
                                                    Toggle ON if you want the downloaded image to be clean (no icons), so they can be added as clickable links below.
                                                </p>

                                                <label className="flex items-center justify-between cursor-pointer">
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Department Signature</span>
                                                    <ThemeSwitch 
                                                        isDarkMode={isDepartmentSignature} 
                                                        toggle={() => {
                                                            const newValue = !isDepartmentSignature;
                                                            setIsDepartmentSignature(newValue);
                                                            if (newValue) {
                                                                // Auto-fill company links
                                                                setSignatureLinks({
                                                                    ...signatureLinks,
                                                                    linkedin: 'https://www.linkedin.com/company/salsa-technology/',
                                                                    website: 'https://salsatechnology.com',
                                                                    instagram: 'https://www.instagram.com/salsatechnology/'
                                                                });
                                                                setActiveSocials(['linkedin', 'website', 'instagram']);
                                                            }
                                                        }} 
                                                    />
                                                </label>
                                                {isDepartmentSignature && (
                                                    <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Department Name</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="e.g. MARKETING"
                                                            value={departmentName}
                                                            onChange={(e) => setDepartmentName(e.target.value.toUpperCase())}
                                                            className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500/50 text-slate-700 dark:text-white transition-colors"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-4 p-3">
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Hosted Image URL (Optional)</label>
                                                <div className="flex items-center bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2">
                                                    <LinkIcon size={14} className="text-slate-400 mr-2" />
                                                    <input 
                                                        value={hostedImageUrl}
                                                        onChange={(e) => setHostedImageUrl(e.target.value)}
                                                        placeholder="https://your-image-host.com/image.png"
                                                        className="bg-transparent outline-none w-full text-sm text-slate-700 dark:text-white placeholder:text-slate-400"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-2">
                                                    Paste the URL where you hosted the downloaded image to generate the full HTML signature code.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {isNewProvider && (
                        <div className="absolute top-6 right-8 z-30 flex flex-col gap-2 items-end">
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 shadow-xl flex flex-col gap-2">
                                <span className="text-[10px] uppercase font-bold text-white/50 px-2 pt-1">Format</span>
                                <div className="grid grid-cols-2 gap-1">
                                    {[
                                        { id: 'post-sq', label: 'Post (Sq)', icon: RectangleHorizontal },
                                        { id: 'post-story', label: 'Story', icon: RectangleVertical },
                                        { id: 'banner-small', label: 'Banner S', icon: RectangleHorizontal },
                                        { id: 'banner-large', label: 'Banner L', icon: RectangleHorizontal },
                                        { id: 'pr-small', label: 'PR Small', icon: RectangleHorizontal },
                                        { id: 'pr-large', label: 'PR Large', icon: RectangleHorizontal },
                                    ].map(fmt => (
                                        <button 
                                            key={fmt.id}
                                            onClick={() => setProviderFormat(fmt.id as ProviderFormat)}
                                            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${providerFormat === fmt.id ? 'bg-cyan-500 text-white' : 'hover:bg-white/10 text-slate-300'}`}
                                        >
                                            <fmt.icon size={14} />
                                            {fmt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {(!isPresentation && !isSignature && !isNewProvider) && (
                        <div className="absolute top-6 right-8 z-30 flex gap-2">
                            {/* WELCOME TEXT ALIGNMENT (Landscape Only) */}
                            {selectedTemplate === TemplateType.WELCOME && orientation === 'landscape' && (
                                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-1 shadow-xl flex items-center">
                                    {(['left', 'center', 'right'] as const).map((align) => (
                                        <button
                                            key={align}
                                            onClick={() => setWelcomeTextAlignment(align)}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${welcomeTextAlignment === align ? 'bg-cyan-500 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                                            title={`Align ${align}`}
                                        >
                                            {align === 'left' && <AlignLeft size={14} />}
                                            {align === 'center' && <AlignCenter size={14} />}
                                            {align === 'right' && <AlignRight size={14} />}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* LANGUAGE SWITCHER */}
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-1 shadow-xl flex items-center">
                                {(['en', 'pt', 'es'] as Language[]).map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => setLanguage(lang)}
                                        className={`w-8 h-8 rounded-full text-[10px] font-bold uppercase transition-all flex items-center justify-center leading-none pt-[1px] ${language === lang ? 'bg-cyan-500 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-1 shadow-xl flex">
                                <button 
                                    onClick={() => handleOrientationChange('portrait')} 
                                    className={`p-2 rounded-full transition-all ${orientation === 'portrait' ? 'bg-cyan-500 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                                    title="Portrait"
                                >
                                    <RectangleVertical size={20} />
                                </button>
                                <button 
                                    onClick={() => handleOrientationChange('landscape')} 
                                    className={`p-2 rounded-full transition-all ${orientation === 'landscape' ? 'bg-cyan-500 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                                    title="Landscape"
                                >
                                    <RectangleHorizontal size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            )}
            </div>
        </div>
        
        {viewMode === ViewMode.EDITOR && selectedTemplate !== TemplateType.PRESENTATION && selectedTemplate !== TemplateType.NEW_PROVIDER && selectedTemplate !== TemplateType.NEWSLETTER && (
            <div 
                className="fixed bottom-8 left-[380px] z-50 group"
                onMouseDown={handleJoystickStart}
            >
              <div className={`w-32 h-32 rounded-full bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-center transition-opacity duration-300 ${isJoystickDragging ? 'opacity-100 scale-110' : 'opacity-40 hover:opacity-100'}`}>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                      <div className="w-full h-px bg-white"></div>
                      <div className="h-full w-px bg-white absolute"></div>
                  </div>
                  
                  <div 
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg border-2 border-white/20 relative z-10 cursor-grab active:cursor-grabbing"
                      style={{ transform: `translate(${joystickUiPos.x}px, ${joystickUiPos.y}px)` }}
                  >
                      <div className="absolute inset-0 rounded-full bg-white/20 blur-sm"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                          <Move size={20} className="text-white opacity-80" />
                      </div>
                  </div>
                  
                  <div className="absolute -bottom-8 text-[10px] font-bold text-white/50 uppercase tracking-widest pointer-events-none">
                      Pan Photo
                  </div>
              </div>
            </div>
        )}
        
      </div>
  );
}
