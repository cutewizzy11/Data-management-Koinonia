# Netlify Deployment Guide

This guide explains how to deploy the Applicant Connect application to Netlify with proper signature image support.

## Problem Solved

The application was originally designed to work with a backend server for image handling, but when deployed to Netlify as a static site, signature images wouldn't display because:

1. The `SignatureModal` component previously used a local backend. The app now serves images statically from the built `public/images` directory.
2. The `apiService` was trying to fetch from a backend that doesn't exist in production
3. No fallback mechanism was in place for static deployment

## Solution Implemented

### 1. Smart Image URL Resolution

Updated `SignatureModal.tsx` to intelligently handle image URLs:
- In development: images are served directly from `/images/drive_*.jpg` via Vite static handling.
- In production (Netlify): Serves images directly from `/images/` folder
- Automatically detects environment and adjusts accordingly

### 2. Production Fallback in API Service

Modified `apiService.ts` to:
- Detect production environment without backend
- Automatically fall back to mock data with proper image paths
- Maintain development functionality with backend server

### 3. Enhanced Mock Data

Updated `mockData.ts` to include:
- Signature URLs pointing to existing downloaded images
- Image URLs for profile photos
- Proper static paths that work in production

### 4. Build Configuration

Configured Vite (`vite.config.ts`) to:
- Properly copy `public/images` to build output
- Maintain image file structure in production
- Optimize asset handling

### 5. Netlify Configuration

Created `netlify.toml` with:
- Proper build settings
- SPA routing redirects
- Image caching headers

## Deployment Steps

### Option 1: Direct Netlify Deployment

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify:**
   - Drag and drop the `dist` folder to Netlify
   - Or connect your GitHub repository to Netlify

### Option 2: GitHub Integration

1. **Push changes to GitHub:**
   ```bash
   git add .
   git commit -m "Fix signature images for Netlify deployment"
   git push origin main
   ```

2. **Connect to Netlify:**
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Select your repository
   - Build settings are automatically detected from `netlify.toml`

## Verification

### Local Testing

Test the production build locally:
```bash
npm run build
serve dist -p 3000
```

Then visit `http://localhost:3000` and:
1. Navigate to any person's profile
2. Click "View Signature" 
3. Verify the signature image displays correctly

### Production Testing

After deployment:
1. Visit your Netlify URL
2. Test signature viewing functionality
3. Check browser console for any errors

## Technical Details

### Environment Detection

The application uses this logic to determine the environment:
```javascript
const isProductionWithoutBackend = () => {
  return !import.meta.env.DEV || window.location.hostname !== 'localhost' || window.location.port === '8080';
};
```

### Image Path Resolution

- **Development:** `/images/drive_*.jpg`
- **Production (Netlify):** `/images/drive_*.jpg` (served from static files)

### Files Modified

- `src/components/SignatureModal.tsx` - Smart image URL resolution
- `src/services/apiService.ts` - Production environment detection
- `src/data/mockData.ts` - Added signature and image URLs
- `vite.config.ts` - Build configuration for images
- `netlify.toml` - Netlify deployment configuration

## Troubleshooting

### Images Not Displaying

1. **Check browser console** for 404 errors
2. **Verify build output** - ensure `dist/images/` contains the image files
3. **Check image paths** in mock data match actual filenames

### Build Issues

1. **Clear build cache:**
   ```bash
   rm -rf dist
   npm run build
   ```

2. **Verify dependencies:**
   ```bash
   npm install
   ```

### Netlify Deployment Issues

1. **Check build logs** in Netlify dashboard
2. **Verify `netlify.toml`** configuration
3. **Ensure Node.js version** compatibility (using Node 18)

## Future Enhancements

For a full production deployment, consider:

1. **Real backend integration** with proper Google Sheets API
2. **Image optimization** and CDN usage
3. **Environment-specific configurations**
4. **Automated image updates** via GitHub Actions

The current solution provides a robust fallback that works perfectly for static deployment while maintaining development functionality.