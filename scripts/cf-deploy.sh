#!/bin/bash
set -e
echo "Building..."
cd /home/nazim/brates-3d-office
npm run build
echo "Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=brates-3d-office --branch=main
echo "DEPLOYED TO CLOUDFLARE PAGES"
