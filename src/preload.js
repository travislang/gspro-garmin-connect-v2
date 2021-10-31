const { ipcRenderer } = require('electron')

const windowLoaded = new Promise((resolve) => {
    window.onload = resolve
})

ipcRenderer.on('main-port', async (event) => {
    await windowLoaded

    window.postMessage('main-port', '*', event.ports)
})
