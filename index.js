import fs from "fs"
import iconv from 'iconv-lite'
import path from "path"
import express from "express"
import cookie from 'cookie-parser';
import parseurl from 'parseurl';
import qs from 'qs';
import googleapis from 'googleapis';
import Encoding from 'encoding-japanese';
import autocomplete from './backend/pull_autocomplete.js'
import searxngfetch from './backend/searx-api-hit.js'
import cfg from "./backend/cfg.js";
import { log } from "./backend/things.js"
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import user from "./backend/user.js";
import toml from "toml"
import { dump } from "js-toml";
import { exec } from "child_process";

const pjson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const gs2009_version = pjson.version

const serviceID = "a5a0d64a-ae61-4972-81cd-97f3e2ee73a9"

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

var config = toml.parse(cfg.template)
var searxng_ishttps = false;

log.i("starting gs2009 instance, version " + gs2009_version, "init")

async function branchWarning() {
    const tag = "branch"
    // Source - https://stackoverflow.com/a/62228183
    // Posted by Aayush Mall, modified by community. See post 'Timeline' for change history
    // Retrieved 2026-09-23, License - CC BY-SA 4.0

    await exec('git rev-parse --abbrev-ref HEAD', (err, stdout, stderr) => {
        if (err) {
            log.e("Failed to retrive current branch from this directory", tag)
            return false
        }

        if (typeof stdout === 'string' && (stdout.trim() !== 'main')) {
            log.w("You're now in '" + stdout.trim() + "' which looks not main branch. If you are in the development branch you might see some issues or crashes!", tag)
        }
    });
}

await branchWarning()

function getLanguage(settings) {
    if (!settings || config.frontend.forceDefaults) return config.frontend.defaults.language
    const j = JSON.parse(settings)

    if (!j) return config.frontend.defaults.language
    else try {
        return j.language
    } catch {
        return config.frontend.defaults.language
    }
}

function grabSettings(settings) {
    if (!settings || config.frontend.forceDefaults) return config.frontend.defaults
    try {
        return JSON.parse(settings)
    } catch {
        return config.frontend.defaults
    }
}

async function grabEraPath(afterPath, language, era){
    const pathes = [
        path.join(__dirname, "/languages/", language, era, afterPath),
        path.join(__dirname, "/languages/", config.frontend.defaults.language, era, afterPath),
        path.join(__dirname, "/languages/", "en", era, afterPath),
        path.join(__dirname, "/languages/", language, "/defaults/", afterPath),
        path.join(__dirname, "/languages/", config.frontend.defaults.language, "/defaults/", afterPath),
        path.join(__dirname, "/languages/", "en", "/defaults/", afterPath)
    ]

    for (let i = 0; i < pathes.length; i++) {
        if (fs.existsSync(pathes[i])) { return pathes[i] }
    }
}

async function followPath(urlPath) {
    let result = undefined;
    const pathes = [
        // [original path, folder path]
        ["/__gs2009_wallma_/ig_main.js", "./assets/admin/assets/ig_main.js"],
        ["/__gs2009_wallma_/lib/libdrag.js", "./assets/admin/assets/libdrag.js"],
        ["/__gs2009_wallma_/lib/libtabs.js", "./assets/admin/assets/libtabs.js"],
        ["/__gs2009_wallma_/ig.css", "./assets/admin/assets/ig.css"],
        ["/__gs2009_wallma_/gs2009_wallma.png", "./assets/admin/assets/images/gs2009_wallma.png"],
        ["/__gs2009_wallma_/smiley.png", "./assets/admin/assets/images/smiley.png"],
        ["/__gs2009_wallma_/balls.gif", "./assets/images/balls.gif"],
        ["/__gs2009_wallma_/tl.gif", "./assets/admin/assets/images/tl.gif"],
        ["/__gs2009_wallma_/bl.gif", "./assets/admin/assets/images/bl.gif"],
        ["/__gs2009_wallma_/tr.gif", "./assets/admin/assets/images/tr.gif"],
        ["/__gs2009_wallma_/br.gif", "./assets/admin/assets/images/br.gif"],
        ["/__gs2009_wallma_/login.css", "./assets/admin/login.css"],
        ["/gs2009.png", "./assets/images/gs2009.png"],
        ["/images/logo_sm.gif", './assets/images/logo_sm.gif'],
        ['/accounts/msh.gif', './assets/images/accounts/msh.gif'],
        ['/intl/ja_ALL/images/logos/images_logo_lg.gif', './assets/images/ja-ALL/images_logo_lg.gif'],
        ['/accounts/ig.gif', './assets/images/accounts/ig.gif'],
        ['/accounts/sierra.gif', './assets/images/accounts/sierra.gif'],
        ['/accounts/google_transparent.gif', './assets/images/accounts/google_transparent.gif'],
        ['/intl/ja/images/logos/accounts_logo.gif', './assets/images/ja/accounts_logo.gif'],
        ['/intl/en/images/logos/accounts_logo.gif', './assets/images/en/accounts_logo.gif'],
        ['/accounts/intl/en/images/logos/accounts_logo.gif', './assets/images/en/accounts_logo.gif'],
        ['/favicon.ico', './assets/favicon.ico'],
        ['/intl/en_ALL/images/logo.gif', './assets/images/en-ALL/logo.gif'],
        ['/images/nav_logo3.png', './assets/images/nav_logo3.png'],
        ['/logos/olympics10-bg.jpg', './assets/logos/olympics10-bg.jpg'],
        ['/images/firefox/firefox35_v1.png', './assets/images/firefox/firefox35_v1.png'],
        ['/images/firefox/sprite2.png', './assets/images/firefox/sprite2.png'],
        ['/images/firefox/gradsprite2.png', './assets/images/firefox/gradsprite2.png'],
        ['/accounts/mail.gif', './assets/images/accounts/mail.gif'],
        ['/images/yellow_warning.gif', './assets/images/yellow_warning.gif'],
        ['/ig/f/q-xfFF7Vi4Y/intl/ALL_jp/jawh_vprodicons.png', './assets/images/ig/f/q-xfFF7Vi4Y/intl/ALL_jp/jawh_vprodicons.png'],
        ['/intl/ja/images/jawh_prodiconl6.png', './assets/images/ja/jawh_prodiconl6.png'],
        ['/ig/f/q-xfFF7Vi4Y/intl/ALL_jp/logo.gif', './assets/images/ig/f/q-xfFF7Vi4Y/intl/ALL_jp/logo.gif'],
        ['/accounts/googleaccountslogo.gif', './assets/images/accounts/googleaccountslogo.gif'],
        ['/ig/f/6ULrcrp42tM/intl/ALL_jp/homepage.js', './assets/ig/f/6ULrcrp42tM/intl/ALL_jp/homepage.js'],
        ['/intl/ja/images/productlinktabs.png', './assets/images/ja/productlinktabs.png'],
        ['/images/nav_logo6.png', './assets/images/nav_logo6.png'],
        ['/intl/ja/images/jawh_prodicons1.png', './assets/images/ja/jawh_prodicons1.png'],
    ]

    for (let i = 0; i < pathes.length; i++) {
        try {
            if (pathes[i][0] == urlPath) {
                result = fs.readFileSync(pathes[i][1])
                break;
            }
        } catch {}
    }

    return result
}

