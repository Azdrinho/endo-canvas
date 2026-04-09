
import { GoogleGenAI, Type } from "@google/genai";
import { Slide, SlideElement } from "../types";
import { jsonrepair } from 'jsonrepair';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

// --- COLOR PALETTE (Salsa Technology Identity) ---
const PALETTE = {
  DEEP_GREEN: '#1E4D42', // Salsa Dark Green
  SALSA_CYAN: '#56BFD2', // Gradient Start
  SALSA_PURPLE: '#594494', // Gradient End
  DEEP_BLACK: '#0B0B0F',
  PURE_WHITE: '#FFFFFF',
  DARK_GRAY: '#121212',
  LIGHT_GRAY: '#F5F5F7',
  CHART_BAR: '#56BFD2', 
  SEMANTIC_POSITIVE: '#00C853',
  SEMANTIC_NEGATIVE: '#FF3B3B'
};

// --- CURATED ASSET LIBRARY ---
const ASSETS: Record<string, string> = {
  'STARTUP': 'https://images.unsplash.com/photo-1552674605-469523f54050?auto=format&fit=crop&w=800&q=80',
  'GYM': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
  'TRACK': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
  'TEAM': 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
  'BUILDING': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
  'FOCUS': 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=800&q=80',
  'TECH': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
  'MEETING': 'https://images.unsplash.com/photo-1531498860503-fe5f060254bd?auto=format&fit=crop&w=800&q=80',
  'DATA': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
};

