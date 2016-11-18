

# Pathways Compass Generator

## Usage

Put all PDF content to be searched in the `original_content` directory. Create this directory first
if it does not exist.

Run this code to generate a shareable offline folder, `PathwaysCompass_XX`. End users can open
the `compass.html` file in the offline folder to perform searches.

Zipping the `PathwaysCompass_XX` folder before sharing is advisable.

## Installation

Dependencies:

> npm install

> brew install poppler

> brew install gnu-sed --with-default-names

To run,

> node compassGenerator.js


# Roadmap

- Refactor code to facilitate testing (thinking of using mocha.js as test suite)
- Filter search results by folder containing each result PDF file
- Link directly to pages in each PDF
- Dedicated mobile-support
- Specify number of snippets to return per document in search

(c) 2015-2016 Gavin Ovsak, Edward Stronge. All rights reserved.
