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
            var posttabs = tabs.filter(tab => {
                const up = parseURIParameters(tab.url)
    
                if(tab.url.startsWith(baseuri) && (up.page === "post") && (up.s === "view") && (!isNaN(up.id))){
                    return true
                } else {
                    return false
                }
            })

            if(message.type === "autoclosetabs_swchange"){
                chrome.storage.local.set({ autoclosetabs: message.data })
            } else if(message.type === "nnnblock_swchange"){
                chrome.storage.local.set({ nnnblock: !message.data })

                if(!message.data){
                    chrome.tabs.query({}).then(tabs => tabs.filter(tab => tab.url.startsWith(baseuri)).forEach(tab => chrome.tabs.remove(tab.id)))
                }
            } else {
                chrome.storage.local.get(null, options => {
                    if(options.nnnblock){
                        const curYear = new Date().getFullYear()
    
                        if((new Date(`1 November ${curYear}`) < new Date()) && (new Date(`31 November ${curYear}`) > new Date())){
                            const errMessage = "Nu-uh :/"
                            port.postMessage({ type: "error", data: { err: errMessage, errStack: errMessage } })
                            tabs.filter(tab => tab.url.startsWith(baseuri)).forEach(tab => chrome.tabs.remove(tab.id))
            
                            return
                        }
                    }
    
                    if(!posttabs.length) return port.postMessage({ type: "action", action: "setInfobox", data: { content: "No Gelbooru post tabs found." } })
    
                    if(message.type === "cpgl"){
                        port.postMessage({ type: "action", action: "clipboardWriteText", data: { content: posttabs.map(tab => tab.url).join("\n") } })
                        port.postMessage({ type: "action", action: "setInfobox", data: { content: "Gelbooru post links copied to clipboard ;>>" } })
                    } else if(message.type === "dgpi"){
                        posttabs = [...new Set(posttabs.map(tab => parseURIParameters(tab.url).id))]
                        
                        posttabs.forEach(id => {
                            fetch(`${baseuri}/index.php?page=dapi&s=post&q=index&id=${id}&json=1`, { method: "GET" }).then(res => res.json()).then(res => {
                                const image_uri = res.post[0].file_url
                                const image_ext = image_uri.substring(image_uri.lastIndexOf('/') + 1).split(".")
        
                                chrome.downloads.download({ url: image_uri, filename: `gelbooru_${res.post[0].id}${image_ext[1] ? `.${image_ext[1]}` : ""}` })
                            }).catch(err => port.postMessage({ type: "error", data: { err: err.toString(), errStack: err.stack.toString() } }))
                        })
        
                        port.postMessage({ type: "action", action: "setInfobox", data: { content: `Downloading ${posttabs.length} post images...` } })
                    } else if(message.type === "closetabs"){
                        posttabs.forEach(tab => chrome.tabs.remove(tab.id))
        
                        port.postMessage({ type: "action", action: "setInfobox", data: { content: "Closed all the post tabs." } })
                    }

                    if(message.type !== "closetabs" && options.autoclosetabs){
                        posttabs.forEach(tab => chrome.tabs.remove(tab.id))
                    }
                })
            }
        }).catch(err => port.postMessage({ type: "error", data: { err: err.toString(), errStack: err.stack.toString() } }))
    })
})

chrome.tabs.onUpdated.addListener((tabId, tab) => {
    if(tab.status !== "loading" || !tab.url.startsWith(baseuri)) return

    chrome.storage.local.get(['nnnblock'], options => {
        if(options.nnnblock){
            chrome.tabs.remove(tabId)
        }
    })
})