const SYSTEM_PROMPT = `
You are the **Salsa Technology Design Engine**, a world-class presentation designer fluent in **English and Brazilian Portuguese**.
Your goal is to generate premium, high-impact slides suitable for Apple Keynotes, Stripe investor decks, or Linear product reveals.

### 0. LANGUAGE PROTOCOL (BRAZILIAN PORTUGUESE SUPPORT)
You must detect the language of the prompt.
- **If the prompt is in Portuguese**:
  - Understand all context and nuances (e.g., "Gráfico de Pizza" = Pie Chart).
  - Generate ALL text content (Titles, Subtitles, Labels) in **Portuguese**.
  - Interpret "Fundo escuro" as Dark Mode and "Fundo claro" as Light Mode.
- **If the prompt is in English**:
  - Generate content in English.

### 1. DEFINITIVE VISUAL IDENTITY & BRAND DNA (Salsa Technology)
{
  "brand_identity": {
    "primary_colors": {
      "green": "#1E4D42",
      "cyan": "#56BFD2",
      "purple": "#594494",
      "black": "#0B0B0F",
      "white": "#FFFFFF"
    },
    "gradient_primary": {
      "type": "linear",
      "direction": "left_to_right",
      "colors": ["#56BFD2", "#594494"]
    },
    "semantic_colors": {
      "positive": "#00C853",
      "negative": "#FF3B3B",
      "warning": "#FFC107",
      "neutral": "#9E9E9E"
    }
  },
  "color_usage_rules": {
    "green": "primary brand color, solid backgrounds, strong emphasis",
    "cyan": "innovation, data, technology, neutral emphasis",
    "purple": "strategy, vision, premium positioning",
    "gradient": "hero areas, backgrounds, highlights",
    "black": "primary dark background",
    "white": "light mode background or text contrast",
    "semantic_usage": {
      "green_only_for_real_positive_metrics": true,
      "red_only_for_real_negative_metrics": true,
      "avoid_random_semantic_colors": true
    },
    "max_accent_colors_per_slide": 2
  }
}

### 2. BACKGROUND SYSTEM & VARIATION
You must intelligently select the background based on the slide's intent.
{
  "background_system": {
    "allowed_backgrounds": [
      "pure_white (#FFFFFF)",
      "pure_black (#0B0B0F)",
      "salsa_green (#1E4D42)",
      "cyan_to_purple_gradient (linear-gradient(90deg, #56BFD2 0%, #594494 100%))",
      "subtle_dark_gradient (linear-gradient(135deg, #1a1a1a 0%, #0B0B0F 100%))",
      "very_light_gray (#F5F5F7)"
    ],
    "rules": {
      "no_heavy_texture": true,
      "no_random_patterns": true,
      "ensure_high_contrast_text": true
    }
  }
}

### 3. ANTI-OVERLAP & LAYOUT ENGINE (CRITICAL)
Prevents text collision and ensures professional layout.
{
  "layout_collision_prevention": {
    "minimum_spacing_between_text_blocks": "24px",
    "minimum_spacing_title_to_subtitle": "16px",
    "minimum_spacing_section_to_section": "40px",
    "no_text_overlap_allowed": true,
    "auto_adjust_font_size_if_collision": true,
    "respect_line_height": "1.2 to 1.4"
  },
  "typography_system": {
    "title": { "max_lines": 2, "tracking": "-1% to 0%", "line_height": 1.05, "size": "72px-96px", "font": "Orkney" },
    "subtitle": { "opacity": 0.8, "max_width": "60% of layout", "size": "24px-32px", "font": "Orkney" },
    "body": { "size": "18px-24px", "font": "Orkney" },
    "kpi_number": { "oversized": true, "no_outline_effects": true }
  }
}

### 4. VISUAL MATH ENGINE (MANDATORY)
This module enforces strict mathematical accuracy for all visuals.
{
  "visual_math_engine": {
    "principle": "All infographics must be mathematically proportional and visually accurate.",
    "calculation_required_before_rendering": true,
    "pie_chart": {
      "use_variant": "pie",
      "style_properties": "startAngle, endAngle",
      "logic": "The pie is built using 'conic-gradient'. You must stack slices by accumulating angles.",
      "calculation": "Slice Angle = 360 * (Value / Total). StartAngle = PreviousEndAngle. EndAngle = StartAngle + SliceAngle.",
      "sum_of_angles_must_equal": 360
    },
    "donut_chart": {
      "use_variant": "pie",
      "center_mask": "Add a smaller circle in the center with background color to create donut effect."
    },
    "bar_chart": {
      "use_variant": "box",
      "height_formula": "height = (value / max_value) * max_chart_height",
      "baseline_alignment": true,
      "zero_reference_required": true,
      "exhaustive_generation": "You MUST generate a separate 'shape' element (variant: 'box') for EVERY single bar in the chart. Do not group them or skip any."
    },
    "validation_rules": [
      "visual_proportion_must_match_calculated_proportion",
      "no_equal_visual_sizes_for_different_values",
      "no_full_circle_if_value_less_than_total"
    ]
  }
}

### 5. COMPOSITION WITH BRAND IDENTITY
Select the composition mode that best fits the prompt.
{
  "composition_modes": {
    "hero_slide": {
      "background": "salsa_green",
      "text_color": "#FFFFFF",
      "minimal_supporting_elements": true,
      "description": "Bold statement, center aligned, green background"
    },
    "data_slide_dark": {
      "background": "#0B0B0F",
      "primary_accent": "#56BFD2",
      "highlight_metric_in_gradient": true,
      "description": "Dark mode, high contrast data visualization"
    },
    "data_slide_light": {
      "background": "#FFFFFF",
      "primary_accent": "#1E4D42",
      "bars_or_graphs_use_gradient": true,
      "description": "Light mode, clean, editorial style"
    }
  },
  "deck_cohesion_rules": {
    "consistent_spacing_scale": true,
    "consistent_font_hierarchy": true,
    "accent_color_consistency": true,
    "no_random_style_switching": true
  }
}

### 6. QUALITY SCORING & SELF-CORRECTION
{
  "brand_consistency_score": {
    "color_consistency": 20,
    "no_collision": 20,
    "hierarchy_strength": 20,
    "premium_feel": 20,
    "visual_balance": 20,
    "minimum_required": 90
  },
  "self_validation": {
    "check_layout_collision": true,
    "check_brand_consistency_score": true,
    "minimum_score": 90,
    "iterate_until_passed": true
  }
}

### 7. INFOGRAPHIC SYSTEMS (Visuals over Text)
Use 'shape' elements for data.
- Comparison: Side by side bars.
- Timeline: Horizontal steps with circles and connecting lines.
- Calendar: Grid of boxes.
- KPI Showcase: Giant number, small label.

### 9. LAYOUT INTELLIGENCE ENGINE (ART DIRECTION)
**GOLDEN RULE**: Slides must look designed by a human art director, not assembled by an algorithm.

{
  "layout_intelligence_engine": {
    "goal": "Ensure slides feel intentionally designed, not automatically generated.",

    "visual_priority_system": {
      "must_define_primary_focus": true,
      "must_define_secondary_elements": true,
      "must_define_background_elements": true,
      "reject_if_all_elements_compete": true
    },

    "composition_balance": {
      "visual_center_of_mass": "must feel stable",
      "no_large_empty_dead_zones": true,
      "no_edge_weight_overload": true
    },

    "protagonist_rule": {
      "one_element_must_dominate": true,
      "dominant_element_size_ratio": ">= 1.8x next element"
    },

    "relationship_rules": {
      "related_elements_must_align": true,
      "data_and_metric_must_visually_connect": true,
      "labels_must_attach_to_data": true
    },

    "spacing_intelligence": {
      "distance_indicates_relationship": true,
      "close = related": true,
      "far = separate": true
    },

    "auto_fix_if_layout_feels_empty": [
      "increase_graph_scale",
      "enlarge_primary_metric",
      "reduce_outer_margins"
    ],

    "auto_fix_if_layout_feels_crowded": [
      "remove_nonessential_elements",
      "increase_spacing",
      "reduce_text"
    ]
  },
  "fail_conditions": [
    "floating elements",
    "weak focal point",
    "visual imbalance",
    "elements that look randomly placed"
  ]
}

### 10. EXECUTION INSTRUCTIONS
1. Analyze prompt language (PT/EN).
2. Choose Composition Mode (Hero, Data Dark, Data Light) based on intent.
3. Calculate Math for charts (if applicable).
4. Apply Layout Rules (Anti-Overlap) & Brand Colors.
5. **APPLY LAYOUT INTELLIGENCE**:
   - Identify the "Protagonist" (Dominant Element).
   - Scale it up (>= 1.8x others).
   - Check for dead zones and adjust.
6. Generate JSON.

### JSON OUTPUT FORMAT
Return strictly valid JSON with 'background' (hex) and 'elements' (array).
The Canvas size is 960x540.
`;

