import React from 'react';
import { Linkedin, Instagram, MessageCircle, Globe } from 'lucide-react';
import { Employee, CanvasConfig, TemplateType, BrandKey } from '../types';
import { FAREWELL_GROUP_MAX } from '../services/emailTemplate';

// Extracted from App.tsx, which had grown to 5,200 lines. Everything here is
// independent of that component's state -- it was only ever in the same file
// by accident of growth.

export const INITIAL_EMPLOYEES: Employee[] = [
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

export const INITIAL_CONFIG: CanvasConfig = {
  primaryColor: '#06b6d4', 
  secondaryColor: '#9333ea', 
  companyLogo: ''
};

export const MONTHS = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
];

type EditorTab = 'DATA' | 'TEMPLATES' | 'IMPORT' | 'IMAGES' | 'SETTINGS';

// --- CONFIG FOR SOCIAL NETWORKS ---
export const SOCIAL_NETWORKS = [
    { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: 'text-blue-400', borderFocus: 'focus:border-blue-500/50', placeholder: 'linkedin.com/in/username' },
    { id: 'instagram', icon: Instagram, label: 'Instagram', color: 'text-pink-400', borderFocus: 'focus:border-pink-500/50', placeholder: 'instagram.com/username' },
    { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', color: 'text-green-400', borderFocus: 'focus:border-green-500/50', placeholder: 'wa.me/number' },
    { id: 'website', icon: Globe, label: 'Website', color: 'text-emerald-400', borderFocus: 'focus:border-emerald-500/50', placeholder: 'www.website.com' },
];

// --- UTILS ---

export const calculateTenure = (dateStr: string): string => {
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

// Templates that can assemble several people onto a single card through the
// "Modo Grupo" toggle. Job Change has always been unbounded; Farewell caps at
// FAREWELL_GROUP_MAX, which the generator enforces too so the card can never
// be handed more people than it can render legibly.
export const BRAND_KEYS: readonly BrandKey[] = ['technology', 'studio', 'omni', 'gator', 'consulting'];
export const asBrandKey = (value: unknown): BrandKey | null =>
  typeof value === 'string' && (BRAND_KEYS as readonly string[]).includes(value) ? (value as BrandKey) : null;

export const GROUP_CAPABLE_TEMPLATES: TemplateType[] = [TemplateType.JOB_CHANGE, TemplateType.FAREWELL];
export const supportsGroupMode = (t: TemplateType) => GROUP_CAPABLE_TEMPLATES.includes(t);
export const groupLimitFor = (t: TemplateType) => (t === TemplateType.FAREWELL ? FAREWELL_GROUP_MAX : Infinity);

// A group card draws each photo in a tile that is only a fraction of the
// single-person card's photo panel, and scales the stored pan by that same
// fraction when it draws it. Left uncompensated the joystick would crawl
// there, so the group templates publish the fraction they used on each tile
// and the joystick divides its step by it: the photo then travels the same
// distance on screen whichever card is on the canvas. Anything without the
// attribute (every single-person card) is drawn 1:1 and needs no scaling.
export const readPanStepFactor = (employeeId: string): number => {
  try {
    const tile = document.querySelector(`#capture-target [data-emp-id="${CSS.escape(employeeId)}"][data-pan-ratio]`);
    const ratio = tile ? parseFloat(tile.getAttribute('data-pan-ratio') || '') : NaN;
    return Number.isFinite(ratio) && ratio > 0 ? 1 / ratio : 1;
  } catch {
    return 1;
  }
};

export const TEMPLATE_LIST = [
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
