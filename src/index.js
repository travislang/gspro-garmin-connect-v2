try {
    require('electron-reloader')(module)
} catch (_) {}

require('dotenv').config()
const { app, BrowserWindow, MessageChannelMain } = require('electron')
const path = require('path')

// const { ws } = require('./gsProConnect.js')
const GarminConnect = require('./garminConnect.js')

if (require('electron-squirrel-startup')) {
    app.quit()
}

const startApp = () => {
    const mainWindow = new BrowserWindow({
        width: 650,
        height: 500,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    })

    mainWindow.loadFile(path.join(__dirname, 'index.html'))
    mainWindow.webContents.openDevTools({ mode: 'detach' })

    const { port1, port2 } = new MessageChannelMain()

    port2.on('message', (event) => {
        console.log('from renderer main world:', event.data)
    })

    port2.start()

    const garminConnect = new GarminConnect(port2)

    mainWindow.webContents.postMessage('main-port', null, [port1])
}

app.on('ready', startApp)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        startApp()
    }
})
