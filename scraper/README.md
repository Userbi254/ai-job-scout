# AI Job Scraper Worker

Node.js scraping worker with Playwright and Cheerio for JavaScript-rendered page scraping.

## Quick Start

### Local Development

```bash
cd scraper
npm install
npx playwright install chromium
npm start
```

Server will run on <http://localhost:3001>

### Docker Deployment

```bash
cd scraper
docker build -t ai-job-scraper-worker .
docker run -p 3001:3001 ai-job-scraper-worker
```

## API Endpoints

### GET /health

Health check endpoint.

### POST /scrape

Scrapes a URL using Playwright (full JavaScript execution).

```json
{
  "url": "https://example.com/jobs",
  "options": {
    "waitUntil": "networkidle",
    "timeout": 30000
  }
}
```

### POST /scrape-paginated

Scrapes multiple pages using Playwright pagination.

```json
{
  "url": "https://example.com/jobs",
  "nextSelector": "a.next",
  "maxPages": 5
}
```

### POST /parse

Parses HTML using Cheerio (BeautifulSoup-like).

```json
{
  "html": "<html>...</html>",
  "pageUrl": "https://example.com"
}
```

### POST /full-extract

Full pipeline: Scrape with Playwright → Parse with Cheerio.

```json
{
  "url": "https://example.com/jobs"
}
```

## Deployment Options

- **Railway**: `railway up`
- **Fly.io**: `fly deploy`
- **Docker on VPS**: See Dockerfile
- **Cloud Run**: Deploy container to GCP

## Environment Variables

- `PORT`: Server port (default: 3001)
- `SCRAPER_WORKER_URL`: Set this in Edge Functions to point to this worker
