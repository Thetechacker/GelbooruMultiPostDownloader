const port = chrome.runtime.connect()

const infobox = document.getElementById("infobox")
const cpgl = document.getElementById("cpgl")
const dgpi = document.getElementById("dgpi")
const closetabs = document.getElementById("closetabs")

port.onMessage.addListener(message => {
    if(infobox.classList.contains("error")) infobox.classList.remove("error")

    if(message.type === "error"){
        infobox.classList.add("error")
        infobox.innerText = message.data.err
    } else if(message.type === "action"){
        if(message.action === "setInfobox"){
            infobox.innerText = message.data.content
        } else if(message.action === "clipboardWriteText"){
            navigator.clipboard.writeText(message.data.content)
        }
    }
})

function tabOperation(type){
    port.postMessage({ type })
}

cpgl.addEventListener("click", (ev) => tabOperation("cpgl"))
dgpi.addEventListener("click", (ev) => tabOperation("dgpi"))
closetabs.addEventListener("click", (ev) => tabOperation("closetabs"))