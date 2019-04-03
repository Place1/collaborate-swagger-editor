const http = require('http')
const express = require('express')
const peer = require('peer')
const cors = require('cors')

const app = express()

const server = app.listen(8000)

app.use(cors())

app.use('/rtc', peer.ExpressPeerServer(server, {
	debug: true
}))
