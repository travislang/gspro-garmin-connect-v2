const net = require('net')
const { localIP } = require('./helpers/helpers')
const SimMessages = require('./helpers/simMessages')

class GarminConnect {
    constructor(ipcPort, gsProConnect) {
        this.server = net.createServer()
        this.client = null
        this.ballData = {}
        this.clubData = {}
        this.clubType = '7Iron'
        this.ipcPort = ipcPort
        this.gsProConnect = gsProConnect

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

    updateClubType(clubType) {
        this.clubType = clubType

        this.client.write(SimMessages.get_success_message('SetClubType'))

        if (clubType == 'SandWedge') this.sendTestShot()
    }

    sendTestShot() {
        this.ballData = {
            ballspeed: 128.5,
            spinaxis: -13.2,
            totalspin: 2350.2,
            hla: 0.0,
            vla: 13.5,
        }

        this.sendShot()
    }

    setBallData(ballData) {
        let spinAxis = ballData.SpinAxis
        if (spinAxis > 90) {
            spinAxis -= 360
        }
        spinAxis *= -1
        this.ballData = {
            ballspeed: ballData.BallSpeed,
            spinaxis: spinAxis,
            totalspin: ballData.TotalSpin,
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

        this.client.write(SimMessages.get_success_message('SendShot'))
        this.client.write(SimMessages.get_shot_complete_message())
        this.client.write(SimMessages.get_sim_command('Disarm'))

        setTimeout(() => {
            this.client.write(SimMessages.get_sim_command('Arm'))
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
