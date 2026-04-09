

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
  PRESENTATION = 'Presentation Slide',
  NEW_PROVIDER = 'New Provider', // New Template
  HIRING = 'Hiring',
  BABY = 'Baby'
}

export type ProviderFormat = 'pr-small' | 'pr-large' | 'post-sq' | 'post-story' | 'banner-small' | 'banner-large';

export type Orientation = 'portrait' | 'landscape';

export type Language = 'en' | 'pt' | 'es';

export interface CanvasConfig {
  primaryColor: string;
  secondaryColor: string;
  companyLogo: string;
}

// --- SLIDE EDITOR TYPES ---

export type SlideElementType = 'text' | 'image' | 'shape' | 'group' | 'chart';

export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  data: any[];
  config: {
    xAxisKey?: string;
    series: {
      key: string;
      color: string;
      name?: string;
    }[];
  };
}

export interface SlideElement {
  id: string;
  type: SlideElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string; // Text content or Image URL
  children?: SlideElement[]; // For Grouping
  chartData?: ChartData; // For Charts
  style: {
    fontFamily?: 'Orkney';
    fontWeight?: '300' | '400' | '700' | '900' | 'normal' | 'bold';
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    opacity?: number;
    textAlign?: 'left' | 'center' | 'right';
    textTransform?: 'uppercase' | 'none' | 'capitalize'; // Added for Akira style
    letterSpacing?: string; // Added for Akira style
    lineHeight?: number; // Added for text line height
    variant?: 'sphere' | 'box' | 'triangle' | 'star' | 'arrow_right' | 'line' | 'pie'; // Extended Shapes including Pie
    gradient?: string; // For shapes
    filter?: string; // NEW: Supports 'grayscale(100%)' etc.
    border?: string; // NEW: Supports borders
    borderWidth?: number;
    borderColor?: string;
    startAngle?: number; // For Pie Charts
    endAngle?: number;   // For Pie Charts
    rotation?: number;   // For general rotation
  };
  zIndex: number;
}

export interface Slide {
  id: string;
  elements: SlideElement[];
  background: string; // Hex or Gradient
}