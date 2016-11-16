// CompassGenerator

// Put all PDF content to be searched in the 'original_content folder'. 
// Then run this code to generate a sharable offline folder. Zipping it up for sharing is recommended.

// Dependency Install:
// > npm install
// > brew install poppler

// To run,
// > node compassGenerator.js


var exec = require('child_process').execSync;
var fs = require('fs-extra');
var  path = require('path');
var _ = require('lodash');
var xml2js = require('xml2js');

// Find an unused folder name

var newDirNum = 0;
var directoryBase = 'PathwaysCompass_';

var folderName;
while (folderName == null) {
  try {
    fs.lstatSync('' + directoryBase + newDirNum);
    newDirNum++;
  } catch(e) {
    folderName = '' + directoryBase + newDirNum;
  }
}

// make a new folder and fill with content and resources

fs.mkdirSync(folderName);
exec('find original_content -name "*.txt.*" -delete');
fs.copySync('original_content', folderName + '/content');
fs.copySync('resources', folderName + '/resources');
fs.copySync('compass.html', folderName + '/compass.html');

// create txt files for each pdf

var convertPDFtoTextinDir = function(dir) {
  console.log('Converting PDF files in ' + dir);
  var dirContent = fs.readdirSync(dir);
  for (var i = 0; i < dirContent.length; i++) {
    try {
      var stats = fs.lstatSync(dir + '/' + dirContent[i]);
      if (stats.isDirectory()) {
        convertPDFtoTextinDir(dir + '/' + dirContent[i]);
      } else if (dirContent[i].slice(dirContent[i].length - 4, dirContent[i].length) == '.pdf') {
        var pdfFilePath = dir + '/' + dirContent[i] 
        var textFilePath = pdfFilePath.slice(0, pdfFilePath.length - 4) + '.txt'
        var tokenFilePath = textFilePath + '.tokens'

        // Assume everything is ASCII - for the handful of files where UTF-8 was not used, it would
        // be a pain to find out what the true encoding is
        //
        // Also, send all stderr output to /dev/null
        exec('pdftotext -enc ASCII7 "'+ pdfFilePath + '" >"' + textFilePath + '" 2>/dev/null');
        // Current processing pipelines for *tokens only* (not shown to end-user):
        //
        // - Change punctuation to spaces `tr [:punct:] " "`
        // - Change unprintable characters to spaces `tr -c "\11\12\15\32-\176" " "`
        //      See the ASCII code point table to find what the removed characters are.
        // - Convert upper to lowercase, quickly `dd conv=lcase 2>/dev/null`
        // - Remove common stopwords `sed -f stopword_filters.sed`. See the referenced file for details 
        // - Convert all spaces to newlines `tr -s [:space:] "\\n"`
        // - Remove lines containing <3 characters `sed -r "/^.{1,2}$/d"`
        // - Remove lines starting with a digit `sed -r "/^[0-9]/d"`
        // - Sort the resulting lines
        // - Count all resulting tokens, remove duplicates and write the output to `tokenFilePath`:
        //      `sort | uniq -c >"tokenFilePath"`
        exec('tr [:punct:] " " <"' + textFilePath + '" | tr -c "\11\12\15\32-\176" " " | dd conv=lcase 2>/dev/null | sed -f stopword_filters.sed | tr -s [:space:] "\\n" | sed -r "/^.{1,2}$/d" | sed -r "/^[0-9]/d" | sort | uniq -c >"' + tokenFilePath + '"');
      }
    } catch(e) {

    }
  }

};

convertPDFtoTextinDir(folderName + '/content');

// Generate directory.js

var parseString = require('xml2js').parseString;
var directory = {};
var invertedIndex = {};

// Recursive search function for each directory.

var exploreDir = function(dir) {
  // var contentDir = './content' + dir;
  fs.readdirSync(folderName + '/content/' + dir).forEach(function(file) {
    // Parse files in `dir` and populate `directory.js` and `invertedIndex.js`

    var fullPath = path.join(dir, file);

    if (fs.statSync(folderName + '/content/' + fullPath).isDirectory()) {
      exploreDir(fullPath);
    } else {
      // Example match: 
      // > matchObject
      // [ 'Neuroanatomy Final Review!.txt.tokens',
      //   'Neuroanatomy Final Review!',
      //   '.txt.tokens',
      //   index: 0,
      //   input: 'Neuroanatomy Final Review!.txt.tokens' 
      //   ]
      var splitFile = file.match(/^([^.]+)(.*)$/);
      if (splitFile != null) {
        var minusExtension = splitFile[1];
        var extension = splitFile[2];

        if (directory[minusExtension] == null) {
          directory[minusExtension] = {
            text: '', localPath: null
          };
        }

        if (extension.endsWith('.txt')) {
          directory[minusExtension].text = fs.readFileSync(folderName + '/content/' + fullPath, "utf8");

          // Populate inverted index
          var tokens = fs.readFileSync(folderName + '/content/' + fullPath + '.tokens', "utf8").split(/\r?\n/);
          for (var i = 0; i < tokens.length; i++) {

            // Avoid lines without text
            if (tokens[i] + '' === '') {
              continue
            }

            // Match the word frequency information from `uniq -c`
            // Example:
            // `     35 alveolar` 
            // and `1045 patients`
            var tokenInfo = tokens[i].match(/^\s*(\d+)\s+(.*)$/);
            var token = tokenInfo[2];
            var frequency = tokenInfo[1];
            // Token exclusion criteria:
            // - Empty string
            // - Very long string (things bigger than dysdiachokinesis unlikely to be searched for...
            // - Strings containing more than 4 numbers (e.g., "a1413302")
            // - Strings containing over 5 letters and then >2 digits (e.g., "abstinence109")
            // - Strings starting with a letter followed by a digit and then >1 letters (e.g., "a8vator")
            // - Strings beginning in a single character followed by only digits
            if (token === '' || token.length >= 16 || token.match(/\d\d\d\d/) || token.match(/[a-z]{5}\d\d+/) ||
                token.match(/[a-z]{1,2}\d+[a-z]+/) || token.match(/^[a-z]\d+$/)) {
              continue
            } else if (token in invertedIndex) {
              invertedIndex[token].push({'file': minusExtension, 'freq':frequency});
            } else {
              invertedIndex[token] = [{'file': minusExtension, 'freq':frequency}];
            }
          }

        } else if (extension.endsWith('.webloc')) {
          parseString(fs.readFileSync(folderName + '/content/' + fullPath, "utf8"), 
          function (err, result) {
            var link = result.plist.dict[0].string[0];
            directory[minusExtension].webPath = link;
          });
        } else if (!extension.endsWith('.tokens')) {
          directory[minusExtension].localPath = fullPath;
        }
      }
    }
  });
};

exploreDir('');

delete directory[''];

fs.writeFile(folderName + '/directory.js', 'var directory = ' + JSON.stringify(directory, null, 2), 'utf8');
fs.writeFile(folderName + '/invertedIndex.js', 'var invertedIndex = ' + JSON.stringify(invertedIndex, null, 2), 'utf8');

console.log('Generated '+folderName+'!');

