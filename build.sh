#!/bin/bash

# Build script for GitHub Pages deployment
echo "Building ToDo Application for GitHub Pages..."

cd ToDoList

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build for GitHub Pages
echo "Building static application..."
npm run build -- --configuration=static --base-href="/ToDoApplication-Frontend/"

echo "Build complete! Output is in ToDoList/dist/ToDoList/browser/"