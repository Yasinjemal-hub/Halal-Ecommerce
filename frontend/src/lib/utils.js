import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a consistent placeholder image URL
 * @param {string} text - Text to display on placeholder
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} bgColor - Background color (hex without #)
 * @param {string} textColor - Text color (hex without #)
 * @returns {string} Placeholder image URL
 */
export function getPlaceholderImage(text, width = 400, height = 400, bgColor = '0D7C3D', textColor = 'FFFFFF') {
  return `https://placehold.co/${width}x${height}/${bgColor}/${textColor}/png?text=${encodeURIComponent(text)}`
}

/**
 * Get fallback image URL for product images
 * @param {string} productName - Product name for context
 * @returns {string} Fallback placeholder URL
 */
export function getProductFallbackImage(productName = 'Halal Product') {
  return getPlaceholderImage(productName, 400, 400, '0D7C3D', 'FFFFFF')
}

/**
 * Get fallback image URL for small thumbnails (cart, wishlist)
 * @param {string} text - Text to display
 * @returns {string} Fallback placeholder URL
 */
export function getThumbnailFallbackImage(text = 'H') {
  return getPlaceholderImage(text, 100, 100, '0D7C3D', 'FFFFFF')
}
