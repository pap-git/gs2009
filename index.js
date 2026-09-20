import fs, { readFileSync } from "fs"
import iconv from 'iconv-lite'
import path from "path"
import express from "express"
import cookie from 'cookie-parser';
import parseurl from 'parseurl';
import qs from 'qs';
import googleapis from 'googleapis';
import Encoding from 'encoding-japanese';
import autocomplete from './extern_js/pull_autocomplete.js'
import * as readline from 'readline-sync'
import searxngfetch from './backend/searx-api-hit.js'
import cfg from "./backend/cfg.js";
import { log } from "./backend/scripts/things.js"
import strings from "./backend/strings.js"
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import user from "./backend/user.js";
import toml from "toml"

const pjson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const gs2009_version = pjson.version

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

var config = toml.parse(cfg.template)

var searxng_ishttps = false;
var searxng_eg = false;

var redirector_only = "none"; // keeping this shit for a while its so messy here
var only_old = false;
var only_old_date = "2010-03-20";
var searchqueryEnabled = true;

function getLanguage(userAuth) {
    user.get()
}

async function reloadconfig(){
    let tag = "cfg"
    log.i(strings.cfg.reload, "init")

    config = toml.parse(cfg.template)
    if (!cfg.exists(path.join(__dirname, "config.json")) && !cfg.exists(path.join(__dirname, "config.toml"))) await cfg.gen()

    const file = fs.readFileSync("config.toml")

    if (cfg.exists(path.join(__dirname, "config.json"))) {
        if (cfg.isOld(fs.readFileSync("config.json"))) {
            log.w("old config found, backing up before convert", "config-conversion")
            fs.writeFileSync("config.old.json", readFileSync("config.json"))
            fs.writeFileSync("config.toml", JSON.stringify(cfg.convertOld(JSON.parse(fs.readFileSync("config.json")))))
            log.w("config converted to new format, Please check your config is matched with your previous one", "config-conversion")
        }
    }

    config = toml.parse(fs.readFileSync("config.toml"))

    /*
    if (config.backend.engine.type == "cse") {
        if (config.config.engine.csjapi.api_key == "") {
            log.w("Custom Search API (config.engine.csjapi.api_key) is not set correctly! PLease see /gs2009settings")
        }
        if (config.config.engine.csjapi.cse_id == "") {
            log.w("Search Engine ID (config.engine.csjapi.cse_id) is not set correctly! PLease see /gs2009settings")
        }
    }
    */
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
}

await reloadconfig()

const app = express();

