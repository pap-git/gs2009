import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from "path"
import fs, { fchownSync } from "node:fs"

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tempf = {
    grab: function(lang) {
        const LANG_APPEND = "!!LANG__" + lang
        const result = {
            gbar: {
                default: {
                    path: path.join(__dirname, "../template/" + LANG_APPEND + "/gbar_user.txt"),
                    isfb: false,
                    data: undefined
                },
                index: {
                    path: path.join(__dirname, "../template/" + LANG_APPEND + "/gbar_user_index.txt"),
                    isfb: false,
                    data: undefined
                },
                logged_in: {
                    path: path.join(__dirname, "../template/" + LANG_APPEND + "/gbar_user_logged.txt"),
                    isfb: false,
                    data: undefined
                }
            },
            search: {
                normal: {
                    path: path.join(__dirname, "../template/" + LANG_APPEND + "/search/normal.txt"),
                    isfb: false,
                    data: undefined
                },
                more: {
                    path: path.join(__dirname, "../template/" + LANG_APPEND + "/search/more.txt"),
                    isfb: false,
                    data: undefined
                },
                more_end: {
                    path: path.join(__dirname, "../template/" + LANG_APPEND + "/search/more_eom.txt"),
                    isfb: false,
                    data: undefined
                },
                not_found: {
                    path: path.join(__dirname, "../template/" + LANG_APPEND + "/search/not_found.txt"),
                    isfb: false,
                    data: undefined
                },
                didyoumean: {
                    path: path.join(__dirname, "../template/" + LANG_APPEND + "/search/did_you_mean.txt"),
                    isfb: false,
                    data: undefined
                }
            },
        }
        Object.keys(result).forEach(type => {
            Object.keys(result[type]).forEach(obj => {
                let fb = !(fs.existsSync(path.join(result[type][obj].path.replace(LANG_APPEND, lang))))
                result[type][obj].path = fs.existsSync(path.join(result[type][obj].path.replace(LANG_APPEND, lang))) ? path.join(result[type][obj].path.replace(LANG_APPEND, lang)) : path.join(result[type][obj].path.replace(LANG_APPEND, "en"))
                result[type][obj].isfb = fb
                result[type][obj].data = fs.readFileSync(result[type][obj].path)
            })
        })
        return result;
    }
}

export default tempf