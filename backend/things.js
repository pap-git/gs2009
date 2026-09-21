import e from "express";

function back(type, msg, tag) {
    log.list.push({
        "type": type,
        "tag": tag,
        "message": msg,
        "date": Date.now()
    })
    const msgtoShow = tag ? "[" + Array.from(type)[0] + "] [" + tag + "] " + msg : "[" + Array.from(type)[0] + "] " + msg
    switch (type) {
        case "error":
            console.error(msgtoShow)
            break;
        case "warning":
            console.warn(msgtoShow)
            break;
        default:
            console.log(msgtoShow)
            break;
    }
}

export function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

export const log = {
    list: [],
    i: function (msg, tag) {
        back("info", msg, tag)
    },
    e: function (msg, tag) {
        back("error", msg, tag)
    },
    w: function (msg, tag) {
        back("warning", msg, tag)
    }
}