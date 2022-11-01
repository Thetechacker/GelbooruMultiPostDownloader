const baseuri = "https://gelbooru.com"

function parseURIParameters(uri){
    if(typeof uri !== "string") return null

    const splt = "<s>"
    const pstr = uri.split("?").join(splt).split("&").join(splt).split(splt).slice(1)
    const objParams = {}

    pstr.forEach(ps => {
        const k = ps.split("=")

        objParams[k[0]] = decodeURIComponent(k[1])
    })

    return objParams
}

chrome.runtime.onConnect.addListener(port => {
    port.onMessage.addListener(message => {
        chrome.tabs.query({}).then(tabs => {
            tabs = tabs.filter(tab => {
                const up = parseURIParameters(tab.url)
    
                if(tab.url.startsWith(baseuri) && (up.page === "post") && (up.s === "view") && (!isNaN(up.id))){
                    return true
                } else {
                    return false
                }
            })
            
            const curYear = new Date().getFullYear()

            if((new Date(`1 November ${curYear}`) < new Date()) && (new Date(`31 November ${curYear}`) > new Date())){
                port.postMessage({ type: "error", data: { err: "Try the next month ;)", errStack: "Try the next month ;)" } })

                return
            }

            if(!tabs.length) return port.postMessage({ type: "action", action: "setInfobox", data: { content: "No Gelbooru post tabs found." } })

            if(message.type === "cpgl"){
                port.postMessage({ type: "action", action: "clipboardWriteText", data: { content: tabs.map(tab => tab.url).join("\n") } })
                port.postMessage({ type: "action", action: "setInfobox", data: { content: "Gelbooru post links copied to clipboard ;>>" } })
            } else if(message.type === "dgpi"){
                tabs = [...new Set(tabs.map(tab => parseURIParameters(tab.url).id))]
                
                tabs.forEach(id => {
                    fetch(`${baseuri}/index.php?page=dapi&s=post&q=index&id=${id}&json=1`, { method: "GET" }).then(res => res.json()).then(res => {
                        const image_uri = res.post[0].file_url
                        const image_ext = image_uri.substring(image_uri.lastIndexOf('/') + 1).split(".")

                        chrome.downloads.download({ url: image_uri, filename: `gelbooru_${res.post[0].id}${image_ext[1] ? `.${image_ext[1]}` : ""}` })
                    }).catch(err => port.postMessage({ type: "error", data: { err: err.toString(), errStack: err.stack.toString() } }))
                })

                port.postMessage({ type: "action", action: "setInfobox", data: { content: `Downloading ${tabs.length} post images...` } })
            } else if(message.type === "closetabs"){
                tabs.forEach(tab => chrome.tabs.remove(tab.id))

                port.postMessage({ type: "action", action: "setInfobox", data: { content: "Closed all the post tabs." } })
            }
        }).catch(err => port.postMessage({ type: "error", data: { err: err.toString(), errStack: err.stack.toString() } }))
    })
})
