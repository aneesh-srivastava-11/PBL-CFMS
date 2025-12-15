#!/bin/bash

# Usage: ./generate_coursefile.sh <course_code>
COURSE_CODE=$1

if [ -z "$COURSE_CODE" ]; then
    echo "Usage: ./generate_coursefile.sh <course_code>"
    exit 1
fi

OUTPUT_DIR="./course_files/$COURSE_CODE"
mkdir -p $OUTPUT_DIR

echo "Generating course file for $COURSE_CODE..."

# In a real scenario, this would fetch file paths from DB and copy them.
# For simulation, we will zip everything in uploads that starts with the course code if naming convention exists,
# or we just zip the whole uploads folder for now as a placeholder for logic.

# Placeholder logic: Zip all files in uploads
zip -r "$OUTPUT_DIR/course_file_$COURSE_CODE.zip" ./backend/uploads

echo "Course file generated: $OUTPUT_DIR/course_file_$COURSE_CODE.zip"
