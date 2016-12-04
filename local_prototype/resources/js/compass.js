

compass = (function() {

  // Config
  var delay = 300; // ms to wait before searching
  var maxSnippets = 5; // max # of snippets to show below
  var maxResults = 100; // max results to show
  var mapPrefix = '__prefix__';

  var results;
  var cachedResultsByTopic = {};
  // Use helper function `_getTopicPreferenceMapKey` to generate keys for `topicPreferences`
  var topicPreferences = localStorage.getItem('prefs') ? JSON.parse(localStorage.getItem('prefs')) : {};
  var lastClick = new Date();
  var timeout;
    
  $('.btn').button();
  $('#search').on('input', inputChange);
  $('#filter-toggle').click(function() {
    $('#filter-toggle i').attr('class', 
      $('#filter-holder').is(':visible') ? 
      'fa fa-plus-circle' : 
      'fa fa-minus-circle')
    $('#filter-holder').slideToggle();

  });

  inputChange();

  function toggleTopicButtion(e) {
    topicPreferences[_getTopicPreferenceMapKey(e.target.name)] = e.target.checked;
    refilterSearchResults();
    localStorage.setItem('prefs', JSON.stringify(topicPreferences));
  }

  function refilterSearchResults() {
    var newElements = getResultHTMLElements(
      _.sortBy(_extractLocalProperties(mapPrefix, cachedResultsByTopic)));
    $('#results').empty();
    $('#results').append(newElements);
  }
  
	function inputChange() {
		query = $('#search').val();
		$('#results').empty();
		$('#results').append($(
			'<h5> Searching... </h5>'));

		lastClick = new Date();
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			
			results = getSearchResults(query);
      refreshResultsCache(results);
			console.log('Search Results for', query, results, results.length);

      // Use lodash to ensure stable sorting. Both inner arguments are globals
      var topicArray = _.sortBy(_extractLocalProperties(mapPrefix, cachedResultsByTopic));

      // TODO FIXME Boxes shouldn't be visible initially

      $('#filter-holder').empty();  // TODO save users preferences re: toggle state before emptying
      $('#filter-holder').off('change');
      // TODO FIXME Boxes shouldn't be visible initially
      makeTopicCheckboxHTMLElements(topicArray);

			$('#results').empty();
      $('#results').append(getResultHTMLElements(topicArray));
      
    }, delay);
  };

  function makeTopicCheckboxHTMLElements(topicArray) {

    var checkboxHTMLElements = [];
    var newButtons = '<div class="filter-button-array">' +
      // XXX not sure if the inline-block display is needed vs removing
      // justified class
      '<div class="btn-group btn-group btn-group-justified" style="display: inline-block; width: 100%;" data-toggle="buttons">';
    
    for (var i = 0; i < topicArray.length; i ++) {

      var currTopic = topicArray[i];
      var collapsedTopic = currTopic.split(/\s+/).join('');

      if (topicPreferences[_getTopicPreferenceMapKey(collapsedTopic)] != null) {
        checked = topicPreferences[_getTopicPreferenceMapKey(collapsedTopic)];
      } else {
        checked = true;
      }

      newButtons += '' +
          '<label class="btn active" id="' + collapsedTopic +'" style="display: inline-table;">' +
            '<input type="checkbox" name="' + collapsedTopic + '" ' + (checked ? 'checked' : '') +'>' +
              '<i class="fa fa-square-o fa-2x"></i><i class="fa fa-check-square-o fa-2x"></i>' + 
                '<span class="topic-text">  ' + currTopic + ' [' + 
                   cachedResultsByTopic[mapPrefix + currTopic].length +
                   ']'+ '</span>' +
            '</label>';
        // Binding click events to #filter-holder, which currently exists. Note the 
        // buttons, however, have not yet been added to the DOM
        $('#filter-holder').on('change', '#' + collapsedTopic, toggleTopicButtion);
    }
    newButtons += '</div></div>';
    $('#filter-holder').append($(newButtons));
  }

  function _getTopicPreferenceMapKey(t) {
    /* Remove whitespace and add map prefix for topic names
     */
    return mapPrefix + t.split(/\s+/).join('');
  }

  function refreshResultsCache(resultsData) {
    /*
     * Given new results data, populate `cachedResultsByTopic`, a map of 
     * topics to arrays of related results
     */
    cachedResultsByTopic = {};  // Clear old data
    resultsData.forEach(function(r) {
      if (r.topic != null) {
        if (!((mapPrefix + r.topic) in cachedResultsByTopic)) {
          cachedResultsByTopic[mapPrefix + r.topic] = [];
        }
        cachedResultsByTopic[mapPrefix + r.topic].push(r);
      }
    });
  };

  function getResultHTMLElements(topicArray) {
    // Sort, then return HTML elements using the data cache in 
    // `cachedResultsByTopic`

    // TODO - should show the checkbox bar by default when a checkbox has been
    // deselected, but hide in other cases

    // Get preferences and set defaults as needed. Respect existing preferences
    // TODO persist user preferences beyond the session
    var filteredResults = [];
    for (var i = 0; i < topicArray.length; i++) {

      var currTopic = topicArray[i];
      if (!((_getTopicPreferenceMapKey(currTopic)) in topicPreferences)) {
        topicPreferences[_getTopicPreferenceMapKey(currTopic)] = true;
      }

      if (topicPreferences[_getTopicPreferenceMapKey(currTopic)]) {
        Array.prototype.push.apply(
          filteredResults, cachedResultsByTopic[mapPrefix + currTopic]);
      }
    }

    var resultElements = [];
    _.sortBy(filteredResults, 'score').slice(0, maxResults).forEach(function(r) {

      var newResult = '<div class="panel panel-default">' + '	<div class="panel-body">'

      if (r.local) {
        var pdfFileLink = './content/' + r.link;

        newResult += '    <h5><a href="' + pdfFileLink + '" target="_blank">'+r.link+'</a></h5>';

        if (r.snippets) {
          newResult += '<p>		Snippets (click a snippet to access document):<p><ul>';
          for (var i = 0; i < r.snippets.length; i++) {
            // Example: {text: 'Here is a query with context.', pageNo: 5}
            newResult += (
            '<li> <a class="snippet" href="' + pdfFileLink + '#page=' + r.snippets[i].pageNo + '" target="_blank">' +
              r.snippets[i].text +
            '</a></li><br>' // should eventually style this and add padding-bottom
            );
          }
        } else if (!r.snippets) {
          newResult += '<p>		<i>No matches found in the body of this document</i><p>';
        }
        newResult +=  '</ul>  </div></div>';

      } else if (!r.local) {
        newResult += '		<h5>' + '<a href="'+r.link+'" target="_blank">'+r.title+'</a>' +'</h5>' +
          '		Link to '+r.link+'<br>';
      }
      resultElements.push($(newResult));
    });
    return resultElements;
  };

  function invIndexSearch(directory, queryArray) {

    var titleWeight = 10;  // Value title matches 1000x body matches

    // Currently, the inverse index isn't set up to handle
    // bigrams. Will have a second query array as a workaround
    var queryUnigrams = [];
    for (var i = 0; i < queryArray.length; i++) {
      // Need Array.push to update queryUnigrams in place
      Array.prototype.push.apply(queryUnigrams, queryArray[i].split(/\s+/));
    }

    // Should not use the unigrams when searching for title matches -
    // otherwise, the query 'renal cell cancer' might yield
    // "Ovarian Cancer" as a top hit, solely due to the word `cancer`,
    // despite the two being very distinct topics
    var titleMatches = getTitleMatch(directory, queryArray);
    var bodyMatches = getBodyMatch(invertedIndex, queryUnigrams);

    var tempMatchedDocumentArray = titleMatches.concat(bodyMatches);
    var matchedDocuments = {};
    for (var i = 0; i < tempMatchedDocumentArray.length; i++) {
      matchedDocuments[mapPrefix + tempMatchedDocumentArray[i]] = 1;
    }
    var matchedDocumentsArray = _extractLocalProperties(mapPrefix, matchedDocuments);

    var hitsPerFile = null;
    if (titleMatches.length || matchedDocumentsArray.length) {
      hitsPerFile = getHitsPerFile(queryUnigrams, invertedIndex, matchedDocumentsArray);
    }

    var results = [];
    _.forEach(_.pick(directory, matchedDocumentsArray), 
              function(content, title) {
      // sort by title matches first, then the num of snippets. Can use a big number to weight title matching.
      var noBreaks = content.text.split('\n').join(' ');

      // May not be important to determine the precise number of hits per title;
      // it's not clear that having >1 title hit makes a document more pertinent
      var titleMatches = getMatches(title.split('_').join(' '), queryArray);
      var bodySnippets = getSnippets(noBreaks, queryArray);

      // Calculate number of hits per file
      var bodyMatchNum = 0;
      for (var i = 0; i < queryUnigrams.length; i++) {
        // This introduces something of a bug - we double count `renal` and `cell`
        // if a user enters "renal cell"
        bodyMatchNum += parseInt(hitsPerFile[title][queryArray[i]]);
      }

			if (bodySnippets != null || (titleMatches.length > 0 && content.text == '')) {
				var result = {
					title: title,
					snippets: bodySnippets,
          topic: content.localPath != null ? content.localPath.match(/^([^/]+).*/)[1] : null,

          link: content.localPath || content.webPath,
          local: content.localPath != null,

          titleMatches: titleMatches.length,
          bodyMatchNum: bodyMatchNum,
          // Lower is better
          score: -(titleMatches.length * titleWeight + bodyMatchNum),
        };

        results.push(result);
      }
    });
    return results;
  };

  function getTitleMatch(directory, queryArray) {
    // queries - array of comma-delimited queries

    // Loop through filenames (keys) of directory.js to find matching titles
    //
    // In this case, we don't really care if there are multiple matches, since
    // a title that repeats a query twice isn't obviously more interesting
    // than a title that only has one instance of a query.
    var matchingDocuments = [];
    for (var i = 0; i < queryArray.length; i++) {
      for (var documentTitle in directory) {
        if (documentTitle.toLowerCase().indexOf(queryArray[i]) >= 0) {
          matchingDocuments.push(documentTitle);
        }
      }
    }
    return matchingDocuments;
  };

  function getBodyMatch(invertedIndex, queryArray) {
    // Return the set of documents containing each term
    // in queryArray

    var outputArray = null;

    for (var i = 0; i < queryArray.length; i++) {
      var docList = invertedIndex[queryArray[i]];
      if (docList === undefined) {
        return [];  // All query terms must be present
      }
      docList = _.pluck(docList, 'file');

      if (outputArray === null) {
        outputArray = docList;
      }
      outputArray = _.intersection(outputArray, docList);
    }
    return outputArray === null ? [] : outputArray;
  };

  function getHitsPerFile(queryArray, invertedIndex, matchedDocuments) {
    // Return a map of filename to {query: queryFrequency} objects
    
    resultsMap = {};
    for (var i = 0; i < matchedDocuments.length; i++) {
      resultsMap[matchedDocuments[i]] = {};
    }

    for (var i = 0; i < queryArray.length; i++) {
      var q = queryArray[i];
      var allQueryContainingDocs = invertedIndex[q];
      if (typeof allQueryContainingDocs === 'undefined') {
        continue;
      }

      for (var j = 0; j < allQueryContainingDocs.length; j++) {
        var f = allQueryContainingDocs[j].file;
        if (f in resultsMap) {
          resultsMap[f][q] = parseInt(allQueryContainingDocs[j].freq);
        }
      }
    }
    return resultsMap;
  };

  function _extractLocalProperties(prefix, o) {
    // Return an array of properties in `o` that
    // begin with `prefix`
    var properties = [];
    for (var k in o) {
      if (k.startsWith(prefix)) {
        properties.push(k.slice(prefix.length, k.length));
      }
    }
    return properties
  };

  function getSearchResults(query) {
    // Split up query by commas
    var queryTerm = query.toLowerCase().split(',');
    var splitQuery = [];
    for (var i = 0; i < queryTerm.length; i++) {
      var trimmedTerm = $.trim(queryTerm[i]);
      if (trimmedTerm.length > 2) {
        splitQuery.push(trimmedTerm);
      }
    }
    return invIndexSearch(directory, splitQuery);  // `directory` is global
  };

  // Gets a list of text matches for a given document. Only
  // used to look for title matches
  function getMatches(text, queries) {
    var allMatches = [];

    var nextIndexes = {};
    queries.forEach(function (q, i) {
      nextIndexes[q] = text.toLowerCase().indexOf(q, (nextIndexes[q] != null ? nextIndexes[q] + 1 : 0));
    });
    var closest = _.sortBy(
        _.filter(
          _.pairs(nextIndexes), function (n) { return n[1] >= 0;}), 
        function(n) { return n[1];}
        )[0];

    // XXX Unnecessary, as this fxn only is used to search titles (which will rarely have multiple
    // instances of an interesting query
    while (closest != null) {
      allMatches.push(closest);
      queries.forEach(function (q, i) {
        nextIndexes[q] = text.toLowerCase().indexOf(q, (nextIndexes[q] != null ? nextIndexes[q] + 1 : 0));
      });
      closest = _.sortBy(_.filter(_.pairs(nextIndexes), function (n) { return n[1] >= 0;}), function(n) { return n[1];})[0];
    }
    return allMatches;
  };

  // Generates bolded snippets by searching the content's body
  function getSnippets(text, queries) {
    // text - content from a PDF
    // queries - list of queries inserted into search box

    queries.forEach(function(n) {
      if (text.toLowerCase().indexOf(n) == -1) {
        // not all query parts match in the text.
        return null;
      }
    });

    var nextIndexes = {};
    var snippetTextArray = [];
    var snippets = [];

    var first = true;
    var queryContextLength = 1000; // Chars to return around query
    var lastSnippetPage = 1;
    var closest;
    var lastClosest = [null, {index:0, query:null}];

    var lowerCaseText = text.toLowerCase()
    // Run through text looking for instances of either query. Make a snippet of the
    // closest result. Reset results after each loop (this may discount cases where the
    // second query occurs just after the first query, but isn't an important bug)
    while ((closest != null && snippets.length < maxSnippets) || first) {

      queries.forEach(function (q, i) {
        nextIndexes[q] = {
          // Start from the previous search's index. Record the index of any new match
          index: lowerCaseText.indexOf(q, (nextIndexes[q] != null ? nextIndexes[q].index + 1 : lastClosest[1].index)),
          query: q
        };
      });
      // Of the queries were there was a match, we consider the match with the lowest index. The
      // innermost function unrolls the map, saving us from having to specify its keys
      closest = _.sortBy(_.filter(_.pairs(nextIndexes), function (n) { return n[1].index >= lastClosest[1].index;}), 'index')[0];

      if (closest != null) {
        // Logic: consider the case where multiple snippets are taken from the same page, say page 2. No
        // form feed characters will intercede, but ''.split('\f').length is 1. Thus, we decrement
        // the result of the above function call by 1.
        var snippetPage = lastSnippetPage + lowerCaseText.slice(lastClosest[1].index, closest[1].index).split('\f').length - 1;
        var lastSnippetPage = snippetPage;
        lastClosest = closest;

        // We don't want to search all the way back to index 0 if we can avoid it (most of the
        // time, we expect there to be a lot of text between index 0 and closest.index.
        //
        // We try to get away with just looking at the last `queryContextLength` characters
        var beforeIndex = (closest[1].index - queryContextLength) < 0 ? 0 : (closest[1].index - queryContextLength);
        var before = text.substring(beforeIndex, closest[1].index).match(/[^\.\-\–\?]*$/)[0];

        var afterIndex = ((closest[1].index + closest[1].query.length + queryContextLength) > text.length) 
          ? text.length 
          : (closest[1].index + closest[1].query.length + queryContextLength);
        var after = text.substring(closest[1].index + closest[1].query.length, afterIndex).match(/.[^\.\-\–\?]+/)[0];

        var newSnippet = before + '<b>' + closest[1].query + '</b>' + after + '. <i>(Page ' + snippetPage + ')</i>';

        // TODO with the current two-step search system (first step based on keywords,
        // second step based on a full-text search using this function), we sometimes flag
        // parts of words as beting matches to our queries (e.g., query = 'fgf' should not return snippets 
        // containing 'bfgf', but this currently happens).
        
        // NOTE Only showing one result per page (if a user is interested, s/he will likely
        // already know from the first snippet shown.
        if (snippetTextArray.indexOf('Page ' + snippetPage) == -1) {
          snippetTextArray.push('Page ' + snippetPage);
          snippets.push({'text': newSnippet, 'pageNo': snippetPage});
        }
      }

      first = false;
    }

    return snippets.length > 0 ? snippets : null;   
  }


});

