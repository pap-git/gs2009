import fs from "node:fs"

const icons = fs.readdirSync("./assets/options")

const result = []

icons.forEach(icon => {
    const from = "/options/" + icon
    const to = "./assets/options/" + icon
    const array = [from, to]

    result.push(array)
})

fs.writeFileSync("result.json", JSON.stringify(result))