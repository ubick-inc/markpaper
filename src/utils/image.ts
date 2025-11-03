import { readFile } from 'fs-extra';
import { extname } from 'path';
import https from 'https';
import http from 'http';

/**
 * Image size specification parsed from markdown
 */
export interface ImageSize {
  width?: number;
  height?: number;
}

/**
 * Parse image size specification from alt text
 * Supports formats: =300 or =300x200
 */
export function parseImageSize(altText: string): { alt: string; size?: ImageSize } {
  const sizeMatch = altText.match(/\s*=(\d+)(?:x(\d+))?\s*$/);

  if (sizeMatch) {
    const cleanAlt = altText.replace(/\s*=(\d+)(?:x(\d+))?\s*$/, '').trim();
    const width = parseInt(sizeMatch[1], 10);
    const height = sizeMatch[2] ? parseInt(sizeMatch[2], 10) : undefined;

    return {
      alt: cleanAlt,
      size: { width, height }
    };
  }

  return { alt: altText };
}

/**
 * Get MIME type from file extension
 */
function getMimeType(url: string): string {
  const ext = extname(url).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon'
  };

  return mimeTypes[ext] || 'image/png';
}

/**
 * Fetch image from URL and convert to base64 data URI
 */
export async function fetchImageAsBase64(url: string): Promise<string> {
  // Handle local file paths
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    try {
      const buffer = await readFile(url);
      const mimeType = getMimeType(url);
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch (error) {
      throw new Error(`Failed to read local image: ${url}`);
    }
  }

  // Handle remote URLs
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : http;

    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch image: ${url} (status: ${response.statusCode})`));
        return;
      }

      const chunks: Buffer[] = [];

      response.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const mimeType = response.headers['content-type'] || getMimeType(url);
        const base64 = buffer.toString('base64');
        resolve(`data:${mimeType};base64,${base64}`);
      });

      response.on('error', (error) => {
        reject(new Error(`Failed to fetch image: ${url} - ${error.message}`));
      });
    }).on('error', (error) => {
      reject(new Error(`Failed to fetch image: ${url} - ${error.message}`));
    });
  });
}

/**
 * Generate style attribute for image sizing
 */
export function generateImageStyle(size?: ImageSize): string {
  if (!size) {
    return '';
  }

  const styles: string[] = [];

  if (size.width) {
    styles.push(`width: ${size.width}px`);
  }

  if (size.height) {
    styles.push(`height: ${size.height}px`);
  }

  return styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
}
