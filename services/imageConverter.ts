/**
 * Image Converter Utility for converting user uploads to WebP format.
 */

/**
 * Detects if the browser supports canvas-based WebP encoding.
 */
let isWebpSupportedCache: boolean | null = null;
export function isWebpSupported(): boolean {
  if (isWebpSupportedCache !== null) return isWebpSupportedCache;
  try {
    const elem = document.createElement('canvas');
    if (elem.getContext && elem.getContext('2d')) {
      isWebpSupportedCache = elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      return isWebpSupportedCache;
    }
    isWebpSupportedCache = false;
    return false;
  } catch (err) {
    isWebpSupportedCache = false;
    return false;
  }
}

/**
 * Converts any File object (JPEG, PNG, SVG/etc.) to a WebP File.
 * Falls back to original File if WebP conversion is unsupported or fails.
 */
export function convertFileToWebP(file: File, quality: number = 0.85): Promise<File> {
  if (!isWebpSupported()) {
    console.warn("WebP format conversion not supported by browser. Using original file.");
    return Promise.resolve(file);
  }

  // If already a webp, return it directly
  if (file.type === 'image/webp') {
    return Promise.resolve(file);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file); // fallback
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file); // fallback
              return;
            }
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const webpFile = new File([blob], `${baseName}.webp`, { type: 'image/webp' });
            resolve(webpFile);
          }, 'image/webp', quality);
        } catch (err) {
          console.error("Error during WebP file conversion:", err);
          resolve(file); // fallback
        }
      };
      img.onerror = () => {
        resolve(file); // fallback
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve(file); // fallback
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a Data URL (base64) string to a WebP Data URL string.
 * Falls back to original Data URL string if conversion fails or is unsupported.
 */
export function convertDataUrlToWebP(dataUrl: string, quality: number = 0.85): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return Promise.resolve(dataUrl);
  }

  if (dataUrl.startsWith('data:image/webp;')) {
    return Promise.resolve(dataUrl);
  }

  if (!isWebpSupported()) {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl); // fallback
          return;
        }
        ctx.drawImage(img, 0, 0);
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        resolve(webpDataUrl);
      } catch (err) {
        console.error("Error during WebP data URL conversion:", err);
        resolve(dataUrl); // fallback
      }
    };
    img.onerror = () => {
      resolve(dataUrl); // fallback
    };
    img.src = dataUrl;
  });
}

/**
 * Loads an external HTTP/HTTPS URL and converts it to a WebP format Blob under CORS.
 */
export function convertUrlToWebPBlob(url: string, quality: number = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // If the image cannot be fetched because of CORS, we try loading direct with anonymous crossOrigin
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Canvas context is null"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((webpBlob) => {
          if (webpBlob) {
            resolve(webpBlob);
          } else {
            reject(new Error("Failed to export canvas to WebP blob"));
          }
        }, 'image/webp', quality);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      reject(new Error("Failed to load image for WebP conversion."));
    };
    img.src = url;
  });
}

