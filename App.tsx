

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { Employee, ViewMode, TemplateType, CanvasConfig, Orientation, Language, Slide, ProviderFormat, ProviderGridConfig } from './types';
import { generateCardCanvas } from './services/emailTemplate'; 
import { supabase, fetchEmployees, upsertEmployee, deleteEmployee, fetchHiringImages, addHiringImage, deleteHiringImage, uploadHiringImageToStorage, fetchBabyImages, addBabyImage, deleteBabyImage, uploadBabyImageToStorage } from './services/supabase';
import { EmployeeManager } from './components/EmployeeManager';
import { SalsaLogo } from './components/SalsaLogo';
import { SlideEditor } from './components/SlideEditor';
import * as XLSX from 'xlsx';
import { toPng, toJpeg } from 'html-to-image';
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
  Undo2,
  Redo2,
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
  Settings // Added Settings Icon
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
  },
  {
    id: 'hiring-generic',
    name: 'Generic Hiring',
    role: '',
    department: '',
    photoUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1000&auto=format&fit=crop',
    photoScale: 1,
    photoPosition: { x: 0, y: 0 },
    dateStr: '', 
    admissionDate: '',
    tenure: ''
  },
  {
    id: 'baby-generic',
    name: '',
    role: '',
    department: '',
    photoUrl: '',
    photoScale: 1,
    photoPosition: { x: 0, y: 0 },
    dateStr: '', 
    admissionDate: '',
    tenure: ''
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
          fontFamily: 'Orkney',
          fontWeight: '700',
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
          fontFamily: 'Orkney',
          fontSize: 24,
          color: '#666666',
          textAlign: 'left'
       }
    }
  ]
}];

