# semvercheck

Paste any npm version range and get a plain English explanation.

![semvercheck screenshot](screenshot.png)

## What it does

- Explains what the range actually allows (`^`, `~`, `>=`, `<`, `||`, hyphen, x-ranges)
- Shows the resolved comparator form (e.g. `^1.2.3` → `>=1.2.3 <2.0.0`)
- Displays a sample version grid — which versions match, which don't
- Shareable URLs (`/?range=^1.2.3`)

## Stack

- **Runtime** — [Bun](https://bun.sh)
- **Framework** — [Hono](https://hono.dev) with JSX SSR
- **Styling** — Tailwind CSS (CDN)
- **Parsing** — [node-semver](https://github.com/npm/node-semver)

## Run locally

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## License

MIT
