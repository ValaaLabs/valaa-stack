const https = require("http");

exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const response = {
    status: "200",
    statusDescription: "OK",
    body: "",
    headers: {}
  };

  https.get("http://production.static.valaa.com/front/endpoint-matches.json", (resp) => {
    resp.setEncoding("utf8");

    let returnData = "";

    resp.on("data", chunk => { returnData += chunk; });

    resp.on("end", () => {
      const sites = JSON.parse(returnData);

      if (request.uri === "/rtest") {
        response.body = JSON.stringify(request);
        console.log(`Generated response =  ${response.body}`);
        return callback(null, response);
      }

      console.log(request.uri);
      if (request.uri === "/valaa-inspire.revelation.json") {
        https.get("http://production.static.valaa.com/valaa-inspire.revelation.json", (resp2) => {
          resp2.setEncoding("utf8");
          let revelationData = "";
          resp2.on("data", chunk => {
            revelationData += chunk;
          });
          resp2.on("end", () => {
            const revelation = JSON.parse(revelationData);
            let site = "default";
            console.log(request.querystring);
            if (typeof (request.querystring) === "string"
              && (
                sites.hasOwnProperty(request.querystring)
                || (request.querystring.slice(-5) === ".json" && sites.hasOwnProperty(request.querystring.slice(0, -5))))) {
              if (request.querystring.slice(-5) === ".json") {
                site = request.querystring.slice(0, -5);
              } else {
                site = request.querystring;
              }
            }

            // we override the partitionUri here
            const content = revelation;
            content.directPartitionURI = sites[site];
            content.site = site;
            response.body = JSON.stringify(content);
            response.headers["content-type"] = [{
              key: "Content-Type",
              value: "application/json"
            }];

            console.log(`Generated response =  ${response.body}`);
            return callback(null, response);
          });
        });
        return undefined;
      } else if (sites.hasOwnProperty(request.uri.substring(1))) {
        response.body = indexPage(request.uri.substring(1));
        console.log(`Generated response =  ${response.body}`);
        return callback(null, response);
      }
      return callback(null, request);
    });
  });
};


function indexPage (site) {
  return `<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <title>Valaa - Inspire</title>
        <link rel="icon" href="favicon.ico?a=1" type="image/x-icon" />
        <style>
          html, body, #game {
            margin: 0px;
            padding: 0px;
            box-sizing: border-box;
            transition: all 0.5s ease;
          }
          *, *:before, *:after {
            box-sizing: inherit;
          }
        </style>
        <link rel="preload" href="js/valaa-inspire.js" as="script" type="application/js" />
        <link rel="preload" href="js/url-search-params.js" as="script" type="application/js" />
        <link rel="preload" href="valaa-inspire.revelation.json" as="fetch" type="application/json" />
    </head>
<body>
    <div id="valaa-inspire--main-container"></div>
    <!-- TODO: cdn.valaa.com? -->
    <script src="js/url-search-params.js" async></script>
    <script src="js/valaa-inspire.js" async></script>
    <script>
      document.addEventListener(
          "DOMContentLoaded",
          (function (inspireClientPromise) {
            return function () {
              inspireClientPromise.then(function (inspireClient) {
                inspireClient.createAndConnectViewsToDOM({
                  inspireMain: {
                    name: "Inspire Main",
                    size: { width: window.innerWidth, height: window.innerHeight, scale: 1 },
                    container: document.querySelector("#valaa-inspire--main-container"),
                    rootId: "valaa-inspire--main-root",
                    rootPartitionURI: inspireClient.revelation.directPartitionURI,
                  },
                });
              });
            };
          })(createInspireClient(
              "valaa-inspire.revelation.json?${site}", {
                directPartitionURI: (new URLSearchParams(document.location.search.substring(1)))
                    .get("partition") || undefined
              }
          )),
          false);
    </script>
</body>
</html>
`;
}
