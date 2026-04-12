# LoudMinds Repurpose Engine

Content repurposing tool for LoudMindsClub. Turn any idea, transcript, or post into platform-native content for TikTok, Twitter, Instagram, LinkedIn, Email, and more.

## Stack

- React 18 + Vite
- Vanilla CSS (no Tailwind)
- Claude API (claude-sonnet-4-20250514)
- Cloudflare Pages deployment

## Local Dev

```bash
npm install
npm run dev
```

## Build & Deploy

```bash
npm run build
```

Deploy `/dist` to Cloudflare Pages.

**Build settings in Cloudflare:**
- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`

## Custom Domain

Point `repurpose.loudminds.club` to this Cloudflare Pages project via CNAME.

## Features (Flow A)

- 4 input types: Raw Text, URL, Transcript, Tweet
- 5 tone modes
- 8 output formats: TikTok Script, Twitter Thread, IG Caption, LinkedIn Post, Email Newsletter, Carousel Slides, YouTube Short, Blog Post
- Parallel generation (all formats fire simultaneously)
- API key stored in localStorage
- Quick-select format packs

## Roadmap

- **Flow B**: Auto-publish to TikTok, LinkedIn, Twitter (OAuth + Cloudflare Workers)
- **Flow C**: Content calendar dashboard + scheduling queue