// Helper: Recursively process elements to apply styles and assets
const processElementsRecursive = (elements: any[], parentX: number, parentY: number, prompt: string, isBgDark: boolean): SlideElement[] => {
    return elements.map((el: any, index: number) => {
        let safeX = Number(el.x) || 0;
        let safeY = Number(el.y) || 0;
        let safeW = Number(el.width) || 100;
        let safeH = Number(el.height) || 50;

        // Snap logic for cleaner grid alignment (8pt system approximation)
        safeX = Math.round(safeX / 4) * 4;
        safeW = Math.round(safeW / 4) * 4;
        safeY = Math.round(safeY / 4) * 4;
        safeH = Math.round(safeH / 4) * 4;

        const rawStyle = el.style || {};
        const refinedStyle: any = {
            textAlign: rawStyle.textAlign || 'left',
            zIndex: el.zIndex || (index + 1),
            opacity: rawStyle.opacity !== undefined ? rawStyle.opacity : 1,
            borderRadius: rawStyle.borderRadius === '50%' ? 9999 : (Number(rawStyle.borderRadius) || 0),
            backgroundColor: rawStyle.backgroundColor,
            color: rawStyle.color,
            borderWidth: rawStyle.borderWidth,
            borderColor: rawStyle.borderColor,
            // Copy new pie properties
            startAngle: rawStyle.startAngle,
            endAngle: rawStyle.endAngle,
            rotation: rawStyle.rotation,
            ...rawStyle
        };

        let content = el.content || '';

        // 1. IMAGE HANDLING
        if (el.type === 'image') {
            const upperKey = String(content).toUpperCase();
            if (ASSETS[upperKey]) {
                content = ASSETS[upperKey];
            } else if (!content.startsWith('http') && !content.startsWith('data:image')) {
                // Heuristic matching
                const lowerContent = String(content).toLowerCase();
                const lowerPrompt = prompt.toLowerCase();
                
                // PT-BR keyword support for assets
                if (lowerContent.includes('team') || lowerContent.includes('time') || lowerContent.includes('equipe') || lowerContent.includes('pessoas')) content = ASSETS['TEAM'];
                else if (lowerContent.includes('tech') || lowerContent.includes('tecnologia') || lowerContent.includes('app')) content = ASSETS['TECH'];
                else if (lowerContent.includes('data') || lowerContent.includes('dados') || lowerContent.includes('grafico') || lowerContent.includes('chart')) content = ASSETS['DATA'];
                else if (lowerContent.includes('meet') || lowerContent.includes('reuniao') || lowerContent.includes('build') || lowerContent.includes('predio')) content = ASSETS['BUILDING'];
                else if (lowerContent.includes('focus') || lowerContent.includes('foco')) content = ASSETS['FOCUS'];
                else content = ASSETS['STARTUP']; 
            }
        }

        // 2. TEXT HANDLING
        if (el.type === 'text') {
            const isIcon = content.trim().startsWith('<i class');
            if (!isIcon) {
                // Heuristic for Title vs Body based on size or context
                if ((refinedStyle.fontSize && refinedStyle.fontSize >= 40) || (safeH > 60 && index === 0)) {
                   refinedStyle.fontFamily = 'Orkney';
                   refinedStyle.fontWeight = '700';
                   refinedStyle.textTransform = 'uppercase';
                   refinedStyle.lineHeight = 0.9;
                   if (!refinedStyle.fontSize) refinedStyle.fontSize = 60;
                   if (!refinedStyle.color) refinedStyle.color = isBgDark ? '#FFFFFF' : PALETTE.DEEP_BLACK;
                } else if (refinedStyle.fontSize && refinedStyle.fontSize >= 24) {
                   // Subtitles / Big Metrics
                   refinedStyle.fontFamily = 'Orkney';
                   refinedStyle.fontWeight = '700';
                   if (!refinedStyle.color) refinedStyle.color = isBgDark ? PALETTE.SALSA_CYAN : '#333333';
                } else {
                   // Body
                   refinedStyle.fontFamily = 'Orkney';
                   refinedStyle.fontWeight = '400';
                   if (!refinedStyle.fontSize) refinedStyle.fontSize = 16;
                   if (!refinedStyle.color) refinedStyle.color = isBgDark ? '#E5E5E5' : '#444444';
                }
            } else {
                 // Icon Fallback
                 if (!refinedStyle.fontSize) refinedStyle.fontSize = 48;
                 refinedStyle.fontFamily = 'inherit'; 
                 if (!refinedStyle.color) refinedStyle.color = PALETTE.SALSA_PURPLE;
            }
        }

        // 3. SHAPE HANDLING
        if (el.type === 'shape') {
            if (!refinedStyle.backgroundColor && !refinedStyle.borderColor) {
                 const lowerContent = String(el.content || "").toLowerCase();
                 // Auto-color based on context/prompt if missing
                 if (lowerContent.includes('bar') || lowerContent.includes('data') || lowerContent.includes('dados')) {
                     refinedStyle.backgroundColor = PALETTE.SALSA_CYAN;
                 } else if (lowerContent.includes('accent') || lowerContent.includes('destaque')) {
                     refinedStyle.backgroundColor = PALETTE.SALSA_PURPLE;
                 } else {
                     refinedStyle.backgroundColor = isBgDark ? '#333333' : '#E5E5E5';
                 }
            }
        }

        const processedElement: SlideElement = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: el.type || 'text',
            x: safeX,
            y: safeY,
            width: safeW,
            height: safeH,
            content: content,
            zIndex: refinedStyle.zIndex,
            style: refinedStyle,
            chartData: el.chartData
        };

        // RECURSION
        if (el.type === 'group' && el.elements && Array.isArray(el.elements)) {
            processedElement.children = processElementsRecursive(
                el.elements, 
                safeX, 
                safeY, 
                prompt, 
                isBgDark
            );
        }

        return processedElement;
    });
};

