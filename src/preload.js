const { contextBridge, ipcRenderer } = require('electron')

const { localIP } = require('./helpers/helpers.js')

contextBridge.exposeInMainWorld('mainAPI', {
    localIP,
})

const windowLoaded = new Promise((resolve) => {
    window.onload = resolve
})

ipcRenderer.on('main-port', async (event) => {
    await windowLoaded

    window.postMessage('main-port', '*', event.ports)
})
