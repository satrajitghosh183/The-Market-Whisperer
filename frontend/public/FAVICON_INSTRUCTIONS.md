# How to Change the Browser Tab Icon (Favicon)

## Quick Setup

1. **Create or find your icon file**
   - Recommended formats: `.ico`, `.png`, or `.svg`
   - Recommended sizes:
     - `favicon.ico` - 16x16, 32x32, or 48x48 pixels (multi-size ICO file)
     - `icon-16x16.png` - 16x16 pixels
     - `icon-32x32.png` - 32x32 pixels
     - `apple-touch-icon.png` - 180x180 pixels (for iOS)

2. **Place your icon files in the `frontend/public/` directory:**
   ```
   frontend/public/
     ├── favicon.ico          (required - main favicon)
     ├── icon-16x16.png      (optional - for better quality)
     ├── icon-32x32.png      (optional - for better quality)
     └── apple-touch-icon.png (optional - for iOS devices)
   ```

3. **The favicon will automatically appear in browser tabs!**

## File Formats

- **`.ico`** - Best compatibility, supports multiple sizes in one file
- **`.png`** - Good quality, widely supported
- **`.svg`** - Scalable, modern browsers only

## Online Favicon Generators

If you need to create a favicon from an image:
- https://favicon.io/ - Free favicon generator
- https://realfavicongenerator.net/ - Comprehensive favicon generator
- https://www.favicon-generator.org/ - Simple favicon generator

## Testing

After adding your favicon:
1. Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
2. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
3. The new favicon should appear in the browser tab

## Current Setup

The favicon is configured in `frontend/src/app/layout.tsx` in the metadata.icons section.

