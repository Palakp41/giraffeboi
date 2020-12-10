#!/usr/bin/env node
import express from 'express'

import axios from 'axios'
import moment from 'moment'

const baseURL = process.env.INFLUX_URL; // url of your cloud instance (e.g. https://us-west-2-1.aws.cloud2.influxdata.com/)
const influxToken = process.env.INFLUX_TOKEN; // create an all access token in the UI, export it as INFLUX_TOKEN
const orgID = process.env.ORG_ID; // export your org id;
const mapboxUrl = process.env.API_URL;
const apiKey = process.env.API_KEY; //export your own apiKey;

const influxProxy = axios.create({
  baseURL,
  headers: {
    'Authorization': `Token ${influxToken}`,
    'Content-Type': 'application/json'
  }
});

const app = express();
const port = 8617;

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './' });
});

app.get('/dist/bundle.js', (req, res) => {
  res.sendFile('bundle.js', { root: './dist' });
})

app.get('/query', (req, res) => {
  const bucket = 'telegraf';
  const start = '2019-02-01 00:00:00.000'
  const stop = '2020-02-28 23:59:00.000'

  const query = `
  from(bucket: "palak+cloud2's Bucket")
  |> range(start: ${moment(start).toISOString()}, stop: ${moment(stop).toISOString()})
  |> filter(fn: (r) => r["_measurement"] == "migration")
  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)
  |> yield(name: "mean")
  `.trim();

  influxProxy.request({
    method: 'post',
    url: 'api/v2/query',
    params: {
      orgID
    },
    data: {
      query,
      extern: {"type":"File","package":null,"imports":null,"body":[{"type":"OptionStatement","assignment":{"type":"VariableAssignment","id":{"type":"Identifier","name":"v"},"init":{"type":"ObjectExpression","properties":[{"type":"Property","key":{"type":"Identifier","name":"bucket"},"value":{"type":"StringLiteral","value":"telegraf"}},{"type":"Property","key":{"type":"Identifier","name":"timeRangeStart"},"value":{"type":"UnaryExpression","operator":"-","argument":{"type":"DurationLiteral","values":[{"magnitude":1,"unit":"h"}]}}},{"type":"Property","key":{"type":"Identifier","name":"timeRangeStop"},"value":{"type":"CallExpression","callee":{"type":"Identifier","name":"now"}}},{"type":"Property","key":{"type":"Identifier","name":"windowPeriod"},"value":{"type":"DurationLiteral","values":[{"magnitude":10000,"unit":"ms"}]}}]}}}]},
      dialect :{"annotations":["group","datatype","default"]}
    }
  }).then((response) => {
    res.send(response.data)
  }).catch(error => {
    res.send(error.message)
  });

})

app.get('/apiUrlKey', (req, res) => {
  res.send({ url: mapboxUrl, key: apiKey })
  })

app.get('/map', (req, res) => {
  console.log("maboxUrls", mapboxUrl);
  const link = mapboxUrl + '?access_token=' + apiKey;
  axios.get(link).then((response) => {
      res.send(response.data)
    })
})

app.listen(port, () => {
  console.log(`listening on port :${port}`);
});
