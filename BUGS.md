# Known Bugs

## 1. Gallery: Truncated (+N) mode loses images on re-edit

**Status:** Open  
**Priority:** High  
**Area:** `client/src/config/editorBlocks.js`, `client/src/components/BlockEditor.jsx`

### Description

When a gallery is created in "+N overlay" (truncated) mode and saved, re-editing the post causes images to be lost or the gallery mode to break.

### Steps to Reproduce

1. Create a post with a gallery in "+N overlay" mode
2. Add 5+ images, set columns to 3
3. Save the post
4. Edit the post
5. Gallery shows incorrect state — images missing or mode swapped

### Root Cause Analysis

The issue is in the round-trip between `blocksToHtml` (export) and `parseHtmlToBlocks` (import):

1. **HTML export** (`blocksToHtml`): In truncated mode, only `cols` visible images are rendered as `<img>` / `<div class="gallery-more">` child elements. The full image list is stored as `data-images` JSON attribute on the gallery-grid div.

2. **HTML import** (`parseHtmlToBlocks`): Reads `data-images` JSON to restore all images. However, the data may not round-trip correctly due to:
   - JSON escaping issues with `escapeHtml` in attribute values
   - Browser HTML entity decoding behavior with `getAttribute`
   - Data URL images (base64) in the JSON being very large and potentially truncated

3. **Editor rendering** (`BlockEditor.jsx`): In truncated mode, the editor shows only `cols` images in the grid preview, with a separate list below for managing all images. The preview overlay (+N) appears on the last grid cell.

### Current Behavior

- Gallery created with 5 images, 3 columns, truncated mode
- Saved HTML contains: `data-images` JSON with 5 images, visual DOM with 2 images + 1 gallery-more
- On re-edit: `data-images` JSON is read, but something in the round-trip corrupts or loses data
- Result: fewer images than expected, or mode incorrectly detected

### Attempted Fixes

1. Added `data-mode` and `data-images` attributes to gallery-grid HTML for persistent metadata
2. Updated parser to read from `data-images` JSON with fallback to DOM children
3. Changed editor to show all images in truncated mode with preview overlay
4. Added compact image list below grid for managing all images in truncated mode

### Notes for Future Fix

- Consider storing gallery data separately (not embedded in HTML) — e.g., as a JSON field in the post document
- Test JSON escaping round-trip with special characters in image URLs (data URLs, URLs with `&`, `"`, etc.)
- Verify `escapeHtml` + browser `getAttribute` correctly round-trips JSON
- Consider using `encodeURIComponent`/`decodeURIComponent` for the data-images attribute instead of HTML entity escaping
- The `data-images` JSON can be very large with base64 data URLs — consider limiting or compressing

---

## 2. (Add new bugs below this line)

