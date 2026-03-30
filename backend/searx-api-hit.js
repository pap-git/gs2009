function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

export default async function searxngfetch(searchIP, isHTTPS, query, start, lr) {
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
    }
    if (query == undefined || query == "") {
        return
    }
    if (start != undefined) {
        page = 1 + (start / 10)
    } else {
        page = 1
    }

    url = url1 + "/?q=" + query + "&format=json" + "&pageno=" + page + "&engines=google"
    /*
    if (lr != undefined) {
        url = url + "&language=" + lr
    }
        */

    try {
        const result = await fetch(url)
        const json = await result.json();
        console.log(json)
        if (result.ok == false) {
            console.log(url)
            throw new Error("omg look at the status code you did it wrong: " + result.status)
        } else {
            console.log(result.status)
        }

        const results = { data: { searchInformation: { formattedTotalResults: 0 }, items: [] } }

        json.results.forEach(result => {
            if (result.template != "default.html") return;

            let htmlTitle = result.title;
            let displayLink = result.parsed_url[1];
            let link = result.url;
            let htmlSnippet = result.content;
            let htmlFormattedUrl = result.url;

            if (displayLink.match(/www\./)) {
                displayLink = result.parsed_url[1].replace(/www\./, "")
            }

            const returns = {
                htmlTitle: htmlTitle,
                displayLink: displayLink,
                link: link,
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
    }
}