require('dotenv').config()
const axios = require('axios')
const express = require('express')

const isDev = process.env.DEV || false

const app = express()
const port = process.env.PORT || 8000

const client_id = process.env.SPOTIFY_APP_ID
const client_secret = process.env.SPOTIFY_APP_SECRET

if (isDev) {
    console.log(client_id, client_secret, port)
}

const redirect_uri = `http://localhost:3000/callback/`

const cors_allowed_origins = ['http://localhost:3000', 'http://0.0.0.0:3000']

process.on('SIGTERM', shutDown)
process.on('SIGINT', shutDown)

function log(req, res, next) {
    const oldWrite = res.write,
        oldEnd = res.end

    const chunks = []

    res.write = function (chunk) {
        chunks.push(Buffer.from(chunk))

        oldWrite.apply(res, arguments)
    }

    res.end = function (chunk) {
        if (chunk) {
            chunks.push(Buffer.from(chunk))
        }

        const body = Buffer.concat(chunks).toString('utf8')

        console.log(
            {
                time: new Date().toUTCString(),
                fromIP:
                    req.headers['x-forwarded-for'] ||
                    req.connection.remoteAddress,
                method: req.method,
                originalUri: req.originalUrl,
                uri: req.url,
                requestData: req.body,
                responseData: body,
                referer: req.headers.referer || '',
                origin: req.get('origin'),
                ua: req.headers['user-agent'],
            },
            '\n'
        )

        oldEnd.apply(res, arguments)
    }

    next()
}

app.use(log)

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/get-token', async (req, res) => {
    const code = req.query.code || null
    const auth_string = Buffer.from(`${client_id}:${client_secret}`).toString(
        'base64'
    )
    const origin = req.get('origin')

    if (cors_allowed_origins.includes(origin))
        res.append('Access-Control-Allow-Origin', origin)

    const body = new URLSearchParams()
    body.append('grant_type', 'authorization_code')
    body.append('code', code)
    body.append('redirect_uri', redirect_uri)

    const data = await axios({
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            Authorization: `Basic ${auth_string}`,
            'Content-type': 'application/x-www-form-urlencoded',
        },
        data: body, //{
        //     grant_type: 'authorization_code',
        //     code: code,
        //     redirect_uri: redirect_uri,
        // },
    })
        .then((response) => {
            res.status(200).send({ ...response.data })
            return { ...response.data }
        })
        .catch((err) => {
            console.log(err)
            if (err.response) {
                res.status(err.response.status).send({ ...err.response.data })

                return { ...err.response.data }
            }

            return { ...err }
        })

    //console.log(data)
    //console.log('==============================================')
})

app.get('/refresh-token', async (req, res) => {
    const refresh_token = req.query.refresh_token || null
    const auth_string = Buffer.from(`${client_id}:${client_secret}`).toString(
        'base64'
    )

    const origin = req.get('origin')

    if (cors_allowed_origins.includes(origin))
        res.append('Access-Control-Allow-Origin', origin)

    const body = new URLSearchParams()
    body.append('grant_type', 'refresh_token')
    body.append('refresh_token', refresh_token)

    const data = await axios({
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            Authorization: `Basic ${auth_string}`,
            'Content-type': 'application/x-www-form-urlencoded',
        },
        data: body,
    })
        .then((response) => {
            res.status(200).send({ ...response.data })
            return { ...response.data }
        })
        .catch((err) => {
            console.log(err)
            if (err.response) {
                res.status(err.response.status).send({ ...err.response.data })

                return { ...err.response.data }
            }

            return { ...err }
        })
})

app.listen(port, () => {
    console.log(`janitors-closet running and listening on port ${port}`)
})

function shutDown() {
    console.log('\njanitors-closet shutting down...')
    process.exit(0)
}
