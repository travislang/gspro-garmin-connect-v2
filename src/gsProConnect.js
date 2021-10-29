const WebSocket = require('ws')

const ws = new WebSocket(`ws://${process.env.IP_ADDRESS}:${process.env.PORT}`)

ws.on('open', function open() {
    console.log('connected')
    // ws.send(Date.now())
})

ws.on('close', function close() {
    console.log('disconnected')
})

ws.on('message', function incoming(data) {
    console.log(`Roundtrip time: ${Date.now() - data} ms`)

    setTimeout(function timeout() {
        ws.send(Date.now())
    }, 500)
})

exports.ws = ws
