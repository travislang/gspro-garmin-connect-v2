const net = require('net')
const { localIP, localIPs } = require('./helpers/helpers')
const SimMessages = require('./helpers/simMessages')
const ENV = require('./env')

class GarminConnect {
    constructor(ipcPort, gsProConnect) {
        this.server = net.createServer()
        this.client = null
        this.ballData = {}
        this.clubData = {}
        this.clubType = '7Iron'
        this.ipcPort = ipcPort
        this.gsProConnect = gsProConnect
        this.localIP = localIP
        this.pingTimeout = false
        this.intervalID = null

        ipcPort.on('message', (event) => {
            if (event.data === 'sendTestShot') {
                this.sendTestShot()
            } else if (event.data && event.data.type === 'setIP') {
                this.setNewIP(event.data.data)
            }
        })

        this.ipcPort.postMessage({
            type: 'ipOptions',
            data: localIPs,
        })
        this.ipcPort.postMessage({
            type: 'setIP',
            data: this.localIP,
        })

        ipcPort.start()

        this.listen()
    }

    setNewIP(ip) {
        this.ipcPort.postMessage({
            type: 'setIP',
            data: ip,
        })

        this.localIP = ip

        this.ipcPort.postMessage({
            type: 'R10Message',
            message: `Switching IP to ${ip}`,
        })

        if (this.client) {
            handleDisconnect()
        }
        this.listen()
    }

    listen() {
        if (this.server) {
            this.server.close()
        }
        this.server = net.createServer()

        this.server.on('connection', (conn) => {
            this.handleConnection(conn)
        })

        this.server.on('error', (e) => {
            if (e.code === 'EADDRINUSE') {
                this.ipcPort.postMessage({
                    type: 'R10Message',
                    message:
                        'Address already in use.  Do you have this program open in another window?  Retrying...',
                })
            } else {
                console.log('error with garmin server', e)
            }
            setTimeout(() => {
                this.listen()
            }, 5000)
        })

        this.server.listen(ENV.GARMIN_PORT, this.localIP, () => {
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
            case 'Pong':
                this.handlePong()
                break
            case 'SetClubType':
                this.updateClubType(data.ClubType)
                break
            case 'SetBallData':
                this.setBallData(data.BallData)
                break
            case 'SetClubData':
                this.setClubData(data.ClubData)
                break
            case 'SendShot':
                this.sendShot()
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
        this.ipcPort.postMessage({
            type: 'gsProShotStatus',
            ready: false,
        })
    }

    handlePong() {
        this.pingTimeout = false
    }

    sendPing() {
        console.log('sending ping')
        this.pingTimeout = true

        this.client.write(SimMessages.get_sim_command('Ping'))

        setTimeout(() => {
            if (this.pingTimeout === true) {
                this.ipcPort.postMessage({
                    type: 'R10Message',
                    message: 'R10 stopped responding...',
                    level: 'error',
                })
                if (this.intervalID) {
                    clearInterval(this.intervalID)
                }
                this.handleDisconnect()
                this.listen()
            } else {
            }
        }, 3000)
    }

    handleConnection(conn) {
        this.ipcPort.postMessage({
            type: 'garminStatus',
            status: 'connected',
        })
        this.ipcPort.postMessage({
            type: 'R10Message',
            message: 'Connected to R10',
            level: 'success',
        })
        this.ipcPort.postMessage({
            type: 'gsProShotStatus',
            ready: true,
        })
        this.client = conn

        this.client.setEncoding('UTF8')

        if (this.intervalID) {
            clearInterval(this.intervalID)
        }
        this.intervalID = setInterval(() => {
            this.sendPing()
        }, 10000)

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

    updateClubType(clubType) {
        this.clubType = clubType

        this.client.write(SimMessages.get_success_message('SetClubType'))
    }

    sendTestShot() {
        this.ballData = {
            ballSpeed: 98.5,
            spinAxis: -10.2,
            totalSpin: 2350.2,
            hla: 0.0,
            vla: 13.5,
        }

        this.sendShot()
    }

    setBallData(ballData) {
        let spinAxis = Number(ballData.SpinAxis)
        if (spinAxis > 90) {
            spinAxis -= 360
        }
        spinAxis *= -1
        this.ballData = {
            ballSpeed: ballData.BallSpeed,
            spinAxis: spinAxis,
            totalSpin: ballData.TotalSpin,
            hla: ballData.LaunchDirection,
            vla: ballData.LaunchAngle,
        }

        this.ipcPort.postMessage({
            type: 'gsProShotStatus',
            ready: false,
        })

        this.client.write(SimMessages.get_success_message('SetBallData'))
    }

    setClubData(clubData) {
        this.clubData = {
            speed: clubData.ClubHeadSpeed,
        }

        this.ipcPort.postMessage({
            type: 'gsProShotStatus',
            ready: false,
        })

        this.client.write(SimMessages.get_success_message('SetClubData'))
    }

    async sendShot() {
        this.ipcPort.postMessage({
            type: 'gsProShotStatus',
            ready: false,
        })
        this.gsProConnect.launchBall(this.ballData, this.clubData)

        if (this.client) {
            this.client.write(SimMessages.get_success_message('SendShot'))
            setTimeout(() => {
                this.client.write(SimMessages.get_shot_complete_message())
            }, 300)
            setTimeout(() => {
                this.client.write(SimMessages.get_sim_command('Disarm'))
            }, 700)
            setTimeout(() => {
                this.client.write(SimMessages.get_sim_command('Arm'))
            }, 1000)
        }

        setTimeout(() => {
            this.ipcPort.postMessage({
                type: 'gsProMessage',
                message: '💯 Shot successful 💯',
                level: 'success',
            })
            this.ipcPort.postMessage({
                type: 'gsProShotStatus',
                ready: true,
            })
        }, 1000)
    }
}

module.exports = GarminConnect
