# Vercel Deployment Guide for Omega-Core A.I.

## Required Environment Variables

### Authentication (Required)
```bash
AUTH_SECRET=your-random-secret-here
# Generate: https://generate-secret.vercel.app/32
# Or: openssl rand -base64 32
```

### Database (Required)
```bash
POSTGRES_URL=your-postgres-connection-string
# Format: postgres://user:password@host:port/database?sslmode=require
# Get from: Vercel Dashboard > Storage > Postgres
```

### AI Providers

#### OpenAI (Required for GPT-4 models)
```bash
OPENAI_API_KEY=sk-...
# Get from: https://platform.openai.com/api-keys
```

#### xAI (Optional - for Grok models, more permissive for security research)
```bash
XAI_API_KEY=your-xai-key
# Get from: https://console.x.ai/
```

#### Anthropic (Optional - for Claude models)
```bash
ANTHROPIC_API_KEY=sk-ant-...
# Get from: https://console.anthropic.com/
```

### File Storage (Optional)
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_...
# Get from: Vercel Dashboard > Storage > Blob
```

## Vercel Deployment Steps

1. **Login to Vercel CLI:**
   ```bash
   vercel login
   ```

2. **Link your project (if not already linked):**
   ```bash
   vercel link
   ```

3. **Set environment variables in Vercel Dashboard:**
   - Go to your project in Vercel Dashboard
   - Navigate to Settings > Environment Variables
   - Add all required variables above
   - Make sure to set them for Production, Preview, and Development environments

4. **Deploy:**
   ```bash
   vercel --prod
   ```

   Or push to your connected Git repository for automatic deployments.

## Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | ✅ Yes | Authentication secret for NextAuth |
| `POSTGRES_URL` | ✅ Yes | Database connection string |
| `OPENAI_API_KEY` | ✅ Yes | OpenAI API key for GPT-4 |
| `XAI_API_KEY` | ⚠️ Optional | xAI API key for Grok models |
| `ANTHROPIC_API_KEY` | ⚠️ Optional | Anthropic API key for Claude models |
| `BLOB_READ_WRITE_TOKEN` | ⚠️ Optional | Vercel Blob storage token |

## Notes

- The app uses `POSTGRES_URL` (not `DATABASE_URL`) for database connections
- All environment variables should be set in Vercel Dashboard before deployment
- The build will fail if `POSTGRES_URL` or `AUTH_SECRET` are missing
- OpenAI API key is required for the default GPT-4 models to work

