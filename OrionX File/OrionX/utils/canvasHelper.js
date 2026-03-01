import logger from './logger.js';

let canvasModule = null;
let isCanvasAvailable = false;

try {
    // Thử nạp canvas một cách linh hoạt
    canvasModule = await import('@napi-rs/canvas');
    isCanvasAvailable = true;
} catch (error) {
    logger.warn('⚠️ [CanvasHelper] Không thể nạp @napi-rs/canvas. Các tính năng hình ảnh sẽ bị vô hiệu hóa.');
}

/**
 * Kiếm tra xem canvas có sẵn sàng không
 */
export function hasCanvas() {
    return isCanvasAvailable;
}

/**
 * Proxy các hàm từ canvas nếu có, nếu không thì trả về hàm rỗng hoặc báo lỗi
 */
export const createCanvas = isCanvasAvailable ? canvasModule.createCanvas : () => { throw new Error('Canvas not available'); };
export const loadImage = isCanvasAvailable ? canvasModule.loadImage : () => { throw new Error('Canvas not available'); };
export const GlobalFonts = isCanvasAvailable ? canvasModule.GlobalFonts : null;