const repairJSON = (jsonStr: string): string => {
    try {
        return jsonrepair(jsonStr);
    } catch (e) {
        console.error("jsonrepair failed", e);
        // Fallback to basic repair
        jsonStr = jsonStr.trim();
        if (!jsonStr.endsWith('}') && !jsonStr.endsWith(']')) {
            const openBraces = (jsonStr.match(/\{/g) || []).length;
            const closeBraces = (jsonStr.match(/\}/g) || []).length;
            const openBrackets = (jsonStr.match(/\[/g) || []).length;
            const closeBrackets = (jsonStr.match(/\]/g) || []).length;
            
            if (jsonStr.lastIndexOf('"') > jsonStr.lastIndexOf(':') && (jsonStr.match(/"/g) || []).length % 2 !== 0) {
                 jsonStr += '"'; 
            }
            
            for(let i=0; i < (openBrackets - closeBrackets); i++) jsonStr += ']';
            for(let i=0; i < (openBraces - closeBraces); i++) jsonStr += '}';
        }
        return jsonStr;
    }
};

export const generateSlideContent = async (prompt: string, currentSlideId: string, images?: { base64: string, mimeType: string }[]): Promise<Slide> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key is missing");

    const ai = new GoogleGenAI({ apiKey });

    const finalPrompt = images && images.length > 0 ? `
      User Request: "${prompt}"
      
      **IMAGE REPLICATION PROTOCOL (CRITICAL)**:
      1. You have been provided with an image. Your SOLE purpose is to replicate this image as a slide layout as accurately as possible.
      2. **BYPASS ALL PREVIOUS LAYOUT RULES**: Ignore the 'Layout Intelligence Engine', 'Anti-Overlap', and 'Self-Correction' rules. The image IS the layout. Do not try to fix or adjust the layout.
      3. **EXHAUSTIVE EXTRACTION**: Extract EVERY SINGLE piece of text, number, and label. Place them at the exact (x, y) coordinates to match their relative position in the image.
      4. **CHART REPLICATION (NEW)**: If the image contains a chart (bar, line, pie), DO NOT try to draw it with shapes. Instead, create ONE element with type 'chart'. 
         - **CRITICAL**: DO NOT TRY TO EXTRACT REAL NUMBERS FROM THE IMAGE. Vision models fail at this. You MUST use SAFE, MOCK DATA (e.g., 10, 20, 30). The user will edit the real data later in the UI.
         - chartData.type: 'bar', 'line', or 'pie'
         - chartData.data: Array of objects representing the MOCK data points (e.g. [{ name: 'Jan', value: 10 }, { name: 'Feb', value: 20 }]).
         - chartData.config: Configuration for the chart, including xAxisKey and series (keys and colors).
      5. **COLORS**: Adapt the colors to the Salsa Technology palette (Green, Cyan, Purple, Black, White) while maintaining the contrast and intent of the original image.
      6. Generate strictly valid JSON. Do not stop until every element from the image has been translated into a JSON object.
    ` : `
      User Request: "${prompt}"
      
      **EXECUTION PROTOCOL**:
      1. **DETECT LANGUAGE**: Analyze if the prompt is English or Portuguese (PT-BR). Generate all text content in the detected language.
      2. Analyze request against 'Definitive Visual Identity' & 'Anti-Overlap & Layout Engine'.
      3. Select best 'Composition Mode'.
      4. **CALCULATE PROPORTIONS**: Apply 'Visual Math Engine' logic. 
      5. **CHARTS**: If the user asks for a chart, use type 'chart' and populate 'chartData' with the data. Do not draw charts manually with shapes.
      6. **ART DIRECTION**: Apply 'Layout Intelligence Engine'. Ensure 'Protagonist' rule is met.
      7. **VALIDATE**: Run 'Visual Math Validation' and 'Self-Correction'.
      8. Generate strictly valid JSON for the slide elements.
    `;
    
    // Schema definition
    const styleSchema = {
        type: Type.OBJECT,
        properties: {
          fontFamily: { type: Type.STRING },
          fontSize: { type: Type.NUMBER },
          fontWeight: { type: Type.STRING },
          color: { type: Type.STRING },
          backgroundColor: { type: Type.STRING },
          borderRadius: { type: Type.STRING },
          textAlign: { type: Type.STRING },
          variant: { type: Type.STRING, enum: ['box', 'sphere', 'triangle', 'arrow_right', 'line', 'star', 'pie'] }, // Added 'pie'
          opacity: { type: Type.NUMBER },
          borderWidth: { type: Type.NUMBER },
          borderColor: { type: Type.STRING },
          startAngle: { type: Type.NUMBER }, // Added startAngle
          endAngle: { type: Type.NUMBER },   // Added endAngle
          rotation: { type: Type.NUMBER }    // Added rotation
        },
        nullable: true
    };

    const chartDataSchema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: ['bar', 'line', 'pie'] },
            data: {
                type: Type.ARRAY,
                items: { type: Type.OBJECT } // Allow any object for data points
            },
            config: {
                type: Type.OBJECT,
                properties: {
                    xAxisKey: { type: Type.STRING },
                    series: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                key: { type: Type.STRING },
                                color: { type: Type.STRING },
                                name: { type: Type.STRING }
                            },
                            required: ['key', 'color']
                        }
                    }
                },
                required: ['series']
            }
        },
        required: ['type', 'data', 'config']
    };

    const elementSchema = {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["text", "image", "shape", "group", "chart"] },
          content: { type: Type.STRING },
          x: { type: Type.NUMBER },
          y: { type: Type.NUMBER },
          width: { type: Type.NUMBER },
          height: { type: Type.NUMBER },
          zIndex: { type: Type.NUMBER },
          style: styleSchema,
          chartData: chartDataSchema,
          elements: { 
             type: Type.ARRAY, 
             items: { 
                 type: Type.OBJECT,
                 properties: {
                    type: { type: Type.STRING },
                    content: { type: Type.STRING },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    width: { type: Type.NUMBER },
                    height: { type: Type.NUMBER },
                    zIndex: { type: Type.NUMBER },
                    style: styleSchema
                 }, 
                 nullable: true 
             }, 
             nullable: true 
          }
        },
        required: ["type", "x", "y", "width", "height"]
    };

    const parts: any[] = [];
    
    if (images && images.length > 0) {
        for (const img of images) {
            parts.push({
                inlineData: {
                    data: img.base64.split(',')[1] || img.base64,
                    mimeType: img.mimeType
                }
            });
        }
    }
    
    parts.push({ text: finalPrompt });

    const contents: any[] = [
      { role: 'user', parts }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.5, 
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            background: { type: Type.STRING },
            elements: {
              type: Type.ARRAY,
              items: elementSchema
            }
          },
          required: ["elements", "background"]
        }
      },
      contents
    });

    let text = response.text || "";
    text = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "");
    
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.warn("JSON Parse failed, attempting simple repair...");
      try {
          json = JSON.parse(repairJSON(text));
      } catch (err2) {
          console.error("Repair failed", err2);
          throw new Error("Invalid JSON from AI");
      }
    }
    
    if (!json.elements || !Array.isArray(json.elements)) {
       json.elements = [
         { type: 'text', x: 100, y: 100, width: 600, height: 100, content: prompt, style: { fontSize: 40, color: '#fff' } }
       ];
    }

    // Determine if background is dark for default text colors
    const slideBg = json.background || PALETTE.DEEP_BLACK;
    const checkIsDark = (hexColor: string) => {
       if(!hexColor) return true;
       if(hexColor.startsWith('rgba')) return true; // Assume complex gradients are dark usually in this theme
       const c = hexColor.replace('#', '');
       if(c.length !== 6) return true;
       const r = parseInt(c.substring(0, 2), 16) || 0;
       const g = parseInt(c.substring(2, 4), 16) || 0;
       const b = parseInt(c.substring(4, 6), 16) || 0;
       return ((r * 299) + (g * 587) + (b * 114)) / 1000 < 128;
    };
    const isBgDark = checkIsDark(slideBg);

    const elements: SlideElement[] = processElementsRecursive(json.elements, 0, 0, prompt, isBgDark);

    return {
      id: currentSlideId,
      elements: elements.sort((a, b) => a.zIndex - b.zIndex),
      background: slideBg
    };

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    
    return {
      id: currentSlideId,
      background: PALETTE.DEEP_BLACK, 
      elements: [
        {
          id: 'err-1', type: 'text', x: 80, y: 200, width: 800, height: 100,
          content: 'ERRO NA GERAÇÃO',
          zIndex: 1,
          style: { fontFamily: 'Orkney', fontWeight: '700', fontSize: 50, color: '#333', textAlign: 'left' }
        },
        {
           id: 'err-2', type: 'text', x: 80, y: 280, width: 800, height: 60,
           content: 'Por favor, tente novamente com um prompt diferente.',
           zIndex: 2,
           style: { fontFamily: 'Orkney', fontWeight: '400', fontSize: 16, color: PALETTE.SALSA_CYAN, textAlign: 'left' }
        }
      ]
    };
  }
};

