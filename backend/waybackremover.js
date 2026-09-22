import fs from "node:fs"
import jschardet from "jschardet"
import iconv from "iconv-lite"

let repl = fs.readFileSync("Google.html")

// repl = iconv.decode(repl, jschardet.detect(repl).encoding)
// repl = iconv.decode(repl, "shiftjis")
repl = repl.toString()

repl = repl.replace(/<script type=(.+\n)*<!-- End Wayback Rewrite JS Include -->/gm, "")
repl = repl.replace(/<!--\n     FILE ARCHIVED ON .*(\n.*)+-->/gm, "")
repl = repl.replace(/http:\\?\/\\?\/web.archive.org\\?\/web\\?\/\d+.{0,3}\//gm, "")
repl = repl.replace(/http.?:\/\/web.archive.org\/web\/\d+.{0,3}\//gm, "")
repl = repl.replace(/http.?:\/\/([^web.archive.org][a-z]*[1-9]*(\.)?){2,128}[a-z]*\/web\/\d+.{0,3}\//gm, "")
repl = repl.replace(/\/web\/\d+.{0,3}\//gm, "")
repl = repl.replace(/https:/g, "http:")
repl = repl.replace(/http:\\?\/\\?\/web.archive.org\\?\/web\\?\/\d+.{0,3}\//gm, "")
repl = repl.replace(/http.?:\/\/(www\.)?google\.com\//gm, "")

repl = iconv.encode(repl, "shiftjis")

fs.writeFileSync("wayback_output.html", repl)