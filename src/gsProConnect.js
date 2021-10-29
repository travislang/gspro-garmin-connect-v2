const net = require('net')

class GsProConnect {
    constructor(ipcPort) {
        this.deviceID = process.env.DEVICE_ID
        this.units = process.env.UNITS
        this.apiVersion = process.env.API_VERSION
        this.sendClubData = process.env.clubData

        this.shotNumber = 1
        this.socket = null
        this.ipcPort = ipcPort

        this.connectSocket()
    }

    connectSocket() {
        this.ipcPort.postMessage({
            type: 'gsProStatus',
            status: 'connecting',
        })
        this.ipcPort.postMessage({
            type: 'gsProMessage',
            message: 'Trying to connect to GSPro...',
        })
        setTimeout(() => this.handleConnection(), 1000)
        // this.socket = net.createConnection(
        //     {
        //         address: process.env.IP_ADDRESS,
        //         port: process.env.PORT,
        //     },
        //     this.handleConnection
        // )
    }

    handleDisconnect() {
        if (this.socket) this.socket.destroy()
        this.socket = null
        this.ipcPort.postMessage({
            type: 'gsProStatus',
            status: 'disconnected',
        })
        this.ipcPort.postMessage({
            type: 'gsProMessage',
            message: 'Disconnected from GSPro...',
            level: 'error',
        })
        this.ipcPort.postMessage({
            type: 'gsProShotStatus',
            ready: false,
        })

        this.connectSocket()
    }

    handleConnection() {
        this.ipcPort.postMessage({
            type: 'gsProStatus',
            status: 'connected',
        })
        this.ipcPort.postMessage({
            type: 'gsProMessage',
            message: 'Connected to GSPro',
            level: 'success',
        })

        // this.socket.setEncoding('UTF8')

        // this.socket.on('error', (e) => {
        //     console.log('error with gspro socket', e)
        //     this.ipcPort.postMessage({
        //         type: 'GSProMessage',
        //         message: 'Error with GSPro connection.  Trying to reconnect...',
        //     })
        // })

        // this.socket.on('close', (hadError) => {
        //     console.log('gsPro connection closed.  Had error: ', hadError)
        //     this.handleDisconnect()
        // })

        // this.socket.on('data', (data) => {
        //     try {
        //         const dataObj = JSON.parse(data)
        //         console.log('incoming message from gsPro:', dataObj)
        //     } catch (e) {
        //         console.log('error parsing incoming gsPro message', e)
        //     }
        // })
    }

    sendMessage(payload) {
        this.socket.write(JSON.stringify(payload))
    }

    launchBall(ballData, clubData) {
        const APIData = {
            DeviceID: this.deviceID,
            Units: this.unit,
            ShotNumber: this.shotNumber,
            APIversion: this.apiVersion,
            BallDat: {
                Speed: ballData.ballspeed,
                SpinAxix: ballData.spinaxis,
                TotalSpin: ballData.totalspin,
                HLA: ballData.hla,
                VLA: ballData.vla,
            },
            ShotDataOptions: {
                ContainsBallData: true,
                ContainsClubData: false,
            },
        }

        if (this.sendClubData) {
            APIData.ShotDataOptions.ContainsClubData = true

            APIData.ClubData = {
                Speed: clubData.speed,
                AngleOfAttack: clubData.angleofattack,
                FaceToTarget: clubData.facetotarget,
                Lie: clubData.lie,
                Loft: clubData.loft,
                Path: clubData.path,
                SpeedAtImpact: clubData.speedatimpact,
                VerticalFaceImpact: clubData.verticalfaceimpact,
                HorizontalFaceImpact: clubData.horizontalfaceimpact,
                ClosureRate: clubData.closurerate,
            }
        }

        this.sendMessage(APIData)

        this.shotNumber++
    }
}

module.exports = GsProConnect
