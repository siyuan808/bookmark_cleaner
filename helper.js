//Document ready
$(function () {	
	var bms = [];
	var his = [];
			
	chrome.storage.local.get(null, function(storage){
		var d = storage['durationDays'];
		$("#setting_value").attr('value', d);
		
		var last = storage['lastDate'];
		if(last != null) {
			var now = new Date().getTime();
			var diff = Math.floor((now - last) / 1000 / 60 / 60 / 24);
			if(diff > 15)
				$("#head").html("It's been " + diff + " days since your last clean up!");
		}
	});
	
	$("#scan").click(function () {
		changeStateTo("progress"); // scan progress suggestion
		//get the history url, and the bookmark
		scan();
	});

	function scan() {
		//fetch all the bookmarks from chrome and fill the bms array
		addBookmarksFromChrome();
	}
	
	function addBookmarksFromChrome() {
		chrome.bookmarks.getTree(function(bookmarks) { // this function will not contain the changed value of bms, it does not belong to document
	  		addBookmarks(bookmarks);		
	  		// $("#head").html("add valid bookmarks:" + bms.length);
			// Now bms has the whole bookmarks from chrome
			// Get users' browsing history from chrome 
			var days = $("#setting_value").attr('value');
			if(days < 30) days = 30;
			var duration = 1000 * 60 * 60 * 24 * days;  // in milliseconds
		  	var endTime = (new Date).getTime();
	  		 startTime = endTime - duration;
			 chrome.history.search({
			      'text': '',              // Return every history item....
			      'startTime': startTime,  // that was accessed less than one week ago.
			      'endTime': endTime,
			      'maxResults': 10000
			    },
			    function(historyItems) {
			    	// $("#head").html("var:" + historyItems.length);
				    //  For each history item, get details on all visits.
				    var bms_len = bms.length;
					jQuery.each(historyItems, function(index, hit) {
						for(var i=0; i<bms.length; i++) {
							if(hit.url == bms[i].url) {
								// $("#head").html("vareuqal: " + bms[i].url);
								bms.splice(i, 1);
							}
						}				
					});
					
					//Now we have the filtered bookmarks
		    	  	$("#progress").attr('value', 80); 
		    	  	if(bms.length > 0) {
						formateSuggestion(bms);
						$("#head").html("Get " + bms.length + "/" + bms_len + " unused bookmarks in the last " + days + " days!");
					} else {
						$("#head").html("No suggestions this time, try another time!");
						changeStateTo("none");
					}
			      }
			  );
		   	
		});
	}
	
	function addBookmarks(bookmarks) {
	  bookmarks.forEach(function(bookmark) {
	    if(bookmark.children)
	     	addBookmarks(bookmark.children);
	    else {
	     if(bookmark.url) {
	     	//add bookmarks with url
	     	bms.push({url: bookmark.url, id: bookmark.id});// {url: bookmark.url, id: bookmark.id}; //put it into the array
	     }
	    }
	  });
	}

	function formateSuggestion(sug_bms) {
		// $("#head").html("suggestion: " + sug_bms.length);
		for(var i = 0; i < sug_bms.length; i++) {
			var cnt = 0;
			chrome.bookmarks.get(sug_bms[i].id, function(bookmarkNodes) {
				bookmarkNodes.forEach(function (bookmarkNode) {
					var pg = Math.floor(cnt/10) + 1;
					cnt += 1;
					// $("#head").html(pg);
					$("#bookmarks").after("<tr class=\"page" + pg +"\"><td><input type=\"checkbox\" data-key='" + bookmarkNode.id + "'></input></td><td><img src='chrome://favicon/" + bookmarkNode.url + "'/></td><td><a href='#' title='" + bookmarkNode.url + "'>" + bookmarkNode.title + "</a></td></tr>");
				});
			});
		}
		
		$("#progress").attr('value', 100);
		
		var num_page = Math.floor((sug_bms.length-1) / 10) + 1;
		// $("#head").html("Page: " + num_page);
		if(num_page > 1) {
			var links = "<tr><td></td><td></td><td>";
			for(var j=1; j<=num_page; j++) {
				links += "<a href=\"#\" id=\"link"+ j +"\">" + j +"</a>&nbsp;";
			}
			links += "</td></tr>";
			$("#bookmarks").after(links);
			
			for(var j=1; j<=num_page; j++) {
				$("#link"+j).click({total: num_page, page: j}, showPage);
			}
			
			$("#link1").trigger("click");
		}
		changeStateTo("suggestion");
	}
	
	function showPage(event) {
		for(var i=1; i<=event.data.total; i++) {
            $(".page"+i).hide();
        }
		$(".page"+event.data.page).show();
		// $("#head").html("total: " + event.data.total + "Page: " + event.data.page);
		// $("tr").each(function () {$(this).hide();});
		// $("tr:lt(10)").each(function () {$(this).show();});
	}
	
	function changeStateTo(state) {
		switch(state) {
			case "progress": 
				$("#progress").show();
				$("#scan").hide();
				$("#suggestion").hide();
			break;
			case "suggestion": 
				$("#progress").hide();
				$("#scan").hide();
				$("#suggestion").show();
			break;
			case "none": 
				$("#progress").hide();
				$("#scan").hide();
				$("#suggestion").hide();
			break;
		}
	}

	$("#select_all").click(function () {
		// $("input.check").attr('checked', 'true');
		$("form :checkbox").prop('checked', true);
	});
	
	$("#select_none").click(function () {
		$("form :checkbox").prop('checked', false);
	});
	
	$("#remove_selected").click(function () {
		var len = $("form :checkbox:checked").length;
		if(len == 0) {
			$("#select_0").show();
			setTimeout(function() {$("#select_0").hide();}, 1500);
		} else {
			// did choose some bookmarks
			$("#select").hide();
			$("#confirm_label").html("Are you sure to remove the selected " + len + " bookmarks?").show();
			$("#confirm").show();
			$("#remove").hide();
		}
	});
	
	$("#remove_cancel").click(function () {
		$("form :checkbox").prop('checked', false);
	});
	
	$("#confirm_cancel").click(function () {
		$("#select").show();
		$("#confirm").hide();
		$("#remove").show();
	});
	
	$("#confirm_ok").click(function () {
		$("form :checkbox:checked").each(function () {
			// remove bookmark of bmid
			var bmid = $(this).data("key");
			// $("#head").html("bmid: " + bmid);
			chrome.bookmarks.remove(""+bmid);
			$(this).parent().parent().remove();
		});
		
		$("#confirm").hide();
		$("#remove_completed").show();
		setTimeout(function() {
			$("#remove_completed").hide();
			$("#select").show();
			$("#remove").show();
		}, 1500);
		
		var last = new Date().getTime();
		chrome.storage.local.set({'lastDate' : last});
	});
	
	$("#setting").click(function () {
		$("#setting_div").toggle();
	});
	
	$("#setting_apply").click(function () {
		$("#setting_ok").show();
		setTimeout(function() { $("#setting_ok").hide();}, 1500);
		var days = $("#setting_value").val();
		// $("#head").html(days);
		chrome.storage.local.set({'durationDays' : days});
	});
});
