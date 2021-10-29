const net = require('net')
const { localIP } = require('./helpers/helpers')
const SimMessages = require('./helpers/simMessages')

class GarminConnect {
    constructor(ipcPort) {
        this.server = net.createServer()
        this.client = null
        this.ballData = {}
        this.clubData = {}
        this.clubType = '7Iron'
        this.connectionStatus = false
        this.ipcPort = ipcPort

        this.init()
    }

    init() {
        this.server.on('connection', (conn) => {
            this.handleConnection(conn)
        })

        this.server.on('error', (e) => {
            if (e.code === 'EADDRINUSE') {
                console.log('Address in use, retrying...')
                this.ipcPort.postMessage({
                    type: 'R10Message',
                    message:
                        'Address already in use.  Do you have this program open in another window?  Retrying...',
                })
                setTimeout(() => {
                    this.listen()
                }, 5000)
            }
        })

        this.listen()
    }

    listen() {
        this.server.close()
        this.server.listen(process.env.GARMIN_PORT, localIP, () => {
            this.ipcPort.postMessage({
                type: 'garminStatus',
                status: 'connecting',
            })
            this.ipcPort.postMessage({
                type: 'R10Message',
                message: 'Waiting for connection from R10...',
            })
        })
    }

    handleIncomingData(data) {
        switch (data.Type) {
            case 'Handshake':
                this.client.write(SimMessages.get_handshake_message(1))
                break
            case 'Challenge':
                this.client.write(SimMessages.get_handshake_message(2))
                break
            case 'Disconnect':
                this.handleDisconnect()
                break
            default:
                console.log('no match', data.Type)
        }
    }

    handleDisconnect() {
        this.client.end()
        this.client = null
        this.ipcPort.postMessage({
            type: 'garminStatus',
            status: 'disconnected',
        })
        this.ipcPort.postMessage({
            type: 'R10Message',
            message: 'Disconnected from R10...',
            level: 'error',
        })
    }

    handleConnection(conn) {
        var remoteAddress = conn.remoteAddress + ':' + conn.remotePort
        console.log('new client connection from %s', remoteAddress)
        this.ipcPort.postMessage({
            type: 'garminStatus',
            status: 'connected',
        })
        this.ipcPort.postMessage({
            type: 'R10Message',
            message: 'Connected to R10',
            level: 'success',
        })
        this.client = conn
        this.connectionStatus = true

        this.client.setEncoding('UTF8')

        this.client.on('ready', () => {
            console.log('socket is ready')
        })

        this.client.on('data', (data) => {
            try {
                const dataObj = JSON.parse(data)
                console.log('incoming message:', dataObj)
                this.handleIncomingData(dataObj)
            } catch (e) {
                console.log('error parsing incoming message', e)
            }
        })

        this.client.on('close', (hadError) => {
            console.log('client connection closed.  Had error: ', hadError)
            this.listen()
        })

        this.client.on('error', (e) => {
            console.log('client connection error', e)
        })
    }
}

module.exports = GarminConnect