type EditorTab = 'DATA' | 'TEMPLATES' | 'IMPORT' | 'IMAGES' | 'SETTINGS';

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
        .switch__inner { border-radius: 0.5em; display: block; overflow: hidden; position: absolute; top: 0.25em; left: 0.25em; width: 2.25em; height: 1em; }
        .switch__inner:before { transition: transform var(--trans-dur) var(--trans-timing); transform: translateX(-1.25em); }
        .switch__inner:before { background-color: var(--primary); border-radius: inherit; content: ""; display: block; width: 100%; height: 100%; }
        .switch__input { background-color: hsl(0,0%,100%); border-radius: 0.75em; box-shadow: 0 0 0 0.0625em hsla(var(--hue),90%,50%,0), 0 0.125em 0.5em hsla(var(--hue),10%,10%,0.1); outline: transparent; width: 2.75em; height: 1.5em; -webkit-appearance: none; appearance: none; transition: background-color var(--trans-dur), box-shadow var(--trans-dur); cursor: pointer; }
        .switch__input:checked { background-color: hsl(0,0%,100%); }
        .switch__input:checked ~ .switch__inner:before { transform: translateX(1.25em); }
      `}</style>
      <label className="switch">
        <input className="switch__input" type="checkbox" role="switch" name="dark" checked={isDarkMode} onChange={toggle} />
        <span className="switch__inner"></span>
        <span className="sr-only">Toggle</span>
      </label>
    </div>
  );
});

const MorphingCanvas = ({ html, templateType, orientation, children }: { html: string, templateType: TemplateType, orientation: Orientation, children?: React.ReactNode }) => {
  const [displayHtml, setDisplayHtml] = useState(html);
  const [displayTemplate, setDisplayTemplate] = useState(templateType);
  const [displayOrientation, setDisplayOrientation] = useState(orientation);
  const [phase, setPhase] = useState<'idle' | 'fadeOut' | 'morph' | 'fadeIn'>('idle');
  const [displayChildren, setDisplayChildren] = useState(children);

  // Store the latest props in refs to access them inside timeouts without re-triggering
  const latestHtml = useRef(html);
  const latestTemplate = useRef(templateType);
  const latestOrientation = useRef(orientation);
  const latestChildren = useRef(children);

  useEffect(() => {
    latestHtml.current = html;
    latestTemplate.current = templateType;
    latestOrientation.current = orientation;
    latestChildren.current = children;
  }, [html, templateType, orientation, children]);

  useEffect(() => {
    if ((templateType !== displayTemplate || orientation !== displayOrientation) && phase === 'idle') {
      setPhase('fadeOut');
    } else if (templateType === displayTemplate && orientation === displayOrientation && phase === 'idle') {
      setDisplayHtml(html);
      setDisplayChildren(children);
    }
  }, [templateType, orientation, html, displayTemplate, displayOrientation, phase, children]);

  useEffect(() => {
    if (phase === 'fadeOut') {
      const timer = setTimeout(() => {
        setDisplayHtml(latestHtml.current);
        setDisplayTemplate(latestTemplate.current);
        setDisplayOrientation(latestOrientation.current);
        setDisplayChildren(latestChildren.current);
        setPhase('morph');
      }, 120);
      return () => clearTimeout(timer);
    } else if (phase === 'morph') {
      const timer = setTimeout(() => {
        setPhase('fadeIn');
      }, 300); // 300ms morph duration
      return () => clearTimeout(timer);
    } else if (phase === 'fadeIn') {
      const timer = setTimeout(() => {
        setPhase('idle');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <motion.div
      layout
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="relative group active:scale-[1.02] transition-transform cursor-pointer"
      style={{ 
        width: 'fit-content',
        height: 'fit-content'
      }}
    >
      <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg opacity-0 group-hover:opacity-40 transition duration-500 blur-lg pointer-events-none"></div>
      
      <div className="relative border border-transparent group-hover:border-cyan-500/50 transition-all duration-500 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] bg-white"
           style={{ 
             borderRadius: '0',
           }}
      >
        <motion.div
          initial={false}
          animate={{
            opacity: phase === 'idle' ? 1 : (phase === 'fadeOut' ? 0 : (phase === 'fadeIn' ? 1 : 0)),
            filter: phase === 'fadeOut' ? 'brightness(1.5)' : 'brightness(1)',
            scale: phase === 'fadeIn' ? [1.03, 1] : 1,
          }}
          transition={{
            opacity: { duration: phase === 'fadeOut' ? 0.12 : 0.2 },
            filter: { duration: 0.12 },
            scale: { duration: 0.2, ease: "easeOut" }
          }}
          style={{ width: 'fit-content', height: 'fit-content', transformOrigin: 'center' }}
        >
          <div dangerouslySetInnerHTML={{ __html: displayHtml }} />
          {displayChildren}
        </motion.div>
      </div>
    </motion.div>
  );
};

const TEMPLATE_LIST = [
  { id: TemplateType.BIRTHDAY, label: 'Happy Birthday', desc: 'Classic celebration card', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1f03c89654a2a47ae.png' },
  { id: TemplateType.ANNIVERSARY, label: 'Work Anniversary', desc: 'Celebrate tenure milestones', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f0f03c89654a2a47ad.png' },
  { id: TemplateType.WELCOME, label: 'Welcome Aboard', desc: 'For new hires', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1187dda7445a894d8.png' },
  { id: TemplateType.JOB_CHANGE, label: 'Job Change', desc: 'New Role / Promotion', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1187dda7445a894d7.png' },
  { id: TemplateType.FAREWELL, label: 'See You Soon', desc: 'Farewell card', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e7625f6fc09c7fb545a11.png' },
  { id: TemplateType.HIRING, label: 'Hiring', desc: 'Recruitment Card', image: 'https://img.mailinblue.com/2600492/images/content_library/original/69cd286e93e704e0f8774c28.png' },
  { id: TemplateType.BABY, label: 'Baby Birth', desc: 'Welcome Baby', image: 'https://img.mailinblue.com/2600492/images/content_library/original/69d5122206cc717826a7543b.jpg' },
  { id: TemplateType.NEWSLETTER, label: 'Email Signature', desc: 'Professional signature', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1bf95d83f4c272549.png' },
  { id: TemplateType.PRESENTATION, label: 'Slide Deck', desc: 'AI Powered Presentation', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f0318a761a56ead72a.png' }, 
  { id: TemplateType.NEW_PROVIDER, label: 'New Provider', desc: 'Casino Game Launch', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1318a761a56ead72c.png' },
];

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [isManagementMode, setIsManagementMode] = useState(false);

  // Fetch from Supabase on mount
  useEffect(() => {
    fetchEmployees().then(data => {
      if (data && data.length > 0) {
        const genericHiring = INITIAL_EMPLOYEES.find(e => e.id === 'hiring-generic');
        const genericBaby = INITIAL_EMPLOYEES.find(e => e.id === 'baby-generic');
        
        let finalData = [...data];
        if (genericHiring && !data.find(e => e.id === 'hiring-generic')) {
          finalData.push(genericHiring);
        }
        if (genericBaby && !data.find(e => e.id === 'baby-generic')) {
          finalData.push(genericBaby);
        }
        setEmployees(finalData);
      }
    });

    fetchHiringImages().then(images => {
      if (images && images.length > 0) {
        setCustomHiringImages(images);
      }
    });

    fetchBabyImages().then(images => {
      if (images && images.length > 0) {
        setCustomBabyImages(images);
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

  // Preload template images when TEMPLATES tab is clicked
  useEffect(() => {
      if (activeTab === 'TEMPLATES') {
          TEMPLATE_LIST.forEach(t => {
              const img = new Image();
              img.src = t.image;
          });
      }
  }, [activeTab]);
  
  const viewMode = activeTab === 'IMPORT' ? ViewMode.IMPORT : ViewMode.EDITOR;

  const [config, setConfig] = useState<CanvasConfig>(INITIAL_CONFIG);
  // Removed isDarkMode state, enforcing dark mode by default
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [providerFormat, setProviderFormat] = useState<ProviderFormat>('post-sq');
  const [language, setLanguage] = useState<Language>('en'); 

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
  const [isCompactMonthView, setIsCompactMonthView] = useState<boolean>(false);
  const [isGroupMode, setIsGroupMode] = useState<boolean>(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(new Date().getMonth());
  const [showImageControls, setShowImageControls] = useState<boolean>(false);
  const [customHiringImages, setCustomHiringImages] = useState<string[]>([]);
  const [customBabyImages, setCustomBabyImages] = useState<string[]>([]);
  
  // SIGNATURE CONTROL STATE
  const [showSignatureControls, setShowSignatureControls] = useState<boolean>(false); // Changed to false to hide on load
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);
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
  const [signatureDepartment, setSignatureDepartment] = useState('');
  
  // Track which socials are active in the UI
  const [activeSocials, setActiveSocials] = useState<string[]>(['linkedin', 'instagram', 'website']);
  const [editingSocialId, setEditingSocialId] = useState<string | null>(null);

  const [hostedImageUrl, setHostedImageUrl] = useState('');
  const [hideIconsForExport, setHideIconsForExport] = useState(true); 
  const [includeInfoInHtml, setIncludeInfoInHtml] = useState(true); // NEW Toggle for text info
  const [includeTextInExport, setIncludeTextInExport] = useState(false); // NEW Toggle for text in image
  const [hasCopied, setHasCopied] = useState<string | null>(null); 
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'pdf'>('png');

  // --- UNDO/REDO STATE ---
  const [history, setHistory] = useState<Employee[][]>([INITIAL_EMPLOYEES]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const saveHistory = useCallback((newEmployees: Employee[]) => {
      setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push(newEmployees);
          // Keep last 50 states
          if (newHistory.length > 50) newHistory.shift();
          return newHistory;
      });
      setHistoryIndex(prev => Math.min(prev + 1, 50));
  }, [historyIndex]);

  const undo = useCallback(() => {
      if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setEmployees(history[newIndex]);
          toast.info("Desfeito");
      }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
      if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setEmployees(history[newIndex]);
          toast.info("Refeito");
      }
  }, [history, historyIndex]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
              if (e.shiftKey) {
                  redo();
              } else {
                  undo();
              }
          } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
              redo();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

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

    if (isGroupMode && selectedTemplate === TemplateType.JOB_CHANGE) {
        // Always return an array in group mode to trigger the group template
        if (selectedEmployeeIds.length === 0) {
            const current = employees.find(e => e.id === selectedEmployeeId) || employees[0];
            return [current];
        }
        return employees.filter(e => selectedEmployeeIds.includes(e.id));
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
  }, [employees, isMonthView, isGroupMode, selectedEmployeeIds, selectedTemplate, selectedMonthIndex, selectedEmployeeId, providerData, getCurrentProviderConfig]);

  const currentCanvasData = getCanvasData();
  
  const filteredEmployees = useMemo(() => employees.filter(emp => 
     emp.id !== 'hiring-generic' && emp.id !== 'baby-generic' && (
       emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       emp.role.toLowerCase().includes(searchQuery.toLowerCase())
     )
  ), [employees, searchQuery]);

  const previewHtml = useMemo(() => {
    if (!currentCanvasData || isBulkMode || selectedTemplate === TemplateType.PRESENTATION) {
        return '';
    }
    
    const activeLinksObj: Record<string, string> = {};
    activeSocials.forEach(key => {
        if (signatureLinks[key]) {
            activeLinksObj[key] = signatureLinks[key];
        }
    });

    return generateCardCanvas(currentCanvasData, config, selectedTemplate, orientation, language, hideIconsForExport, activeLinksObj, providerFormat, signatureDepartment, { isMonthNamesOnly: isCompactMonthView });
  }, [currentCanvasData, config, selectedTemplate, orientation, language, hideIconsForExport, isBulkMode, signatureLinks, activeSocials, providerFormat, signatureDepartment, isCompactMonthView]);

  const [isDownloading, setIsDownloading] = useState(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false); 
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
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
      const newPos = { x: centerX, y: Math.max(0, centerY) };
      setPosition(newPos);
      positionRef.current = newPos;
    }
  }, [previewDimensions.width, previewDimensions.height, selectedTemplate, isMonthView]); // Re-center only on layout change

  // ... (keeping existing functions: updateEmployee, updatePhotoPosition, removeEmployee, handleZoom, handleWheel, handleCanvasMouseDown, handleMouseMove, handleMouseUp) ...
  const setEmployeesWithHistory = useCallback((updater: (prev: Employee[]) => Employee[]) => {
      setEmployees(prev => {
          const next = updater(prev);
          saveHistory(next);
          return next;
      });
  }, [saveHistory]);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateEmployee = useCallback((id: string, field: keyof Employee, value: any) => {
    let updatedEmp: Employee | null = null;
    let nextState: Employee[] = [];

    setEmployees(prev => {
        nextState = prev.map(e => {
            if (e.id === id) {
                const updated = { ...e, [field]: value };
                if (field === 'admissionDate') {
                    const newTenure = calculateTenure(value);
                    if (newTenure) updated.tenure = newTenure;
                }
                updatedEmp = updated;
                return updated;
            }
            return e;
        });
        return nextState;
    });

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
        if (nextState.length > 0) saveHistory(nextState);
        if (updatedEmp) upsertEmployee(updatedEmp);
    }, 500);
  }, [saveHistory]);

  // Sync contenteditable changes back to state
  useEffect(() => {
    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const field = target.getAttribute('data-field');
      if (field && target.hasAttribute('contenteditable')) {
        const value = target.innerText;
        updateEmployee(selectedEmployeeId, field as keyof Employee, value);
      }
    };
    document.addEventListener('focusout', handleBlur);
    return () => document.removeEventListener('focusout', handleBlur);
  }, [selectedEmployeeId, updateEmployee]);

  const updatePhotoPosition = useCallback((axis: 'x' | 'y', value: number) => {
      setEmployeesWithHistory(prev => {
          const emp = prev.find(e => e.id === selectedEmployeeId);
          if (!emp) return prev;
          const current = emp.photoPosition || { x: 0, y: 0 };
          const newPos = { ...current, [axis]: value };
          return prev.map(e => e.id === selectedEmployeeId ? { ...e, photoPosition: newPos } : e);
      });
  }, [selectedEmployeeId, setEmployeesWithHistory]);

  const removeEmployee = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmployeesWithHistory(prev => {
        const newList = prev.filter(emp => emp.id !== id);
        if (newList.length > 0 && selectedEmployeeId === id) {
             setSelectedEmployeeId(newList[0].id);
             setSidebarDataView('LIST');
        }
        return newList;
    });
  }, [selectedEmployeeId, setEmployeesWithHistory]);

  const handleZoom = useCallback((delta: number) => {
    setZoomLevel(prev => {
        const next = Math.max(0.1, Math.min(3, prev + delta));
        return Math.round(next * 100) / 100;
    });
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    const step = 0.1;
    const delta = e.deltaY < 0 ? step : -step;
    handleZoom(delta);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.image-controls') || target.closest('.signature-controls') || target.closest('.slide-editor-ui') || target.closest('[contenteditable]') || target.hasAttribute('contenteditable') || target.closest('button, input, textarea, select')) return; 
    
    // NEW LOGIC FOR PROVIDER GRID DRAG (Left Click Only)
    if (isNewProvider && e.button === 0) { 
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

    // Standard Pan Logic (Left or Middle Click)
    if (e.button === 0 || e.button === 1) {
        e.preventDefault();
        setIsDraggingCanvas(true);
        setDragOffset({
          x: e.clientX - positionRef.current.x,
          y: e.clientY - positionRef.current.y
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

    if (isDraggingCanvas && canvasWrapperRef.current) {
        e.preventDefault();
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        positionRef.current = { x: newX, y: newY };
        canvasWrapperRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${zoomLevel})`;
    }
  };

  const handleMouseUp = () => {
    if (isDraggingCanvas) {
        setPosition(positionRef.current);
    }
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
  
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !uploadTarget) return;
      
      if (selectedTemplate === TemplateType.HIRING && uploadTarget.field === 'photoUrl') {
          try {
              // Upload actual file to Supabase Storage
              const publicUrl = await uploadHiringImageToStorage(file);
              
              // Update state and DB with the public URL
              updateEmployee(uploadTarget.id, uploadTarget.field as keyof Employee, publicUrl);
              setCustomHiringImages(prev => [...prev, publicUrl]);
              await addHiringImage(publicUrl);
          } catch (err) {
              console.error('Failed to upload hiring image:', err);
              alert('Failed to upload image. Please try again.');
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          setUploadTarget(null);
          return;
      } else if (selectedTemplate === TemplateType.BABY && uploadTarget.field === 'photoUrl') {
          try {
              // Upload actual file to Supabase Storage
              const publicUrl = await uploadBabyImageToStorage(file);
              
              // Update state and DB with the public URL
              updateEmployee(uploadTarget.id, uploadTarget.field as keyof Employee, publicUrl);
              setCustomBabyImages(prev => [...prev, publicUrl]);
              await addBabyImage(publicUrl);
          } catch (err) {
              console.error('Failed to upload baby image:', err);
              alert('Failed to upload image. Please try again.');
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          setUploadTarget(null);
          return;
      }

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
        
        // Remove rounded corners for export
        const innerCard = clone.querySelector('div[style*="border-radius"]');
        if (innerCard) {
            (innerCard as HTMLElement).style.borderRadius = '0';
        }
        clone.style.borderRadius = '0';
        
        // REMOVE SIGNATURE TEXT ONLY FOR EXPORT
        if (selectedTemplate === TemplateType.NEWSLETTER && !includeTextInExport) {
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

        const options = {
             quality: 1.0,
             pixelRatio: 2,
             cacheBust: false,
             skipAutoScale: true
        };

        let dataUrl = '';
        if (exportFormat === 'jpeg') {
            dataUrl = await toJpeg(clone, options);
        } else {
            dataUrl = await toPng(clone, options);
        }

        const baseFilename = isMonthView 
            ? `endo-month-${MONTHS[selectedMonthIndex].toLowerCase()}-${Date.now()}`
            : `endo-canvas-${selectedTemplate.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

        if (exportFormat === 'pdf') {
            const pdf = new jsPDF({
                orientation: clone.offsetWidth > clone.offsetHeight ? 'landscape' : 'portrait',
                unit: 'px',
                format: [clone.offsetWidth, clone.offsetHeight]
            });
            pdf.addImage(dataUrl, 'PNG', 0, 0, clone.offsetWidth, clone.offsetHeight);
            pdf.save(`${baseFilename}.pdf`);
        } else {
            const link = document.createElement('a');
            link.download = `${baseFilename}.${exportFormat === 'jpeg' ? 'jpg' : 'png'}`;
            link.href = dataUrl;
            link.click();
        }

        document.body.removeChild(container);
        toast.success(`Exportado com sucesso (${exportFormat.toUpperCase()})!`);
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Não foi possível gerar a imagem. Verifique se as imagens externas permitem CORS.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBatchExport = async () => {
    if (!isMonthView || filteredEmployees.length === 0) return;
    
    setIsDownloading(true);
    toast.info(`Iniciando exportação em lote de ${filteredEmployees.length} cartões...`);
    
    try {
        const zip = new JSZip();
        const folder = zip.folder(`Aniversariantes_${MONTHS[selectedMonthIndex]}`);
        
        // We need to render each employee temporarily to capture them
        // This is a simplified approach: we generate the HTML for each and use a hidden container
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.zIndex = '-1';
        document.body.appendChild(container);

        for (let i = 0; i < filteredEmployees.length; i++) {
            const emp = filteredEmployees[i];
            const html = generateCardCanvas(emp, config, selectedTemplate, orientation, language, hideIconsForExport, {}, providerFormat, signatureDepartment);
            
            const wrapper = document.createElement('div');
            wrapper.innerHTML = html;
            const node = wrapper.firstElementChild as HTMLElement;
            if (!node) continue;
            
            // Remove rounded corners for export
            const innerCard = node.querySelector('div[style*="border-radius"]');
            if (innerCard) {
                (innerCard as HTMLElement).style.borderRadius = '0';
            }
            node.style.borderRadius = '0';
            
            container.innerHTML = '';
            container.appendChild(node);
            
            // Wait for images to load
            const imgElements = Array.from(node.querySelectorAll('img'));
            await Promise.all(imgElements.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));
            
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for rendering

            const dataUrl = await toPng(node, {
                quality: 1.0,
                pixelRatio: 2,
                cacheBust: false,
                skipAutoScale: true
            });
            
            const base64Data = dataUrl.replace(/^data:image\/(png|jpeg);base64,/, "");
            folder?.file(`${emp.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${MONTHS[selectedMonthIndex]}.png`, base64Data, {base64: true});
            
            toast.info(`Gerando ${i + 1}/${filteredEmployees.length}...`);
        }
        
        document.body.removeChild(container);
        
        const content = await zip.generateAsync({type: "blob"});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `Aniversariantes_${MONTHS[selectedMonthIndex]}.zip`;
        link.click();
        
        toast.success("Exportação em lote concluída!");
    } catch (err) {
        console.error("Batch export failed:", err);
        toast.error("Falha na exportação em lote.");
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
                        fontFace: 'Orkney',
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
    department: string = signatureDepartment
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
        if (department) {
            const depParts = department.split(' ');
            const firstDep = depParts[0];
            const restDep = depParts.slice(1).join(' ');
            const displayDep = restDep ? `${firstDep}<br/>${restDep}` : firstDep;

            contentHtml += `
            <p style="font-family: 'Arial Black', Arial, sans-serif; font-size: 24px; font-weight: 900; text-transform: uppercase; color: #ffffff; margin: 0; line-height: 1; mso-line-height-rule: exactly; padding-bottom: 15px;">
                ${displayDep}
            </p>
        `;
        } else {
            // Split name only at the first space to match the user's "Vitor<br>Gonzalez" style
            const nameParts = targetEmployee.name.split(' ');
            const firstName = nameParts[0];
            const restName = nameParts.slice(1).join(' ');
            const displayName = restName ? `${firstName}<br/>${restName}` : firstName;

            contentHtml += `
            <p style="font-family: 'Arial Black', Arial, sans-serif; font-size: 24px; font-weight: 900; text-transform: uppercase; color: #ffffff; margin: 0; line-height: 1; mso-line-height-rule: exactly;">
                ${displayName}
            </p>
            <p style="font-family: Arial, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #ffffff; margin: 5px 0 10px 0;">
                ${targetEmployee.role}
            </p>
        `;
        }
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
                      const admission = row['Start Date'] || row['Admission'] || row['Admissão'] || '';

                      return {
                          id: `imported-${Date.now()}-${idx}`,
                          name: fullName,
                          role: role,
                          previousRole: row['Previous Role'] || row['Cargo Anterior'] || '',
                          photoUrl: row['Photo'] || row['Foto'] || 'https://via.placeholder.com/150',
                          dateStr: row['Birthday'] || row['Aniversário'] || '01/01',
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
      <header className="px-6 h-[72px] flex justify-start items-center z-50 shrink-0 sticky top-0 header-gradient">
        <Toaster position="top-center" theme="dark" />
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
      </header>
  ), [isSignature, hasCopied, handleCopyHtml, handleCopyAllHtml, isNewProvider, employees.length]);

  // Redesigned Floating Sidebar
  const SidebarContent = useMemo(() => (
    <div className={`absolute top-24 left-6 w-[340px] bottom-8 rounded-[2.5rem] bg-[#121212] border border-white/10 z-30 shadow-2xl flex flex-col overflow-hidden`}>
       
       {/* 1. Header Tabs */}
       <div className="p-4 shrink-0">
          <div className="flex bg-white/10 rounded-full p-1 h-14 relative">
             {selectedTemplate !== TemplateType.HIRING && selectedTemplate !== TemplateType.BABY && selectedTemplate !== TemplateType.NEW_PROVIDER && (
                 <button 
                    onClick={() => { 
                        setActiveTab('DATA'); 
                        if (selectedTemplate === TemplateType.HIRING || selectedTemplate === TemplateType.BABY) {
                            setSidebarDataView('DETAIL');
                        } else {
                            setSidebarDataView('LIST'); 
                        }
                    }} 
                    className={`relative flex-1 flex items-center justify-center rounded-full transition-colors duration-300 ${activeTab === 'DATA' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                    title="Employee Data"
                 >
                    {activeTab === 'DATA' && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute inset-0"
                        transition={{ type: "tween", ease: [0.4, 0, 0.2, 1], duration: 0.3 }}
                      >
                         <motion.div 
                            key="indicator-DATA"
                            className="w-full h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 shadow-lg"
                            animate={{ scaleX: [1, 1.1, 1] }}
                            transition={{ duration: 0.3, times: [0, 0.5, 1], ease: "easeInOut" }}
                         />
                      </motion.div>
                    )}
                    <span className="relative z-10">
                      {selectedTemplate === TemplateType.NEW_PROVIDER ? <Settings size={22} /> : <Users size={22} />}
                    </span>
                 </button>
             )}
             <button 
                onClick={() => setActiveTab('TEMPLATES')} 
                className={`relative flex-1 flex items-center justify-center rounded-full transition-colors duration-300 ${activeTab === 'TEMPLATES' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                title="Templates"
             >
                {activeTab === 'TEMPLATES' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0"
                    transition={{ type: "tween", ease: [0.4, 0, 0.2, 1], duration: 0.3 }}
                  >
                     <motion.div 
                        key="indicator-TEMPLATES"
                        className="w-full h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 shadow-lg"
                        animate={{ scaleX: [1, 1.1, 1] }}
                        transition={{ duration: 0.3, times: [0, 0.5, 1], ease: "easeInOut" }}
                     />
                  </motion.div>
                )}
                <span className="relative z-10">
                  <Palette size={22} />
                </span>
             </button>
             <button 
                onClick={() => setActiveTab('SETTINGS')} 
                className={`relative flex-1 flex items-center justify-center rounded-full transition-colors duration-300 ${activeTab === 'SETTINGS' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                title="Visual Identity"
             >
                {activeTab === 'SETTINGS' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0"
                    transition={{ type: "tween", ease: [0.4, 0, 0.2, 1], duration: 0.3 }}
                  >
                     <motion.div 
                        key="indicator-SETTINGS"
                        className="w-full h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 shadow-lg"
                        animate={{ scaleX: [1, 1.1, 1] }}
                        transition={{ duration: 0.3, times: [0, 0.5, 1], ease: "easeInOut" }}
                     />
                  </motion.div>
                )}
                <span className="relative z-10">
                  <Settings size={22} />
                </span>
             </button>
             {(selectedTemplate === TemplateType.HIRING || selectedTemplate === TemplateType.BABY) && (
               <button 
                  onClick={() => setActiveTab('IMAGES')} 
                  className={`relative flex-1 flex items-center justify-center rounded-full transition-colors duration-300 ${activeTab === 'IMAGES' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Images"
               >
                  {activeTab === 'IMAGES' && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0"
                      transition={{ type: "tween", ease: [0.4, 0, 0.2, 1], duration: 0.3 }}
                    >
                       <motion.div 
                          key="indicator-IMAGES"
                          className="w-full h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 shadow-lg"
                          animate={{ scaleX: [1, 1.1, 1] }}
                          transition={{ duration: 0.3, times: [0, 0.5, 1], ease: "easeInOut" }}
                       />
                    </motion.div>
                  )}
                  <span className="relative z-10">
                    <ImageIcon size={22} />
                  </span>
               </button>
             )}
          </div>
       </div>

       {/* 2. Middle Content (Scrollable) */}
       <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar overflow-x-hidden">
          <AnimatePresence mode="wait">
             <motion.div 
                 key={activeTab}
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 transition={{ duration: 0.2 }}
                 className="h-full"
             >
                {activeTab === 'IMAGES' && (selectedTemplate === TemplateType.HIRING || selectedTemplate === TemplateType.BABY) && (
             <div className="animate-in slide-in-from-right-4 duration-300 pt-2">
                <h3 className="text-sm font-bold text-cyan-300 uppercase mb-4 flex items-center gap-2"><ImageIcon size={16}/> Image Library</h3>
                <div className="grid grid-cols-2 gap-3">
                    {(selectedTemplate === TemplateType.HIRING ? customHiringImages : customBabyImages).map((img, i) => (
                        <div key={`custom-${i}`} className="relative group">
                            <button 
                                onClick={() => updateEmployee(selectedEmployee.id, 'photoUrl', img)}
                                className={`w-full relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${selectedEmployee.photoUrl === img ? 'border-cyan-500 scale-[0.98]' : 'border-transparent hover:border-white/20'}`}
                            >
                                <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (selectedTemplate === TemplateType.HIRING) {
                                        setCustomHiringImages(prev => {
                                            const newImages = prev.filter((_, idx) => idx !== i);
                                            if (selectedEmployee.photoUrl === img) {
                                                updateEmployee(selectedEmployee.id, 'photoUrl', newImages[0] || '');
                                            }
                                            return newImages;
                                        });
                                        deleteHiringImage(img).catch(console.error);
                                    } else {
                                        setCustomBabyImages(prev => {
                                            const newImages = prev.filter((_, idx) => idx !== i);
                                            if (selectedEmployee.photoUrl === img) {
                                                updateEmployee(selectedEmployee.id, 'photoUrl', newImages[0] || '');
                                            }
                                            return newImages;
                                        });
                                        deleteBabyImage(img).catch(console.error);
                                    }
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                title="Remove Image"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    <button 
                        onClick={() => handleImageUploadTrigger(selectedEmployee.id, 'photoUrl')}
                        className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-cyan-500/50 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-cyan-400 transition-all bg-white/5"
                    >
                        <Upload size={24} />
                        <span className="text-[10px] font-bold uppercase">Upload Custom</span>
                    </button>
                </div>
             </div>
           )}
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
                   (sidebarDataView === 'LIST' && selectedTemplate !== TemplateType.HIRING && selectedTemplate !== TemplateType.BABY) ? (
                     <>
                        {/* UPDATED SEARCH BAR - Fully Rounded & Larger */}
                        <div className={`relative flex items-center px-6 py-4 rounded-full border transition-all bg-white/5 border-white/10 focus-within:bg-white/10 shadow-inner`}>
                            <Search size={20} className="opacity-50 mr-3 text-white" />
                            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="bg-transparent outline-none w-full text-base font-medium placeholder:text-white/30 text-white" />
                        </div>
                        {/* UPDATED GRID with animated gradient backgrounds */}
                        <div className="grid grid-cols-2 gap-2 pb-2">
                            {filteredEmployees.map((emp, index) => (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    key={emp.id} 
                                    onClick={() => {
                                        if (isGroupMode && selectedTemplate === TemplateType.JOB_CHANGE) {
                                            setSelectedEmployeeIds(prev => 
                                                prev.includes(emp.id) 
                                                    ? prev.filter(id => id !== emp.id)
                                                    : [...prev, emp.id]
                                            );
                                        } else {
                                            setSelectedEmployeeId(emp.id);
                                            setSidebarDataView('DETAIL');
                                        }
                                    }}
                                    className={`aspect-square relative overflow-hidden cursor-pointer rounded-2xl border ${
                                        (isGroupMode && selectedTemplate === TemplateType.JOB_CHANGE)
                                            ? (selectedEmployeeIds.includes(emp.id) ? 'border-cyan-400 ring-2 ring-cyan-400/20' : 'border-white/10 opacity-70 hover:opacity-100')
                                            : (selectedEmployeeId === emp.id ? 'border-cyan-400 ring-2 ring-cyan-400/20' : 'border-white/10 opacity-70 hover:opacity-100')
                                    }`}
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
                                </motion.div>
                            ))}
                        </div>
                     </>
                   ) : (
                      // Detail View 
                      <div>
                          {selectedTemplate !== TemplateType.HIRING && selectedTemplate !== TemplateType.BABY && (
                              <button onClick={() => setSidebarDataView('LIST')} className="flex items-center gap-2 text-xs font-bold mb-6 text-slate-400 hover:text-white bg-white/5 px-4 py-2 rounded-full w-fit"><ArrowLeft size={14}/> Back to List</button>
                          )}
                                               <div className="space-y-3">
                                {selectedTemplate !== TemplateType.HIRING && selectedTemplate !== TemplateType.BABY && (
                                    <>
                                        <div className={`flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10`}><User size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.name} onChange={(e) => updateEmployee(selectedEmployee.id, 'name', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Full Name" /></div>
                                        <div className={`flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10`}><Briefcase size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.role} onChange={(e) => updateEmployee(selectedEmployee.id, 'role', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Role" /></div>
                                        <div className={`flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10`}><Calendar size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.dateStr} onChange={(e) => updateEmployee(selectedEmployee.id, 'dateStr', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Birthday (DD/MM)" /></div>
                                        
                                        <div className={`flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10`}><Clock size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.admissionDate || ''} onChange={(e) => updateEmployee(selectedEmployee.id, 'admissionDate', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Admission Date" /></div>

                                        <div className={`flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10`}><TrendingUp size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.previousRole || ''} onChange={(e) => updateEmployee(selectedEmployee.id, 'previousRole', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Previous Role (Job Change)" /></div>
                                    </>
                                )}

                                <div className={`flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10`}><ImageIcon size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.photoUrl} onChange={(e) => updateEmployee(selectedEmployee.id, 'photoUrl', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Photo URL" /></div>
                          </div>
                          
                          {selectedTemplate !== TemplateType.HIRING && selectedTemplate !== TemplateType.BABY && (
                              <>
                                  <button onClick={() => setIsManagementMode(true)} className="w-full py-3 rounded-2xl border border-white/10 text-white hover:bg-white/10 text-xs font-bold transition-all mt-4 flex items-center justify-center gap-2">
                                      <Settings size={16} />
                                      Manage Employees
                                  </button>
                                  <button onClick={(e) => removeEmployee(selectedEmployee.id, e)} className="w-full py-3 rounded-2xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all mt-2">Remove Employee</button>
                              </>
                          )}
                      </div>
                   )
               )}
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <div className="animate-in slide-in-from-right-4 duration-300 pt-2 space-y-6">
                <div>
                    <h3 className="text-sm font-bold text-cyan-300 uppercase mb-4 flex items-center gap-2"><Palette size={16}/> Cores da Marca</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 block mb-2">Cor Primária</label>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="color" 
                                    value={config.primaryColor} 
                                    onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                                />
                                <input 
                                    type="text" 
                                    value={config.primaryColor}
                                    onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white flex-1 outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 block mb-2">Cor Secundária</label>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="color" 
                                    value={config.secondaryColor} 
                                    onChange={(e) => setConfig(prev => ({ ...prev, secondaryColor: e.target.value }))}
                                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                                />
                                <input 
                                    type="text" 
                                    value={config.secondaryColor}
                                    onChange={(e) => setConfig(prev => ({ ...prev, secondaryColor: e.target.value }))}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white flex-1 outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-bold text-cyan-300 uppercase mb-4 flex items-center gap-2"><ImageIcon size={16}/> Logo da Empresa</h3>
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            value={config.companyLogo}
                            onChange={(e) => setConfig(prev => ({ ...prev, companyLogo: e.target.value }))}
                            placeholder="URL do Logo (PNG/SVG)"
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none focus:border-cyan-500"
                        />
                        {config.companyLogo && (
                            <div className="p-4 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                                <img src={config.companyLogo} alt="Logo Preview" className="max-h-16 object-contain" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'TEMPLATES' && (
            <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-3 pt-2">
                {TEMPLATE_LIST.map((t, index) => {
                  return (
                    <button 
                       key={t.id} 
                       onClick={() => { 
                           setSelectedTemplate(t.id as TemplateType); 
                           if (t.id === TemplateType.HIRING) {
                               setSelectedEmployeeId('hiring-generic');
                               updateEmployee('hiring-generic', 'photoUrl', customHiringImages[0] || '');
                               setSidebarDataView('DETAIL');
                               if (activeTab === 'DATA') setActiveTab('TEMPLATES');
                           } else if (t.id === TemplateType.BABY) {
                               setSelectedEmployeeId('baby-generic');
                               setSidebarDataView('DETAIL');
                               if (activeTab === 'DATA') setActiveTab('TEMPLATES');
                           } else if (t.id === TemplateType.NEW_PROVIDER) {
                               if (activeTab === 'DATA') setActiveTab('TEMPLATES');
                           } else if (selectedEmployeeId === 'hiring-generic' || selectedEmployeeId === 'baby-generic') {
                               const firstRealEmployee = employees.find(e => e.id !== 'hiring-generic' && e.id !== 'baby-generic');
                               if (firstRealEmployee) {
                                   setSelectedEmployeeId(firstRealEmployee.id);
                               }
                               setSidebarDataView('LIST');
                           }
                           if (t.id !== TemplateType.BIRTHDAY) setIsMonthView(false); 
                           if (t.id === TemplateType.PRESENTATION || t.id === TemplateType.BABY) {
                               setOrientation('landscape'); 
                           }
                           // Removed auto-navigation logic for NEW_PROVIDER here
                       }} 
                       className={`relative h-[140px] rounded-2xl text-left transition-all duration-300 group overflow-hidden border
                         ${selectedTemplate === t.id ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] scale-[1.02]' : 'border-white/10 opacity-80 hover:opacity-100 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:scale-[1.02]'}
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
          </motion.div>
          </AnimatePresence>
       </div>

       {/* 3. Bottom Actions */}
       <div className="p-4 pt-2 shrink-0 flex flex-col gap-2 border-t border-white/5 bg-[#121212]">
           <div className="flex gap-2">
               <button 
                  className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-full shadow-lg transition-all font-bold text-white text-base ${isDownloading ? 'bg-cyan-700 cursor-wait' : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-purple-500/20'}`} 
                  onClick={handleDownload} 
                  disabled={isDownloading}
               >
                   {isPresentation ? (isDownloading ? '...' : 'Download PPT') : (isDownloading ? 'Generating...' : `Download ${exportFormat.toUpperCase()}`)}
               </button>
               
               <button 
                  onClick={() => setIsManagementMode(true)}
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white border border-white/10 bg-white/10 hover:bg-white/20 transition-all shrink-0"
                  title="Employee Management"
               >
                  <Settings size={20} />
               </button>
           </div>
       </div>

    </div>
  ), [activeTab, sidebarDataView, filteredEmployees, selectedEmployeeId, selectedTemplate, searchQuery, selectedEmployee, updateEmployee, removeEmployee, isSignature, hasCopied, handleCopyHtml, handleCopyAllHtml, isNewProvider, providerData, activeGridConfig, updateGridConfig, isDownloading, isPresentation, handleDownload]);

  // --- HIRING EDITOR OVERLAY ---
  const renderHiringOverlay = () => {
    return null;
  };

  return (
    <div className={`w-full h-screen flex flex-col overflow-hidden ${theme.bg} dark text-slate-900 dark:text-white transition-colors duration-300`}>
        {/* REMOVED ViewMode.IMPORT conditional rendering completely */}
        
        {HeaderContent}
        
        <div className="flex-1 relative overflow-hidden">
            <AnimatePresence>
                {isManagementMode && (
                    <motion.div 
                        key="management"
                        initial={{ opacity: 0, y: 40, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.98 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 z-30"
                    >
                        <EmployeeManager 
                            employees={employees}
                            onClose={() => setIsManagementMode(false)}
                            onUpdateEmployee={handleUpdateEmployeeDB}
                            onDeleteEmployee={handleDeleteEmployeeDB}
                            onAddEmployee={handleAddEmployeeDB}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
            
            <motion.div 
                className="absolute inset-0 flex"
                animate={{ 
                    opacity: isManagementMode ? 0 : 1,
                    scale: isManagementMode ? 1.02 : 1,
                    y: isManagementMode ? -20 : 0,
                    pointerEvents: isManagementMode ? 'none' : 'auto'
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
            
            {SidebarContent}

            <div style={{ display: selectedTemplate === TemplateType.PRESENTATION ? 'flex' : 'none', flex: 1, width: '100%', height: '100%' }}>
                <SlideEditor 
                    slides={slides}
                    currentSlideIndex={currentSlideIndex}
                    onUpdateSlides={setSlides}
                    onSelectSlide={setCurrentSlideIndex}
                />
            </div>
            
            <div 
                style={{ display: selectedTemplate !== TemplateType.PRESENTATION ? 'flex' : 'none' }}
                className={`flex-1 relative overflow-hidden bg-slate-200/50 dark:bg-black/50 ${isDraggingCanvas ? 'cursor-grabbing' : 'cursor-default'}`}
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
                            ref={canvasWrapperRef}
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                                transformOrigin: 'top left',
                                transition: isDraggingCanvas ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                width: 'fit-content',
                                height: 'fit-content',
                                position: 'relative'
                            }}
                       >
                           <MorphingCanvas html={previewHtml} templateType={selectedTemplate} orientation={orientation}>
                               {renderHiringOverlay()}
                           </MorphingCanvas>

                           {isDownloading && (
                               <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
                                   <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
                                   <motion.div 
                                       className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,1)]"
                                       animate={{ top: ['0%', '100%', '0%'] }}
                                       transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                   />
                               </div>
                           )}
                       </div>
                    </div>

                    <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-20">
                        <button onClick={undo} disabled={historyIndex === 0} className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="Desfazer (Ctrl+Z)"><Undo2 size={20}/></button>
                        <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="Refazer (Ctrl+Y)"><Redo2 size={20}/></button>
                        <div className="h-px w-8 bg-white/20 mx-auto my-1"></div>
                        <button onClick={() => handleZoom(0.1)} className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><ZoomIn size={20}/></button>
                        <button onClick={() => handleZoom(-0.1)} className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><ZoomOut size={20}/></button>
                        <button onClick={() => { setZoomLevel(1); }} className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><RotateCcw size={20}/></button>
                    </div>
                    
                    {isMonthView && selectedTemplate === TemplateType.BIRTHDAY && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 ml-[140px] bg-white/10 backdrop-blur-md border border-slate-300 dark:border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-full px-6 py-3 flex items-center gap-6 z-20 transition-all dark:bg-black/20 bg-white">
                            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-700 dark:text-white transition-colors"><ChevronLeft size={20}/></button>
                            <span className="text-slate-800 dark:text-white font-bold uppercase min-w-[120px] text-center tracking-wider">{MONTHS[selectedMonthIndex]}</span>
                            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-700 dark:text-white transition-colors"><ChevronRight size={20}/></button>
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
                                        onWheel={(e) => e.stopPropagation()}
                                        className="signature-controls absolute mt-4 w-[340px] bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                                        style={{ right: 0 }}
                                    >
                                        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Link2 size={18} className="text-cyan-500"/> Social Links</h3>
                                            <button onClick={() => setShowSignatureControls(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={18}/></button>
                                        </div>
                                        <div className="p-2 overflow-y-auto max-h-[60vh] custom-scrollbar">
                                            <div className="mb-4 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Department (Optional)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="e.g. Marketing"
                                                    value={signatureDepartment}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setSignatureDepartment(val);
                                                        if (val && !signatureLinks.linkedin) {
                                                            setSignatureLinks({
                                                                linkedin: 'https://www.linkedin.com/company/salsa-technology/',
                                                                instagram: 'https://www.instagram.com/salsatechnology/',
                                                                website: 'https://salsatechnology.com',
                                                                whatsapp: ''
                                                            });
                                                            setActiveSocials(['linkedin', 'instagram', 'website']);
                                                        }
                                                    }}
                                                    className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-cyan-500/50 text-slate-700 dark:text-white transition-colors"
                                                />
                                                <p className="text-[10px] text-slate-400 mt-2">
                                                    Adds department to signature and auto-fills Salsa links.
                                                </p>
                                            </div>

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
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Include Text in Image</span>
                                                    <ThemeSwitch isDarkMode={includeTextInExport} toggle={() => setIncludeTextInExport(!includeTextInExport)} />
                                                </label>
                                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                                    Toggle ON if you want the downloaded image to include the name and role text.
                                                </p>
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
                            {/* MODO MENSAL TOGGLE (Only for Birthday) */}
                            {selectedTemplate === TemplateType.BIRTHDAY && (
                                <div className="flex gap-2">
                                    {isMonthView && (
                                        <>
                                            <button 
                                                onClick={handleBatchExport}
                                                disabled={isDownloading || filteredEmployees.length === 0}
                                                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs px-4 py-1 rounded-full shadow-xl flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Download size={14} />
                                                Exportar Lote (ZIP)
                                            </button>
                                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-bold text-white uppercase leading-none">Apenas Nomes</span>
                                                    <span className="text-[8px] text-cyan-300 uppercase tracking-tighter leading-none mt-0.5">Sem fotos</span>
                                                </div>
                                                <ThemeSwitch isDarkMode={isCompactMonthView} toggle={() => setIsCompactMonthView(!isCompactMonthView)} />
                                            </div>
                                        </>
                                    )}
                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-bold text-white uppercase leading-none">Modo Mensal</span>
                                            <span className="text-[8px] text-cyan-300 uppercase tracking-tighter leading-none mt-0.5">Ver todos do mês</span>
                                        </div>
                                        <ThemeSwitch isDarkMode={isMonthView} toggle={() => setIsMonthView(!isMonthView)} />
                                    </div>
                                </div>
                            )}

                            {/* MODO GRUPO TOGGLE (Only for Job Change) */}
                            {selectedTemplate === TemplateType.JOB_CHANGE && (
                                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-white uppercase leading-none">Modo Grupo</span>
                                        <span className="text-[8px] text-cyan-300 uppercase tracking-tighter leading-none mt-0.5">Adicionar pessoas</span>
                                    </div>
                                    <ThemeSwitch isDarkMode={isGroupMode} toggle={() => {
                                        const next = !isGroupMode;
                                        setIsGroupMode(next);
                                        if (next) {
                                            setSidebarDataView('LIST');
                                            if (selectedEmployeeIds.length === 0) {
                                                setSelectedEmployeeIds([selectedEmployeeId]);
                                            }
                                        }
                                    }} />
                                </div>
                            )}

                            {/* EXPORT FORMAT DROPDOWN */}
                            {!isPresentation && (
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowExportDropdown(!showExportDropdown)}
                                        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 h-10 shadow-xl flex items-center gap-2 text-white text-xs font-bold hover:bg-white/20 transition-all"
                                    >
                                        {exportFormat.toUpperCase()}
                                        <ChevronDown size={14} className={`transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    <AnimatePresence>
                                        {showExportDropdown && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute top-full mt-2 right-0 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 w-24"
                                            >
                                                {(['png', 'jpeg', 'pdf'] as const).map(fmt => (
                                                    <button
                                                        key={fmt}
                                                        onClick={() => {
                                                            setExportFormat(fmt);
                                                            setShowExportDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${exportFormat === fmt ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                                                    >
                                                        {fmt.toUpperCase()}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* LANGUAGE SWITCHER */}
                            {selectedTemplate !== TemplateType.HIRING && (
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
                            )}

                            {selectedTemplate !== TemplateType.HIRING && selectedTemplate !== TemplateType.BABY && (
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
                            )}
                        </div>
                    )}

                </div>
            </motion.div>
        </div>
        
        {viewMode === ViewMode.EDITOR && !isManagementMode && selectedTemplate !== TemplateType.PRESENTATION && selectedTemplate !== TemplateType.NEW_PROVIDER && selectedTemplate !== TemplateType.NEWSLETTER && selectedTemplate !== TemplateType.HIRING && selectedTemplate !== TemplateType.BABY && (
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
        
        {/* Hidden File Input for Custom Image Uploads */}
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageFileChange} 
            accept="image/*" 
            className="hidden" 
        />
      </div>
  );
}
