# Link Previews for Pool Sharing

This document explains how the link preview system works for sharing pool URLs on social media platforms.

## How It Works

When someone shares a pool URL (e.g., `https://app.stage.fun/0vvhmop3`), social media platforms like Twitter, Facebook, Discord, and Slack will automatically fetch and display a rich preview with:

- Pool title and description
- Funding progress (raised amount, target amount, percentage)
- Pool image (custom or dynamically generated)
- Creator information

## Implementation

The system uses Next.js 15's `generateMetadata` function for server-side metadata generation:

### 1. Server-Side Metadata (`/src/app/[slug]/layout.tsx`)

- Fetches pool data by slug from Supabase during build/request time
- Generates Open Graph and Twitter Card meta tags
- Uses pool's custom image or falls back to dynamic OG image generation
- Handles error cases gracefully with fallback metadata

### 2. Dynamic OG Image Generation (`/src/app/api/og/route.tsx`)

- Creates beautiful 1200x630 Open Graph images when pools don't have custom images
- Displays pool title, funding progress, and StageFun branding
- Uses Edge Runtime for fast generation
- Styled to match StageFun's design system

### 3. Client-Side Layout (`/src/app/[slug]/client-layout.tsx`)

- Maintains all existing client-side functionality
- Separated from server-side metadata generation for optimal performance

## Testing From Localhost

### ✅ **What You CAN Test Locally**

#### 1. **Metadata Generation**

View the generated meta tags by visiting a pool page and viewing page source:

```bash
# Start your dev server
npm run dev

# Visit a pool page
# View page source to see the generated meta tags
```

#### 2. **OG Image Generation**

Test the dynamic image generation directly:

```bash
# Visit this URL in your browser:
http://localhost:3000/api/og?title=My%20Pool&raised=$500&target=$1000&percentage=50
```

#### 3. **Manual Meta Tag Inspection**

Use browser dev tools to inspect the `<head>` section and verify:

- `<meta property="og:title">`
- `<meta property="og:description">`
- `<meta property="og:image">`
- `<meta name="twitter:card">`

### ❌ **What You CANNOT Test Locally**

#### 1. **Social Media Link Previews**

- Twitter, Facebook, Discord, etc. **cannot access localhost URLs**
- These platforms need publicly accessible URLs to fetch previews

#### 2. **Social Media Validators**

- Twitter Card Validator
- Facebook Sharing Debugger
- LinkedIn Post Inspector

These tools require public URLs and won't work with `localhost:3000`.

### 🚀 **Recommended Testing Workflow**

#### **For Development:**

1. **Local Testing:**

   ```bash
   # Test metadata generation
   curl -I http://localhost:3000/your-pool-slug

   # Test OG image generation
   open http://localhost:3000/api/og?title=Test&raised=$100&target=$1000&percentage=10
   ```

2. **View Source Inspection:**
   - Visit your pool page in browser
   - Right-click → "View Page Source"
   - Search for `og:` or `twitter:` to see generated meta tags

#### **For Production Testing:**

1. **Deploy to Vercel Preview:**

   ```bash
   # Push to a branch (creates preview URL)
   git push origin your-feature-branch
   ```

2. **Test with Real URLs:**

   ```bash
   # Use your Vercel preview URL
   https://your-app-git-branch-username.vercel.app/pool-slug
   ```

3. **Social Media Validation:**
   - Use the preview URL in social media validators
   - Test actual sharing on platforms

### 🛠 **Local Development Tips**

#### **Environment Setup for Local Testing:**

```bash
# .env.local
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

#### **Quick Verification Commands:**

```bash
# Check if metadata is generated
curl -s http://localhost:3000/your-pool-slug | grep -i "og:"

# Test OG image endpoint
curl -I http://localhost:3000/api/og?title=Test

# View all meta tags
curl -s http://localhost:3000/your-pool-slug | grep -i "<meta"
```

#### **Browser Testing Checklist:**

- [ ] Visit pool page and view source
- [ ] Check `<title>` tag is correct
- [ ] Verify all `og:` meta tags are present
- [ ] Test `/api/og` endpoint directly
- [ ] Confirm image URLs are properly formatted

## Environment Setup

Add this environment variable to your deployment:

```bash
NEXT_PUBLIC_BASE_URL=https://app.stage.fun
```

For local development, you can use:

```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Testing Link Previews

### 1. Twitter/X Card Validator

- Visit: https://cards-dev.twitter.com/validator
- Enter your pool URL (e.g., `https://app.stage.fun/your-pool-slug`)

### 2. Facebook Sharing Debugger

- Visit: https://developers.facebook.com/tools/debug/
- Enter your pool URL

### 3. LinkedIn Post Inspector

- Visit: https://www.linkedin.com/post-inspector/
- Enter your pool URL

### 4. Discord

- Simply paste the URL in any Discord channel and it will automatically generate a preview

## Technical Benefits

### Performance

- **Server-side rendering**: Metadata is generated at build time or on first request
- **Edge Runtime**: OG image generation happens at the edge for minimal latency
- **Caching**: Next.js automatically caches generated metadata and images

### SEO

- **Rich snippets**: Search engines understand pool content better
- **Structured data**: Open Graph provides structured metadata
- **Canonical URLs**: Proper URL canonicalization prevents duplicate content

### User Experience

- **Visual previews**: Users see rich previews before clicking
- **Trust indicators**: Branded images and descriptions build trust
- **Mobile optimized**: Works across all devices and platforms

## Customization

### Custom Pool Images

If a pool has a custom `image_url`, it will be used instead of the generated image.

### Dynamic Image Customization

Modify `/src/app/api/og/route.tsx` to:

- Change colors, fonts, or layout
- Add creator avatars or additional stats
- Include different branding elements

### Metadata Customization

Modify `/src/app/[slug]/layout.tsx` to:

- Change title/description formats
- Add additional Open Graph properties
- Include structured data (JSON-LD)

## Error Handling

The system includes robust error handling:

1. **Pool not found**: Returns appropriate 404 metadata
2. **Database errors**: Falls back to generic StageFun metadata
3. **Image generation errors**: Returns 500 status with error message
4. **Missing environment variables**: Uses sensible defaults

## Monitoring

Monitor link preview performance by:

1. **Vercel Analytics**: Track page loads from social referrers
2. **Social platform insights**: Monitor click-through rates from previews
3. **Error logs**: Watch for metadata generation errors
4. **OG image generation**: Monitor API route performance

This implementation provides the fastest, most efficient way to add rich link previews to your pool sharing while maintaining excellent performance and user experience.
