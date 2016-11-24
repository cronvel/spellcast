#!/bin/bash

filename=$1

# Get the basename
#filename=$(basename $1)

# Remove the extension part
filename="${filename%.*}"

# Image Magick: extract alpha and inverse (negate) back and white
convert $1 -channel alpha -level 50% -negate -separate "$filename.alpha.bmp"

# Use Potrace to create an SVG mask from the negative alpha
potrace $filename.alpha.bmp -t 5 --svg -o $filename.mask.svg

# Remove temporary file
rm $filename.alpha.bmp
