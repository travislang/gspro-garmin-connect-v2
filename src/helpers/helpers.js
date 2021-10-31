const { networkInterfaces } = require('os')

const nets = networkInterfaces()

const results = Object.keys(nets).reduce((curr, name) => {
    for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
            curr.push(net.address)
        }
    }
    return curr
}, [])

let localIp = results.length ? results[0] : '127.0.0.1'

exports.localIP = localIp
exports.localIPs = results
