

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { Employee, ViewMode, TemplateType, CanvasConfig, Orientation, Language, ProviderFormat, ProviderGridConfig } from './types';
import { generateCardCanvas, applyActivationTextFit } from './services/emailTemplate';
import { generateBackground } from './services/magnificService'; 
import { supabase, fetchEmployees, upsertEmployee, deleteEmployee, fetchHiringImages, addHiringImage, deleteHiringImage, uploadHiringImageToStorage, fetchBabyImages, addBabyImage, deleteBabyImage, uploadBabyImageToStorage, fetchActivationImages, addActivationImage, deleteActivationImage, uploadActivationImageToStorage, uploadEmployeePhoto } from './services/supabase';
import { convertFileToWebP, convertDataUrlToWebP, convertUrlToWebPBlob } from './services/imageConverter';
import { EmployeeManager } from './components/EmployeeManager';
import { NetworkBackground } from './components/NetworkBackground';
import { SalsaLogo } from './components/SalsaLogo';
import { LoadingScreen } from './components/LoadingScreen';
import { EndoCanvasLogo } from './components/EndoCanvasLogo';
import * as XLSX from 'xlsx';
import { toPng, toJpeg } from 'html-to-image';
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
  ArrowRight,
  Loader2,
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
  Sparkles,
  Scan,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading2,
  Pilcrow,
  Bold,
  Italic,
  Circle,
  ImageOff,
  Minus,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd
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
    name: 'BABY',
    role: '',
    department: '',
    photoUrl: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=1000&auto=format&fit=crop',
    photoScale: 1,
    photoPosition: { x: 0, y: 0 },
    dateStr: '', 
    admissionDate: '',
    tenure: ''
  },
  {
    id: 'gaming-generic',
    name: 'VOCÊ JÁ ATIVOU SEU JOGO FAVORITO HOJE?',
    role: '',
    department: '',
    // No baked-in stock photo: the mount effect fills this in with the first
    // image from this template's own Image Library once it loads.
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

const MorphingCanvasImpl = ({ html, templateType, orientation, children }: { html: string, templateType: TemplateType, orientation: Orientation, children?: React.ReactNode }) => {
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
    // `children` is intentionally NOT a dependency here: JSX like `{renderHiringOverlay()}`
    // creates a brand-new element reference on every parent render, even when nothing
    // about it actually changed. Keying this effect on that reference meant it re-ran
    // (and called setDisplayChildren, which — unlike the string setDisplayHtml — always
    // sees a "new" value and always re-renders) on every unrelated App-wide render, e.g.
    // each time the floating format toolbar repositions during a text selection. That
    // extra render was enough to tear down and recreate the card's dangerouslySetInnerHTML
    // subtree, silently collapsing whatever text selection the user was mid-drag on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateType, orientation, html, displayTemplate, displayOrientation, phase]);

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
      className="relative group transition-transform"
      style={{ 
        width: 'fit-content',
        height: 'fit-content'
      }}
    >
      <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg opacity-0 group-hover:opacity-40 transition duration-500 blur-lg pointer-events-none"></div>
      
      <div className="relative border border-transparent group-hover:border-cyan-500/50 transition-all duration-500 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] bg-transparent"
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

// Memoized with a comparator that ignores `children`'s reference: JSX like
// `{renderHiringOverlay()}` is a brand-new element every render even when its
// actual content hasn't changed, so a plain re-render-on-any-prop-change would
// still re-execute this component (and its effects) on every unrelated
// App-wide render — e.g. each time the floating format toolbar repositions
// during a text selection — which was enough to tear down and recreate the
// card's dangerouslySetInnerHTML subtree mid-gesture, silently collapsing
// whatever the user was in the middle of selecting.
const MorphingCanvas = React.memo(MorphingCanvasImpl, (prev, next) =>
  prev.html === next.html && prev.templateType === next.templateType && prev.orientation === next.orientation
);

// Sidebar rich-text fields (Título/Parágrafo/Resumo) suffer the same class of
// bug MorphingCanvas had: the app re-renders on every 'selectionchange' event
// (to reposition the floating Bold/Italic toolbar), and without a memo
// boundary that cascades into these dangerouslySetInnerHTML divs too, which
// can wipe out an in-progress selection or edit. Isolating them behind
// React.memo, keyed only on the props that actually matter, protects them
// the same way it protected the canvas.
const RichTextField = React.memo(function RichTextField({ field, html, className, placeholder, style }: { field: string, html: string, className: string, placeholder?: string, style?: React.CSSProperties }) {
  return (
    <div
      contentEditable
      data-field={field}
      suppressContentEditableWarning
      dangerouslySetInnerHTML={{ __html: html || '' }}
      className={className}
      data-placeholder={placeholder}
      style={style}
    />
  );
}, (prev, next) => prev.field === next.field && prev.html === next.html && prev.className === next.className && prev.placeholder === next.placeholder);

const TEMPLATE_LIST = [
  { id: TemplateType.HIRING, label: 'Hiring', desc: 'Recruitment Card', image: 'https://img.mailinblue.com/2600492/images/content_library/original/69cd286e93e704e0f8774c28.png' },
  { id: TemplateType.WELCOME, label: 'Welcome Aboard', desc: 'For new hires', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1187dda7445a894d8.png' },
  { id: TemplateType.BIRTHDAY, label: 'Happy Birthday', desc: 'Classic celebration card', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1f03c89654a2a47ae.png' },
  { id: TemplateType.ANNIVERSARY, label: 'Work Anniversary', desc: 'Celebrate tenure milestones', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f0f03c89654a2a47ad.png' },
  { id: TemplateType.JOB_CHANGE, label: 'Job Change', desc: 'New Role / Promotion', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1187dda7445a894d7.png' },
  { id: TemplateType.BABY, label: 'Baby Birth', desc: 'Welcome Baby', image: 'https://img.mailinblue.com/2600492/images/content_library/original/69d5122206cc717826a7543b.jpg' },
  { id: TemplateType.NEWSLETTER, label: 'Email Signature', desc: 'Professional signature', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1bf95d83f4c272549.png' },
  { id: TemplateType.ACTIVATION, label: 'HR Feedback', desc: "Feedback and updates\nfrom HR to the team", image: 'https://img.mailinblue.com/2600492/images/content_library/original/6a3d7e9f295b587ca6a4bd4c.png' },
  { id: TemplateType.FAREWELL, label: 'See You Soon', desc: 'Farewell card', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e7625f6fc09c7fb545a11.png' },
  { id: TemplateType.NEW_PROVIDER, label: 'New Provider', desc: 'Casino Game Launch', image: 'https://img.mailinblue.com/2600492/images/content_library/original/698e73f1318a761a56ead72c.png' },
];

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Boot splash: stays up until the initial employee fetch resolves AND a
  // minimum display time has passed (so it never just flickers if the fetch
  // is fast), then the LoadingScreen animates itself away.
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinSplashElapsed(true), 2800);
    return () => clearTimeout(t);
  }, []);

  // The sidebar as a whole is user-resizable — dragging its right edge scales
  // the entire panel (text, icons, spacing, all of it) up or down together,
  // like a zoom, rather than stretching its width and reflowing the content.
  // Clamped so it can never get so small it's illegible or so large it
  // swallows the canvas.
  const SIDEBAR_MIN_SCALE = 0.8;
  const SIDEBAR_MAX_SCALE = 1.3;
  const [sidebarScale, setSidebarScale] = useState(1);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const sidebarResizeStartRef = useRef<{ startX: number, startScale: number } | null>(null);

  useEffect(() => {
    if (!isResizingSidebar) return;
    const handleMouseMove = (e: MouseEvent) => {
      const start = sidebarResizeStartRef.current;
      if (!start) return;
      // 260px of drag = a full +1.0 scale step, so the motion feels proportional.
      const next = Math.min(SIDEBAR_MAX_SCALE, Math.max(SIDEBAR_MIN_SCALE, start.startScale + (e.clientX - start.startX) / 260));
      setSidebarScale(next);
    };
    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      sidebarResizeStartRef.current = null;
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar]);

  const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    sidebarResizeStartRef.current = { startX: e.clientX, startScale: sidebarScale };
    setIsResizingSidebar(true);
  }, [sidebarScale]);

  // 3. Silent Auto Backup Synchronization to LocalStorage
  useEffect(() => {
    if (employees && employees.length > 0 && employees !== INITIAL_EMPLOYEES) {
      try {
        localStorage.setItem('end-employees', JSON.stringify(employees));
      } catch (err) {
        console.warn('Failed to save end-employees to localStorage:', err);
      }
    }
  }, [employees]);


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

  const [isConvertingAll, setIsConvertingAll] = useState(false);
  const [backgroundTheme, setBackgroundTheme] = useState('');
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);

  const convertExistingImagesToWebP = async () => {
      setIsConvertingAll(true);
      const toastId = toast.loading('Iniciando conversão em lote para WEBP...');
      
      try {
          let convertCount = 0;
          const backgroundMap = new Map<string, string>();

          // 1. Convert hiring backgrounds
          if (customHiringImages.length > 0) {
              const nextHiringImages = [...customHiringImages];
              let hiringListChanged = false;
              for (let i = 0; i < customHiringImages.length; i++) {
                  const url = customHiringImages[i];
                  if (url && url.startsWith('http') && !url.includes('.webp')) {
                      try {
                          toast.loading(`Otimizando fundo de contratação ${i + 1}/${customHiringImages.length}...`, { id: toastId });
                          const webpBlob = await convertUrlToWebPBlob(url);
                          const webpFile = new File([webpBlob], `hiring-${Date.now()}-${i}.webp`, { type: 'image/webp' });
                          const newUrl = await uploadHiringImageToStorage(webpFile);
                          await addHiringImage(newUrl);
                          try {
                              await deleteHiringImage(url);
                          } catch (delErr) {
                              console.warn("Could not delete old hiring image from storage:", delErr);
                          }
                          nextHiringImages[i] = newUrl;
                          backgroundMap.set(url, newUrl);
                          hiringListChanged = true;
                          convertCount++;
                      } catch (err) {
                          console.error(`Failed to convert hiring background ${url} to WebP:`, err);
                      }
                  }
              }
              if (hiringListChanged) {
                  setCustomHiringImages(nextHiringImages);
              }
          }

          // 2. Convert baby backgrounds
          if (customBabyImages.length > 0) {
              const nextBabyImages = [...customBabyImages];
              let babyListChanged = false;
              for (let i = 0; i < customBabyImages.length; i++) {
                  const url = customBabyImages[i];
                  if (url && url.startsWith('http') && !url.includes('.webp')) {
                      try {
                          toast.loading(`Otimizando fundo infantil ${i + 1}/${customBabyImages.length}...`, { id: toastId });
                          const webpBlob = await convertUrlToWebPBlob(url);
                          const webpFile = new File([webpBlob], `baby-${Date.now()}-${i}.webp`, { type: 'image/webp' });
                          const newUrl = await uploadBabyImageToStorage(webpFile);
                          await addBabyImage(newUrl);
                          try {
                              await deleteBabyImage(url);
                          } catch (delErr) {
                              console.warn("Could not delete old baby image from storage:", delErr);
                          }
                          nextBabyImages[i] = newUrl;
                          backgroundMap.set(url, newUrl);
                          babyListChanged = true;
                          convertCount++;
                      } catch (err) {
                          console.error(`Failed to convert baby background ${url} to WebP:`, err);
                      }
                  }
              }
              if (babyListChanged) {
                  setCustomBabyImages(nextBabyImages);
              }
          }

          // 3. Convert all employees' photoUrls and gameThumbnails
          toast.loading('Convertendo fotos dos colaboradores para WEBP...', { id: toastId });
          const updatedEmployees = await Promise.all(employees.map(async (emp) => {
              let updatedEmp = { ...emp };
              let changed = false;

              // Check if mapped to a newly converted background URL
              if (emp.photoUrl && backgroundMap.has(emp.photoUrl)) {
                  updatedEmp.photoUrl = backgroundMap.get(emp.photoUrl)!;
                  changed = true;
              } 
              // Base64 conversion
              else if (emp.photoUrl && emp.photoUrl.startsWith('data:image/') && !emp.photoUrl.startsWith('data:image/webp;')) {
                  try {
                      const webpDataUrl = await convertDataUrlToWebP(emp.photoUrl);
                      updatedEmp.photoUrl = webpDataUrl;
                      convertCount++;
                      changed = true;
                  } catch (err) {
                      console.error(`Failed to convert employee ${emp.name} photo to WebP:`, err);
                  }
              }
              // External HTTP URL conversion (not Unsplash placeholders ideally, but convert any user-uploaded files on Supabase)
              else if (emp.photoUrl && emp.photoUrl.startsWith('http') && !emp.photoUrl.includes('.webp') && !emp.photoUrl.includes('image/webp') && !emp.photoUrl.includes('unsplash.com')) {
                  try {
                      const webpBlob = await convertUrlToWebPBlob(emp.photoUrl);
                      const webpFile = new File([webpBlob], `photo-${emp.id}-${Date.now()}.webp`, { type: 'image/webp' });
                      const newUrl = await uploadEmployeePhoto(webpFile, emp.id);
                      updatedEmp.photoUrl = newUrl;
                      convertCount++;
                      changed = true;
                  } catch (err) {
                      console.error(`Failed to convert external photo to WebP for ${emp.name}:`, err);
                  }
              }
              
              // Also convert any base64/HTTP thumb under gameThumbnails
              if (emp.gameThumbnails && emp.gameThumbnails.length > 0) {
                  let thumbnailsChanged = false;
                  const newThumbs = await Promise.all(emp.gameThumbnails.map(async (thumb) => {
                      if (!thumb) return thumb;
                      
                      if (thumb.startsWith('data:image/') && !thumb.startsWith('data:image/webp;')) {
                          try {
                              const webpThumb = await convertDataUrlToWebP(thumb);
                              convertCount++;
                              thumbnailsChanged = true;
                              changed = true;
                              return webpThumb;
                          } catch (err) {
                              console.error('Failed to convert game thumbnail base64 to WebP:', err);
                              return thumb;
                          }
                      } else if (thumb.startsWith('http') && !thumb.includes('.webp') && !thumb.includes('image/webp')) {
                          try {
                              const webpBlob = await convertUrlToWebPBlob(thumb);
                              const webpDataUrl = await new Promise<string>((resolveReader) => {
                                  const reader = new FileReader();
                                  reader.onloadend = () => resolveReader(reader.result as string);
                                  reader.readAsDataURL(webpBlob);
                              });
                              convertCount++;
                              thumbnailsChanged = true;
                              changed = true;
                              return webpDataUrl;
                          } catch (err) {
                              console.error('Failed to convert game thumbnail url to WebP:', err);
                              return thumb;
                          }
                      }
                      return thumb;
                  }));
                  if (thumbnailsChanged) {
                      updatedEmp.gameThumbnails = newThumbs;
                  }
              }
              
              if (changed) {
                  await upsertEmployee(updatedEmp);
              }
              return updatedEmp;
          }));
          
          setEmployees(updatedEmployees);
          
          // 4. Convert provider logo
          let newProviderLogo = providerData.logo;
          let providerChanged = false;
          if (providerData.logo) {
              if (providerData.logo.startsWith('data:image/') && !providerData.logo.startsWith('data:image/webp;')) {
                  try {
                      newProviderLogo = await convertDataUrlToWebP(providerData.logo);
                      convertCount++;
                      providerChanged = true;
                  } catch (err) {
                      console.error('Failed to convert provider logo to WebP:', err);
                  }
              } else if (providerData.logo.startsWith('http') && !providerData.logo.includes('.webp') && !providerData.logo.includes('image/webp')) {
                  try {
                      const webpBlob = await convertUrlToWebPBlob(providerData.logo);
                      const webpDataUrl = await new Promise<string>((resolveReader) => {
                          const reader = new FileReader();
                          reader.onloadend = () => resolveReader(reader.result as string);
                          reader.readAsDataURL(webpBlob);
                      });
                      newProviderLogo = webpDataUrl;
                      convertCount++;
                      providerChanged = true;
                  } catch (err) {
                      console.error('Failed to convert external provider logo to WebP:', err);
                  }
              }
          }
          
          // 5. Convert provider thumbnails
          const newProviderThumbs = await Promise.all(providerData.thumbnails.map(async (thumb) => {
              if (!thumb) return thumb;
              if (thumb.startsWith('data:image/') && !thumb.startsWith('data:image/webp;')) {
                  try {
                      const webpThumb = await convertDataUrlToWebP(thumb);
                      convertCount++;
                      providerChanged = true;
                      return webpThumb;
                  } catch (err) {
                      console.error('Failed to convert provider thumbnail base64 to WebP:', err);
                      return thumb;
                  }
              } else if (thumb.startsWith('http') && !thumb.includes('.webp') && !thumb.includes('image/webp')) {
                  try {
                      const webpBlob = await convertUrlToWebPBlob(thumb);
                      const webpDataUrl = await new Promise<string>((resolveReader) => {
                          const reader = new FileReader();
                          reader.onloadend = () => resolveReader(reader.result as string);
                          reader.readAsDataURL(webpBlob);
                      });
                      convertCount++;
                      providerChanged = true;
                      return webpDataUrl;
                  } catch (err) {
                      console.error('Failed to convert external provider thumbnail to WebP:', err);
                      return thumb;
                  }
              }
              return thumb;
          }));
          
          if (providerChanged) {
              setProviderData(prev => ({
                  ...prev,
                  logo: newProviderLogo,
                  thumbnails: newProviderThumbs
              }));
          }
          
          if (convertCount > 0) {
              toast.success(`Conversão concluída! ${convertCount} fotos e planos de fundo otimizados para WEBP.`, { id: toastId });
          } else {
              toast.info('Todas as imagens já estão devidamente otimizadas em WEBP.', { id: toastId });
          }
      } catch (err) {
          console.error('Batch WebP conversion error:', err);
          toast.error('Erro na conversão em lote das imagens.', { id: toastId });
      } finally {
          setIsConvertingAll(false);
      }
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
      return newEmp;
  };
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(TemplateType.WELCOME);
  const [activeTab, setActiveTab] = useState<EditorTab>('TEMPLATES');
  // Welcome Aboard's text panel color scheme: light (default) or dark.
  const [welcomeVariant, setWelcomeVariant] = useState<'light' | 'dark'>('dark');

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
  const [customActivationImages, setCustomActivationImages] = useState<string[]>([]);
  
  // SIGNATURE CONTROL STATE
  const [showSignatureControls, setShowSignatureControls] = useState<boolean>(false); // Changed to false to hide on load
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);
  const [showLogoDropdown, setShowLogoDropdown] = useState<boolean>(false);
  const [signaturePopupLeft, setSignaturePopupLeft] = useState<number>(0);
  const signatureButtonRef = useRef<HTMLButtonElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const logoDropdownRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');

  const [popupPosition, setPopupPosition] = useState({ x: 20, y: 20 });
  const popupRef = useRef<HTMLDivElement>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const selectedEmployee = useMemo(() => {
    if (selectedTemplate === TemplateType.BABY) {
       return employees.find(e => e.id === 'baby-generic') || {
            id: 'baby-generic',
            name: 'BABY',
            role: '',
            department: '',
            photoUrl: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=1000&auto=format&fit=crop',
            photoScale: 1,
            photoPosition: { x: 0, y: 0 }
       } as Employee;
    }
    if (selectedTemplate === TemplateType.ACTIVATION) {
       return employees.find(e => e.id === 'gaming-generic') || {
            id: 'gaming-generic',
            name: 'VOCÊ JÁ ATIVOU SEU JOGO FAVORITO HOJE?',
            role: '',
            department: '',
            photoUrl: '',
            photoScale: 1,
            photoPosition: { x: 0, y: 0 }
       } as Employee;
    }
    if (selectedTemplate === TemplateType.HIRING) {
       return employees.find(e => e.id === 'hiring-generic') || {
            id: 'hiring-generic',
            name: 'Generic Hiring',
            role: '',
            department: '',
            photoUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1000&auto=format&fit=crop',
            photoScale: 1,
            photoPosition: { x: 0, y: 0 }
       } as Employee;
    }
    return employees.find(e => e.id === selectedEmployeeId) || employees[0];
  }, [employees, selectedEmployeeId, selectedTemplate]);

  // Define Theme based on selectedTemplate
  const theme = useMemo(() => {
    switch(selectedTemplate) {
        case TemplateType.NEW_PROVIDER: return { bg: 'bg-gradient-to-br from-[#0a261f] to-black' };
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
      // Cap at index 49 (max 50 states => valid indices 0..49). Prevents the
      // pointer drifting one past the last element once the cap is hit.
      setHistoryIndex(prev => Math.min(prev + 1, 49));
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

  // Reference for the Right Grid Area to constrain popup
  const controlsAreaRef = useRef<HTMLDivElement>(null);

  // Unified On-Mount State Initialization (Restores backups + loads Supabase)
  useEffect(() => {
    // 1. Silent Local Backup Draft Restoration
    const savedEmployees = localStorage.getItem('end-employees');
    const savedProviderData = localStorage.getItem('end-provider-data');
    const savedConfig = localStorage.getItem('end-config');

    if (savedEmployees) {
      try {
        const parsed = JSON.parse(savedEmployees);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEmployees(parsed);
          // Re-seed the undo baseline so Ctrl+Z can't revert restored data
          // back to the hardcoded INITIAL_EMPLOYEES demo seed.
          setHistory([parsed]);
          setHistoryIndex(0);
          const firstReal = parsed.find(e => e.id !== 'hiring-generic' && e.id !== 'baby-generic' && e.id !== 'gaming-generic');
          if (firstReal) {
            setSelectedEmployeeId(firstReal.id);
          } else {
            setSelectedEmployeeId(parsed[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to restore employees backup", e);
      }
    }
    if (savedProviderData) {
      try {
        setProviderData(JSON.parse(savedProviderData));
      } catch (e) {
        console.error("Failed to restore provider data backup", e);
      }
    }
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error("Failed to restore canvas config backup", e);
      }
    }

    // 2. Fetch remote databases to synchronize persistent records
    fetchEmployees().then(data => {
      if (data && data.length > 0) {
        const genericHiring = INITIAL_EMPLOYEES.find(e => e.id === 'hiring-generic');
        const genericBaby = INITIAL_EMPLOYEES.find(e => e.id === 'baby-generic');
        const genericGaming = INITIAL_EMPLOYEES.find(e => e.id === 'gaming-generic');
        
        let remoteData = data.filter(e => {
          if (e.id === 'gaming-generic' || e.id === 'baby-generic' || e.id === 'hiring-generic') {
            deleteEmployee(e.id).catch(console.error);
            return false;
          }
          return true;
        });

        setEmployees(prev => {
          const dbMap = new Map(remoteData.map(e => [e.id, e]));
          
          if (!dbMap.has('hiring-generic')) {
            dbMap.set('hiring-generic', prev.find(e => e.id === 'hiring-generic') || genericHiring!);
          }
          if (!dbMap.has('baby-generic')) {
            dbMap.set('baby-generic', prev.find(e => e.id === 'baby-generic') || genericBaby!);
          }
          if (!dbMap.has('gaming-generic')) {
            dbMap.set('gaming-generic', prev.find(e => e.id === 'gaming-generic') || genericGaming!);
          }
          
          return Array.from(dbMap.values());
        });

        // Re-seed the undo baseline to the freshly synced remote records so
        // an undo right after load can't wipe them back to the demo seed.
        const historyBaseline = (() => {
          const m = new Map(remoteData.map(e => [e.id, e]));
          if (!m.has('hiring-generic')) m.set('hiring-generic', genericHiring!);
          if (!m.has('baby-generic')) m.set('baby-generic', genericBaby!);
          if (!m.has('gaming-generic')) m.set('gaming-generic', genericGaming!);
          return Array.from(m.values());
        })();
        setHistory([historyBaseline]);
        setHistoryIndex(0);

        const firstRealEmployee = remoteData.find(e => e.id !== 'hiring-generic' && e.id !== 'baby-generic' && e.id !== 'gaming-generic');
        if (firstRealEmployee) {
          setSelectedEmployeeId(firstRealEmployee.id);
        } else if (remoteData.length > 0) {
          setSelectedEmployeeId(remoteData[0].id);
        }
      }
    }).finally(() => setIsDataLoading(false));

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

    fetchActivationImages().then(images => {
      if (images && images.length > 0) {
        setCustomActivationImages(images);
        // Default the General Disclosure card to the first library image instead
        // of leaving it blank (or a stray photo from another template), but only
        // if the user hasn't already picked one.
        setEmployees(prev => prev.map(e =>
          e.id === 'gaming-generic' && !e.photoUrl ? { ...e, photoUrl: images[0] } : e
        ));
      }
    });
  }, []);

  // Automatic state backups for Provider Data and Config
  useEffect(() => {
    if (providerData && providerData.name) {
      try {
        localStorage.setItem('end-provider-data', JSON.stringify(providerData));
      } catch (err) {
        console.warn("Failed to save end-provider-data to localStorage:", err);
      }
    }
  }, [providerData]);

  useEffect(() => {
    if (config && config !== INITIAL_CONFIG) {
      try {
        localStorage.setItem('end-config', JSON.stringify(config));
      } catch (err) {
        console.warn("Failed to save end-config to localStorage:", err);
      }
    }
  }, [config]);



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
      e.stopPropagation();
      setIsJoystickDragging(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const container = e.currentTarget.getBoundingClientRect();
      const centerX = container.left + container.width / 2;
      const centerY = container.top + container.height / 2;
      // Container is w-20 (80px), stick is w-8 (32px).
      // Max travel = 40 - 16 = 24px.
      const maxRadius = 24; 

      const updatePosition = (clientX: number, clientY: number) => {
          let dx = (clientX - centerX) / zoomLevel;
          let dy = (clientY - centerY) / zoomLevel;
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
              const targetId = selectedEmployee.id;
              setEmployees(prev => {
                  const emp = prev.find(p => p.id === targetId);
                  if (!emp) return prev;
                  
                  const currentPos = emp.photoPosition || { x: 0, y: 0 };
                  const newX = currentPos.x + (v.x * speed);
                  const newY = currentPos.y + (v.y * speed);
                  
                  return prev.map(p => p.id === targetId ? { ...p, photoPosition: { x: newX, y: newY } } : p);
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

    if (selectedTemplate === TemplateType.ACTIVATION) {
        return employees.find(e => e.id === 'gaming-generic') || {
            id: 'gaming-generic',
            name: 'VOCÊ JÁ ATIVOU SEU JOGO FAVORITO HOJE?',
            role: '',
            department: '',
            photoUrl: '',
            photoScale: 1,
            photoPosition: { x: 0, y: 0 },
            dateStr: '', 
            admissionDate: '',
            tenure: ''
        } as Employee;
    }

    if (selectedTemplate === TemplateType.BABY) {
        return employees.find(e => e.id === 'baby-generic') || {
            id: 'baby-generic',
            name: 'BABY',
            role: '',
            department: '',
            photoUrl: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=1000&auto=format&fit=crop',
            photoScale: 1,
            photoPosition: { x: 0, y: 0 },
            dateStr: '', 
            admissionDate: '',
            tenure: ''
        } as Employee;
    }

    if (selectedTemplate === TemplateType.HIRING) {
        return employees.find(e => e.id === 'hiring-generic') || {
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

  // Memoized on the (already-stable, useCallback'd) getCanvasData reference itself,
  // not just called inline — otherwise this is a fresh value every render, so
  // downstream useMemos keyed on it (previewHtml) never actually skip recomputing,
  // even for renders wholly unrelated to card content (e.g. the floating format
  // toolbar's selection-tracking state). That recompute replaces this exact DOM
  // subtree via dangerouslySetInnerHTML, which — if it lands mid-gesture — silently
  // collapses whatever text selection the user was in the middle of dragging out.
  const currentCanvasData = useMemo(() => getCanvasData(), [getCanvasData]);

  const filteredEmployees = useMemo(() => employees.filter(emp => 
     emp.id !== 'hiring-generic' && emp.id !== 'baby-generic' && emp.id !== 'gaming-generic' &&
     emp.name !== 'BABY' && emp.name !== 'VOCÊ JÁ ATIVOU SEU JOGO FAVORITO HOJE?' && emp.name !== 'Generic Hiring' && (
       emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       emp.role.toLowerCase().includes(searchQuery.toLowerCase())
     )
  ), [employees, searchQuery]);

  const previewHtml = useMemo(() => {
    if (!currentCanvasData || isBulkMode) {
        return '';
    }

    const activeLinksObj: Record<string, string> = {};
    activeSocials.forEach(key => {
        if (signatureLinks[key]) {
            activeLinksObj[key] = signatureLinks[key];
        }
    });

    return generateCardCanvas(currentCanvasData, config, selectedTemplate, orientation, language, hideIconsForExport, activeLinksObj, providerFormat, signatureDepartment, { isMonthNamesOnly: isCompactMonthView, welcomeVariant });
  }, [currentCanvasData, config, selectedTemplate, orientation, language, hideIconsForExport, isBulkMode, signatureLinks, activeSocials, providerFormat, signatureDepartment, isCompactMonthView, welcomeVariant]);

  const [isDownloading, setIsDownloading] = useState(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  // True for the brief window while the wheel is actively firing, so the CSS
  // transition is suspended and zoom tracks the cursor 1:1 (no lag behind
  // rapid wheel events); a short debounce re-enables the smooth spring
  // transition for the next discrete (button/reset) zoom change.
  const [isWheelZooming, setIsWheelZooming] = useState(false);
  const wheelZoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isSignature = selectedTemplate === TemplateType.NEWSLETTER;
  const isNewProvider = selectedTemplate === TemplateType.NEW_PROVIDER;
  
  const activeGridConfig = getCurrentProviderConfig();

  // Optimized useMemo for dimensions: Does NOT depend on currentCanvasData directly
  const canvasDataIsArray = Array.isArray(currentCanvasData);
  const canvasDataLength = canvasDataIsArray ? (currentCanvasData as Employee[]).length : 0;

  const previewDimensions = useMemo(() => {
      let previewWidth = 360;
      let previewHeight = 540;

      if (selectedTemplate === TemplateType.ACTIVATION) {
          // Matches the canvas sizes generateActivationTemplate renders for each orientation.
          if (orientation === 'portrait') {
              previewWidth = 800;
              previewHeight = 1200;
          } else {
              previewWidth = 1200;
              previewHeight = 800;
          }
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
  }, [isSignature, isNewProvider, providerFormat, canvasDataIsArray, canvasDataLength, orientation]);

  // 1. Zoom Initialization Logic
  useEffect(() => {
      if (selectedTemplate === TemplateType.NEW_PROVIDER || selectedTemplate === TemplateType.ACTIVATION) {
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

      // Derive the same initial zoom the zoom-init effect applies for this
      // template, so centering uses the correct scale on template switch
      // without re-centering (and losing pan) on every manual zoom change.
      const initialZoom = (selectedTemplate === TemplateType.NEW_PROVIDER || selectedTemplate === TemplateType.ACTIVATION) ? 0.45 : 1;
      const scaledW = width * initialZoom;
      const scaledH = height * initialZoom;
      
      // Sidebar Offset Calculation
      const sidebarOffset = 140;

      const centerX = ((clientWidth - scaledW) / 2) + sidebarOffset;
      const centerY = (clientHeight - scaledH) / 2;
      const newPos = { x: centerX, y: Math.max(0, centerY) };
      setPosition(newPos);
      positionRef.current = newPos;
    }
  }, [previewDimensions.width, previewDimensions.height, selectedTemplate, isMonthView]); // Re-center only on layout change

  // 3. Live text auto-fit for the General Disclosure (ACTIVATION) template.
  // The template HTML is injected via dangerouslySetInnerHTML, so it can't run
  // its own <script>; instead we watch the live preview DOM and re-run the
  // real-measurement fit whenever its content changes (template swap, typing,
  // orientation/alignment/mode change, etc.), guaranteeing the text always
  // fits inside the footer box no matter how long it is.
  useEffect(() => {
      if (selectedTemplate !== TemplateType.ACTIVATION) return;
      const target = canvasWrapperRef.current;
      if (!target) return;

      const runFit = () => applyActivationTextFit(document);
      runFit();

      const observer = new MutationObserver(() => {
          requestAnimationFrame(runFit);
      });
      observer.observe(target, { childList: true, subtree: true, characterData: true });
      return () => observer.disconnect();
  }, [selectedTemplate]);

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

  const handleGenerateBackground = async () => {
    if (!backgroundTheme || !backgroundTheme.trim()) {
      toast.error("Por favor, digite um tema para a imagem de fundo.");
      return;
    }
    
    setIsGeneratingBg(true);
    const toastId = toast.loading("Processando tema e gerando imagem de fundo 3:2 via Freepik Magnific AI...");
    
    try {
      const generatedUrl = await generateBackground(backgroundTheme, selectedEmployee?.activationLogo || 'technology');
      
      // Save and optimize the generated image under activation_images/
      let finalUrl = generatedUrl;
      try {
          const webpBlob = await convertUrlToWebPBlob(generatedUrl);
          const webpFile = new File([webpBlob], `activation-${Date.now()}.webp`, { type: 'image/webp' });
          finalUrl = await uploadActivationImageToStorage(webpFile);
          await addActivationImage(finalUrl);
          setCustomActivationImages(prev => [...prev, finalUrl]);
      } catch (uploadErr) {
          console.warn("[App] Failed to save generated background to Supabase storage, using direct fallback URL", uploadErr);
          const fallbackUrl = generatedUrl + '#activation_images/';
          await addActivationImage(fallbackUrl);
          setCustomActivationImages(prev => [...prev, fallbackUrl]);
          finalUrl = fallbackUrl;
      }

      // Update employee ID 'gaming-generic' which holds state for the template,
      // resetting scale/position so the new image starts centered instead of
      // inheriting whatever zoom/offset was left over from the previous one.
      updateEmployee('gaming-generic', 'photoUrl', finalUrl);
      updateEmployee('gaming-generic', 'photoScale', 1);
      updateEmployee('gaming-generic', 'photoPosition', { x: 0, y: 0 });
      toast.success("Plano de fundo 3:2 gerado e aplicado com sucesso!", { id: toastId });
    } catch (err: any) {
      console.error("[App] Background generation error:", err);
      toast.error(`Erro ao gerar plano de fundo: ${err.message || "Tente novamente."}`, { id: toastId });
    } finally {
      setIsGeneratingBg(false);
    }
  };

  const handleThemeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleGenerateBackground();
    }
  };




  // Fields that support rich formatting (bold/italic) applied directly on the
  // canvas or sidebar. `description`/`activationParagraph` are free-form
  // long-text fields, always eligible. `name`/`role`/`department` are normally
  // the shared employee identity fields, reused verbatim elsewhere (sidebar
  // list, filenames), so letting them hold inline <b>/<i> markup would leak
  // raw tags into those other surfaces — EXCEPT on Hiring/Baby/Activation,
  // which never touch a real employee: they always edit one dedicated generic
  // placeholder record (hiring-generic/baby-generic/gaming-generic) that's
  // excluded from the employee list and exports, so it's safe there too.
  const GENERIC_RICH_TEXT_TEMPLATES = [TemplateType.HIRING, TemplateType.BABY, TemplateType.ACTIVATION];
  const isRichTextField = useCallback((field: string) => {
    if (field === 'description' || field === 'activationParagraph') return true;
    if (GENERIC_RICH_TEXT_TEMPLATES.includes(selectedTemplate) && (field === 'name' || field === 'role' || field === 'department')) return true;
    return false;
  }, [selectedTemplate]);

  // Sync contenteditable changes back to state
  useEffect(() => {
    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const field = target.getAttribute('data-field');
      if (field && target.hasAttribute('contenteditable')) {
        const value = isRichTextField(field) ? target.innerHTML : target.innerText;
        // Skip the update (and the re-render + dangerouslySetInnerHTML replace it
        // would trigger) when nothing actually changed — e.g. just clicking into
        // the field and back out without editing. A no-op write here would still
        // recreate this exact DOM node from the regenerated card HTML, which is
        // disruptive if it happens to land mid-gesture (a fresh node has no
        // selection on it).
        if ((selectedEmployee as any)[field] === value) return;
        updateEmployee(selectedEmployee.id, field as keyof Employee, value);
      }
    };
    document.addEventListener('focusout', handleBlur);
    return () => document.removeEventListener('focusout', handleBlur);
  }, [selectedEmployee.id, updateEmployee, isRichTextField]);

  // Clicking the title or paragraph directly on the card (General Disclosure /
  // HR Feedback) jumps the sidebar to the Texto tab — the same one with the
  // font size/line-height/alignment controls — instead of leaving the user on
  // whatever tab they happened to be on (e.g. Images).
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (selectedTemplate !== TemplateType.ACTIVATION) return;
      const target = e.target as HTMLElement;
      const field = target.getAttribute('data-field');
      if (target.hasAttribute('contenteditable') && (field === 'name' || field === 'activationParagraph')) {
        setActiveTab('DATA');
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [selectedTemplate]);

  // Floating Bold/Italic toolbar for the rich-text fields above: shows near the
  // current selection while it's non-collapsed and inside an eligible field,
  // positioned via getBoundingClientRect (viewport coords) and rendered through
  // a portal so it isn't affected by the canvas's zoom `transform` (which would
  // otherwise turn `position: fixed` into a transform-relative position).
  const [textToolbarPos, setTextToolbarPos] = useState<{ x: number; y: number } | null>(null);
  // Which data-field the toolbar is currently floating over — tracked in state
  // (not just the ref below) so the JSX can conditionally show field-specific
  // controls (alignment, font size) alongside the always-available Bold/Italic.
  const [activeToolbarField, setActiveToolbarField] = useState<string | null>(null);
  const activeEditableRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const updateToolbar = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setTextToolbarPos(null);
        setActiveToolbarField(null);
        activeEditableRef.current = null;
        return;
      }
      const anchorEl = (sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement) as HTMLElement | null;
      const editable = anchorEl?.closest('[contenteditable]') as HTMLElement | null;
      const field = editable?.getAttribute('data-field');
      if (!editable || !field || !isRichTextField(field)) {
        setTextToolbarPos(null);
        setActiveToolbarField(null);
        activeEditableRef.current = null;
        return;
      }
      activeEditableRef.current = editable;
      setActiveToolbarField(field);
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setTextToolbarPos({ x: rect.left + rect.width / 2, y: rect.top - 44 });
    };
    document.addEventListener('selectionchange', updateToolbar);
    return () => document.removeEventListener('selectionchange', updateToolbar);
  }, [isRichTextField]);

  // Nudges the font-size scale for whichever ACTIVATION field the floating
  // toolbar is currently over — mirrors the sidebar's Título/Parágrafo
  // "Tamanho" sliders (same clamp range, same fields) so both stay consistent.
  const adjustActivationFontScale = useCallback((field: string, delta: number) => {
    const scaleField = field === 'name' ? 'activationTitleFontScale' : 'activationParagraphFontScale';
    const current = (selectedEmployee as any)[scaleField] || 1;
    const next = Math.min(1.8, Math.max(0.7, Math.round((current + delta) * 100) / 100));
    updateEmployee(selectedEmployee.id, scaleField as keyof Employee, next);
  }, [selectedEmployee, updateEmployee]);

  const applyTextFormat = useCallback((command: 'bold' | 'italic') => {
    // Falls back to whichever eligible field is currently focused — the toolbar
    // ref is only set while there's a non-collapsed text selection (for
    // positioning the floating canvas toolbar), but a persistent sidebar button
    // should also work with just a blinking cursor (toggling bold/italic for
    // whatever gets typed next, same as Word/Docs).
    let editable = activeEditableRef.current;
    if (!editable) {
      const active = document.activeElement as HTMLElement | null;
      const field = active?.getAttribute('data-field');
      if (active && active.hasAttribute('contenteditable') && field && isRichTextField(field)) {
        editable = active;
      }
    }
    if (!editable) return;
    document.execCommand(command);
    const field = editable.getAttribute('data-field');
    if (field) {
      updateEmployee(selectedEmployee.id, field as keyof Employee, editable.innerHTML);
    }
  }, [selectedEmployee.id, updateEmployee, isRichTextField]);

  // Close the export-format and logo dropdown menus when clicking outside them.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showExportDropdown && exportDropdownRef.current && !exportDropdownRef.current.contains(target)) {
        setShowExportDropdown(false);
      }
      if (showLogoDropdown && logoDropdownRef.current && !logoDropdownRef.current.contains(target)) {
        setShowLogoDropdown(false);
      }
    };
    if (showExportDropdown || showLogoDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown, showLogoDropdown]);

  const updatePhotoPosition = useCallback((axis: 'x' | 'y', value: number) => {
      setEmployeesWithHistory(prev => {
          const emp = prev.find(e => e.id === selectedEmployee.id);
          if (!emp) return prev;
          const current = emp.photoPosition || { x: 0, y: 0 };
          const newPos = { ...current, [axis]: value };
          return prev.map(e => e.id === selectedEmployee.id ? { ...e, photoPosition: newPos } : e);
      });
  }, [selectedEmployee.id, setEmployeesWithHistory]);

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

  // Zoom anchored at a point (in container-local screen coords) so that point
  // stays visually fixed as the scale changes — the standard Figma/Miro feel,
  // instead of the old top-left-anchored zoom that made the canvas drift.
  const zoomAtPoint = useCallback((nextZoomRaw: number, anchorX: number, anchorY: number) => {
    setZoomLevel(prevZoom => {
      const nextZoom = Math.round(Math.max(0.1, Math.min(3, nextZoomRaw)) * 100) / 100;
      setPosition(prevPos => {
        const contentX = (anchorX - prevPos.x) / prevZoom;
        const contentY = (anchorY - prevPos.y) / prevZoom;
        const newPos = { x: anchorX - contentX * nextZoom, y: anchorY - contentY * nextZoom };
        positionRef.current = newPos;
        return newPos;
      });
      return nextZoom;
    });
  }, []);

  const handleZoom = useCallback((delta: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const anchorX = rect ? rect.width / 2 : 0;
    const anchorY = rect ? rect.height / 2 : 0;
    zoomAtPoint(zoomLevel + delta, anchorX, anchorY);
  }, [zoomLevel, zoomAtPoint]);

  const handleWheel = (e: React.WheelEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const anchorX = rect ? e.clientX - rect.left : 0;
    const anchorY = rect ? e.clientY - rect.top : 0;
    // Finer step than the button clicks for a smoother, trackpad-like feel.
    const step = 0.06;
    setIsWheelZooming(true);
    if (wheelZoomTimeoutRef.current) clearTimeout(wheelZoomTimeoutRef.current);
    wheelZoomTimeoutRef.current = setTimeout(() => setIsWheelZooming(false), 200);
    zoomAtPoint(zoomLevel + (e.deltaY < 0 ? step : -step), anchorX, anchorY);
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

  // Bridge so the raw HTML rendered via dangerouslySetInnerHTML (the card itself)
  // can trigger the same upload flow as the sidebar controls — its hover-to-upload
  // photo slots call this directly via an inline onclick (see getUploadOverlayHtml
  // in emailTemplate.ts), since it isn't part of the React tree and can't take a
  // normal onClick prop.
  useEffect(() => {
      (window as any).__triggerImageUpload = (id: string, field: string, index?: number) => {
          handleImageUploadTrigger(id, field, index !== undefined ? Number(index) : undefined);
      };
      return () => { delete (window as any).__triggerImageUpload; };
  });

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
      let file = e.target.files?.[0];
      if (!file || !uploadTarget) return;
      
      const conversionToastId = toast.loading('Processando e convertendo imagem para WEBP...');
      try {
          const convertedFile = await convertFileToWebP(file);
          file = convertedFile;
          toast.success('Imagem convertida para WEBP com sucesso!', { id: conversionToastId });
      } catch (err) {
          console.error('Falha na conversão para WEBP:', err);
          toast.error('Erro ao converter para WEBP. Usando formato original.', { id: conversionToastId });
      }
      
      if (selectedTemplate === TemplateType.HIRING && uploadTarget.field === 'photoUrl') {
          try {
              // Upload actual file to Supabase Storage
              const publicUrl = await uploadHiringImageToStorage(file);
              
              // Update state and DB with the public URL, resetting scale and position for full-bleed
              updateEmployee(uploadTarget.id, 'photoUrl', publicUrl);
              updateEmployee(uploadTarget.id, 'photoScale', 1);
              updateEmployee(uploadTarget.id, 'photoPosition', { x: 0, y: 0 });
              setCustomHiringImages(prev => [...prev, publicUrl]);
              await addHiringImage(publicUrl);
          } catch (err) {
              console.error('Failed to upload hiring image:', err);
              toast.error('Falha ao enviar a imagem convertida para o servidor.');
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          setUploadTarget(null);
          return;
      } else if (selectedTemplate === TemplateType.BABY && uploadTarget.field === 'photoUrl') {
          try {
              // Upload actual file to Supabase Storage
              const publicUrl = await uploadBabyImageToStorage(file);
              
              // Update state and DB with the public URL, resetting scale and position for full-bleed
              updateEmployee(uploadTarget.id, 'photoUrl', publicUrl);
              updateEmployee(uploadTarget.id, 'photoScale', 1);
              updateEmployee(uploadTarget.id, 'photoPosition', { x: 0, y: 0 });
              setCustomBabyImages(prev => [...prev, publicUrl]);
              await addBabyImage(publicUrl);
          } catch (err) {
              console.error('Failed to upload baby image:', err);
              toast.error('Falha ao enviar a imagem convertida para o servidor.');
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          setUploadTarget(null);
          return;
      } else if (selectedTemplate === TemplateType.ACTIVATION && uploadTarget.field === 'photoUrl') {
          try {
              // Upload actual file to Supabase Storage
              const publicUrl = await uploadActivationImageToStorage(file);
              
              // Update state and DB with the public URL, resetting scale and position for full-bleed
              updateEmployee(uploadTarget.id, 'photoUrl', publicUrl);
              updateEmployee(uploadTarget.id, 'photoScale', 1);
              updateEmployee(uploadTarget.id, 'photoPosition', { x: 0, y: 0 });
              setCustomActivationImages(prev => [...prev, publicUrl]);
              await addActivationImage(publicUrl);
          } catch (err) {
              console.error('Failed to upload activation image:', err);
              toast.error('Falha ao enviar a imagem convertida para o servidor.');
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
                  if (uploadTarget.field === 'photoUrl') {
                      // Removed face auto-centering
                  }
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
        
        // Only remove rounded corners for the main container to prevent clipping issues, leave inner elements intact
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
        const allElements = Array.from(clone.querySelectorAll('*')) as HTMLElement[];
        allElements.push(clone);
        const bgPromises = allElements.map(async (el) => {
             const style = el.getAttribute('style') || '';
             
             // Workaround for backdrop-filter bugs in html-to-image (blur bleeding out of radius)
             if (style.includes('backdrop-filter') || style.includes('-webkit-backdrop-filter')) {
                 el.style.backdropFilter = 'none';
                 el.style.webkitBackdropFilter = 'none';
                 if (el.style.background && el.style.background.includes('rgba')) {
                     el.style.background = el.style.background.replace(/rgba\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/, (match, r, g, b, a) => {
                         let op = parseFloat(a);
                         return `rgba(${r}, ${g}, ${b}, ${Math.min(op + 0.35, 0.95)})`;
                     });
                 }
             }

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
                            el.style.backgroundImage = `url('${newDataUrl}')`;
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
    // Export the SAME set shown in the month preview (filtered by the selected
    // month), not the search-only `filteredEmployees`. Otherwise the ZIP named
    // e.g. "Aniversariantes_MAIO" would contain every employee.
    const monthEmployees = Array.isArray(currentCanvasData) ? currentCanvasData : [];
    if (!isMonthView || monthEmployees.length === 0) return;

    setIsDownloading(true);
    const preflightToastId = toast.loading("Executando pré-teste de CORS e validando imagens para exportação...");
    
    try {
        const checkImageCors = async (url: string): Promise<boolean> => {
          if (!url) return true;
          if (url.startsWith('data:')) return true;
          if (!url.startsWith('http')) return true;
          try {
            const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
            return response.ok;
          } catch (err) {
            return false;
          }
        };

        // Preflight CORS validation & silent self-healing routing
        const sanitizedEmployees = await Promise.all(monthEmployees.map(async (emp) => {
            if (emp.photoUrl) {
                const isCorsPermissive = await checkImageCors(emp.photoUrl);
                if (!isCorsPermissive) {
                    console.warn(`Compatibilidade: Roteando foto de ${emp.name} via proxy seguro devido a CORS restritivo.`);
                    return {
                        ...emp,
                        photoUrl: `https://images.weserv.nl/?url=${encodeURIComponent(emp.photoUrl)}`
                    };
                }
            }
            return emp;
        }));

        toast.success("Teste de compatibilidade de imagens concluído com sucesso!", { id: preflightToastId });
        toast.info(`Iniciando exportação em lote de ${sanitizedEmployees.length} cartões...`);

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

        for (let i = 0; i < sanitizedEmployees.length; i++) {
            const emp = sanitizedEmployees[i];
            const html = generateCardCanvas(emp, config, selectedTemplate, orientation, language, hideIconsForExport, {}, providerFormat, signatureDepartment);
            
            const wrapper = document.createElement('div');
            wrapper.innerHTML = html;
            const node = wrapper.firstElementChild as HTMLElement;
            if (!node) continue;
            
            // Only remove rounded corners for the main container to prevent clipping issues, leave inner elements intact
            node.style.borderRadius = '0';
            
            // Workaround for backdrop-filter bugs in html-to-image
            const allNodes = Array.from(node.querySelectorAll('*')) as HTMLElement[];
            allNodes.push(node);
            allNodes.forEach(el => {
                const style = el.getAttribute('style') || '';
                if (style.includes('backdrop-filter') || style.includes('-webkit-backdrop-filter')) {
                    el.style.backdropFilter = 'none';
                    el.style.webkitBackdropFilter = 'none';
                    if (el.style.background && el.style.background.includes('rgba')) {
                         el.style.background = el.style.background.replace(/rgba\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/, (match, r, g, b, a) => {
                             let op = parseFloat(a);
                             return `rgba(${r}, ${g}, ${b}, ${Math.min(op + 0.35, 0.95)})`;
                         });
                    }
                }
            });
            
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
            
            toast.info(`Gerando ${i + 1}/${sanitizedEmployees.length}...`);
        }
        
        document.body.removeChild(container);
        
        const content = await zip.generateAsync({type: "blob"});
        const blobUrl = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Aniversariantes_${MONTHS[selectedMonthIndex]}.zip`;
        link.click();
        // Release the object URL to avoid leaking a blob on every export.
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

        toast.success("Exportação em lote concluída!");
    } catch (err) {
        console.error("Batch export failed:", err);
        toast.error("Falha na exportação em lote.");
    } finally {
        setIsDownloading(false);
    }
  };

  const handleDownload = async () => {
     handleDownloadImage();
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
    
    employees
      .filter(e => 
        e.id !== 'hiring-generic' && 
        e.id !== 'baby-generic' && 
        e.id !== 'gaming-generic' && 
        e.name !== 'BABY' && 
        e.name !== 'VOCÊ JÁ ATIVOU SEU JOGO FAVORITO HOJE?' && 
        e.name !== 'Generic Hiring'
      )
      .forEach(emp => {
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
        <Toaster 
          position="top-center" 
          theme="dark" 
          toastOptions={{
              style: {
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '9999px',
                  padding: '10px 20px',
                  color: '#e2e8f0',
                  fontFamily: '"Orkney", "Inter", sans-serif',
                  boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '12.5px',
                  fontWeight: '500',
                  width: 'max-content',
                  minWidth: 'auto',
              }
          }}
        />
        <div className="flex items-center h-full gap-6">
           <div className="">
              <SalsaLogo variant="light" className="h-11 w-32" />
           </div>
           <div className="h-10 w-px bg-white/40 rounded-full shadow-sm"></div>
           
           <div className="pt-1">
              <EndoCanvasLogo className="h-8 w-auto fill-white overflow-visible" />
          </div>
        </div>
      </header>
  ), [isSignature, hasCopied, handleCopyHtml, handleCopyAllHtml, isNewProvider, employees.length]);

  // Redesigned Floating Sidebar
  const SidebarContent = useMemo(() => (
    <motion.div
      initial={false}
      animate={{
        x: isSidebarOpen ? 0 : -520,
        scale: sidebarScale,
      }}
      transition={isResizingSidebar ? { duration: 0 } : {
        type: "spring",
        stiffness: 240,
        damping: 25,
        mass: 0.8
      }}
      style={{ width: 340, transformOrigin: 'top left' }}
      className="absolute top-24 left-6 bottom-8 rounded-[2.5rem] bg-[#121212] border border-white/10 z-30 shadow-2xl flex flex-col overflow-visible"
    >
       {/* Resize handle: the entire right edge (full height) is grabbable —
           drag to scale the whole panel up or down, clamped between
           SIDEBAR_MIN_SCALE and SIDEBAR_MAX_SCALE. Purely functional: no
           visible element, just the cursor changing on hover. */}
       <div
          onMouseDown={handleSidebarResizeStart}
          className="absolute top-0 -right-2 w-4 h-full cursor-ew-resize z-40"
          title="Arraste para redimensionar"
       />

       {/* Inner wrapper to enclose content neatly inside the custom-shaped card */}
       <div className="w-full h-full flex flex-col overflow-hidden rounded-[2.5rem] bg-[#121212]">
       
       {/* 1. Header Tabs */}
       <div className="p-4 shrink-0">
          <div className="flex bg-white/10 rounded-full p-1 h-14 relative">
             {selectedTemplate !== TemplateType.HIRING && selectedTemplate !== TemplateType.BABY && (
                 <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => {
                        setActiveTab('DATA');
                        if (selectedTemplate === TemplateType.HIRING || selectedTemplate === TemplateType.BABY || selectedTemplate === TemplateType.ACTIVATION) {
                            setSidebarDataView('DETAIL');
                        } else {
                            setSidebarDataView('LIST');
                        }
                    }}
                    className={`relative flex-1 flex items-center justify-center rounded-full transition-colors duration-300 ${activeTab === 'DATA' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                    title={selectedTemplate === TemplateType.ACTIVATION ? 'Texto' : 'Employee Data'}
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
                      {selectedTemplate === TemplateType.NEW_PROVIDER ? <Settings size={22} /> : selectedTemplate === TemplateType.ACTIVATION ? <Type size={22} /> : <Users size={22} />}
                    </span>
                 </motion.button>
             )}
             <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
             </motion.button>
             <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
             </motion.button>
             {(selectedTemplate === TemplateType.HIRING || selectedTemplate === TemplateType.BABY || selectedTemplate === TemplateType.ACTIVATION) && (
               <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
               </motion.button>
             )}
          </div>
       </div>

       {/* 2. Middle Content (Scrollable) */}
       <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar overflow-x-hidden">
          <AnimatePresence mode="wait">
             <motion.div
                 key={activeTab}
                 initial={{ opacity: 0, x: 16, scale: 0.99 }}
                 animate={{ opacity: 1, x: 0, scale: 1 }}
                 exit={{ opacity: 0, x: -16, scale: 0.99 }}
                 transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                 className="h-full"
             >
                {activeTab === 'IMAGES' && (selectedTemplate === TemplateType.HIRING || selectedTemplate === TemplateType.BABY || selectedTemplate === TemplateType.ACTIVATION) && (
             <div className="animate-in slide-in-from-right-4 duration-300 pt-2">
                <h3 className="text-sm font-bold text-cyan-300 uppercase mb-4 flex items-center gap-2"><ImageIcon size={16}/> Image Library</h3>
                <div className="grid grid-cols-2 gap-3">
                    {(selectedTemplate === TemplateType.HIRING 
                        ? customHiringImages 
                        : selectedTemplate === TemplateType.BABY 
                          ? customBabyImages 
                          : customActivationImages
                    ).map((img, i) => (
                        <div key={`custom-${i}`} className="relative group">
                            <button 
                                onClick={() => {
                                    updateEmployee(selectedEmployee.id, 'photoUrl', img);
                                    updateEmployee(selectedEmployee.id, 'photoScale', 1);
                                    updateEmployee(selectedEmployee.id, 'photoPosition', { x: 0, y: 0 });
                                }}
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
                                    } else if (selectedTemplate === TemplateType.BABY) {
                                        setCustomBabyImages(prev => {
                                            const newImages = prev.filter((_, idx) => idx !== i);
                                            if (selectedEmployee.photoUrl === img) {
                                                updateEmployee(selectedEmployee.id, 'photoUrl', newImages[0] || '');
                                            }
                                            return newImages;
                                        });
                                        deleteBabyImage(img).catch(console.error);
                                    } else {
                                        setCustomActivationImages(prev => {
                                            const newImages = prev.filter((_, idx) => idx !== i);
                                            if (selectedEmployee.photoUrl === img) {
                                                updateEmployee(selectedEmployee.id, 'photoUrl', newImages[0] || '');
                                            }
                                            return newImages;
                                        });
                                        deleteActivationImage(img).catch(console.error);
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
                   (sidebarDataView === 'LIST' && selectedTemplate !== TemplateType.HIRING && selectedTemplate !== TemplateType.BABY && selectedTemplate !== TemplateType.ACTIVATION) ? (
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
                                        }
                                    }}
                                    onDoubleClick={() => {
                                        if (!(isGroupMode && selectedTemplate === TemplateType.JOB_CHANGE)) {
                                            setSelectedEmployeeId(emp.id);
                                            setSidebarDataView('DETAIL');
                                        }
                                    }}
                                    className="aspect-square relative cursor-pointer"
                                >
                                    {/* Rounding + clipping live on this inner, non-transformed div rather than on the
                                        motion.div itself — Motion's layout/scale animation applies a transform to
                                        whatever element carries it, and combining that transform with border-radius +
                                        overflow-hidden on the SAME element makes the browser render the rounded
                                        corners unevenly (a notched/cut look) during and after the animation. */}
                                    <div className={`absolute inset-0 overflow-hidden rounded-2xl border ${
                                        (isGroupMode && selectedTemplate === TemplateType.JOB_CHANGE)
                                            ? (selectedEmployeeIds.includes(emp.id) ? 'border-cyan-400 ring-2 ring-cyan-400/20' : 'border-white/10 opacity-70 hover:opacity-100')
                                            : (selectedEmployeeId === emp.id ? 'border-cyan-400 ring-2 ring-cyan-400/20' : 'border-white/10 opacity-70 hover:opacity-100')
                                    }`}>
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
                                </motion.div>
                            ))}
                        </div>
                     </>
                   ) : (
                      // Detail View 
                      <div>
                          {selectedTemplate === TemplateType.ACTIVATION ? (
                              <div className="space-y-4">
                                  <div>
                                      <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Formato do Texto</div>
                                      <div className="grid grid-cols-3 gap-2">
                                          {([
                                              { id: 'title', label: 'Título', icon: Heading2 },
                                              { id: 'paragraph', label: 'Parágrafo', icon: Pilcrow },
                                              { id: 'title_paragraph', label: 'Título + Parágrafo', icon: Layers },
                                          ] as { id: 'title' | 'paragraph' | 'title_paragraph', label: string, icon: any }[]).map(opt => {
                                              const isActive = (selectedEmployee.activationTextMode || 'title') === opt.id;
                                              const Icon = opt.icon;
                                              return (
                                                  <button
                                                      key={opt.id}
                                                      onClick={() => updateEmployee(selectedEmployee.id, 'activationTextMode', opt.id)}
                                                      className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-2xl border text-[10px] font-bold uppercase tracking-wide transition-colors ${isActive ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                                                  >
                                                      <Icon size={16} />
                                                      <span className="text-center leading-tight">{opt.label}</span>
                                                  </button>
                                              );
                                          })}
                                      </div>
                                  </div>

                                  <div>
                                      <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Alinhamento do Texto</div>
                                      <div className="grid grid-cols-3 gap-2">
                                          {([
                                              { id: 'left', icon: AlignLeft, label: 'Esquerda' },
                                              { id: 'center', icon: AlignCenter, label: 'Centro' },
                                              { id: 'right', icon: AlignRight, label: 'Direita' },
                                          ] as { id: 'left' | 'center' | 'right', icon: any, label: string }[]).map(opt => {
                                              const isActive = (selectedEmployee.activationTextAlign || 'center') === opt.id;
                                              const Icon = opt.icon;
                                              return (
                                                  <button
                                                      key={opt.id}
                                                      onClick={() => updateEmployee(selectedEmployee.id, 'activationTextAlign', opt.id)}
                                                      title={opt.label}
                                                      className={`flex items-center justify-center py-3 rounded-2xl border transition-colors ${isActive ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                                                  >
                                                      <Icon size={16} />
                                                  </button>
                                              );
                                          })}
                                      </div>
                                  </div>

                                  <div>
                                      <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Imagem</div>
                                      <div className="grid grid-cols-3 gap-2">
                                          {([
                                              { id: 'background', label: 'Fundo', icon: ImageIcon },
                                              { id: 'circle', label: 'Moldura', icon: Circle },
                                              { id: 'none', label: 'Sem Imagem', icon: ImageOff },
                                          ] as { id: 'background' | 'circle' | 'none', label: string, icon: any }[]).map(opt => {
                                              const isActive = (selectedEmployee.activationImageMode || 'background') === opt.id;
                                              const Icon = opt.icon;
                                              return (
                                                  <button
                                                      key={opt.id}
                                                      onClick={() => updateEmployee(selectedEmployee.id, 'activationImageMode', opt.id)}
                                                      className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-2xl border text-[10px] font-bold uppercase tracking-wide transition-colors ${isActive ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                                                  >
                                                      <Icon size={16} />
                                                      <span className="text-center leading-tight">{opt.label}</span>
                                                  </button>
                                              );
                                          })}
                                      </div>
                                      {(selectedEmployee.activationImageMode || 'background') === 'circle' && (
                                          <div className="mt-3 px-1 space-y-3">
                                              <div>
                                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                                      <span>Tamanho da Moldura</span>
                                                      <span>{selectedEmployee.activationCircleSize || 140}px</span>
                                                  </div>
                                                  {/* Bigger paragraph? Shrink the circle to make room — the auto-fit
                                                      text safety net already accounts for whatever height this ends
                                                      up rendering at (see applyActivationTextFit), so it never overlaps. */}
                                                  <input
                                                      type="range" min="60" max="280" step="5"
                                                      value={selectedEmployee.activationCircleSize || 140}
                                                      onChange={(e) => updateEmployee(selectedEmployee.id, 'activationCircleSize', parseInt(e.target.value))}
                                                      className="styled-slider w-full"
                                                  />
                                              </div>
                                              <div>
                                                  <div className="text-[10px] text-slate-500 mb-1">Posição da Moldura</div>
                                                  <div className="grid grid-cols-3 gap-2">
                                                      {([
                                                          { id: 'left', icon: AlignHorizontalJustifyStart, label: 'Esquerda' },
                                                          { id: 'center', icon: AlignHorizontalJustifyCenter, label: 'Centro' },
                                                          { id: 'right', icon: AlignHorizontalJustifyEnd, label: 'Direita' },
                                                      ] as { id: 'left' | 'center' | 'right', icon: any, label: string }[]).map(opt => {
                                                          const isActive = (selectedEmployee.activationCirclePosition || 'center') === opt.id;
                                                          const Icon = opt.icon;
                                                          return (
                                                              <button
                                                                  key={opt.id}
                                                                  onClick={() => updateEmployee(selectedEmployee.id, 'activationCirclePosition', opt.id)}
                                                                  title={opt.label}
                                                                  className={`flex items-center justify-center py-2.5 rounded-2xl border transition-colors ${isActive ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                                                              >
                                                                  <Icon size={16} />
                                                              </button>
                                                          );
                                                      })}
                                                  </div>
                                              </div>
                                          </div>
                                      )}
                                  </div>

                                  <div>
                                      <div className="flex items-center justify-between mb-1">
                                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cor da Fonte</div>
                                          {selectedEmployee.activationFontColor && (
                                              <button onClick={() => updateEmployee(selectedEmployee.id, 'activationFontColor', '')} className="text-[10px] text-slate-500 hover:text-white transition-colors">Redefinir (degradê)</button>
                                          )}
                                      </div>
                                      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border bg-white/5 border-white/10 focus-within:border-cyan-500/50 transition-colors">
                                          <input
                                              type="color"
                                              value={selectedEmployee.activationFontColor || '#ffffff'}
                                              onChange={(e) => updateEmployee(selectedEmployee.id, 'activationFontColor', e.target.value)}
                                              className="w-8 h-8 rounded-lg border border-white/10 bg-transparent cursor-pointer shrink-0"
                                          />
                                          <span className="text-xs text-slate-400">{selectedEmployee.activationFontColor ? selectedEmployee.activationFontColor.toUpperCase() : 'Padrão (título em degradê, parágrafo branco)'}</span>
                                      </div>
                                  </div>

                                  {(selectedEmployee.activationTextMode || 'title') !== 'paragraph' && (
                                      <div>
                                          <div className="flex items-center justify-between mb-1">
                                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Título</div>
                                              <div className="flex items-center gap-1">
                                                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyTextFormat('bold')} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Negrito"><Bold size={12} /></button>
                                                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyTextFormat('italic')} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Itálico"><Italic size={12} /></button>
                                              </div>
                                          </div>
                                          <div className="flex items-start px-4 py-3 rounded-2xl border bg-white/5 border-white/10 focus-within:border-cyan-500/50 transition-colors">
                                              <Heading2 size={16} className="opacity-40 mr-3 mt-1 text-white shrink-0" />
                                              <RichTextField
                                                  field="name"
                                                  html={selectedEmployee.name}
                                                  className="bg-transparent outline-none w-full text-sm font-medium text-white uppercase empty:before:content-[attr(data-placeholder)] empty:before:text-white/30 empty:before:normal-case"
                                                  placeholder="Título da ativação"
                                              />
                                          </div>
                                          {/* Independent size/spacing for the title — raises the ceiling the
                                              auto-fit script (applyActivationTextFit) shrinks down from if needed,
                                              so the layout always stays intact regardless of these values. */}
                                          <div className="grid grid-cols-2 gap-3 mt-2 px-1">
                                              <div>
                                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                                      <span>Tamanho</span>
                                                      <span>{Math.round((selectedEmployee.activationTitleFontScale || 1) * 100)}%</span>
                                                  </div>
                                                  <input
                                                      type="range" min="0.7" max="1.8" step="0.05"
                                                      value={selectedEmployee.activationTitleFontScale || 1}
                                                      onChange={(e) => updateEmployee(selectedEmployee.id, 'activationTitleFontScale', parseFloat(e.target.value))}
                                                      className="styled-slider w-full"
                                                  />
                                              </div>
                                              <div>
                                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                                      <span>Espaçamento</span>
                                                      <span>{(selectedEmployee.activationTitleLineHeight || 1.15).toFixed(2)}</span>
                                                  </div>
                                                  <input
                                                      type="range" min="0.9" max="1.6" step="0.05"
                                                      value={selectedEmployee.activationTitleLineHeight || 1.15}
                                                      onChange={(e) => updateEmployee(selectedEmployee.id, 'activationTitleLineHeight', parseFloat(e.target.value))}
                                                      className="styled-slider w-full"
                                                  />
                                              </div>
                                          </div>
                                      </div>
                                  )}

                                  {(selectedEmployee.activationTextMode === 'paragraph' || selectedEmployee.activationTextMode === 'title_paragraph') && (
                                      <div>
                                          <div className="flex items-center justify-between mb-1">
                                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parágrafo</div>
                                              <div className="flex items-center gap-1">
                                                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyTextFormat('bold')} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Negrito"><Bold size={12} /></button>
                                                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyTextFormat('italic')} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Itálico"><Italic size={12} /></button>
                                              </div>
                                          </div>
                                          <div className="flex items-start px-4 py-3 rounded-2xl border bg-white/5 border-white/10 focus-within:border-cyan-500/50 transition-colors">
                                              <Pilcrow size={16} className="opacity-40 mr-3 mt-1 text-white shrink-0" />
                                              <RichTextField
                                                  field="activationParagraph"
                                                  html={selectedEmployee.activationParagraph || ''}
                                                  className="bg-transparent outline-none w-full text-sm font-medium text-white empty:before:content-[attr(data-placeholder)] empty:before:text-white/30"
                                                  placeholder="Texto do parágrafo"
                                              />
                                          </div>
                                          {/* Independent size/spacing for the paragraph — same auto-fit safety
                                              net as the title above applies here too. */}
                                          <div className="grid grid-cols-2 gap-3 mt-2 px-1">
                                              <div>
                                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                                      <span>Tamanho</span>
                                                      <span>{Math.round((selectedEmployee.activationParagraphFontScale || 1) * 100)}%</span>
                                                  </div>
                                                  <input
                                                      type="range" min="0.7" max="1.8" step="0.05"
                                                      value={selectedEmployee.activationParagraphFontScale || 1}
                                                      onChange={(e) => updateEmployee(selectedEmployee.id, 'activationParagraphFontScale', parseFloat(e.target.value))}
                                                      className="styled-slider w-full"
                                                  />
                                              </div>
                                              <div>
                                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                                      <span>Espaçamento</span>
                                                      <span>{(selectedEmployee.activationParagraphLineHeight || 1.3).toFixed(2)}</span>
                                                  </div>
                                                  <input
                                                      type="range" min="1.0" max="2.0" step="0.05"
                                                      value={selectedEmployee.activationParagraphLineHeight || 1.3}
                                                      onChange={(e) => updateEmployee(selectedEmployee.id, 'activationParagraphLineHeight', parseFloat(e.target.value))}
                                                      className="styled-slider w-full"
                                                  />
                                              </div>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          ) : (
                              <>
                                  {selectedTemplate !== TemplateType.HIRING && selectedTemplate !== TemplateType.BABY && (
                                      <button onClick={() => setSidebarDataView('LIST')} className="flex items-center gap-2 text-xs font-bold mb-5 text-slate-400 hover:text-white bg-white/5 px-4 py-2 rounded-full w-fit"><ArrowLeft size={14}/> Back to List</button>
                                  )}

                                  {selectedTemplate !== TemplateType.HIRING && selectedTemplate !== TemplateType.BABY && (
                                      <>
                                          {/* Profile header: photo preview + name/role, so the person is recognizable at a glance instead of buried in a flat field list. */}
                                          <div className="flex flex-col items-center text-center mb-6">
                                              <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/10 shadow-lg bg-white/5 mb-4 shrink-0">
                                                  {selectedEmployee.photoUrl ? (
                                                      <img src={selectedEmployee.photoUrl} className="w-full h-full object-cover" />
                                                  ) : (
                                                      <div className="w-full h-full flex items-center justify-center text-slate-600"><User size={32} /></div>
                                                  )}
                                              </div>
                                              <input
                                                  value={selectedEmployee.name}
                                                  onChange={(e) => updateEmployee(selectedEmployee.id, 'name', e.target.value)}
                                                  className="bg-transparent outline-none w-full text-center text-lg font-bold text-white placeholder:text-white/30"
                                                  placeholder="Full Name"
                                              />
                                              <input
                                                  value={selectedEmployee.role}
                                                  onChange={(e) => updateEmployee(selectedEmployee.id, 'role', e.target.value)}
                                                  className="bg-transparent outline-none w-full text-center text-sm text-slate-400 placeholder:text-white/30 mt-0.5"
                                                  placeholder="Role"
                                              />
                                          </div>
                                          <div className="h-px bg-white/10 mb-5" />
                                      </>
                                  )}

                                  <div className="space-y-4">
                                      {selectedTemplate !== TemplateType.HIRING && selectedTemplate !== TemplateType.BABY && (
                                          <>
                                              <div>
                                                  <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Aniversário</div>
                                                  <div className="flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10 focus-within:border-cyan-500/50 transition-colors"><Calendar size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.dateStr} onChange={(e) => updateEmployee(selectedEmployee.id, 'dateStr', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Birthday (DD/MM)" /></div>
                                              </div>

                                              <div>
                                                  <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Data de Admissão</div>
                                                  <div className="flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10 focus-within:border-cyan-500/50 transition-colors"><Clock size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.admissionDate || ''} onChange={(e) => updateEmployee(selectedEmployee.id, 'admissionDate', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Admission Date" /></div>
                                              </div>

                                              <div>
                                                  <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Cargo Anterior</div>
                                                  <div className="flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10 focus-within:border-cyan-500/50 transition-colors"><TrendingUp size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.previousRole || ''} onChange={(e) => updateEmployee(selectedEmployee.id, 'previousRole', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Previous Role (Job Change)" /></div>
                                              </div>
                                          </>
                                      )}

                                      <div>
                                          <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">URL da Foto</div>
                                          <div className="flex items-center px-4 py-3 rounded-2xl border bg-white/5 border-white/10 focus-within:border-cyan-500/50 transition-colors"><ImageIcon size={16} className="opacity-40 mr-3 text-white" /><input value={selectedEmployee.photoUrl} onChange={(e) => updateEmployee(selectedEmployee.id, 'photoUrl', e.target.value)} className="bg-transparent outline-none w-full text-sm font-medium text-white placeholder:text-white/30" placeholder="Photo URL" /></div>
                                      </div>

                                      {(selectedTemplate === TemplateType.WELCOME || selectedTemplate === TemplateType.BABY) && (
                                          <div>
                                              <div className="flex items-center justify-between mb-1">
                                                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resumo / Descrição</div>
                                                  <div className="flex items-center gap-1">
                                                      <button
                                                          type="button"
                                                          onMouseDown={(e) => e.preventDefault()}
                                                          onClick={() => applyTextFormat('bold')}
                                                          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                                          title="Negrito"
                                                      >
                                                          <Bold size={12} />
                                                      </button>
                                                      <button
                                                          type="button"
                                                          onMouseDown={(e) => e.preventDefault()}
                                                          onClick={() => applyTextFormat('italic')}
                                                          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                                          title="Itálico"
                                                      >
                                                          <Italic size={12} />
                                                      </button>
                                                  </div>
                                              </div>
                                              <div className="flex items-start px-4 py-3 rounded-2xl border bg-white/5 border-white/10 focus-within:border-cyan-500/50 transition-colors">
                                                  <Pilcrow size={16} className="opacity-40 mr-3 mt-1 text-white shrink-0" />
                                                  {/* contentEditable (not a plain textarea) so Negrito/Itálico can actually
                                                      apply — it shares data-field="description" with the canvas version,
                                                      so the same selection/format/sync logic (isRichTextField, blur-sync)
                                                      just works here too, no separate wiring needed. */}
                                                  <RichTextField
                                                      field="description"
                                                      html={selectedEmployee.description || ''}
                                                      className="bg-transparent outline-none w-full text-sm font-medium text-white empty:before:content-[attr(data-placeholder)] empty:before:text-white/30"
                                                      placeholder="Escreva um resumo sobre a pessoa..."
                                                      style={{ minHeight: '84px' }}
                                                  />
                                              </div>
                                          </div>
                                      )}
                                  </div>

                                  {selectedTemplate !== TemplateType.HIRING && selectedTemplate !== TemplateType.BABY && (
                                      <>
                                          <button onClick={() => setIsManagementMode(true)} className="w-full py-3 rounded-2xl border border-white/10 text-white hover:bg-white/10 text-xs font-bold transition-all mt-5 flex items-center justify-center gap-2">
                                              <Settings size={16} />
                                              Manage Employees
                                          </button>
                                          <button onClick={(e) => removeEmployee(selectedEmployee.id, e)} className="w-full py-3 rounded-2xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all mt-2">Remove Employee</button>
                                      </>
                                  )}
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

                <div className="border-t border-white/10 pt-6">
                    <h3 className="text-sm font-bold text-cyan-300 uppercase mb-3 flex items-center gap-2">
                        <ImageIcon size={16}/> Otimização de Imagens
                    </h3>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Imagens enviadas recentemente são convertidas para <strong>WEBP</strong> no momento do carregamento. Use o botão abaixo para otimizar todas as fotos de colaboradores e logotipos salvos no banco de dados.
                        </p>
                        <button
                            onClick={convertExistingImagesToWebP}
                            disabled={isConvertingAll}
                            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            {isConvertingAll ? (
                                <>
                                    <span className="w-3 h-3 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                                    Convertendo Imagens Existentes...
                                </>
                            ) : (
                                "Converter Imagens Existentes para WEBP"
                            )}
                        </button>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'TEMPLATES' && (
            <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-3 pt-2">
                {TEMPLATE_LIST.map((t, index) => {
                  return (
                    <motion.button
                       key={t.id}
                       animate={{ scale: selectedTemplate === t.id ? 1.02 : 1 }}
                       whileHover={{ scale: selectedTemplate === t.id ? 1.02 : 1.015 }}
                       whileTap={{ scale: 0.98 }}
                       transition={{ type: "spring", stiffness: 350, damping: 24 }}
                       onClick={() => {
                           setSelectedTemplate(t.id as TemplateType); 
                           if (t.id === TemplateType.HIRING) {
                               setSelectedEmployeeId('hiring-generic');
                               updateEmployee('hiring-generic', 'photoUrl', customHiringImages[0] || '');
                               setSidebarDataView('DETAIL');
                               setActiveTab('IMAGES');
                           } else if (t.id === TemplateType.BABY) {
                               setSelectedEmployeeId('baby-generic');
                               setSidebarDataView('DETAIL');
                               setActiveTab('IMAGES');
                           } else if (t.id === TemplateType.ACTIVATION) {
                               setSelectedEmployeeId('gaming-generic');
                               setSidebarDataView('DETAIL');
                               setActiveTab('IMAGES');
                               setOrientation('portrait');
                           } else if (t.id === TemplateType.NEW_PROVIDER) {
                               if (activeTab === 'DATA') setActiveTab('TEMPLATES');
                           } else if (selectedEmployeeId === 'hiring-generic' || selectedEmployeeId === 'baby-generic' || selectedEmployeeId === 'gaming-generic') {
                               const firstRealEmployee = employees.find(e => e.id !== 'hiring-generic' && e.id !== 'baby-generic' && e.id !== 'gaming-generic');
                               if (firstRealEmployee) {
                                   setSelectedEmployeeId(firstRealEmployee.id);
                               }
                               setSidebarDataView('LIST');
                           }
                           if (t.id !== TemplateType.BIRTHDAY) setIsMonthView(false);
                           if (t.id === TemplateType.BABY || t.id === TemplateType.WELCOME) {
                               setOrientation('landscape');
                           }
                           // Removed auto-navigation logic for NEW_PROVIDER here
                       }} 
                       className={`relative h-[140px] rounded-2xl text-left transition-colors duration-300 group overflow-hidden border
                         ${selectedTemplate === t.id ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'border-white/10 opacity-80 hover:opacity-100 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]'}
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
                          <div className="font-sans text-xl text-white font-normal mb-0.5 shadow-black drop-shadow-md">{t.label}</div>
                          <div className="text-[10px] text-cyan-200 font-medium uppercase tracking-wide drop-shadow-md whitespace-pre-line">{t.desc}</div>
                       </div>
                    </motion.button>
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
               <motion.button
                  whileHover={isDownloading ? undefined : { scale: 1.02 }}
                  whileTap={isDownloading ? undefined : { scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-full shadow-lg transition-colors font-medium uppercase tracking-wide text-white text-base ${isDownloading ? 'bg-cyan-700 cursor-wait' : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:shadow-purple-500/20'}`}
                  onClick={handleDownload}
                  disabled={isDownloading}
               >
                   {isDownloading ? 'Generating...' : `Download ${exportFormat.toUpperCase()}`}
               </motion.button>

               <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.93 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  onClick={() => setIsManagementMode(true)}
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white border border-white/10 bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                  title="Employee Management"
               >
                  <Users size={20} />
               </motion.button>
           </div>
       </div>

       </div>



    </motion.div>
  ), [activeTab, sidebarDataView, filteredEmployees, selectedEmployeeId, selectedTemplate, searchQuery, selectedEmployee, updateEmployee, removeEmployee, isSignature, hasCopied, handleCopyHtml, handleCopyAllHtml, isNewProvider, providerData, activeGridConfig, updateGridConfig, isDownloading, handleDownload, isSidebarOpen, sidebarScale, isResizingSidebar, handleSidebarResizeStart]);

  // --- HIRING EDITOR OVERLAY ---
  const renderHiringOverlay = () => {
    return null;
  };

  return (
    <div className={`w-full h-screen flex flex-col overflow-hidden ${theme.bg} dark text-slate-900 dark:text-white transition-colors duration-300`}>
        {/* Temporarily disabled per request — LoadingScreen show={isDataLoading || !minSplashElapsed} */}

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

            <div
                className={`flex flex-1 relative overflow-hidden bg-slate-200/50 dark:bg-black/50 ${isDraggingCanvas ? 'cursor-grabbing' : 'cursor-default'}`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                    <NetworkBackground cardRef={canvasWrapperRef} />

                    <div ref={containerRef} className="w-full h-full relative">
                       <div
                            ref={canvasWrapperRef}
                            style={{
                                display: selectedTemplate === TemplateType.ACTIVATION ? 'flex' : undefined,
                                flexDirection: selectedTemplate === TemplateType.ACTIVATION ? 'column' : undefined,
                                alignItems: selectedTemplate === TemplateType.ACTIVATION ? 'center' : undefined,
                                // Omitting `scale()` entirely at 100% zoom (rather than always including
                                // `scale(1)`) works around a long-standing Chromium bug: drag-to-select
                                // text silently fails to extend the selection inside an element whose
                                // ancestor carries a `transform` with a scale/matrix function, even when
                                // that scale is 1 — plain `translate()` alone doesn't trigger it.
                                transform: zoomLevel === 1
                                    ? `translate(${position.x}px, ${position.y}px)`
                                    : `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                                transformOrigin: 'top left',
                                transition: (isDraggingCanvas || isWheelZooming) ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
                                width: 'fit-content',
                                height: 'fit-content',
                                position: 'relative'
                            }}
                       >
                           <div className="relative">
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

                            {selectedTemplate === TemplateType.ACTIVATION && (
                                <div className="w-[980px] mt-12 p-5 rounded-full bg-[#09090b]/95 backdrop-blur-md border border-white/10 shadow-2xl flex items-center gap-6 transition-all">
                                    <div className="pl-6 text-cyan-400 shrink-0">
                                        <Sparkles size={30} fill="currentColor" />
                                    </div>
                                    <input 
                                        value={backgroundTheme} 
                                        onChange={(e) => setBackgroundTheme(e.target.value)} 
                                        onKeyDown={handleThemeKeyDown}
                                        disabled={isGeneratingBg}
                                        className="bg-transparent outline-none flex-1 px-2 py-4 text-lg md:text-xl font-medium text-white placeholder:text-slate-500" 
                                        placeholder="Digite o tema do plano de fundo (ex: futebol de mesa, cyberpunk, custos operacionais)..." 
                                    />
                                    <button 
                                        onClick={handleGenerateBackground}
                                        disabled={isGeneratingBg}
                                        title="Gerar Imagem"
                                        className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-95 active:scale-[0.95] transition-all text-white rounded-full flex items-center justify-center shadow-lg mr-1 shrink-0 cursor-pointer disabled:cursor-default"
                                    >
                                        {isGeneratingBg ? (
                                            <Loader2 className="animate-spin text-white" size={26} />
                                        ) : (
                                            <ArrowRight size={26} />
                                        )}
                                    </button>
                                </div>
                            )}

                           {/* NEW JOYSTICK & SLIDER */}
                           {viewMode === ViewMode.EDITOR && !isManagementMode && selectedTemplate !== TemplateType.NEW_PROVIDER && selectedTemplate !== TemplateType.NEWSLETTER && (
                               <motion.div 
                                   initial={{ opacity: 0, scale: 0.8, x: 40 }}
                                   animate={{ opacity: 1, scale: 1, x: 0 }}
                                   transition={{ type: "spring", stiffness: 220, damping: 22 }}
                                   className="absolute -right-[100px] top-4 z-50 flex flex-col items-center gap-4"
                               >
                                  {/* Joystick */}
                                  <motion.div 
                                      whileHover={{ scale: isJoystickDragging ? 1.05 : 1.04, opacity: 1 }}
                                      whileTap={{ scale: 0.98 }}
                                      animate={{ scale: isJoystickDragging ? 1.05 : 1, opacity: isJoystickDragging ? 1 : 0.6 }}
                                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                      className="w-[80px] h-[80px] rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing"
                                      onMouseDown={handleJoystickStart}
                                  >
                                      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                                          <div className="w-full h-px bg-white"></div>
                                          <div className="h-full w-px bg-white absolute"></div>
                                      </div>
                                      <div 
                                          className="w-[32px] h-[32px] rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.5)] relative z-10 cursor-grab active:cursor-grabbing flex items-center justify-center"
                                          style={{ transform: `translate(${joystickUiPos.x}px, ${joystickUiPos.y}px)` }}
                                      >
                                          <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
                                      </div>
                                  </motion.div>

                                  {/* Scale Slider */}
                                  <motion.div 
                                      whileHover={{ scale: 1.04, opacity: 1 }}
                                      animate={{ opacity: 0.6 }}
                                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                      className="h-[120px] w-[32px] bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center shadow-xl transition-all"
                                      onMouseDown={(e) => e.stopPropagation()} // Prevent canvas dragging when using slider
                                  >
                                      <input 
                                          type="range" 
                                          min="0.5" max="3" step="0.05" 
                                          value={selectedEmployee.photoScale || 1}
                                          onChange={(e) => updateEmployee(selectedEmployee.id, 'photoScale', parseFloat(e.target.value))}
                                          className="w-[100px] h-[2px] appearance-none bg-white/20 rounded-full outline-none -rotate-90 cursor-ns-resize [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-md"
                                      />
                                  </motion.div>


                               </motion.div>
                           )}

                           
                       </div>
                    </div>

                    <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-20">
                        <button onClick={undo} disabled={historyIndex === 0} className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="Desfazer (Ctrl+Z)"><Undo2 size={20}/></button>
                        <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="Refazer (Ctrl+Y)"><Redo2 size={20}/></button>
                        <div className="h-px w-8 bg-white/20 mx-auto my-1"></div>
                        <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            onClick={() => handleZoom(0.1)}
                            className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            title="Aumentar zoom"
                        >
                            <ZoomIn size={20}/>
                        </motion.button>
                        <motion.button
                            key={zoomLevel}
                            initial={{ scale: 0.85, opacity: 0.6 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            onClick={() => {
                                const rect = containerRef.current?.getBoundingClientRect();
                                zoomAtPoint(1, rect ? rect.width / 2 : 0, rect ? rect.height / 2 : 0);
                            }}
                            className="py-1.5 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-[10px] font-bold tabular-nums text-center"
                            title="Redefinir zoom (100%)"
                        >
                            {Math.round(zoomLevel * 100)}%
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            onClick={() => handleZoom(-0.1)}
                            className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            title="Diminuir zoom"
                        >
                            <ZoomOut size={20}/>
                        </motion.button>
                    </div>
                    
                    {isMonthView && selectedTemplate === TemplateType.BIRTHDAY && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 ml-[140px] bg-white/10 backdrop-blur-md border border-slate-300 dark:border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-full px-6 py-3 flex items-center gap-6 z-20 transition-all dark:bg-black/20 bg-white">
                            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-700 dark:text-white transition-colors"><ChevronLeft size={20}/></button>
                            <span className="text-slate-800 dark:text-white font-bold uppercase min-w-[120px] text-center tracking-wider">{MONTHS[selectedMonthIndex]}</span>
                            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-700 dark:text-white transition-colors"><ChevronRight size={20}/></button>
                        </div>
                    )}
                    
                    {isSignature && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 220, damping: 22 }}
                            className="absolute top-6 right-8 z-30 flex items-start gap-3" 
                            ref={controlsAreaRef}
                        >
                            {employees.length > 1 && (
                                <motion.button 
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold shadow-lg transition-all border bg-white dark:bg-slate-800 text-purple-600 border-slate-200 dark:border-white/10 hover:bg-purple-50" 
                                    onClick={handleCopyAllHtml}
                                >
                                    {hasCopied === 'ALL COPIED!' ? <CheckCircle2 size={18} /> : <List size={18} />}
                                    <span>{hasCopied === 'ALL COPIED!' ? 'List Copied!' : 'Copy List'}</span>
                                </motion.button>
                            )}
                            <motion.button 
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold shadow-lg transition-all border bg-white dark:bg-slate-800 text-cyan-600 border-slate-200 dark:border-white/10 hover:bg-cyan-50" 
                                onClick={handleCopyHtml}
                            >
                                {hasCopied === 'COPIED!' ? <CheckCircle2 size={18} /> : <Code size={18} />}
                                    <span>{hasCopied === 'COPIED!' ? 'Copied!' : 'Copy HTML'}</span>
                            </motion.button>
 
                            <div className="relative">
                                <motion.button 
                                    ref={signatureButtonRef}
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    onClick={toggleSignatureControls} 
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold shadow-lg transition-all border ${showSignatureControls ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10'}`}
                                >
                                    <SlidersHorizontal size={18} />
                                    <span>Signature Options</span>
                                </motion.button>
                                
                                <AnimatePresence>
                                    {showSignatureControls && (
                                        <motion.div 
                                            ref={popupRef}
                                            onWheel={(e) => e.stopPropagation()}
                                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 15, scale: 0.95 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                            className="signature-controls absolute mt-4 w-[340px] bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
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
                                                    <ThemeSwitch isDarkMode={hideIconsForExport} toggle={() => setHideIconsForExport(!hideIconsForExport)} />
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
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                    
                    {isNewProvider && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 220, damping: 22 }}
                            className="absolute top-6 right-8 z-30 flex flex-col gap-2 items-end"
                        >
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
                                        <motion.button 
                                            key={fmt.id}
                                            whileHover={{ scale: 1.04 }}
                                            whileTap={{ scale: 0.96 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                            onClick={() => setProviderFormat(fmt.id as ProviderFormat)}
                                            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${providerFormat === fmt.id ? 'bg-cyan-500 text-white shadow-lg' : 'hover:bg-white/10 text-slate-300'}`}
                                        >
                                            <fmt.icon size={14} />
                                            {fmt.label}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {(!isSignature && !isNewProvider) && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 220, damping: 22 }}
                            className="absolute top-6 right-8 z-30 flex gap-2"
                        >
                            {/* MODO MENSAL TOGGLE (Only for Birthday) */}
                            {selectedTemplate === TemplateType.BIRTHDAY && (
                                <div className="flex gap-2">
                                    {isMonthView && (
                                        <>
                                            <motion.button 
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                onClick={handleBatchExport}
                                                disabled={isDownloading || filteredEmployees.length === 0}
                                                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs px-4 py-1 rounded-full shadow-xl flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Download size={14} />
                                                Exportar Lote (ZIP)
                                            </motion.button>
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

                            {/* FUNDO ESCURO TOGGLE (Welcome Aboard, Birthday, Anniversary, Job Change, Farewell) */}
                            {(selectedTemplate === TemplateType.WELCOME || selectedTemplate === TemplateType.BIRTHDAY || selectedTemplate === TemplateType.ANNIVERSARY || selectedTemplate === TemplateType.JOB_CHANGE || selectedTemplate === TemplateType.FAREWELL) && (
                                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-white uppercase leading-none">Fundo Escuro</span>
                                        <span className="text-[8px] text-cyan-300 uppercase tracking-tighter leading-none mt-0.5">Seção do texto</span>
                                    </div>
                                    <ThemeSwitch isDarkMode={welcomeVariant === 'dark'} toggle={() => setWelcomeVariant(welcomeVariant === 'dark' ? 'light' : 'dark')} />
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
                            {(
                                <div className="relative" ref={exportDropdownRef}>
                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-1 shadow-xl flex items-center h-[44px]">
                                        <motion.button
                                            whileHover={{ scale: 1.04 }}
                                            whileTap={{ scale: 0.96 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                            onClick={() => setShowExportDropdown(!showExportDropdown)}
                                            className="px-3 w-[84px] justify-between h-full rounded-full flex items-center text-white text-[10px] tracking-wider font-bold hover:bg-white/20 transition-all"
                                        >
                                            <span>{exportFormat.toUpperCase()}</span>
                                            <ChevronDown size={14} className={`transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                                        </motion.button>
                                    </div>
                                    
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
                                                    <motion.button
                                                        key={fmt}
                                                        whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                        onClick={() => {
                                                            setExportFormat(fmt);
                                                            setShowExportDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2 text-xs font-bold transition-all ${exportFormat === fmt ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300'}`}
                                                    >
                                                        {fmt.toUpperCase()}
                                                    </motion.button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* LOGO SELECTOR OR LANGUAGE SWITCHER */}
                            {selectedTemplate === TemplateType.ACTIVATION ? (
                                <div className="relative" ref={logoDropdownRef}>
                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-1 shadow-xl flex items-center h-[44px]">
                                        <motion.button
                                            whileHover={{ scale: 1.04 }}
                                            whileTap={{ scale: 0.96 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                            onClick={() => setShowLogoDropdown(!showLogoDropdown)}
                                            className="px-3.5 py-2 w-[125px] justify-between h-full rounded-full flex items-center hover:bg-white/20 transition-all gap-2"
                                        >
                                            <div className="w-18 h-5 flex items-center justify-center shrink-0">
                                                <SalsaLogo variant="light" brand={selectedEmployee?.activationLogo || 'technology'} className="w-full h-full object-contain" />
                                            </div>
                                            <ChevronDown size={14} className={`text-white/70 shrink-0 transition-transform ${showLogoDropdown ? 'rotate-180' : ''}`} />
                                        </motion.button>
                                    </div>
                                    
                                    <AnimatePresence>
                                        {showLogoDropdown && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute top-full mt-2 left-0 right-0 bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 p-1 flex flex-col gap-0.5"
                                            >
                                                {(['technology', 'studio', 'omni', 'gator', 'consulting'] as const).map(brand => (
                                                    <motion.button
                                                        key={brand}
                                                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                        onClick={() => {
                                                            updateEmployee(selectedEmployee.id, 'activationLogo', brand);
                                                            setShowLogoDropdown(false);
                                                        }}
                                                        className={`w-full rounded-xl transition-all flex items-center justify-center px-2 py-2 ${selectedEmployee?.activationLogo === brand || (brand === 'technology' && !selectedEmployee?.activationLogo) ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300'}`}
                                                    >
                                                        <div className="w-16 h-5 flex items-center justify-center shrink-0">
                                                            <SalsaLogo variant="light" brand={brand} className="w-full h-full object-contain" />
                                                        </div>
                                                    </motion.button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                selectedTemplate !== TemplateType.HIRING && (
                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-1 shadow-xl flex items-center h-[44px]">
                                        {(['en', 'pt', 'es'] as Language[]).map((lang) => (
                                            <motion.button
                                                key={lang}
                                                whileHover={{ scale: 1.08 }}
                                                whileTap={{ scale: 0.92 }}
                                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                onClick={() => setLanguage(lang)}
                                                className={`w-9 h-full rounded-full text-[10px] font-bold uppercase transition-all flex items-center justify-center leading-none pt-[1px] ${language === lang ? 'bg-cyan-500 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                                            >
                                                {lang}
                                            </motion.button>
                                        ))}
                                    </div>
                                )
                            )}

                            {selectedTemplate !== TemplateType.HIRING && selectedTemplate !== TemplateType.BABY && selectedTemplate !== TemplateType.WELCOME && (
                                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-1 shadow-xl flex items-center h-[44px]">
                                    <motion.button
                                        whileHover={{ scale: 1.08 }}
                                        whileTap={{ scale: 0.92 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        onClick={() => handleOrientationChange('portrait')} 
                                        className={`w-9 h-full rounded-full flex items-center justify-center transition-all ${orientation === 'portrait' ? 'bg-cyan-500 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                                        title="Portrait"
                                    >
                                        <RectangleVertical size={18} />
                                    </motion.button>
                                    <motion.button 
                                        whileHover={{ scale: 1.08 }}
                                        whileTap={{ scale: 0.92 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        onClick={() => handleOrientationChange('landscape')} 
                                        className={`w-9 h-full rounded-full flex items-center justify-center transition-all ${orientation === 'landscape' ? 'bg-cyan-500 text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                                        title="Landscape"
                                    >
                                        <RectangleHorizontal size={18} />
                                    </motion.button>
                                </div>
                            )}
                        </motion.div>
                    )}

                </div>
            </motion.div>
        </div>
        
        {/* Hidden File Input for Custom Image Uploads */}
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFileChange}
            accept="image/*"
            className="hidden"
        />

        {/* Floating text toolbar for rich-text canvas fields: Bold/Italic always,
            plus alignment and font-size controls for ACTIVATION's title/paragraph
            (mirrors the same sidebar controls) so those don't require switching
            over to the sidebar just to nudge them mid-edit. */}
        {textToolbarPos && createPortal(
            <div
                style={{ position: 'fixed', left: textToolbarPos.x, top: textToolbarPos.y, transform: 'translateX(-50%)', zIndex: 9999 }}
                className="flex items-center gap-1 bg-slate-900 border border-white/20 rounded-full shadow-2xl p-1"
                // Prevent the selection from collapsing before the click handler runs.
                onMouseDown={(e) => e.preventDefault()}
            >
                <button
                    onClick={() => applyTextFormat('bold')}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                    title="Negrito"
                >
                    <Bold size={14} />
                </button>
                <button
                    onClick={() => applyTextFormat('italic')}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                    title="Itálico"
                >
                    <Italic size={14} />
                </button>

                {selectedTemplate === TemplateType.ACTIVATION && (activeToolbarField === 'name' || activeToolbarField === 'activationParagraph') && (
                    <>
                        <div className="w-px h-5 bg-white/15 mx-0.5" />

                        {([
                            { id: 'left', icon: AlignLeft, label: 'Esquerda' },
                            { id: 'center', icon: AlignCenter, label: 'Centro' },
                            { id: 'right', icon: AlignRight, label: 'Direita' },
                        ] as { id: 'left' | 'center' | 'right', icon: any, label: string }[]).map(opt => {
                            const isActive = (selectedEmployee.activationTextAlign || 'center') === opt.id;
                            const Icon = opt.icon;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => updateEmployee(selectedEmployee.id, 'activationTextAlign', opt.id)}
                                    title={opt.label}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'text-white hover:bg-white/10'}`}
                                >
                                    <Icon size={14} />
                                </button>
                            );
                        })}

                        <div className="w-px h-5 bg-white/15 mx-0.5" />

                        <button
                            onClick={() => adjustActivationFontScale(activeToolbarField, -0.1)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                            title="Diminuir fonte"
                        >
                            <Minus size={14} />
                        </button>
                        <button
                            onClick={() => adjustActivationFontScale(activeToolbarField, 0.1)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                            title="Aumentar fonte"
                        >
                            <Plus size={14} />
                        </button>
                    </>
                )}
            </div>,
            document.body
        )}
      </div>
  );
}
