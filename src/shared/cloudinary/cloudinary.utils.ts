export function extractPublicIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('cloudinary.com')) {
      return null;
    }

    const pathParts = urlObj.pathname.split('/');
    const uploadIndex = pathParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) return null;

    let relevantParts = pathParts.slice(uploadIndex + 1);

    // Remove version tag if present
    if (relevantParts.length > 0 && /^v\d+$/.test(relevantParts[0])) {
      relevantParts = relevantParts.slice(1);
    }

    const fullPathWithExtension = relevantParts.join('/');
    
    // Remove extension
    const lastDotIndex = fullPathWithExtension.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      return fullPathWithExtension.substring(0, lastDotIndex);
    }

    return fullPathWithExtension;
  } catch (error) {
    return null;
  }
}
