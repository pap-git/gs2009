import request from 'request';
import { XMLParser } from 'fast-xml-parser';
import iconv from 'iconv-lite';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

function pull(query, hl, expIds, cp) {
    const url = "https://www.google.com/complete/search?q=" + encodeURIComponent(query) + "&hl=" + hl + "&output=toolbar"
    try {
        return new Promise(resolve => {
            request({ url:url, encoding: null }, (err, httpResponse, body) => {
                let result = ""
                try {
                    if (hl == "ja") {
                        result = iconv.decode(body, 'CP932')
                    } else {
                        result = body.toString('utf8')
                    }
                } catch {
                    console.log("[INFO] Could not convert string to UTF-8")
                    if (body == undefined) {
                        let send = "";
                        resolve(send)
                    } else {
                        if (hl == "ja") {
                            result = iconv.decode(body, 'CP932')
                        } else {
                            result = body.toString();
                        }
                    }
                }
                result = parser.parse(result)
                let send = "window.google.ac.h([\"" + query + "\",[";
                try {
                    result.toplevel.CompleteSuggestion.forEach(( content, i ) => {
                        // let now = "[\"" + content.suggestion.data + "\",\"\",\"" + i + "\"],"
                        // let now = "[\"" + content.suggestion.data + "\",\"" + content.suggestion.data + "\",\"\",\"\"],"
                        let now = "[\"" + content.suggestion.data + "\",[0]],"
                        send = send + now
                    })
                    send = send.replace(/(.*),/, "$1") + `] , {
                        "j":"${expIds}",
                        "client": "hp",
                        "q":"${query}",
                        "t":"${query}",
                        "cp":"${cp}",
                    }]);`;

                    resolve(send)
                } catch(e) {
                    console.log(e)
                    let send = "";
                    resolve(send)
                }
                
            })
        })
    } catch(e) {
        console.error(e)
    }
}

var exports = {};
export default { pull }
