const port = chrome.runtime.connect()

const infobox = document.getElementById("infobox")
const cpgl = document.getElementById("cpgl")
const dgpi = document.getElementById("dgpi")
const closetabs = document.getElementById("closetabs")
const autoclosetabs = document.getElementById("autoclosetabs")
const nnnblock = document.getElementById("nnnblock")

chrome.storage.local.get(null, options => {
    autoclosetabs.checked = options.autoclosetabs
    nnnblock.checked = !options.nnnblock
})

port.onMessage.addListener(message => {
    if(infobox.classList.contains("error")) infobox.classList.remove("error")

    if(message.type === "error"){
        infobox.classList.add("error")
        infobox.innerText = message.data.err

        window.scrollTo(0, document.body.scrollHeight);
    } else if(message.type === "action"){
        if(message.action === "setInfobox"){
            infobox.innerText = message.data.content

            window.scrollTo(0, document.body.scrollHeight);
        } else if(message.action === "clipboardWriteText"){
            navigator.clipboard.writeText(message.data.content)
        }
    }
})

function tabOperation(type, data){
    port.postMessage({ type, data })
}

cpgl.addEventListener("click", (ev) => tabOperation("cpgl"))
dgpi.addEventListener("click", (ev) => tabOperation("dgpi"))
closetabs.addEventListener("click", (ev) => tabOperation("closetabs"))
autoclosetabs.addEventListener("change", (ev) => tabOperation("autoclosetabs_swchange", autoclosetabs.checked))
nnnblock.addEventListener("change", (ev) => tabOperation("nnnblock_swchange", nnnblock.checked))