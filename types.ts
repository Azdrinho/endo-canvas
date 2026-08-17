

export interface Employee {
  id: string;
  name: string;
  role: string;
  previousRole?: string; // New field for Job Change
  photoUrl: string;
  photoScale?: number; // Image Zoom Level
  photoPosition?: { x: number; y: number }; // Image Pan Position
  dateStr: string; // Birthday
  admissionDate?: string; // Date joined company (Start Date)
  tenure?: string; // Work Anniversary (e.g. "5 ANOS")
  birthDate?: string; // Full birth date (e.g. "2002-06-12")
  description?: string; // Short bio/description
  socials?: {
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    email?: string;
    phone?: string;
    skills?: string[];
  };
  department?: string; // Department/Team
  status?: 'Active' | 'Inactive' | 'On Leave'; // Employment Status
  
  // --- NEW HR FEATURES ---
  onboardingChecklist?: ChecklistItem[];
  offboardingChecklist?: ChecklistItem[];
  managerId?: string; // For Org Chart

  // New Provider Fields
  providerLogo?: string; 
  providerLogoScale?: number;
  gameThumbnails?: string[]; 
  providerGridConfig?: ProviderGridConfig; // New Grid Configuration
  
  // Custom Hiring Fields
  hiringTitle1?: string;
  hiringTitle2?: string;
  hiringLayout?: {
    logo?: { x: number, y: number, scale: number };
    hiringTitle1?: { x: number, y: number, scale: number };
    hiringTitle2?: { x: number, y: number, scale: number };
    role?: { x: number, y: number, scale: number };
    department?: { x: number, y: number, scale: number };
  };
  activationLogo?: 'technology' | 'studio' | 'omni' | 'gator' | 'consulting';
  activationTextMode?: 'title' | 'paragraph' | 'title_paragraph';
  activationTextAlign?: 'left' | 'center' | 'right';
  activationParagraph?: string; // Paragraph text for the General Disclosure template
  // User-controlled font size multipliers and line-heights for the title/paragraph,
  // applied independently on top of the template's base sizes before the auto-fit
  // shrink-to-fit safety net runs — so increasing them never clips or breaks the
  // layout, it just raises the ceiling the auto-fit script shrinks down from if needed.
  activationTitleFontScale?: number;
  activationParagraphFontScale?: number;
  activationTitleLineHeight?: number;
  activationParagraphLineHeight?: number;
}

export interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
}

export interface ProviderGridConfig {
  columns: number; // 0 = Auto
  x: number;
  y: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  scale: number;
  // New text positioning and scaling
  textScale?: number;
  textX?: number;
  textY?: number;
}

export enum ViewMode {
  EDITOR = 'EDITOR',
  IMPORT = 'IMPORT'
}

export enum TemplateType {
  BIRTHDAY = 'Happy Birthday',
  ANNIVERSARY = 'Work Anniversary',
  WELCOME = 'Welcome Aboard',
  FAREWELL = 'See You Soon',
  JOB_CHANGE = 'Job Change',
  NEWSLETTER = 'Email Signature',
  NEW_PROVIDER = 'New Provider', // New Template
  HIRING = 'Hiring',
  BABY = 'Baby',
  ACTIVATION = 'General Disclosure'
}

export type ProviderFormat = 'pr-small' | 'pr-large' | 'post-sq' | 'post-story' | 'banner-small' | 'banner-large';

export type Orientation = 'portrait' | 'landscape';

export type Language = 'en' | 'pt' | 'es';

export interface CanvasConfig {
  primaryColor: string;
  secondaryColor: string;
  companyLogo: string;
}