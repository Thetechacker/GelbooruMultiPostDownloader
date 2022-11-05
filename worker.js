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

function isNNN(){
    const curDate = new Date()

    return (new Date(`1 November ${curDate.getFullYear()}`) < curDate) && (new Date(`31 November ${curDate.getFullYear()}`) > curDate)
}

chrome.runtime.onInstalled.addListener(details => {
    if(details.reason === "install"){
        chrome.storage.local.set({ nnnblock: true })
    }

    if(isNNN()){
        chrome.storage.local.get(['nnnblock'], options => {
            if(options.nnnblock){
                chrome.tabs.query({}).then(tabs => tabs.filter(tab => tab.url.startsWith(baseuri)).forEach(tab => chrome.tabs.remove(tab.id))).catch(err => undefined)
            }
        })
    }
})

chrome.tabs.onUpdated.addListener((tabId, tab) => {
    if(isNNN()){
        if(tab.status !== "loading") return

        if(tab.url){
            if(!tab.url.startsWith(baseuri)) return
        } else {
            return
        }
    
        chrome.storage.local.get(['nnnblock'], options => {
            if(options.nnnblock){
                chrome.tabs.query({}).then(tabs => tabs.filter(tab => tab.url.startsWith(baseuri)).forEach(tab => chrome.tabs.remove(tab.id))).catch(err => undefined)
            }
        })
    }
})

chrome.runtime.onConnect.addListener(port => {
    port.onMessage.addListener(message => {
        let setInfobox = (content, textColor) => port.postMessage({ type: "action", action: "setInfobox", data: { content: (typeof content === "string" ? content : "noContent"), textColor: (typeof textColor === "string" ? textColor : "greenyellow") } })
        let throwError = (err) => port.postMessage({ type: "action", action: "setInfobox", data: { content: (err ? err.toString() : "noErr"), textColor: "red" } })
        let throwWarning = (warning) => port.postMessage({ type: "action", action: "setInfobox", data: { content: `/!\\ ` + (typeof warning === "string" ? warning : "noWarning"), textColor: "yellow" } })

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

                if(isNNN() && !message.data){
                    chrome.tabs.query({}).then(tabs => tabs.filter(tab => tab.url.startsWith(baseuri)).forEach(tab => chrome.tabs.remove(tab.id))).catch(throwError)
                }
            } else {
                chrome.storage.local.get(null, options => {
                    if(options.nnnblock && isNNN()){
                        throwError("Nuh-uh :/")
                        tabs.filter(tab => tab.url.startsWith(baseuri)).forEach(tab => chrome.tabs.remove(tab.id))
        
                        return
                    }
    
                    if(!posttabs.length) return throwWarning("No Gelbooru post tabs found.")
    
                    if(message.type === "cpgl"){
                        port.postMessage({ type: "action", action: "clipboardWriteText", data: { content: posttabs.map(tab => tab.url).join("\n") } })
                        setInfobox("Gelbooru post links copied to clipboard ;>>")
                    } else if(message.type === "dgpi"){
                        const fposttabs = [...new Set(posttabs.map(tab => parseURIParameters(tab.url).id))]
                        
                        fposttabs.forEach(id => {
                            fetch(`${baseuri}/index.php?page=dapi&s=post&q=index&id=${id}&json=1`, { method: "GET" }).then(res => res.json()).then(res => {
                                const image_uri = res.post[0].file_url
                                const image_ext = image_uri.substring(image_uri.lastIndexOf('/') + 1).split(".")
        
                                chrome.downloads.download({ url: image_uri, filename: `gelbooru_${res.post[0].id}${image_ext[1] ? `.${image_ext[1]}` : ""}` }).catch(throwError)
                            }).catch(throwError)
                        })

                        setInfobox(`Downloading ${posttabs.length} post images...`)
                    } else if(message.type === "closetabs"){
                        posttabs.forEach(tab => chrome.tabs.remove(tab.id))
                        
                        setInfobox("Closed all the post tabs.")
                    }

                    if(message.type !== "closetabs" && options.autoclosetabs){
                        posttabs.forEach(tab => chrome.tabs.remove(tab.id))
                    }
                })
            }
        }).catch(throwError)
    })
})
