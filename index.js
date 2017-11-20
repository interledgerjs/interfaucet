const startServer = require('./startServer')
const Plugin = require('ilp-plugin-btp-client')
const IlpPacket = require('ilp-packet')
const uuid = require('uuid/v4')
const url = require('url')
function base64url (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

const plugin = new Plugin({
  btpUri: 'btp+wss://interfaucet:' + process.env.TOKEN + '@amundsen.ilpdemo.org/api/17q3',
})

function getQuote(ipp) {
  console.log('ipp', JSON.stringify(ipp))
  const quotePacket = IlpPacket.serializeIlqpByDestinationRequest({
    destinationAccount: ipp.account,
    destinationAmount: ipp.amount,
    destinationHoldDuration: 3000 // gives the fund.js script 3 seconds to fulfill
  })
  const requestMessage = {
    id: uuid(),
    from: plugin.getAccount(),
    to: plugin.getInfo().connectors[0],
    ledger: plugin.getInfo().prefix,
    ilp: base64url(quotePacket),
    custom: {}
  }
  console.log('lpi quote', requestMessage)
  return plugin.sendRequest(requestMessage).then(responseMessage => {
    console.log({ responseMessage })
    const quoteResponse = IlpPacket.deserializeIlqpByDestinationResponse(Buffer.from(responseMessage.ilp, 'base64'))
    console.log({ quoteResponse }) // sourceAmount: '9000000000', sourceHoldDuration: 3000
    return quoteResponse
  })
}

function sendTransfer(sourceAmount, ipp, condition) {
  const transfer = {
    id: uuid(),
    from: plugin.getAccount(),
    to: plugin.getInfo().connectors[0],
    ledger: plugin.getInfo().prefix,
    amount: sourceAmount,
    ilp: base64url(ipp),
    executionCondition: condition.toString('base64'),
    expiresAt: new Date(new Date().getTime() + 3600000).toISOString()
  }
  console.log('lpi transfer', transfer)
  return plugin.sendTransfer(transfer)
}

function pay(ipr, res) {
  console.log('paying', ipr)
  const ipp = IlpPacket.deserializeIlpPayment(ipr.packet)
  return getQuote(ipp).then(quoteResponse => {
    if (quoteResponse.sourceHoldDuration > 3600000) {
      return Promise.reject(new Error('That would cost the Interfaucet more than 1 hour!'))
    }
    if (parseInt(quoteResponse.sourceAmount) > 1000) {
      return Promise.reject(new Error('That would cost the Interfaucet more than 1000 microdollars!'))
    }
    return sendTransfer(quoteResponse.sourceAmount, ipr.packet, ipr.condition).then(() => {
      res.end(`<html><h2>Congrats!</h2><p>Sent ${quoteResponse.sourceAmount} microdollars</p><img src="https://i.pinimg.com/564x/88/84/85/888485cae122717788328b4486803a32.jpg"></html>`)
    })
  })
}

console.log('connecting plugin, will start webserver soon!')
plugin.connect().then(() => {
  console.log('client started, starting webserver')
  startServer((req, res) => {
    Promise.resolve().then(() => {
      const parts = req.url.split('/')
      if (parts.length < 3) {
        const queryData = url.parse(req.url, true).query
        console.log(queryData)
        if (queryData.address && queryData.condition) {
          return pay({
            packet: IlpPacket.serializeIlpPayment({
              account: queryData.address,
              amount: '1000',
              data: new Buffer([])
            }),
            condition: base64url(Buffer.from(queryData.condition, 'hex'))
          }, res)
        }
        console.log (req.url)
        res.end('<html><h2>Welcome to Interfaucet!</h2><p>See <a href="https://github.com/michielbdejong/ilp-plugin-stripe/pull/2">the payment requests tutorial</a>.</p>')
        return
      }
      console.log('interfaucet request!', parts)
      const iprBuf = Buffer.from(parts[2], 'hex')
      const ipr = {
        version: iprBuf[0],
        packet: iprBuf.slice(1, iprBuf.length - 32),
        condition: iprBuf.slice(-32)
      }
      console.log('ipr', JSON.stringify(ipr))
      return pay(ipr, res)
    }).catch(err => {
      console.log(err, err.message)
      res.end('<html><h2>Oops! Something went wrong.</h2><p>' + err.message + '</p><img src="https://i.pinimg.com/736x/fa/d2/76/fad27608b9bd588fe18231e2babe2b5f--man-faces-strange-places.jpg"></html>')
    })
  })
})