async function reloadconfig(){
    const tag = "cfg"
    log.i("reloading config", tag)

    config = toml.parse(cfg.template)
    if (!cfg.exists(path.join(__dirname, "config.json")) && !cfg.exists(path.join(__dirname, "config.toml"))) await cfg.gen()

    if (cfg.exists(path.join(__dirname, "config.json")) && !cfg.exists(path.join(__dirname, "config.toml"))) {
        if (cfg.isOld(JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"))))) {
            log.w("old config found, backing up before convert", tag)
            fs.renameSync(path.join(__dirname, "config.json"), path.join(__dirname, "config.old.json"))
            fs.writeFileSync(path.join(__dirname, "config.toml"), ("# This is configuration file for this gs2009 instance.\n# Converted from previous version (1.x) via gs2009 version " + gs2009_version + "\n# Please refer '/backend/config.template.toml' for the explaination of each options.\n\n" + dump(cfg.convertOld(JSON.parse(fs.readFileSync(path.join(__dirname, "config.old.json")))))))
            log.w("config converted to new format, Please check your config is matched with your previous one", tag)
        }
    }

    config = toml.parse(fs.readFileSync("config.toml"))

    config.engine.order.forEach((engineName) => {
        switch (engineName) {
            case "cse":
                if (config.engine.csjapi.api_key == "") {
                    log.w("Custom Search API (config.engine.csjapi.api_key) is not set correctl! Please check your config.toml")
                }
                if (config.engine.csjapi.cse_id == "") {
                    log.w("Search Engine ID (config.engine.csjapi.cse_id) is not set correctly! Please check your config.toml")
                }
                break;
            case "searxng":
                if (config.engine.searxng.url == "") {
                    log.w("SearXNG instance URL (config.engine.searxng.url) is not set correctly! Please check your config.toml")
                }
                break;
            default:
                throw new Error("Unknown engine name:", engineName)
        }
    })

    if (config.users.enabled) {
        if (config.users.location.secretdb.toString().length < 1 || config.users.location.userdb.toString().length < 1) {
            log.e((config.users.location.secretdb.toString().length < 1 ? "config: invaild path: users.location.secretdb" : "config: invaild path: users.location.userdb"), tag)
            log.e("exiting!", tag)
            process.exit(1)
        }
        if (!fs.existsSync(path.join(config.users.location.secretdb))) {
            fs.writeFileSync(config.users.location.secretdb, JSON.stringify([]))
            log.i("Created new database: " + path.join(config.users.location.secretdb), tag)
        }
        if (!fs.existsSync(path.join(config.users.location.userdb))) {
            fs.writeFileSync(config.users.location.userdb, JSON.stringify([]))
            log.i("Created new database: " + path.join(config.users.location.userdb), tag)
        }
    }
}

await reloadconfig()

const app = express();

function retriveTemplate(lang) {
    function GiveMeTheResult(lang, next_path) {
        const langTemplatePath = path.join(__dirname, "/languages/", lang, "/defaults/_templates")
        const enTemplatePath = path.join(__dirname, "/languages/", "en", "/defaults/_templates")
        return fs.existsSync(path.join(langTemplatePath, next_path)) ? path.join(langTemplatePath, next_path) : path.join(enTemplatePath, next_path)
    }

    const paths = {
        gbar_user: GiveMeTheResult(lang, "/gbar_user.txt"), // ext_t_g_u
        gbar_user_index: GiveMeTheResult(lang, "/gbar_user_index.txt"), // ext_t_g_u
        gbar_user_logged: GiveMeTheResult(lang, "/gbar_user_logged.txt"), // ext_t_g_u_l

        auth_mismatch: GiveMeTheResult(lang, "/auth_mismatch.txt"),

        search_normal: GiveMeTheResult(lang, "/search/normal.txt"), // ext_t_s_n
        search_more: GiveMeTheResult(lang, "/search/more.txt"), // ext_t_s_m
        search_EOM: GiveMeTheResult(lang, "/search/more_eom.txt"), // ext_t_s_EOM
        search_notfound: GiveMeTheResult(lang, "/search/not_found.txt"), // ext_t_s_nf

        did_you_mean: GiveMeTheResult(lang, "/search/did_you_mean.txt"), // ext_t_dym
    }

    const data = {
        gbar_user: fs.readFileSync(paths.gbar_user, "utf8"),
        gbar_user_index: fs.readFileSync(paths.gbar_user_index, "utf8"),
        gbar_user_logged: fs.readFileSync(paths.gbar_user_logged, "utf8"),

        auth_mismatch: fs.readFileSync(paths.auth_mismatch, "utf8"),

        search_normal: fs.readFileSync(paths.search_normal, "utf8"),
        search_more: fs.readFileSync(paths.search_more, "utf8"),
        search_EOM: fs.readFileSync(paths.search_EOM, "utf8"),
        search_notfound: fs.readFileSync(paths.search_notfound, "utf8"),

        did_you_mean: fs.readFileSync(paths.did_you_mean, "utf8")
    }
    return {
        paths, data
    }
}

var query;
var actualq;

var hl;
var lr;
var start;

// https://qiita.com/ganyariya/items/23d51b05bacdcb27fce6
// im using the google search example from here v (thx for og author)

async function search(event) {

    if (isNaN(start) == true) {
        start = 0;
    }

    let result;
    let errorCounts = 0;

    for (let i = 0; i < config.engine.order.length; i++) {
        log.i("trying engine: " + config.engine.order[i], "search")
        switch (config.engine.order[i]) {
            case "cse":
                if (!config.engine.csjapi.api_key || !config.engine.csjapi.cse_id) throw new Error("Either API key or CSE ID is missing on Custom Search JSON API settings")

                try {
                    const {google} = googleapis;
                    const customSearch = google.customsearch("v1");
                    result = await customSearch.cse.list({
                        auth: config.engine.csjapi.api_key,
                        cx: config.engine.csjapi.cse_id,
                        q: query,
                        hl: hl,
                        lr: lr,
                        start: start
                    });
                    i = config.engine.order.length
                } catch(e) {
                    log.e("got an error on engine '" + config.engine.order[i] + "', skipping")
                    log.e(e.trace)
                    errorCounts++
                }
                break;
            case "searxng":
                try {
                    let temp_searxng_ishttps
                    if (config.engine.searxng.url.match(/https:\/\//) || config.engine.searxng.url.match(/http:\/\//)) {
                        temp_searxng_ishttps = searxng_ishttps
                        searxng_ishttps = undefined
                    }
                    result = await searxngfetch(config.engine.searxng.url, searxng_ishttps, true, query, start, lr)
                    searxng_ishttps = temp_searxng_ishttps

                    if (result.data.error) throw new Error("bye bro")
                    i = config.engine.order.length
                } catch(e) {
                    log.e("got an error on engine '" + config.engine.order[i] + "', skipping")
                    errorCounts++
                }
                break;
            default:
                throw new Error("??? got new engine called " + config.engine.order[i])
        }
    }

    if (errorCounts == config.engine.order.length) log.e("Failed to retrive results on every engine", "search")
    return(result);
}

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(cookie());
app.use(express.static('public'));

app.use(async (req, res, next) => {
    // for some of server like in the issue #18 
    if (Array.from(req.url)[0] + Array.from(req.url)[1] == "//") {
        req.url = req.url.slice(1)
    }

    if (req.cookies.GS2009_ACCOUNTS) {
        let clear = false;
        if (config.users.enablePasswordAuth) {
            const result = await user.auth(JSON.parse(req.cookies.GS2009_ACCOUNTS).email, JSON.parse(req.cookies.GS2009_ACCOUNTS).auth)
            if (!result) {
                clear = true;
                res.clearCookie('GS2009_ACCOUNTS');
                res.clearCookie('GS2009_SETTINGS');
            }
        }

        let age = {};
        if (JSON.parse(req.cookies.GS2009_ACCOUNTS).stayWithMe) {
            age = { maxAge: 31 * 24 * 60 * 60 * 1000 }
        }
        let userdata;

        try {
            if (clear) throw new Error("e")
            userdata = await user.get(JSON.parse(req.cookies.GS2009_ACCOUNTS).email, JSON.parse(req.cookies.GS2009_ACCOUNTS).auth, serviceID)
            res.cookie('GS2009_ACCOUNTS', JSON.stringify({
                email: JSON.parse(req.cookies.GS2009_ACCOUNTS).email,
                auth: JSON.parse(req.cookies.GS2009_ACCOUNTS).auth,
                stayWithMe: JSON.parse(req.cookies.GS2009_ACCOUNTS).stayWithMe
            }), age)
            res.cookie('GS2009_SETTINGS', config.frontend.forceDefaults ? JSON.stringify(config.frontend.defaults) : JSON.stringify(userdata.settings), age);
        } catch {
            res.clearCookie('GS2009_ACCOUNTS');
            res.clearCookie('GS2009_SETTINGS');
        }
    }

    const assets = await followPath(req._parsedUrl.pathname)
    if (assets) {
        res.send(assets)
        return;
    }
    if (req.url.includes("webhp")) req.url = req.url.replace("webhp", "")
    next()
})

app.listen(config.server.port, () => {
    const tag = "init"
    log.i(`Server started at port ${config.server.port} in ` + Date(), tag);
});

app.get('/setprefs', (req, res) => {
    // this code is so FUCKED LOL
    return
    /*
    let redir_temp
    let redirhttp_temp
    let onlyold_temp
    let searxng_eg_temp

    if (req.query.redir == "on") {
        redir_temp = "both"
    } else {
        redir_temp = req.query.redir
    }

    if (req.query.searxng_eg != "1") {
        searxng_eg_temp = false
    } else {
        searxng_eg_temp = true
    }

    if (req.query.redirhttp != '1') {
        redirhttp_temp = false;
    } else {
        redirhttp_temp = true;
    }

    if (req.query.onlyold != '1') {
        onlyold_temp = false;
    } else {
        onlyold_temp = true;
    }

    const JsonTemp = {
        PORT: port,

        LANGUAGE: req.query.hl,

        ENGINE: req.query.engine,
        SEARXNG_URL: req.query.searxng_url,
        SEARXNG_ISHTTPS: req.query.searxng_ishttps,
        SEARXNG_USEOTHERENGINE: searxng_eg_temp,

        API_KEY: req.query.apikey,
        CSE_ID: req.query.cseid,

        REDIRECTOR_OPTION: redir_temp,
        REDIRECT_HTTP: redirhttp_temp,

        YT2009_ADDRESS: req.query.yt2009addr,

        ONLY_OLD: onlyold_temp,
        ONLY_OLD_DATE: req.query.onlyolddate,

        SEARCH_QUERY: req.query.enablesq
    }

    console.log(JsonTemp)
    fs.writeFileSync('config.json', JSON.stringify(JsonTemp));
    console.log("[INFO] Generated config.json to " + __dirname + "/config.json")
    reloadconfig();
    reloadtemplate();
    res.redirect('/');
    */
})

app.get('/intl/ja_jp/images/logo.gif', (req, res) => {
    let now = new Date
    let nowdate = (now.getMonth() + 1) + (now.getDay() < 10 ? 0 + now.getDay().toString() : now.getDay())
    
    let logo_path;

    switch(nowdate){
        case "0209":
            logo_path = './assets/logos/soseki10-hp.gif'
            break;
        default:
            logo_path = './assets/images/ja_jp/logo.gif';
    }

    res.type("gif").send(fs.readFileSync(logo_path))
})

app.get('/logos/olympics10.png', (req, res) => {
    const language = getLanguage(req.cookies.GS2009_SETTINGS)

    let now = new Date
    let nowmonth = now.getMonth() + 1
    let tmp = now.getDay()
    let nowday
    nowday = tmp < 10 ? 0 + tmp.toString() : tmp
    let nowdate = nowmonth.toString() + nowday.toString()
    let logo_path = './assets/images/ja_jp/logo.gif';
    switch (nowdate) {
        case "0213":
            logo_path = language == "ja" ? './assets/logos/olympics10-opening-nr-hp.png' : './assets/logos/olympics10-opening-hp.png'
            break;
        case "0214":
        case "0215":
            logo_path = './assets/logos/olympics10-snowboarding-hp.png'
            break;
        case "0216":
            logo_path = './assets/logos/olympics10-xcskiing-hp.png'
            break;
        case "0217":
            logo_path = './assets/logos/olympics10-curling-hp.png'
            break;
        case "0218":
            logo_path = './assets/logos/olympics10-xcskiiing2-hp.png'
            break;
        case "0219":
        case "0220":
            logo_path = './assets/logos/olympics10-apskiing-hp.png'
            break;
        case "0221":
            logo_path = './assets/logos/olympics10-skijump-hp.png'
            break;
        case "0222":
            logo_path = './assets/logos/olympics10-bobsleigh-hp.png'
            break;
        case "0223":
            logo_path = './assets/logos/olympics10-icedance-hp.png'
            break;
        default:
            logo_path = './assets/images/ja_jp/logo.gif'
    }

    res.type('png').send(fs.readFileSync(logo_path))
})

app.get('/extern_js/f/autocomplete.js', async (req, res) => {
    const language = getLanguage(req.cookies.GS2009_SETTINGS)
    let jsFilePath
    switch (grabSettings(req.cookies.GS2009_SETTINGS).eras) {
        case "early2009":
            jsFilePath = './assets/extern_js/autocomplete_early2009.js'
            break;
        case "mid2009":
            jsFilePath = './assets/extern_js/autocomplete_mid2009.js'
            break;
        default:
            jsFilePath = './assets/extern_js/autocomplete.js'
    }

    fs.readFile(jsFilePath, async (err, data) => {
        let repl = data.toString();

        const filePath = await grabEraPath("/index.html", language, grabSettings(req.cookies.GS2009_SETTINGS).eras);
        fs.readFile(filePath, (err, data) => {
            let conv;

            if (language == "ja") {
                conv = iconv.decode(data, 'shift_jis')
            } else {
                conv = data.toString();
            }

            let str_search = conv.substring(conv.indexOf('name=btnG') + 29)
            str_search = str_search.substring(0, str_search.indexOf('"'));
            let str_imfl = conv.substring(conv.indexOf('name=btnI') + 29)
            str_imfl = str_imfl.substring(0, str_imfl.indexOf('"'));
            // console.log(str_search);
            // console.log(str_imfl);

            repl = repl.replace("str_search", str_search)
            repl = repl.replace("str_imfl", str_imfl)

            res.send(repl)
        })

        
    });
})

app.get('/complete/search', async (req, res) => {
    const language = getLanguage(req.cookies.GS2009_SETTINGS)

    let result = "";
    let hl = "";

    // console.log(req.query)
    // console.log(req.originalUrl)
    if (req.query.hl == "" || req.query.hl == undefined) {
        hl = language;
    } else {
        hl = req.query.hl;
    }

    result = await autocomplete.pull(req.query.q, hl, req.query.expIds, req.query.cp)
    if (language == "ja") {
        result = iconv.encode(result.toString(), 'shift_jis')
        res.set('Content-Type','text/javascript; charset=Shift_JIS')
    } else {
        res.set('Content-Type','text/javascript')
    }
    res.status(200)
    res.send(result)
})

app.get('/generate_204'), ((req, res) => {
    res.status(204).send("");
})

app.get('/notepad', (req, res) => {
    const filePath = path.join(__dirname, "/html/eggs/notepad.html");
    fs.readFile(filePath, (err, data) => {
        let repl = data.toString();
        const wordlist = ["evilest", "evil", "cool", "wowie", "googlest", "coolest", "greatest", "pre", "applest", "everest", "more cooler", "very", ""]

        repl = repl.replace(/okest/, wordlist[getRandomInt(wordlist.length)])
        res.send(repl)
    } )
    return
});

app.get('/search_csstest', (req, res) => {
    const language = getLanguage(req.cookies.GS2009_SETTINGS)
    // console.log("[INFO] Simulated login username: " + req.cookies.SimLogin);
    let SimLogin = undefined;
    try {
        SimLogin = JSON.parse(req.cookies.GS2009_ACCOUNTS).email
    } catch {}
    const filePath = path.join(__dirname, "/languages/" + language + "/defaults/" + "/search.html");
    fs.readFile(filePath, (err, data) => {
        let repl = "";
        
        if (language == "ja") {
            repl = iconv.decode(data, 'shift_jis')
        } else {
            repl = data.toString();
        }

        if (SimLogin == undefined || SimLogin == "" || SimLogin == "undefined") {
            repl = repl.replace("gbar_user_REPLACE_HERE", ext_t_g_u_i)
        } else {
            repl = repl.replace("gbar_user_REPLACE_HERE", ext_t_g_u_l)
        }
        
        repl = repl.replace(/gbar_username/g, SimLogin)
        if (language == "ja"){
            let encoded = iconv.encode(repl, 'shift_jis')
            res.set("Content-Type", "text/html;charset=Shift_JIS")
            res.send(encoded)
            return
        }
        res.send(repl)
        
    } )
    return
});

app.get('/imghp', (req, res) => {
    const language = getLanguage(req.cookies.GS2009_SETTINGS)
    let SimLogin = undefined;
    try {
        SimLogin = JSON.parse(req.cookies.GS2009_ACCOUNTS).email
    } catch {}
    // console.log("[INFO] Simulated login username: " + req.cookies.SimLogin);
    if (SimLogin === undefined && SimLogin == 'undefined') {
        const filePath = path.join(__dirname, "/languages/" + language + "/defaults/" + "/images/index.html");
            fs.readFile(filePath, (err, data) => {
            res.set("Content-Type", "text/html;charset=Shift_JIS")
            res.send(data)
        } )
        return
    }
    const filePath = path.join(__dirname, "/languages/" + language + "/defaults/" + "/images/index_signed_in.html");
    fs.readFile(filePath, (err, data) => {
        let decoded = iconv.decode(data, 'shift_jis')
        let replaced = decoded.replace(/username/g, SimLogin)
        let encoded = iconv.encode(replaced, 'shift_jis')
        res.set("Content-Type", "text/html;charset=Shift_JIS")
        res.send(encoded)
    } )
    return
});

app.get('/csi', async (req, res) => {
    // does do anything?
    res.send("")
})

app.get('/', async (req, res) => {
    const language = getLanguage(req.cookies.GS2009_SETTINGS)
    const template = retriveTemplate(language)
    // console.log("[INFO] Simulated login username: " + req.cookies.SimLogin);
    let SimLogin = undefined;
    try {
        SimLogin = JSON.parse(req.cookies.GS2009_ACCOUNTS).email
    } catch {}

    let now = new Date
    let nowmonth = now.getMonth() + 1
    let tmp = now.getDay()

    let filePath

    switch (grabSettings(req.cookies.GS2009_SETTINGS).eras) {
        case "early2010":
            if (nowmonth == 2){
                if (tmp >= 12 && tmp <= 23) {
                    filePath = await grabEraPath("/index-olympics10.html", language, grabSettings(req.cookies.GS2009_SETTINGS).eras)
                } else {
                    filePath = await grabEraPath("/index.html", language, grabSettings(req.cookies.GS2009_SETTINGS).eras)
                }
            } else {
                filePath = await grabEraPath("/index.html", language, grabSettings(req.cookies.GS2009_SETTINGS).eras)
            }
            break;
        default:
            filePath = await grabEraPath("/index.html", language, grabSettings(req.cookies.GS2009_SETTINGS).eras);
            break;
    }
        
    fs.readFile(filePath, (err, data) => {
        let repl = "";
        
        repl = language == "ja" ? iconv.decode(data, 'shift_jis') : repl = data.toString();

        repl = (SimLogin == undefined || SimLogin == "" || SimLogin == "undefined") ? 
                repl.replace("gbar_user_REPLACE_HERE", template.data.gbar_user_index) : 
                repl.replace("gbar_user_REPLACE_HERE", template.data.gbar_user_logged)

        let messagelist = JSON.parse(fs.readFileSync('languages/' + language + "/defaults/" + 'messages.json', 'utf8'))

        let now = new Date
        let nowmonth = now.getMonth() + 1
        let tmp = now.getDay()
        let nowday 
        if (tmp < 10) {
            nowday = 0 + tmp.toString()
        } else {
            nowday = tmp
        }
        let nowdate = nowmonth.toString() + nowday.toString()
        let message;

        messagelist.messages.forEach(item => {
            if (nowdate.toString() == item.date) {
                message = item.message
            }
        })
        repl = repl.replace(/message/g, message)
        repl = repl.replace(/message/g, "")
        
        repl = repl.replace(/undefined/g, "")
        repl = repl.replace(/gbar_username/g, SimLogin)
        if (language == "ja"){
            let encoded = iconv.encode(repl, 'shift_jis')
            res.set("Content-Type", "text/html;charset=Shift_JIS")
            res.send(encoded)
            return
        }
        res.send(repl)
        
    } )
    return
});

app.get('/gs2009settings', (req, res) => {
    res.redirect("/__gs2009_wallma_/ig")
})

app.get('/accounts/Login', async (req, res) => {
    const language = getLanguage(req.cookies.GS2009_SETTINGS)
    const template = retriveTemplate(language)
    const file = await grabEraPath("/signin.html", language, grabSettings(req.cookies.GS2009_SETTINGS).eras)
    let repl = fs.readFileSync(file)
    
    if (language == "ja") {
        res.set("Content-Type", "text/html;charset=Shift_JIS")
        repl = iconv.decode(repl, "shiftjis")
    } else {
        repl = repl.toString()
    }

    if (req.cookies.GS2009_AUTH_MISMATCH) {
        switch (grabSettings(req.cookies.GS2009_SETTINGS).eras) {
            case "early2009":
                repl = repl.replace(/<td align="left">[^{a-z}]*<\/td>[^{a-z}]*<\/tr>[^{a-z}]*<tr>[^{a-z}]*td align="right" va/, '<td align="left">' + template.data.auth_mismatch + '</td></tr><tr><td align="right" va')
            default:
                repl = repl.replace(/<td align="left">[^{a-z}]*<\/td>[^{a-z}]*<\/tr>[^{a-z}]*<tr id="re/, '<td align="left">' + template.data.auth_mismatch + '</td></tr><tr id="re')
        }
        res.clearCookie("GS2009_AUTH_MISMATCH")
    }

    if (language == "ja") repl = iconv.encode(repl, "shiftjis")
    res.send(repl)
})

app.get('/firefox', (req, res) => {
    const filePath = path.join(__dirname, "/languages/" + language + "/defaults/" + "/firefox/index.html");
    if (language == "ja") {
        fs.readFile(filePath, (err, data) => {
            res.set("Content-Type", "text/html;charset=Shift_JIS")
            res.send(data)
        })
    } else {
        fs.readFile(filePath, (err, data) => {
            data = data.toString();
            res.send(data)
        })
    }
})

app.post('/accounts/LoginAuth', async (req, res) => {
    /*
    // console.log(req.body);
    var SimLogin = req.body.Email;
    /*
    if (SimLogin = "undefined") {
        res.writeHead(302, {
	        'Location': '/'
            });
        res.end();
    }
    */
    /*
    res.cookie('SimLogin', SimLogin, { maxAge: 2592000000 });
    res.redirect('/');
    */
    
    if (config.users.enablePasswordAuth ? (await user.auth(req.body.Email, user.md5saltMe(req.body.Passwd))) : await user.exists(req.body.Email, "boolean")) {
        // would implement session id
        let age = {};
        if (req.body.PersistentCookie === "yes") {
            age = { maxAge: 31 * 24 * 60 * 60 * 1000 }
        }
        let userdata;

        try { 
            userdata = await user.get(req.body.Email, user.md5saltMe(req.body.Passwd), serviceID)
            
            if (!userdata) userdata = await user.modifyData(req.body.Email, serviceID, config.frontend.defaults, true)
        } catch {
            await user.modifyData(req.body.Email, serviceID, config.frontend.defaults, false)
            userdata = await user.get(req.body.Email, user.md5saltMe(req.body.Passwd), serviceID)
        }

        res.cookie('GS2009_ACCOUNTS', JSON.stringify({
            email: req.body.Email,
            auth: user.md5saltMe(req.body.Passwd),
            stayWithMe: req.body.PersistentCookie === "yes" ? JSON.parse(true) : JSON.parse(false)
        }), age)
        res.cookie('GS2009_SETTINGS', JSON.stringify(userdata.settings), age);
        res.send("<script>document.location.href = '/'</script>")
    } else {
        res.cookie("GS2009_AUTH_MISMATCH", JSON.stringify(true))
        res.redirect("/accounts/Login")
    }
})

app.get('/accounts/NewAccount', async (req, res) => {
    const language = getLanguage(req.cookies.GS2009_SETTINGS)
    const filePath = await grabEraPath("/signup.html", language, grabSettings(req.cookies.GS2009_SETTINGS).eras);
    fs.readFile(filePath, (err, data) => {
        let repl = "";
        
        repl = language == "ja" ? iconv.decode(data, 'shift_jis') : repl = data.toString();
        if (language == "ja"){
            let encoded = iconv.encode(repl, 'shift_jis')
            res.set("Content-Type", "text/html;charset=Shift_JIS")
            res.send(encoded)
            return
        }
        res.send(repl)
    } )
    return
})

app.get("/accounts/ServiceLogin", (req, res) => {
    res.redirect("/accounts/Login")
})

app.post('/accounts/CreateAccount', async (req, res) => {
    if (await user.exists(req.body.Email, "boolean")) { log.e("Failed to register the user '" + req.body.Email + "' to database: User already exists"); res.send("<head><title>gogul account</title></head>you failed to register the user but i am so tired to implement the feature to show proper error so go back to previous page bro"); return; }
    if (!(req.body.Passwd == req.body.PasswdAgain) || (req.body.Passwd.length < 8 || req.body.PasswdAgain.length < 8)) { log.e("Failed to register the user '" + req.body.Email + "' to database: Password mismatch"); res.send("<head><title>gogul account</title></head>you failed to register the user but i am so tired to implement the feature to show proper error so go back to previous page bro"); return; }
    await user.add(req.body.Email, user.md5saltMe(req.body.Passwd))

    let age = {};
    if (req.body.PersistentCookie === "yes") {
        age = { maxAge: 31 * 24 * 60 * 60 * 1000 }
    }
    const userdata = await user.modifyData(req.body.Email, serviceID, config.frontend.defaults, true)
    res.cookie('GS2009_ACCOUNTS', JSON.stringify({
        email: req.body.Email,
        auth: user.md5saltMe(req.body.Passwd),
        stayWithMe: req.body.PersistentCookie === "yes" ? JSON.parse(true) : JSON.parse(false)
    }), age)
    res.cookie('GS2009_SETTINGS', JSON.stringify(userdata.settings), age);
    res.send()
})

app.get('/clearcookies', (req, res) => {
    res.clearCookie('GS2009_ACCOUNTS');
    res.clearCookie('GS2009_SETTINGS');
    res.redirect('/');
})

app.get('/search', async (req, res) => {
    const tag = "search"

    const language = getLanguage(req.cookies.GS2009_SETTINGS)
    log.i("got an /search GET", tag)
    const startTime = Date.now();
    let nowTime = 0;
    var sqparam = qs.parse(parseurl(req).query);
    if (sqparam.q == "" || sqparam.q == undefined) {
        log.w("query was empty, redirecting to /", tag)
        res.redirect('/');
        return
    }
    if (sqparam.q.includes('%')) {
        log.i("maybe Shift-JIS? trying to decode to Unicode", tag)
        let sjisArray = Encoding.urlDecode(sqparam.q);
        let unicodeArray = Encoding.convert(sjisArray, { to: 'UNICODE', from: 'SJIS' });
        query = Encoding.codeToString(unicodeArray);
    } else {
        query = sqparam.q;
    }
    log.i("extracted query: " + query, tag)

    if (grabSettings(req.cookies.GS2009_SETTINGS).before !== "0000-00-00") {
        log.i("before date was not 0000-00-00, adding before: param to query", tag)
        actualq = query
        query = query + " before:" + grabSettings(req.cookies.GS2009_SETTINGS).before;
    }

    // console.log(req.query)

    if (req.query.hl == "" || req.query.hl == undefined) {
        hl = language;
    } else {
        hl = req.query.hl;
    }
    if (req.query.lr != "" || req.query.lr != undefined) {
        lr = req.query.lr
    }

    if (req.query.start != "" || req.query.start != undefined) {
        start = parseInt(req.query.start) + 1;
    } else {
        start = 0;
    }

    log.i("waiting for result", tag)

    let result;
    try {
        result = await search();
    } catch(e) {
        /*
        if (config.backend.engine.type == "cse") {
            console.error("[ERROR] GaxiosError:", e.cause.status);
            console.error("[ERROR]", e.cause.message);
            if (e.cause.status != "RESOURCE_EXHAUSTED") {
                const filePath = path.join(__dirname, "/html/error.html");
                fs.readFile(filePath, (err, data) => {
                    let repl = data.toString();
                    repl = repl.replace(/status/, e.cause.status)
                    repl = repl.replace(/message/, e.cause.message)
                    res.send(repl)
                })
            } else {
                const filePath = path.join(__dirname, "/html/quota.html");
                fs.readFile(filePath, (err, data) => {
                    data = data.toString();
                    res.send(data)
                })
            }
        } else {
            console.error("[ERROR]", e)
            const filePath = path.join(__dirname, "/html/error.html");
            fs.readFile(filePath, (err, data) => {
                let repl = data.toString();
                repl = repl.replace(/status/, "")
                repl = repl.replace(/message/, e)
                res.send(repl)
            })
        }
        */
        
        return
    }

    log.i("got an result", tag)
    
    // console.log("result: ", result);
    // console.log(JSON.stringify(result.data.items, null, 2))
    // console.log("-----------------------------------------------");
    const link = [];
    let filePath = "";

    try {
        let test_result_length = result.data.items.length
    } catch {
        log.e("nvm thats error", tag)
        const filePath = path.join(__dirname, "/html/error.html");
        fs.readFile(filePath, (err, data) => {
            let repl = data.toString();
            repl = repl.replace(/status/, result.data.error.title)
            repl = repl.replace(/message/, result.data.error.desc)

            res.send(repl)
        })
        return
    }

    result.data.items.forEach(item => {
        // console.log("-----------------------------")
        // console.log(item.htmlTitle, item.displayLink, item.link, item.htmlSnippet, item.htmlFormattedUrl)
        link.push(item.displayLink);
    })

    if (req.query.btnI == "I'm Feeling Lucky") {
        log.i("feeling lucky, redirecting to first link", tag)
        res.redirect(result.data.items[0].link)
        return
    }

    const linklist = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const alphlist = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

    log.i("Sorting item", tag)
    link.forEach((item, i) => {
        
        // console.log("link:" + link[i])
        let alp = alphlist[i];
        // console.log("link alp:" + alp)
        result.data.items.forEach((item, o) => {
            // console.log("checking url:", item.displayLink)
            if (linklist[i] == 0 || o == i || typeof linklist[i] !== 'number'){
                // console.log("no")
                return
            }
            if (link[i] == item.displayLink){
                if (i <= o || isNaN(linklist[i])) {
                    // console.log("matched???? nah")
                    return
                }
                // console.log("matched!")
                linklist[i] = o + alp
                return
            }
            // console.log("checked:" + o)
        })
        // console.log("checked url:" + i)
    })

    const linkalplist = [...linklist].sort();
    const linknumlist = [...linklist].sort();

    linknumlist.forEach((item, i) => {
        if (typeof linknumlist[i] !== 'number') {
            linknumlist[i] = alphlist.indexOf(linknumlist[i].slice(1));
        }
    })

    log.i("Sorted Alphabet list: " + linkalplist.toString(), tag)
    log.i("Sorted Number list: " + linknumlist.toString(), tag)

    filePath = path.join(__dirname, "/languages/" + language + "/defaults/" + "/search.html");
    
    fs.readFile(filePath, (err, data) => {
        const template = retriveTemplate(language)

        let repl = "";
        
        if (language == "ja") {
            repl = iconv.decode(data, 'shift_jis')
        } else {
            repl = data.toString();
        }

        let SimLogin = undefined;
        try {
            SimLogin = JSON.parse(req.cookies.GS2009_ACCOUNTS).email
        } catch {}

        if (SimLogin == undefined || SimLogin == "" || SimLogin == "undefined") {
            repl = repl.replace("gbar_user_REPLACE_HERE", template.data.gbar_user)
        } else {
            repl = repl.replace("gbar_user_REPLACE_HERE", template.data.gbar_user_logged)
        }

        if (result.data.items.length < 1) {
            log.i("no result found for the query: " + query, tag)
            repl = repl.replace(/didyoumean/g, "");
            repl = repl.replace(/item/g, "");

            repl = repl.replace(/topItem/g, template.data.search_notfound);

            repl = repl.replace(/<p>(\s+.+){1,2}\s+<div id="res" class="med">/, '<p><br></p></div><div id="res" class="med">')

            if (grabSettings(req.cookies.GS2009_SETTINGS).before !== "0000-00-00") {
                repl = repl.replace(/query/g, actualq)
            } else {
                repl = repl.replace(/query/g, query)
            }
            if (language == "ja"){
                let encoded = iconv.encode(repl, 'shift_jis')
                res.set("Content-Type", "text/html;charset=Shift_JIS")
                res.send(encoded)
                return
            }
            res.send(repl)
            return
        }
        
        if (grabSettings(req.cookies.GS2009_SETTINGS).before !== "0000-00-00") {
            repl = repl.replace(/query/g, actualq)
        } else {
            repl = repl.replace(/query/g, query)
        }
        
        let lastIdx = linkalplist.findLastIndex(item => /[a-z]/i.test(item))
        
        let items = repl.split("item")

        let count = linkalplist.filter(v => /[a-z]/i.test(String(v))).length
        if (count == 0) {
            void(0);
        } else {
            result.data.items.forEach((item, i) => {
                if (typeof linkalplist[i] !== 'number') {
                    if (typeof linkalplist[i+1] == 'number') {
                        items.splice(i + 1, 0, "lastone\n")
                    }
                }
            })
        }

        repl = items.join("item")

        result.data.items.forEach((item, i) => {
            if (typeof linkalplist[i] !== 'number') {
                repl = repl.replace(/item/, template.data.search_more)
                return
            }
            repl = repl.replace(/item/, template.data.search_normal)
            repl = repl.replace(/lastone/, template.data.search_EOM)
        })

        const search = [];
        search.htmlTitle = "";
        search.link = "";
        search.htmlSnippet = "";
        search.htmlFormattedUrl = "";
        search.displayLink = "";

        result.data.items.forEach((item, i) => {
            const search = [];
            search.htmlTitle = "";
            search.link = "";
            search.htmlSnippet = "";
            search.htmlFormattedUrl = "";
            search.displayLink = "";

            try {
                if (i != linknumlist[i]){
                    search.htmlTitle = result.data.items[linknumlist[i]].htmlTitle;
                    search.link = result.data.items[linknumlist[i]].link;
                    search.htmlFormattedUrl = result.data.items[linknumlist[i]].htmlFormattedUrl;
                    search.htmlSnippet = result.data.items[linknumlist[i]].htmlSnippet;
                    search.displayLink = result.data.items[linknumlist[i]].displayLink;
                } else {
                    search.htmlTitle = item.htmlTitle;
                    search.link = item.link;
                    search.htmlFormattedUrl = item.htmlFormattedUrl;
                    search.htmlSnippet = item.htmlSnippet;
                    search.displayLink = item.displayLink;
                }
            } catch {
                search.htmlTitle = item.htmlTitle;
                search.link = item.link;
                search.htmlFormattedUrl = item.htmlFormattedUrl;
                search.htmlSnippet = item.htmlSnippet;
                search.displayLink = item.displayLink;
            }
            
            repl = repl.replace(/htmlTitle/, search.htmlTitle)
            if (grabSettings(req.cookies.GS2009_SETTINGS).redirect.enabled.includes("http") == true) {
                search.link = search.link.replace("https://", "http://")
            }
            if (grabSettings(req.cookies.GS2009_SETTINGS).redirect.enabled.length < 1) {
                grabSettings(req.cookies.GS2009_SETTINGS).redirect.enabled.forEach(target => {
                    let waybacklink
                    switch (target) {
                        case "wayback":
                            if (!grabSettings(req.cookies.GS2009_SETTINGS).redirect.enabled.includes("yt2009")) {
                                if (grabSettings(req.cookies.GS2009_SETTINGS).redirect.wayback_date == undefined) {
                                    waybacklink = "http://web.archive.org/web/20100324182056/"
                                } else {
                                    waybacklink = "http://web.archive.org/web/" + grabSettings(req.cookies.GS2009_SETTINGS).redirect.wayback_date + "/"
                                }
                                search.link = search.link.replace("http://", waybacklink)
                                search.link = search.link.replace("https://", waybacklink)
                                break;
                            }
                        case "yt2009":
                            if (!grabSettings(req.cookies.GS2009_SETTINGS).redirect.enabled.includes("wayback")) {
                                if (grabSettings(req.cookies.GS2009_SETTINGS).redirect.yt2009_address == undefined) {
                                    return
                                }
                                search.link = search.link.replace("www.youtube.com", grabSettings(req.cookies.GS2009_SETTINGS).redirect.yt2009_address)
                                search.link = search.link.replace("youtube.com", grabSettings(req.cookies.GS2009_SETTINGS).redirect.yt2009_address)
                            } else {
                                if (grabSettings(req.cookies.GS2009_SETTINGS).redirect.yt2009_address == undefined) {
                                    return
                                }
                                if (grabSettings(req.cookies.GS2009_SETTINGS).redirect.wayback_date == undefined) {
                                    waybacklink = "http://web.archive.org/web/20100324182056/"
                                } else {
                                    waybacklink = "http://web.archive.org/web/" + grabSettings(req.cookies.GS2009_SETTINGS).redirect.wayback_date + "/"
                                }
                                search.link = search.link.replace("http://", waybacklink)
                                search.link = search.link.replace("https://", waybacklink)

                                if (grabSettings(req.cookies.GS2009_SETTINGS).redirect.yt2009_address == undefined) {
                                } else {
                                    let yt2009link = "http://" + grabSettings(req.cookies.GS2009_SETTINGS).redirect.yt2009_address;
                                    let ytlink0 = waybacklink + "https://www.youtube.com"
                                    let ytlink1 = waybacklink + "http://www.youtube.com"
                                    let ytlink2 = waybacklink + "www.youtube.com"
                                    search.link = search.link.replace(ytlink0, yt2009link)
                                    search.link = search.link.replace(ytlink1, yt2009link)
                                    search.link = search.link.replace(ytlink2, yt2009link)
                                }
                            }
                            break;
                        case "http":
                            break;
                    } 
                });
                /*
                
                if (redirector_only == "yt2009") {
                    if (config.frontend.default.redirect.properties.yt2009_url == undefined) {
                        return
                    }
                    search.link = search.link.replace("www.youtube.com", config.frontend.default.redirect.properties.yt2009_url)
                    search.link = search.link.replace("youtube.com", config.frontend.default.redirect.properties.yt2009_url)
                } else if (redirector_only == "wayback") {
                    if (config.frontend.default.redirect.properties.wayback_date == undefined) {
                        waybacklink = "http://web.archive.org/web/20100324182056/"
                    } else {
                        waybacklink = "http://web.archive.org/web/" + config.frontend.default.redirect.properties.wayback_date + "/"
                    }
                    search.link = search.link.replace("http://", waybacklink)
                    search.link = search.link.replace("https://", waybacklink)
                } else if (redirector_only == "none") {
                } else if (redirector_only == "both") {
                    if (config.frontend.default.redirect.properties.wayback_date == undefined) {
                        waybacklink = "http://web.archive.org/web/20100324182056/"
                    } else {
                        waybacklink = "http://web.archive.org/web/" + config.frontend.default.redirect.properties.wayback_date + "/"
                    }
                    search.link = search.link.replace("http://", waybacklink)
                    search.link = search.link.replace("https://", waybacklink)

                    if (config.frontend.default.redirect.properties.yt2009_url == undefined) {
                    } else {
                        let yt2009link = "http://" + config.frontend.default.redirect.properties.yt2009_url;
                        let ytlink0 = waybacklink + "https://www.youtube.com"
                        let ytlink1 = waybacklink + "http://www.youtube.com"
                        let ytlink2 = waybacklink + "www.youtube.com"
                        search.link = search.link.replace(ytlink0, yt2009link)
                        search.link = search.link.replace(ytlink1, yt2009link)
                        search.link = search.link.replace(ytlink2, yt2009link)
                    }
                }
                */
            }

            if (typeof linkalplist[i] !== 'number') {
                if (typeof linkalplist[i+1] == 'number') {
                    repl = repl.replace(/moreRelatedLink/, search.displayLink)
                    repl = repl.replace(/moreRelatedLink/, search.displayLink)
                }
            }
            repl = repl.replace(/relatedUrlLink/, search.link)
            repl = repl.replace(/UrlLink/, search.link)
            repl = repl.replace(/htmlSnippet/, search.htmlSnippet)
            repl = repl.replace(/htmlFormattedUrl/, search.htmlFormattedUrl)
            //repl = repl.replace(/displayLink/, search.displayLink)
        })

        try {
            if (result.data.spelling.correctedQuery != undefined) {
                repl = repl.replace(/didyoumean/g, ext_t_dym)
                let suggested = result.data.spelling.correctedQuery;
                let date;
                if (grabSettings(req.cookies.GS2009_SETTINGS).before !== "0000-00-00") {
                    date = " before:" + grabSettings(req.cookies.GS2009_SETTINGS).before
                    suggested = suggested.replace(date, "")
                }
                repl = repl.replace(/suggestedQuery/g, suggested);
            }
        } catch {
            repl = repl.replace(/didyoumean/g, "")
        }

        repl = repl.replace(/item/g, "")

        nowTime = (Date.now() - startTime) / 1000;
        const searchFinish = nowTime.toString();

        repl = repl.replace(/searchFinish/g, searchFinish.slice(0,4))

        if (req.query.start <= 9 || isNaN(req.query.start) == true) {
            repl = repl.replace(/<td class="b">[\s\S]*?<\/a>/, '')
            repl = repl.replace(/<td>\s*<a[^>]*href="\/search\?[^"]*">/, '<td class="cur"><a tabindex="-1" style="color:#a90a08;font-weight:bold">')
        } else {
            if (start <= 20) {
                repl = repl.replace(/<td>\s*<a href="\/search\?hl=[^&]*&amp;q=[^&]*&amp;start=10&amp;sa=N">/, '<td class="cur"><a tabindex="-1" style="color:#a90a08;font-weight:bold">')
            } else if (start <= 30) {
                repl = repl.replace(/<td>\s*<a href="\/search\?hl=[^&]*&amp;q=[^&]*&amp;start=20&amp;sa=N">/, '<td class="cur"><a tabindex="-1" style="color:#a90a08;font-weight:bold">')
            } else if (start <= 40) {
                repl = repl.replace(/<td>\s*<a href="\/search\?hl=[^&]*&amp;q=[^&]*&amp;start=30&amp;sa=N">/, '<td class="cur"><a tabindex="-1" style="color:#a90a08;font-weight:bold">')
            } else if (start <= 50) {
                repl = repl.replace(/<td>\s*<a href="\/search\?hl=[^&]*&amp;q=[^&]*&amp;start=40&amp;sa=N">/, '<td class="cur"><a tabindex="-1" style="color:#a90a08;font-weight:bold">')
            } else if (start <= 60) {
                repl = repl.replace(/<td>\s*<a href="\/search\?hl=[^&]*&amp;q=[^&]*&amp;start=50&amp;sa=N">/, '<td class="cur"><a tabindex="-1" style="color:#a90a08;font-weight:bold">')
            } else if (start <= 70) {
                repl = repl.replace(/<td>\s*<a href="\/search\?hl=[^&]*&amp;q=[^&]*&amp;start=60&amp;sa=N">/, '<td class="cur"><a tabindex="-1" style="color:#a90a08;font-weight:bold">')
            } else if (start <= 80) {
                repl = repl.replace(/<td>\s*<a href="\/search\?hl=[^&]*&amp;q=[^&]*&amp;start=70&amp;sa=N">/, '<td class="cur"><a tabindex="-1" style="color:#a90a08;font-weight:bold">')
            } else if (start <= 90) {
                repl = repl.replace(/<td>\s*<a href="\/search\?hl=[^&]*&amp;q=[^&]*&amp;start=80&amp;sa=N">/, '<td class="cur"><a tabindex="-1" style="color:#a90a08;font-weight:bold">')
            } else {
                repl = repl.replace(/<td>\s*<a href="\/search\?hl=[^&]*&amp;q=[^&]*&amp;start=90&amp;sa=N">/, '<td class="cur"><a tabindex="-1" style="color:#a90a08;font-weight:bold">')
                repl = repl.replace(/<td class="b">\s*<a href="\/search\?hl=[^&]*&amp;q=[^&]*&amp;start=nextstart&amp;sa=N">[\s\S]*?<\/a>/g, '<td><span class="csb" style="background-position:-76px 0;width:40px"></span>')
            }
        }

        if (req.query.start <= 9 || isNaN(req.query.start) == true) {
        } else if (start <= 11) {
            repl = repl.replace(/&amp;start=prevstart/, "");
        } else {
            repl = repl.replace(/prevstart/, parseInt(req.query.start) - 10 )
        }

        if (req.query.start <= 9 || isNaN(req.query.start) == true) {
            repl = repl.replace(/nextstart/, 10)
        } else {
            repl = repl.replace(/nextstart/, parseInt(req.query.start) + 10 )
        }

        repl = repl.replace(/formattedTotalResults/, result.data.searchInformation.formattedTotalResults)
        if (start != 0) {
            repl = repl.replace(/currentItems/, start)
            repl = repl.replace(/currentItems2/, start + 9)
        } else {
            repl = repl.replace(/currentItems/, 1)
            repl = repl.replace(/currentItems2/, start + 10)
        }

        repl = repl.replace(/gbar_username/g, SimLogin)
        repl = repl.replace(/topItem/g, "")
        log.i("Sending replaced result", tag)
        if (language == "ja"){
            let encoded = iconv.encode(repl, 'shift_jis')
            res.set("Content-Type", "text/html;charset=Shift_JIS")
            res.send(encoded)
            return
        }
        res.send(repl)
    } )
})

app.get('/gs2009', async (req, res) => {
    
})

app.get('/__gs2009_wallma_/ig', async (req, res) => {
    if (!req.cookies.GS2009_ACCOUNTS_ADMIN) { res.redirect("/__gs2009_wallma_/Login"); return }
    const userinfo = JSON.parse(req.cookies.GS2009_ACCOUNTS_ADMIN)
    if (!(userinfo.user == config.server.settingsPage.auth.user && userinfo.auth == user.md5saltMe(config.server.settingsPage.auth.password))) {
        res.redirect("/__gs2009_wallma_/Login"); return 
    }
    res.send(fs.readFileSync("./assets/admin/iguess.html").toString())
})

app.get('/__gs2009_wallma_/Login', (req, res) => {
    if (config.server.settingsPage.enabled) {
        res.clearCookie("GS2009_AUTH_MISMATCH")
        res.send(fs.readFileSync(path.join("./assets/admin/login.html")).toString().replace(req.cookies.GS2009_AUTH_MISMATCH === "true" ? "" : "<div class=\"errormsg\">The username or password you entered is incorrect.</div>", ""))
    } else {
        res.status(404).send("")
    }
})

app.post('/__gs2009_wallma_/LoginAuth', (req, res) => {
    if (req.body.u == config.server.settingsPage.auth.user && req.body.pw == config.server.settingsPage.auth.password) {
        res.cookie("GS2009_ACCOUNTS_ADMIN", JSON.stringify({
            user: req.body.u,
            auth: user.md5saltMe(req.body.pw)
        }))
        res.redirect("/__gs2009_wallma_/ig")
    } else {
        res.cookie("GS2009_AUTH_MISMATCH", JSON.stringify(true))
        res.redirect("/__gs2009_wallma_/Login")
    }
})

process.on('SIGINT', function() {
    log.i("Server stopped by interrupt signal", tag);
    process.exit();
});