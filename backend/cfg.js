import toml from "toml"
import fs from "node:fs"
import {log} from "./things.js";
import path from "node:path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from "googleapis/build/src/apis/config/index.js";

const pjson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const gs2009_version = pjson.version

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const internal = {
    isJSON: function(json) {
        try {
            JSON.parse(JSON.stringify(json))
            return true;
        } catch(e) {
            return false;
        }
    }
}

const cfg = {
    tag: "cfg",
    template: fs.readFileSync(path.join("backend", "config.template.toml")),

    isOld: function(json) {
        const waybackdate = "20100324182056";
        const only_old_date = "2010-03-20";
        if (!internal.isJSON(json)) throw new Error("Not JSON")

        try {
            const test = {
                PORT: json.PORT,

                LANGUAGE: json.LANGUAGE,

                ENGINE: json.ENGINE,
                SEARXNG_URL: json.SEARXNG_URL,
                SEARXNG_ISHTTPS: json.SEARXNG_ISHTTPS,
                SEARXNG_USEOTHERENGINE: json.SEARXNG_USEOTHERENGINE,

                API_KEY: json.API_KEY,
                CSE_ID: json.CSE_ID,

                REDIRECTOR_OPTION: json.REDIRECTOR_OPTION,
                REDIRECT_HTTP: json.REDIRECTOR_HTTP,

                WAYBACKDATE: json.WAYBACKDATE,
                YT2009_ADDRESS: json.YT2009_ADDRESS,

                ONLY_OLD: json.ONLY_OLD,
                ONLY_OLD_DATE: json.ONLY_OLD_DATE,

                SEARCH_QUERY: json.SEARCH_QUERY
            }

            if (typeof(test.PORT) == "undefined") return false
            else return true
        } catch(e) {
            return false
        }
    },

    convertOld: function(oldjson) {
        let serverpage = true
        if (!internal.isJSON(oldjson)) throw new Error("Not JSON")
        if (!cfg.isOld(oldjson)) throw new Error("Not an old configuration file")
        if (typeof(oldjson.ENABLE_SERVER_SETTINGS_PAGE)) serverpage = true
        else serverpage = oldjson.ENABLE_SERVER_SETTINGS_PAGE

        /*
        const result = {
            "server": {
                "port": oldjson.PORT,
                "enableServerSettingsPage": serverpage
            },
            "backend": {
                "engine": {
                    "type": oldjson.ENGINE,
                    "config": {
                        "searxng": {
                            "url": oldjson.SEARXNG_URL,
                            "forceGoogle": oldjson.SEARXNG_USEOTHERENGINE
                        },
                        "cse": {
                            "api_key": oldjson.API_KEY,
                            "cse_id": oldjson.CSE_ID
                        }
                    }
                },
                "searchQuery": oldjson.SEARCH_QUERY
            },
            "frontend": {
                "enableCookieBasedSettings": false,
                "default": {
                    "language": oldjson.LANGUAGE,
                    "searchQuery": oldjson.SEARCH_QUERY,
                    "before": oldjson.ONLY_OLD_DATE,
                    "redirect": {
                        "enabled": ["wayback", "yt2009"],
                        "properties": {
                            "wayback_date": oldjson.WAYBACKDATE,
                            "yt2009_url": oldjson.YT2009_ADDRESS
                        }
                    }
                }
            }
        }
        */

        const result = {
            server: {
                port: oldjson.PORT,
                settingsPage: {
                    enabled: serverpage,
                    authEnabled: false,
                    auth: {
                        user: "",
                        password: ""
                    }
                }
            },
            engine: {
                order: [],
                searxng: {
                    url: oldjson.SEARXNG_URL,
                    enginesToUse: []
                },
                csjapi: {
                    api_key: oldjson.API_KEY,
                    cse_id: oldjson.CSE_ID
                }
            },
            users: {
                enabled: false,
                enablePasswordAuth: true,
                location: {
                    secretdb: "secretdb.json",
                    userdb: "userdb.json"
                }
            },
            frontend: {
                forceDefaults: false,
                defaults: {
                    language: oldjson.LANGUAGE,
                    eras: "early2010",
                    roll_eras: false,
                    roll_stucknine: false,
                    before: oldjson.ONLY_OLD ? oldjson.ONLY_OLD_DATE : "",
                    redirects: {
                        enabled: [],
                        wayback_date: oldjson.WAYBACKDATE,
                        yt2009_address: oldjson.YT2009_ADDRESS
                    }
                }
            }
        }
        
        switch (oldjson.ENGINE) {
            case "cse":
                result.engine.order.push("cse")
                if (result.engine.searxng.url) result.engine.order.push("searxng")
                break;
            case "searxng":
                result.engine.order.push("searxng")
                if (result.engine.csjapi.api_key || result.engine.csjapi.cse_id) result.engine.order.push("cse")
                break;
        }

        switch (oldjson.REDIRECTOR_OPTION) {
            case "both":
                result.frontend.defaults.redirects.enabled.push("wayback")
                result.frontend.defaults.redirects.enabled.push("yt2009")
                break;
            case "yt2009":
                result.frontend.defaults.redirects.enabled.push("yt2009")
                break;
            case "wayback":
                result.frontend.defaults.redirects.enabled.push("wayback")
                break;
        }

        if (oldjson.REDIRECTOR_HTTP) result.frontend.defaults.redirects.enabled.push("http")
        return result
    },

    gen: async function (pathtoconfig, force) {
        const p = pathtoconfig ? path.join(__dirname, "../", pathtoconfig) : path.join(__dirname, "../config.toml")
        if (!(cfg.exists(path.join(__dirname, "config.json")) && cfg.exists(path.join(__dirname, "config.toml"))) || force) {
            log.i(force ? "re" + "generated config" : "generated config", cfg.tag)
            log.w("================================\n" + "Configure your instance by editing config.toml via text editor!\n\nYou will need the instance of SearXNG that supporting JSON format for API, \nor You can use existing Google Search JSON API key with Programmable Search Engine ID for Google Search.\n\nIt is recommended to have your private instance of SearXNG.\nPlease refer the SearXNG documentation for running your own instance.\n\nIf neither of them does not configured to use, gs2009 will warn you when you tried to use them." + "================================\n", cfg.tag)

            fs.writeFileSync(p, cfg.template.toString().replace("OKAYGIMMETHEVERSIONPLEASE??", gs2009_version));
            log.i("generated config to path: " + p, tag)
        }
    },
    exists: function (pathtoconfig) {
        const p = pathtoconfig ? pathtoconfig : path.join(__dirname, "../config.json")
        return fs.existsSync(p)
    }
}

export default cfg