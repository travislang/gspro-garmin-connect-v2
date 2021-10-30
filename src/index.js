// try {
//     require('electron-reloader')(module)
// } catch (_) {}

require('update-electron-app')({
    updateInterval: '1 hour',
})

// require('dotenv').config()
const { app, BrowserWindow, MessageChannelMain } = require('electron')
const path = require('path')

const GarminConnect = require('./garminConnect.js')
const GsProConnect = require('./gsProConnect.js')

if (require('electron-squirrel-startup')) {
    app.quit()
}

const startApp = () => {
    const mainWindow = new BrowserWindow({
        width: 675,
        height: 500,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            nativeWindowOpen: true,
        },
    })

    mainWindow.loadFile(path.join(__dirname, 'index.html'))
    mainWindow.webContents.openDevTools({ mode: 'detach' })

    const { port1, port2 } = new MessageChannelMain()

    // port2.start()

    const gsProConnect = new GsProConnect(port2)
    const garminConnect = new GarminConnect(port2, gsProConnect)

    mainWindow.webContents.postMessage('main-port', null, [port1])

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://travislang.io')) {
            require('electron').shell.openExternal(url)
        }
        return { action: 'deny' }
    })
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
