const { networkInterfaces } = require('os')

const nets = networkInterfaces()
const results = {} // Or just '{}', an empty object

for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
            if (!results[name]) {
                results[name] = []
            }
            results[name].push(net.address)
        }
    }
}

let localIp =  results[Object.keys(results)[0]][0]

console.log('localIp', localIp)

exports.localIP = localIp
