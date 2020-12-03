#!/usr/bin/env node
import express from 'express'

import axios from 'axios'

const baseURL = process.env.INFLUX_URL; // url of your cloud instance (e.g. https://us-west-2-1.aws.cloud2.influxdata.com/)
const influxToken = process.env.INFLUX_TOKEN; // create an all access token in the UI, export it as INFLUX_TOKEN
const orgID = process.env.ORG_ID; // export your org id;
const mapboxUrl = process.env.MAPBOX_URL;
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

  const query = `
  from(bucket: "palak+cloud2's Bucket")
    |> range(start: -30s)
    |> filter(fn: (r) => r._measurement == "mem")
    |> filter(fn: (r) => r._field == "used_percent")
    |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)
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
