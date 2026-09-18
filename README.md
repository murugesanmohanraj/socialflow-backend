# Social Media Manager Backend

Express and TypeScript REST API for the Social Media Manager project.

## Setup

```bash
npm install
copy .env.example .env
```

On macOS or Linux, use `cp .env.example .env` instead of `copy`.

## Development

```bash
npm run dev
```

The API runs at `http://localhost:5000` by default.

## Verification

```bash
npm run typecheck
npm run build
```

Health endpoint:

```text
GET /api/health
```
