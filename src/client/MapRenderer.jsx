import React from "react";
import ReactDOM from "react-dom";

import { Plot, newTable, fromFlux } from "@influxdata/giraffe";
import axios from "axios";

const style = {
  width: "calc(70vw - 20px)",
  height: "calc(70vh - 20px)",
  margin: "40px",
};

const REASONABLE_API_REFRESH_RATE = 30000;

export class MapRenderer extends React.Component {
  constructor(props) {
    super(props);

    this.animationFrameId;

    this.state = {
      layer: {
        type: "geo",
        lat: 40,
        lon: -76,
        zoom: 6,
        allowPanAndZoom: true,
        detectCoordinateFields: false,
        layers: [
          {
            type: "pointMap",
            colorDimension: { label: "Duration" },
            colorField: "duration",
            colors: [
              { type: "min", hex: "#ff0000" },
              { value: 50, hex: "#343aeb" },
              { type: "max", hex: "#343aeb" },
            ],
            isClustered: false,
          },
        ],
        tileServerConfiguration: {
          tileServerUrl: "",
          bingKey: "",
        },
      },
      table: {},
      timestamps: [],
      values: [],
    };

    this.getTileServerUrl = this.getTileServerUrl.bind(this);
    this.fetchInfluxData = this.fetchInfluxData.bind(this);
  }

  async componentDidMount() {
    try {
      this.fetchInfluxData();
      const res = await this.getTileServerUrl();
      const { url } = res;
      const tileServerConfiguration = {
        tileServerUrl: url,
        bingKey: "",
      };
      this.setState({
        layer: {
          ...this.state.layer,
          tileServerConfiguration: tileServerConfiguration,
        },
      });
      this.animationFrameId = window.setInterval(
        this.animateRealData,
        REASONABLE_API_REFRESH_RATE
      );
    } catch (error) {
      console.error(error);
    }
  }

  componentWillUnmount() {
    window.clearInterval(this.animationFrameId);
  }

  render() {
    const config = {
      table: this.state.table,
      layers: [this.state.layer],
    };

    if (!Object.keys(config.table).length) {
      return null;
    }

    return (
      <div style={style}>
        <Plot config={config} />
      </div>
    );
  }

  fetchData() {
    return fetch("http://localhost:8617/mapquery", {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  async fetchInfluxData() {
    const resp = await this.fetchData();
    const resultsCSV = await resp.text();
    let results;

    try {
      results = fromFlux(resultsCSV);
    } catch (error) {
      console.error("error", error.message);
    }

    this.setState({
      table: results.table,
    });
  }

  fetchTileServerUrl(token) {
    return fetch("http://localhost:8617/tileServerUrl", {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        authorization: `Token ${token}`,
      },
    });
  }

  async getTileServerUrl() {
    const jstObj = {
      aud: "gateway.influxdata.com",
      iat: 1568628980,
      iss: "cloud2.influxdata.com",
      kid: "non-static",
      permissions: [
        {
          action: "write",
          resource: {
            type: "buckets",
            id: "0000000000000001",
            orgID: "0000000000000002",
          },
        },
      ],
      user: {
        id: "0000000000000001",
        name: "bbuddin@influxdata.com",
        status: "active",
      },
      features: {
        exampleBooleanFeatureFlag: true,
        exampleNumericFeatureFlag: 2,
      },
    };
    const token = await axios.post("http://localhost:8617/jwt", jstObj);
    const resp = await this.fetchTileServerUrl(token.data);
    const res = await resp.json();
    return res;
  }
}
