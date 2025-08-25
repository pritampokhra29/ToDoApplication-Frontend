# Deploy-Frontend-Git GitHub Action

This GitHub Action automatically builds and deploys the ToDoApplication Frontend to GitHub Pages.

## Overview

The action performs the following steps:
1. **Build**: Compiles the Angular application with optimized settings for GitHub Pages
2. **Deploy**: Publishes the built static files to GitHub Pages

## Triggers

The action runs automatically on:
- Push to `main` branch
- Push to `RELEASE_1.0.0` branch 
- Pull requests to `main` branch (build only, no deployment)
- Manual trigger via GitHub UI (workflow_dispatch)

## Configuration

### Angular Build Configuration

A special `github-pages` build configuration has been added to `ToDoList/angular.json`:

```json
"github-pages": {
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "2MB",
      "maximumError": "3MB"
    },
    {
      "type": "anyComponentStyle", 
      "maximumWarning": "20kB",
      "maximumError": "30kB"
    }
  ],
  "outputHashing": "all",
  "baseHref": "/ToDoApplication-Frontend/",
  "optimization": true,
  "outputMode": "static"
}
```

### Key Features

- **Static Output**: Configured for GitHub Pages static hosting
- **Base Href**: Set to repository name for proper routing
- **Optimized**: Production-ready builds with optimization enabled
- **Increased Budgets**: Allows for larger bundle sizes than default

## Permissions

The action requires the following permissions:
- `contents: read` - To access repository code
- `pages: write` - To deploy to GitHub Pages
- `id-token: write` - For secure deployment

## Setup Instructions

1. **Enable GitHub Pages** in your repository settings:
   - Go to Settings → Pages
   - Set Source to "GitHub Actions"

2. **The action will automatically run** when you push to main or RELEASE_1.0.0 branches

3. **Access your deployed app** at: `https://pritampokhra29.github.io/ToDoApplication-Frontend/`

## Manual Build

To build locally for GitHub Pages:

```bash
cd ToDoList
npm install
npm run build -- --configuration=github-pages
```

The built files will be in `ToDoList/dist/ToDoList/browser/`

## Troubleshooting

- **Build fails**: Check that all dependencies are installed and Angular CLI is working
- **Deployment fails**: Ensure GitHub Pages is enabled in repository settings
- **App doesn't load**: Verify the baseHref setting matches your repository name