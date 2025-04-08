#!/bin/bash

# Script to copy TensorFlow.js model files to the public directory

# Source directory (where model files are currently located)
SOURCE_DIR="/Users/nicholasmartino/Repositories/pugmark/data/model"

# Destination directory (public directory where files should be served from)
DEST_DIR="./public/data/model"

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Copy model files
echo "Copying model files from $SOURCE_DIR to $DEST_DIR"
cp -R "$SOURCE_DIR"/* "$DEST_DIR"/

# Check if copy was successful
if [ $? -eq 0 ]; then
  echo "✅ Model files successfully copied to $DEST_DIR"
  echo "The model should now be accessible at ./data/model/model.json"
else
  echo "❌ Failed to copy model files"
  exit 1
fi

echo "Make sure your BuildingFootprintGenerator component uses './data/model/model.json' as the modelPath" 