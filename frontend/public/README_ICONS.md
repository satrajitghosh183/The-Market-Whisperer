# Adding Custom Icons/Logo

## Favicon
1. Place your favicon file as `favicon.ico` in the `public/` directory
2. The favicon will automatically appear in browser tabs

## Logo
1. Place your logo file as `logo.png` (or `logo.svg`) in the `public/` directory
2. Supported formats: PNG, SVG, JPG
3. Recommended size: 32x32px to 64x64px for best quality
4. The logo will appear next to "Market Whisperer" in the header

## Apple Touch Icon (Optional)
1. Place your Apple touch icon as `apple-touch-icon.png` in the `public/` directory
2. Recommended size: 180x180px
3. Used when users add the site to their iOS home screen

## File Structure
```
frontend/
  public/
    favicon.ico          # Browser tab icon
    logo.png            # Header logo (or logo.svg)
    apple-touch-icon.png # iOS home screen icon (optional)
```

## Notes
- If logo.png doesn't exist, the header will just show text (no error)
- Favicon should be .ico format for best browser compatibility
- Logo can be PNG, SVG, or JPG format

