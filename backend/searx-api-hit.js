function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

export default async function searxngfetch(searchIP, isHTTPS, IsOtherEnginesEnabled, query, start, lr) {
    let page;
    let url;
    let url1;
    if (searchIP == undefined) {
        throw new Error("searchIP is empty, cannot proceed")
    } else {
        if (searchIP.match(/http:\/\//) == false && searchIP.match(/https:\/\//) == false) {
            if (typeof isHTTPS == "boolean") {
                if (isHTTPS) {
                    url1 = "https://" + searchIP
                } else {
                    url1 = "http://" + searchIP
                }
            } else if (typeof isHTTPS == "undefined"){
                throw new Error("cannot determine https or not")
            } else {
                throw new Error("isHTTPS should be boolean")
            }
        } else {
            url1 = searchIP;
        }
        if (url1.charAt(url1.length - 1) == "/") {
            url1 = url1.slice(0, url1.length - 1)
        }
    }
    if (query == undefined || query == "") {
        return
    } else { 
        query = encodeURIComponent(query)
    }
    if (start !== undefined) {
        page = 1 + parseInt(start / 10)
    } else {
        page = 1
    }

    url = url1 + "/search?q=" + query + "&format=json" + "&pageno=" + page

    if (!IsOtherEnginesEnabled) {
        url = url + "&engines=google"
    }
    /*
    if (lr != undefined) {
        url = url + "&language=" + lr
    }
        */

    try {
        console.log("[INFO] searxngfetch: URL: ", url)
        const result = await fetch(url)
        if (result.ok == false) {
            const results = { data: { error: { title: "", desc: "" } }}
            if (result.status == 429) {
                results.data.error.title = "tu many reque >:((((("
                results.data.error.desc = "I think... you send it too much. Try later again, or change your SearXNG instance."
                return results
            } else {
                results.data.error.title = "something went wrong: ", result.status
                results.data.error.desc = "Please check the status below: <code>", result, "</code>"
                return results
            }
        } else {
            console.log("searxngfetch: got an status: ", result.status)
        }

        let json;

        try {
            json = await result.json();
        } catch(e) {
            const results = { data: { error: { title: "", desc: "" } }}
            results.data.error.title = "Error while exporting result into variable"
            results.data.error.desc = "<textarea rows=\"10\" cols=\"50\">" + e + "</textarea><br>URL is: <code>" + url + "</code><br><br><b>Tips:</b><br>     - This instance might not supporting the Google engine for scraping. Try another instance."
            return results
        }

        const results = { 
            data: {
                _SearXNG_exclusive: {
                    relatedSuggestions: json.suggestions
                },
                searchInformation: { 
                    formattedTotalResults: 0
                }, 
                items: [] 
            } 
        }

        json.results.forEach(result => {
            if (result.template != "default.html") return;

            let title = result.title;
            let htmlTitle = result.title.replace(new RegExp(RegExp.escape(query), "ig"), "<b>$&</b>");
            let displayLink = result.parsed_url[1].replace(new RegExp(RegExp.escape(query), "ig"), "<b>$&</b>");
            let link = result.url;
            let snippet = result.content;
            let htmlSnippet = result.content.replace(new RegExp(RegExp.escape(query), "ig"), "<b>$&</b>");
            let htmlFormattedUrl = result.url.replace(new RegExp(RegExp.escape(query), "ig"), "<b>$&</b>");

            if (displayLink.match(/www\./)) {
                displayLink = result.parsed_url[1].replace(/www\./, "")
            }

            const returns = {
                title: title,
                htmlTitle: htmlTitle,
                displayLink: displayLink,
                link: link,
                snippet: snippet,
                htmlSnippet: htmlSnippet,
                htmlFormattedUrl: htmlFormattedUrl
            }
            results.data.items.push(returns)
        })

        const rand = new Intl.NumberFormat("en-US", {}).format(getRandomInt(2147483647))
        results.data.searchInformation.formattedTotalResults = rand

        return results;
    }
    catch(e) {
        console.error(e)
        const results = { data: { error: { title: "", desc: "" } }}
        results.data.error.title = "Error while fetching"
        results.data.error.desc = "<textarea rows=\"10\" cols=\"50\">" + e + "</textarea>"
        return results
    }
}