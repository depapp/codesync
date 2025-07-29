#!/bin/bash

# Deployment Script
# This script helps prepare your project for deployment

echo "🚀 Deployment Preparation"
echo "=================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Initializing..."
    git init
    git add .
    git commit -m "Initial commit"
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository found"
fi

# Check if we have uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Found uncommitted changes. Committing..."
    git add .
    git commit -m "Prepare for deployment - $(date)"
    echo "✅ Changes committed"
else
    echo "✅ No uncommitted changes"
fi

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ No remote origin found."
    echo "Please add your GitHub repository as origin:"
    echo "git remote add origin https://github.com/depapp/codesync.git"
    echo "git push -u origin main"
    exit 1
else
    echo "✅ Remote origin found"
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main
echo "✅ Code pushed to GitHub"

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Go to https://render.com and create a new Web Service"
echo "2. Connect your GitHub repository"
echo "3. Use these build settings:"
echo "   - Build Command: cd backend && npm install"
echo "   - Start Command: cd backend && npm start"
echo ""
echo "4. Set these environment variables in Render:"
echo "   NODE_ENV=production"
echo "   REDIS_USERNAME=default"
echo "   REDIS_PASSWORD=delPi8Dk8yZkQNsyq5cIBQvmiZHUKfhv"
echo "   REDIS_HOST=redis-10161.c321.us-east-1-2.ec2.redns.redis-cloud.com"
echo "   REDIS_PORT=10161"
echo "   CLIENT_URL=https://your-frontend-domain.vercel.app"
echo ""
echo "5. Go to https://vercel.com and deploy the frontend"
echo "6. Set these environment variables in Vercel:"
echo "   REACT_APP_API_URL=https://your-backend-domain.onrender.com"
echo "   REACT_APP_WS_URL=wss://your-backend-domain.onrender.com"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md"
