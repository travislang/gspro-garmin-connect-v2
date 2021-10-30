window.addEventListener('DOMContentLoaded', () => {
    const IPText = document.getElementById('ip-address')
    if (IPText && window.mainAPI.localIP) IPText.innerText = window.mainAPI.localIP

    let timeout = false
    let gsProConnected = false

    window.onmessage = (event) => {
        if (event.source === window && event.data === 'main-port') {
            const [port] = event.ports
            port.onmessage = (event) => {
                console.log('from main process:', event.data)

                handleMessage(event.data)
            }

            const sendTestShotButton = document.querySelector('#send-test-shot')

            sendTestShotButton.addEventListener('click', () => {
                if (!gsProConnected) {
                    return
                }
                timeout = true
                port.postMessage('sendTestShot')

                sendTestShotButton.classList.remove('send-test-shot')
                sendTestShotButton.classList.add('send-test-shot-disabled')
                setTimeout(() => {
                    sendTestShotButton.classList.remove('send-test-shot-disabled')
                    sendTestShotButton.classList.add('send-test-shot')
                    timeout = false
                }, 8000)
            })
        }
    }

    function handleMessage(data) {
        if (data.type) {
            if (data.type === 'garminStatus') {
                updateStatus('garmin', data.status)
            } else if (data.type === 'R10Message') {
                printMessage('R10', data.message, data.level)
            } else if (data.type === 'gsProStatus') {
                updateStatus('gspro', data.status)
            } else if (data.type === 'gsProMessage') {
                printMessage('GSPro', data.message, data.level)
            } else if (data.type === 'gsProShotStatus') {
                updateShotStatus(data.ready)
            }
        }
    }

    function updateStatus(element, status) {
        if (element === 'gspro') {
            const sendTestShotButton = document.querySelector('#send-test-shot')

            if (status === 'connected') {
                gsProConnected = true
                sendTestShotButton.classList.remove('send-test-shot-disabled')
                sendTestShotButton.classList.add('send-test-shot')
            } else {
                gsProConnected = false
                sendTestShotButton.classList.remove('send-test-shot')
                sendTestShotButton.classList.add('send-test-shot-disabled')
            }
        }
        const COLOR_CLASSES = ['status-color-red', 'status-color-yellow', 'status-color-green']

        const el = document.getElementById(element)
        const statusColor = el.querySelector('.status-icon')
        const statusText = el.querySelector('.status-text-container .status-status')

        statusColor.classList.remove(...COLOR_CLASSES)

        if (status === 'connected') {
            statusColor.classList.add(COLOR_CLASSES[2])
            statusText.innerHTML = 'Connected'
        } else if (status === 'connecting') {
            statusColor.classList.add(COLOR_CLASSES[1])
            statusText.innerHTML = 'Connecting...'
        } else {
            statusColor.classList.add(COLOR_CLASSES[0])
            statusText.innerHTML = 'Disconnected'
        }
    }

    function printMessage(system, message, level) {
        const mw = document.querySelector('.messages-window')

        const messageEl = mw.querySelector('.message-text').cloneNode(true)

        if (level === 'error') {
            messageEl.classList.add('message-text-red')
        }
        if (level === 'success') {
            messageEl.classList.add('message-text-green')
        }

        const title = messageEl.querySelectorAll('span')[0]
        const text = messageEl.querySelectorAll('span')[1]

        const date = new Date()

        title.innerHTML = `${system}  🔅  ${date.getHours().toString().padStart(2, '0')}:${date
            .getHours()
            .toString()
            .padStart(2, '0')}>`

        text.innerHTML = message

        mw.append(messageEl)
    }

    function updateShotStatus(ready) {
        const shotReadyText = document.querySelector('.shot-status')
        console.log('in', shotReadyText)
        if (ready) {
            shotReadyText.innerHTML = 'Ready For Shot  💣'

            shotReadyText.classList.remove('message-text-red')
            shotReadyText.classList.add('message-text-green')
        } else {
            shotReadyText.innerHTML = 'Wait ✋'

            shotReadyText.classList.remove('message-text-green')
            shotReadyText.classList.add('message-text-red')
        }
    }
})