/*
let template_gbar_user = path.join(__dirname, "/template/" + serverlanguage + "/gbar_user.txt"); // ext_t_g_u
let template_gbar_user_index = path.join(__dirname, "/template/" + serverlanguage + "/gbar_user_index.txt"); // ext_t_g_u
let template_gbar_user_logged = path.join(__dirname, "/template/" + serverlanguage + "/gbar_user_logged.txt"); // ext_t_g_u_l

let template_search_normal = path.join(__dirname, "/template/" + serverlanguage + "/search/normal.txt"); // ext_t_s_n
let template_search_more = path.join(__dirname, "/template/" + serverlanguage + "/search/more.txt"); // ext_t_s_m
let template_search_EOM = path.join(__dirname, "/template/" + serverlanguage + "/search/more_eom.txt"); // ext_t_s_EOM
let template_search_notfound = path.join(__dirname, "/template/" + serverlanguage + "/search/not_found.txt"); // ext_t_s_nf

let template_did_you_mean = path.join(__dirname, "/template/" + serverlanguage + "/search/did_you_mean.txt"); // ext_t_dym

let ext_t_g_u = fs.readFileSync(template_gbar_user, "utf8")
console.log("[INFO] loaded template (template_gbar_user)")
let ext_t_g_u_i = fs.readFileSync(template_gbar_user_index, "utf8")
console.log("[INFO] loaded template (template_gbar_user_index)")
let ext_t_g_u_l = fs.readFileSync(template_gbar_user_logged, "utf8")
console.log("[INFO] loaded template (template_gbar_user_logged)")
let ext_t_dym = fs.readFileSync(template_did_you_mean, "utf8")
console.log("[INFO] loaded template (template_did_you_mean)")

function reloadtemplate(){

    template_gbar_user = path.join(__dirname, "/template/" + serverlanguage + "/gbar_user.txt"); // ext_t_g_u
    template_gbar_user_index = path.join(__dirname, "/template/" + serverlanguage + "/gbar_user_index.txt"); // ext_t_g_u
    template_gbar_user_logged = path.join(__dirname, "/template/" + serverlanguage + "/gbar_user_logged.txt"); // ext_t_g_u_l

    template_search_normal = path.join(__dirname, "/template/" + serverlanguage + "/search/normal.txt"); // ext_t_s_n
    template_search_more = path.join(__dirname, "/template/" + serverlanguage + "/search/more.txt"); // ext_t_s_m
    template_search_EOM = path.join(__dirname, "/template/" + serverlanguage + "/search/more_eom.txt"); // ext_t_s_EOM

    template_did_you_mean = path.join(__dirname, "/template/" + serverlanguage + "/search/did_you_mean.txt"); // ext_t_dym

    ext_t_g_u = fs.readFileSync(template_gbar_user, "utf8")
    console.log("[INFO] reloaded template (template_gbar_user)")
    ext_t_g_u_i = fs.readFileSync(template_gbar_user_index, "utf8")
    console.log("[INFO] reloaded template (template_gbar_user_index)")
    ext_t_g_u_l = fs.readFileSync(template_gbar_user_logged, "utf8")
    console.log("[INFO] reloaded template (template_gbar_user_logged)")
    ext_t_dym = fs.readFileSync(template_did_you_mean, "utf8")
    console.log("[INFO] loaded template (template_did_you_mean)")
    console.log("[INFO] reloaded all template/template paths")
}

reloadtemplate();
*/

function retriveTemplate(lang) {
    function GiveMeTheResult(lang, next_path) {
        const langTemplatePath = path.join(__dirname, "/template/", lang)
        const enTemplatePath = path.join(__dirname, "/template/", "en")
        return fs.existsSync(path.join(langTemplatePath, next_path)) ? path.join(langTemplatePath, next_path) : path.join(enTemplatePath, next_path)
    }

    const paths = {
        gbar_user: GiveMeTheResult(lang, "/gbar_user.txt"), // ext_t_g_u
        gbar_user_index: GiveMeTheResult(lang, "/gbar_user_index.txt"), // ext_t_g_u
        gbar_user_logged: GiveMeTheResult(lang, "/gbar_user_logged.txt"), // ext_t_g_u_l

        search_normal: GiveMeTheResult(lang, "/search/normal.txt"), // ext_t_s_n
        search_more: GiveMeTheResult(lang, "/search/more.txt"), // ext_t_s_m
        search_EOM: GiveMeTheResult(lang, "/search/more_eom.txt"), // ext_t_s_EOM

        did_you_mean: GiveMeTheResult(lang, "/search/did_you_mean.txt"), // ext_t_dym
    }

    const data = {
        gbar_user: fs.readFileSync(paths.gbar_user, "utf8"),
        gbar_user_index: fs.readFileSync(paths.gbar_user_index, "utf8"),
        gbar_user_logged: fs.readFileSync(paths.gbar_user_logged, "utf8"),

        search_normal: fs.readFileSync(paths.search_normal, "utf8"),
        search_more: fs.readFileSync(paths.search_more, "utf8"),
        search_EOM: fs.readFileSync(paths.search_EOM, "utf8"),

        did_you_mean: fs.readFileSync(paths.did_you_mean, "utf8")
    }
    return {
        paths, data
    }
}

var redirector = true;

var query;
var actualq;

var hl;
var lr;
var start;

let SimLogin = [];

// https://qiita.com/ganyariya/items/23d51b05bacdcb27fce6
// im using the google search example from here v (thx for og author)

