require('dotenv').config()
const axios = require('axios')
const express = require('express')

const app = express()
const port = 8000

const client_id = process.env.SPOTIFY_APP_ID
const client_secret = process.env.SPOTIFY_APP_SECRET

const redirect_uri = `http://localhost:3000/callback/`

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

    res.append('Access-Control-Allow-Origin', 'http://localhost:3000')

    const body = new URLSearchParams()
    body.append('grant_type', 'authorization_code')
    body.append('redirect_uri', redirect_uri)
    body.append('code', code)

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
            if (err.response) {
                res.status(res.response.status).send({ ...err.response.data })

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

    res.append('Access-Control-Allow-Origin', 'http://localhost:3000')

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
            if (err.response) {
                res.status(res.response.status).send({ ...err.response.data })

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
