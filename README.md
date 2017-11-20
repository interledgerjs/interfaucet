# interfaucet
The code running at https://interfaucet.herokuapp.com

# development
```sh
npm install
PORT=9000 node index.js
```

# production
```sh
$ sudo su
# history # for exact env vars
# cd /root/interfaucet
# npm install
# DOMAIN=interfaucet.ilpdemo.org EMAIL=user@gmail.com TOKEN=****** node index.js
```

Then use [fund.js](https://github.com/interledger/tutorials/blob/7796c6c875591a243c32b734bc7a027c7a944413/fund.js) and open something like http://localhost:9000/fund/0201420000000000002710376447567a64433568625856755a484e6c6269353459576c6b61575531646e56696157395564555a6c5a5842686153356a62476c6c626e510000fe6286be1a053de3c6dec8f7137be178e16fd103cb0d61ab7f63df499af07df0