async function search(event) {
    const {google} = googleapis;
    const customSearch = google.customsearch("v1");

    if (isNaN(start) == true) {
        start = 0;
    }

    console.log(start)

    let result;

    /*
    if (config.backend.engine.type == "searxng") {
        let temp_searxng_ishttps
        if (config.backend.engine.config.searxng.match(/https:\/\//) || config.backend.engine.config.searxng.match(/http:\/\//)) {
            temp_searxng_ishttps = searxng_ishttps
            searxng_ishttps = undefined
        }
        result = await searxngfetch(config.backend.engine.config.searxng, searxng_ishttps, searxng_eg, query, lr, start)
        searxng_ishttps = temp_searxng_ishttps
    } else {
        result = await customSearch.cse.list({

            auth: config.config.engine.csjapi.api_key,

            cx: config.config.engine.csjapi.cse_id,

            q: query,

            hl: hl,

            lr: lr,

            start: start
        });
    }
    */

    throw new Error("test")
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

    if (req.url.includes("webhp")) req.url = req.url.replace("webhp", "")
    next()
})

app.listen(config.server.port, () => {
    log.i(`Server started at port ${config.server.port} in ` + Date());
});

app.get('/setprefs', (req, res) => {
    if (req.query.yt2009addr == "yt2009addr-replace-this") {
        return
    }

    if (config.server.enableServerSettingsPage == false) {
        res.send("This feature is disabled due to settings page is disabled.<br>Please contact your administrator to change the settings.")
        return
    }

    res.send("this code is so FUCKED LOL")
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
    let now = new Date
    let nowmonth = now.getMonth() + 1
    let tmp = now.getDay()
    let nowday
    nowday = tmp < 10 ? 0 + tmp.toString() : tmp
    let nowdate = nowmonth.toString() + nowday.toString()
    let logo_path = './assets/images/ja_jp/logo.gif';
    switch (nowdate) {
        case "0213":
            logo_path = serverlanguage == "ja" ? './assets/logos/olympics10-opening-nr-hp.png' : './assets/logos/olympics10-opening-hp.png'
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

app.get('/intl/en_ALL/images/logo.gif', (req, res) => {
    fs.readFile('./assets/images/en-ALL/logo.gif', (err, data) => {
      res.type('gif');
      res.send(data);
    });
})

app.get('/images/nav_logo3.png', (req, res) => {
    fs.readFile('./assets/images/nav_logo3.png', (err, data) => {
      res.type('png');
      res.send(data);
    });
})

app.get('/logos/olympics10-bg.jpg', (req, res) => {
    fs.readFile('./assets/logos/olympics10-bg.jpg', (err, data) => {
      res.type('png');
      res.send(data);
    });
})

app.get('/images/firefox/firefox35_v1.png', (req, res) => {
    fs.readFile('./assets/images/firefox/firefox35_v1.png', (err, data) => {
      res.type('png');
      res.send(data);
    });
})

app.get('/images/firefox/sprite2.png', (req, res) => {
    fs.readFile('./assets/images/firefox/sprite2.png', (err, data) => {
      res.type('png');
      res.send(data);
    });
})

app.get('/images/firefox/gradsprite2.png', (req, res) => {
    fs.readFile('./assets/images/firefox/gradsprite2.png', (err, data) => {
      res.type('png');
      res.send(data);
    });
})

app.get('/accounts/mail.gif', (req, res) => {
    fs.readFile('./assets/images/accounts/mail.gif', (err, data) => {
      res.type('gif');
      res.send(data);
    });
})

app.get('/images/yellow_warning.gif', (req, res) => {
    fs.readFile('./assets/images/yellow_warning.gif', (err, data) => {
      res.type('gif');
      res.send(data);
    });
})

app.get('/extern_js/f/autocomplete.js', (req, res) => {
    fs.readFile('./extern_js/autocomplete.js', (err, data) => {
        let repl = data.toString();

        const filePath = path.join(__dirname, "/html/" + serverlanguage + "/index.html");
        fs.readFile(filePath, (err, data) => {
            let conv;

            if (serverlanguage == "ja") {
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
    let result = "";
    let hl = "";

    // console.log(req.query)
    // console.log(req.originalUrl)
    if (req.query.hl == "" || req.query.hl == undefined) {
        hl = serverlanguage;
    } else {
        hl = req.query.hl;
    }

    result = await autocomplete.pull(req.query.q, hl, req.query.expIds, req.query.cp)
    if (serverlanguage == "ja") {
        result = iconv.encode(result.toString(), 'shift_jis')
        res.set('Content-Type','text/javascript; charset=Shift_JIS')
    } else {
        res.set('Content-Type','text/javascript')
    }
    res.status(200)
    if (searchqueryEnabled == true) {
        res.send(result)
    } else {
        res.send()
        return
    }
})

app.get('/images/logo_sm.gif', (req, res) => {
    fs.readFile('./assets/images/logo_sm.gif', (err, data) => {
      res.type('gif');
      res.send(data);
    });
})

app.get('/generate_204'), ((req, res) => {
    res.status(204).send("");
})

app.get('/accounts/msh.gif', (req, res) => {
    fs.readFile('./assets/images/accounts/msh.gif', (err, data) => {
      res.type('gif');
      res.send(data);
    });
})

app.get('/intl/ja_ALL/images/logos/images_logo_lg.gif', (req, res) => {
    fs.readFile('./assets/images/ja-ALL/images_logo_lg.gif', (err, data) => {
      res.type('gif');
      res.send(data);
    });
})

app.get('/accounts/ig.gif', (req, res) => {
    fs.readFile('./assets/images/accounts/ig.gif', (err, data) => {
      res.type('gif');
      res.send(data);
    });
})

app.get('/accounts/sierra.gif', (req, res) => {
    fs.readFile('./assets/images/accounts/sierra.gif', (err, data) => {
      res.type('gif');
      res.send(data);
    });
})

app.get('/accounts/google_transparent.gif', (req, res) => {
    fs.readFile('./assets/images/accounts/google_transparent.gif', (err, data) => {
      res.type('gif');
      res.send(data);
    });
})

app.get('/intl/ja/images/logos/accounts_logo.gif', (req, res) => {
    fs.readFile('./assets/images/ja/accounts_logo.gif', (err, data) => {
      res.type('gif');
      res.send(data);
    });
})

app.get('/intl/en/images/logos/accounts_logo.gif', (req, res) => {
    fs.readFile('./assets/images/en/accounts_logo.gif', (err, data) => {
      res.type('gif');
      res.send(data);
    });
})

app.get('/favicon.ico', (req, res) => {
    fs.readFile('./assets/favicon.ico', (err, data) => {
      res.type('ico');
      res.send(data);
    });
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
    // console.log("[INFO] Simulated login username: " + req.cookies.SimLogin);
    let SimLogin = req.cookies.SimLogin;
    const filePath = path.join(__dirname, "/html/" + serverlanguage + "/search.html");
    fs.readFile(filePath, (err, data) => {
        let repl = "";
        
        if (serverlanguage == "ja") {
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
        if (serverlanguage == "ja"){
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
    // console.log("[INFO] Simulated login username: " + req.cookies.SimLogin);
    if (req.cookies.SimLogin === undefined) {
        const filePath = path.join(__dirname, "/html/" + serverlanguage + "/images/index.html");
            fs.readFile(filePath, (err, data) => {
            res.set("Content-Type", "text/html;charset=Shift_JIS")
            res.send(data)
        } )
        return
    }
    if (req.cookies.SimLogin == 'undefined') {
        const filePath = path.join(__dirname, "/html/" + serverlanguage + "/images/index.html");
            fs.readFile(filePath, (err, data) => {
            res.set("Content-Type", "text/html;charset=Shift_JIS")
            res.send(data)
        } )
        return
    }
    let SimLogin = req.cookies.SimLogin;
    const filePath = path.join(__dirname, "/html/" + serverlanguage + "/images/index_signed_in.html");
    fs.readFile(filePath, (err, data) => {
        let decoded = iconv.decode(data, 'shift_jis')
        let replaced = decoded.replace(/username/g, SimLogin)
        let encoded = iconv.encode(replaced, 'shift_jis')
        res.set("Content-Type", "text/html;charset=Shift_JIS")
        res.send(encoded)
    } )
    return
});

app.get('/', (req, res) => {
    const template = retriveTemplate("en")
    // console.log("[INFO] Simulated login username: " + req.cookies.SimLogin);
    let SimLogin = req.cookies.SimLogin;

    let now = new Date
    let nowmonth = now.getMonth() + 1
    let tmp = now.getDay()

    let filePath

    if (nowmonth == 2){
        if (tmp >= 12 && tmp <= 23) {
            filePath = path.join(__dirname, "/html/" + serverlanguage + "/index-olympics10.html");
        } else {
            filePath = path.join(__dirname, "/html/" + serverlanguage + "/index.html");
        }
    } else {
        filePath = path.join(__dirname, "/html/" + serverlanguage + "/index.html");
    }
        
    fs.readFile(filePath, (err, data) => {
        let repl = "";
        
        repl = serverlanguage == "ja" ? iconv.decode(data, 'shift_jis') : repl = data.toString();

        repl = (SimLogin == undefined || SimLogin == "" || SimLogin == "undefined") ? 
                repl.replace("gbar_user_REPLACE_HERE", template.data.gbar_user_index) : 
                repl.replace("gbar_user_REPLACE_HERE", template.data.gbar_user_logged)

        let messagelist = JSON.parse(fs.readFileSync('./assets/messages/' + serverlanguage + '.json', 'utf8'))

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
        if (serverlanguage == "ja"){
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
    if (config.server.enableServerSettingsPage == false) {
        res.send("This feature is disabled due to settings page is disabled.<br>Please contact your administrator to change the settings.")
        return
    }
    const filePath = path.join(__dirname, "/html/gs2009settings.html");
    fs.readFile(filePath, (err, data) => {
        let repl;
        repl = data.toString();

        if (config.backend.engine.type == "cse") {
            repl = repl.replace(/cse"/, "cse\" checked")
        } else {
            repl = repl.replace(/searxng"/, "searxng\" checked")
        }

        if (config.backend.engine.config.searxng == undefined) {
            repl = repl.replace("searxng_url-replace-this", "")
        } else {
            repl = repl.replace("searxng_url-replace-this", config.backend.engine.config.searxng)
        }

        if (searxng_eg == true) {
            repl = repl.replace(/searxng_eg value=1/, "searxng_eg value=1 checked")
        }

        repl = repl.replace("api-key-replace-this", config.config.engine.csjapi.api_key)
        repl = repl.replace("cse-id-replace-this", config.config.engine.csjapi.cse_id)
        repl = repl.replace("value=" + serverlanguage, "value=" + serverlanguage + " selected")

        repl = repl.replace(/wayback" checked/, "wayback\"")

        if (!config.frontend.default.redirect.enabled.includes("wayback") && !config.frontend.default.redirect.enabled.includes("yt2009")) {
            repl = repl.replace(/off"/, "off\" checked")
        } else if (config.frontend.default.redirect.enabled.includes("wayback") && !config.frontend.default.redirect.enabled.includes("yt2009")) {
            repl = repl.replace(/wayback"/, "wayback\" checked")
        } else if (!config.frontend.default.redirect.enabled.includes("wayback") && config.frontend.default.redirect.enabled.includes("yt2009")) {
            if (config.frontend.default.redirect.properties.yt2009_url == "") {
                repl = repl.replace(/off"/, "off\" checked")
            } else {
                repl = repl.replace(/yt2009"/, "yt2009\" checked")
            }
        } else if (config.frontend.default.redirect.enabled.includes("wayback") && config.frontend.default.redirect.enabled.includes("yt2009")) {
            if (config.frontend.default.redirect.properties.yt2009_url == "") {
                repl = repl.replace(/wayback"/, "wayback\" checked")
            } else {
                repl = repl.replace(/on"/, "on\" checked")
            }
        }

        repl = repl.replace("waybackdate-replace-this", config.frontend.default.redirect.properties.wayback_date)
        repl = repl.replace("yt2009addr-replace-this", config.frontend.default.redirect.properties.yt2009_url)

        if (config.frontend.default.redirect.enabled.includes("http") == true) {
            repl = repl.replace(/p value=1/, "p value=1 checked")
        }

        if (only_old == true) {
            repl = repl.replace(/d value=1/, "d value=1 checked")
        }

        if (searchqueryEnabled == true) {
            repl = repl.replace(/enablesq value=1/, "enablesq value=1 checked")
        }

        repl = repl.replace("onlyolddate-replace-this", only_old_date)
        repl = repl.replace("VersionNumber", gs2009_version)

        res.send(repl)
    })
})

app.get('/accounts/Login', (req, res) => {
    const file = path.join(__dirname, "/html/" + serverlanguage + "/signin.html");
    if (serverlanguage == "ja") {
        res.set("Content-Type", "text/html;charset=Shift_JIS")
        res.send(fs.readFileSync(file))
    } else {
        res.send(fs.readFileSync(file).toString())
    }
})

app.get('/firefox', (req, res) => {
    const filePath = path.join(__dirname, "/html/" + serverlanguage + "/firefox/index.html");
    if (serverlanguage == "ja") {
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

app.post('/accounts/LoginAuth', (req, res) => {
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
    
    user.get(req.body.Email, user.md5saltMe(req.body.Passwd))
})

app.get('/setCookie', (req, res) => {
    const userlogin = {
        "email": "paphere124@hotmail.com",
        "auth": ""
    }
    const usersettings = {
        "language": "en",
        "searchQuery": false,
        "before": {
            "enabled": true,
            "date": "2010-01-24"
        },
        "redirect": {
            "enabled": ["wayback", "yt2009", "http"],
            "properties": {
                "wayback_date": 20100324182056,
                "yt2009_url": ""
            }
        }
    }
})

app.get('/clearcookies', (req, res) => {
    res.clearCookie('SimLogin');
    res.redirect('/');
})

app.get('/search', async (req, res) => {
    console.log("[INFO] search: got an /search GET")
    switch (config.backend.engine.type) {
        case "cse":
            if (config.config.engine.csjapi.api_key == "" || config.config.engine.csjapi.cse_id == "") {
                console.log("[WARN] search: Google Custom Search API or Programmable Search Engine ID is not set! redirecting to /gs2009settings")
                res.redirect("/gs2009settings")
                return
            }
            break;
        case "searxng":
            if (config.backend.engine.config.searxng == "" || config.backend.engine.config.searxng == undefined) {
                console.log("[WARN] search: SearXNG Search API selected but API URL is not set on config! redirecting to /gs2009settings")
                res.redirect("/gs2009settings")
                return
            }
            break;
    }
    const startTime = Date.now();
    let nowTime = 0;
    var sqparam = qs.parse(parseurl(req).query);
    if (sqparam.q == "" || sqparam.q == undefined) {
        console.log("[INFO] search: query was empty, redirecting to /")
        res.redirect('/');
        return
    }
    if (sqparam.q.includes('%')) {
        console.log("[INFO] search: maybe Shift-JIS? trying to decode to Unicode")
        let sjisArray = Encoding.urlDecode(sqparam.q);
        let unicodeArray = Encoding.convert(sjisArray, { to: 'UNICODE', from: 'SJIS' });
        query = Encoding.codeToString(unicodeArray);
    } else {
        query = sqparam.q;
    }
    console.log("[INFO] search: extracted query: " + query)

    if (only_old == true) {
        console.log("[INFO] search: only_old is enabled, adding before:")
        actualq = query
        if (only_old_date == undefined) {
            query = query + " before:2010-03-21";
        }
        query = query + " before:" + only_old_date;
    }

    // console.log(req.query)

    if (req.query.hl == "" || req.query.hl == undefined) {
        hl = serverlanguage;
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

    console.log("[INFO] search: waiting for result")

    let result;
    try {
        result = await search();
    } catch(e) {
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
        
        return
    }

    console.log("[INFO] search: got an result")
    
    // console.log("result: ", result);
    // console.log(JSON.stringify(result.data.items, null, 2))
    // console.log("-----------------------------------------------");
    const link = [];
    let filePath = "";

    try {
        let test_result_length = result.data.items.length
    } catch {
        console.log("[INFO] search: nvm thats error")
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
        console.log("[INFO] search: feeling lucky, redirecting to first link")
        res.redirect(result.data.items[0].link)
        return
    }

    const linklist = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const alphlist = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

    console.log("[INFO] search: Sorting item")
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

    console.log("[INFO] search: Sorted Alphabet list:")
    console.log(linkalplist);
    console.log("[INFO] search: Sorted Number list:")
    console.log(linknumlist);

    filePath = path.join(__dirname, "/html/" + serverlanguage + "/search.html");
    
    fs.readFile(filePath, (err, data) => {
        /*
        const ext_t_s_n = fs.readFileSync(template_search_normal, "utf8")
        const ext_t_s_m = fs.readFileSync(template_search_more, "utf8")
        const ext_t_s_eom = fs.readFileSync(template_search_EOM, "utf8")
        const ext_t_s_nf = fs.readFileSync(template_search_notfound, "utf8")
        */
        const template = retriveTemplate(serverlanguage)

        let repl = "";
        
        if (serverlanguage == "ja") {
            repl = iconv.decode(data, 'shift_jis')
        } else {
            repl = data.toString();
        }

        let SimLogin = req.cookies.SimLogin;

        if (SimLogin == undefined || SimLogin == "" || SimLogin == "undefined") {
            repl = repl.replace("gbar_user_REPLACE_HERE", ext_t_g_u)
        } else {
            repl = repl.replace("gbar_user_REPLACE_HERE", ext_t_g_u_l)
        }

        if (result.data.items.length < 1) {
            console.log("[INFO] search: no result found for the query: ", query)
            repl = repl.replace(/didyoumean/g, "");
            repl = repl.replace(/item/g, "");

            repl = repl.replace(/topItem/g, ext_t_s_nf);

            repl = repl.replace(/<p>(\s+.+){1,2}\s+<div id="res" class="med">/, '<p><br></p></div><div id="res" class="med">')

            if (only_old == true) {
                repl = repl.replace(/query/g, actualq)
            } else {
                repl = repl.replace(/query/g, query)
            }
            if (serverlanguage == "ja"){
                let encoded = iconv.encode(repl, 'shift_jis')
                res.set("Content-Type", "text/html;charset=Shift_JIS")
                res.send(encoded)
                return
            }
            res.send(repl)
            return
        }
        
        if (only_old == true) {
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
                repl = repl.replace(/item/, ext_t_s_m)
                return
            }
            repl = repl.replace(/item/, ext_t_s_n)
            repl = repl.replace(/lastone/, ext_t_s_eom)
        })

        repl = repl.replace(/htmlTitle/, result.data.items[0].htmlTitle)
        if (config.frontend.default.redirect.enabled.includes("http") == true) {
            result.data.items[0].link = result.data.items[0].link.replace("https://", "http://")
        }

        const search = [];
        search.htmlTitle = "";
        search.link = "";
        search.htmlSnippet = "";
        search.htmlFormattedUrl = "";
        search.displayLink = "";

        search.htmlTitle = result.data.items[0].htmlTitle;
        search.link = result.data.items[0].link;
        search.htmlFormattedUrl = result.data.items[0].htmlFormattedUrl;
        search.htmlSnippet = result.data.items[0].htmlSnippet;
        search.displayLink = result.data.items[0].displayLink;

        if (redirector == true) {
            let waybacklink
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
        }
        repl = repl.replace(/relatedUrlLink/, search.link)
        repl = repl.replace(/UrlLink/, search.link)
        repl = repl.replace(/htmlSnippet/, search.htmlSnippet)
        repl = repl.replace(/htmlFormattedUrl/, search.htmlFormattedUrl)

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
            if (config.frontend.default.redirect.enabled.includes("http") == true) {
                search.link = search.link.replace("https://", "http://")
            }
            if (redirector == true) {
                let waybacklink
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
                if (only_old == true) {
                    date = " before:" + only_old_date
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
        console.log("[INFO] search: Sending replaced result")
        if (serverlanguage == "ja"){
            let encoded = iconv.encode(repl, 'shift_jis')
            res.set("Content-Type", "text/html;charset=Shift_JIS")
            res.send(encoded)
            return
        }
        res.send(repl)
    } )
})

process.on('SIGINT', function() {
    console.log("[INFO] Server stopped by interrupt signal");
    process.exit();
});