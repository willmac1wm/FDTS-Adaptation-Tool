#!/bin/bash

# Configuration
SOURCE_DIR="/Users/williammacomber/Desktop/FDTS-Work-Project"
TARGET_DIR="/Users/williammacomber/Desktop/FDTS_Data_Package"
MAX_SIZE_MB=500

# Create target directory
mkdir -p "$TARGET_DIR"

echo "📦 Starting Data Package Creation..."

# 1. XML Adaptation Files (Production Only)
echo "📄 Extracting production XML adaptation files..."
ADAPT_ROOT="$SOURCE_DIR/documents/FDTS/FDTS_Adaptation_Files"

find "$ADAPT_ROOT" -name "*.xml" | while read -r file; do
    filename=$(basename "$file")
    # STRICT EXCLUSION: If it contains any of these, skip it immediately.
    if echo "$filename" | grep -iqE "(LAB|draft|working|old|backup|Copy|Sign|Log|Survey|Temp|Test)"; then
        continue
    fi
    
    facility=$(echo "$filename" | grep -oE "[A-Z]{3}" | head -1)
    if [ -z "$facility" ]; then continue; fi
    
    cp "$file" "$TARGET_DIR/${facility}_XML_${filename}"
done

# 2. Excel Routing Worksheets (Cleaned)
echo "📊 Extracting primary Excel worksheets..."
find "$SOURCE_DIR" -name "*.xlsx" | while read -r file; do
    filename=$(basename "$file")
    # STRICT EXCLUSION
    if echo "$filename" | grep -iqE "(Sign|Log|Survey|draft|working|OLD|Copy|Visit|Temp|Test)"; then continue; fi
    # Must be a primary document type
    if ! echo "$filename" | grep -iqE "(Routing|Matrix|Adaptation|Implementation|Schedule|Setup)"; then continue; fi

    facility=$(echo "$filename" | grep -oE "[A-Z]{3}" | head -1)
    if [ -z "$facility" ]; then facility="General"; fi
    
    cp "$file" "$TARGET_DIR/${facility}_EXCEL_${filename}"
done

# 3. XSD Schema Files
echo "🏗️ Extracting core XSD schemas..."
find "$SOURCE_DIR" -maxdepth 5 -name "*.xsd" -not -path "*/Tools/*" | while read -r file; do
    filename=$(basename "$file")
    cp "$file" "$TARGET_DIR/SCHEMA_${filename}"
done

# 4. Reference Data
echo "📚 Extracting primary reference data..."
find "$SOURCE_DIR" -maxdepth 4 \( -name "*Aircraft*" -o -name "FixNames*" -o -name "*Adaptation_Specialist*" \) -not -path "*/Tools/*" | grep -E "\.(txt|csv|json|xml)$" | head -n 20 | while read -r file; do
    filename=$(basename "$file")
    cp "$file" "$TARGET_DIR/REF_${filename}"
done

# 5. README Generation
echo "📝 Generating README..."
cat <<EOF > "$TARGET_DIR/00_README.md"
# FDTS Data Package for Claude

## Purpose
This package provides a condensed view of the FDTS Project structure and data for AI context.

## Structure
Files are prefixed to maintain organization in a flat structure:
- [FACILITY]_XML_*: Latest adaptation files for that facility
- [FACILITY]_EXCEL_*: Routing worksheets and survey data
- SCHEMA_*: XSD files defining the XML structure
- REF_*: Global aircraft lists, fix names, and configuration data

## Exclusions
- Sub-directories (flattened for Claude project compatibility)
- Large media files (Recordings, Images)
- Duplicate/Older versions of adaptation files
EOF

# 6. Compress and check size
echo "🤐 Compressing package..."
cd "/Users/williammacomber/Desktop"
rm -f FDTS_Data_Package_Claude.zip
zip -r FDTS_Data_Package_Claude.zip FDTS_Data_Package/ > /dev/null

size=$(du -m FDTS_Data_Package_Claude.zip | cut -f1)
echo "✅ Done! Final package size: ${size}MB"
echo "Location: /Users/williammacomber/Desktop/FDTS_Data_Package_Claude.zip"
