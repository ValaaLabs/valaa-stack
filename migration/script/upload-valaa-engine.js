const path = require("path");
const fs = require("fs");
const FormData = require("form-data");
const http = require("http");

const synopsis = "upload-valaa-engine targetDirectory";
// for inspire.valaa.com - 6d86102d6257573e5da009a8059e77151fd767b8
const projectId = process.env.INSPIRE_PROJECT_ID;
// for inspire.valaa.com - 745a7be22dacd2a1c1a20c2f5ad70c85d1b796f0
const projectHeadId = process.env.INSPIRE_PROJECT_RELEASE_ID;

if (!process.argv[2]) {
  console.log("Synopsis:", synopsis);
  process.exit(0);
}

const packageName = process.argv[2];
const fileName = `${packageName}.tar.gz`;

if (process.env.INSPIRE_UPLOAD_HOST
    && process.env.INSPIRE_UPLOAD_PORT
    && process.env.INSPIRE_PROJECT_ID
    && process.env.INSPIRE_PROJECT_RELEASE_ID
    && process.env.INSPIRE_USERNAME) {

  const exportContent = fs.readFileSync(fileName);
  const uploadEngineForm = new FormData();

  graphQlRequest(
    {
      input_0: {
        archiveType: "gzip",
        archiveName: fileName,
        clientMutationId: "2"
      }
    },
    `mutation ImportEngineMutation($input_0:ImportEngineMutationInput!) {
      importEngine(input:$input_0) {
        clientMutationId,
        ...F0
      }
    }
    fragment F0 on ImportEngineMutationPayload {
      clientMutationId,
      engineReleaseId
    }`,
    fileName,
    data => {
      const response = JSON.parse(data.toString());
      if (response.data.importEngine.engineReleaseId) {
        updateProject(projectHeadId, response.data.importEngine.engineReleaseId);
      } else {
        console.log("This engine version has already been uploaded...");
      }
    }
  );

} else {
  console.log(
    "The environment is not correctly setup. The following environment vairables MUST be set:",
    "\n\tINSPIRE_UPLOAD_HOST",
    "\n\tINSPIRE_UPLOAD_PORT",
    "\n\tINSPIRE_PROJECT_ID",
    "\n\tINSPIRE_PROJECT_RELEASE_ID",
    "\n\tINSPIRE_USERNAME"
  );
  process.exit(0);
}

function graphQlRequest (variables, query, file, onComplete, sessionId) {
  const formData = new FormData();
  formData.append("variables", JSON.stringify(variables));
  formData.append("query", query);
  if (file) formData.append("file", fs.createReadStream(file), file);
  const headers = formData.getHeaders();
  if (sessionId) headers["Cookie"] = "sessionId=" + sessionId;
  const request = http.request({
    method: "post",
    host: process.env.INSPIRE_UPLOAD_HOST,
    port: process.env.INSPIRE_UPLOAD_PORT,
    path: "/graphql",
    headers: headers
  });
  formData.pipe(request);
  request.on("response", res => {
    console.log("GraphQL request complete with status:", res.statusCode, res.statusMessage);
    res.on("data", data => {
      console.log(data.toString());
      onComplete(data, res);
    });
  });
}

/* TODO(iridian): Remove valaa-project remnant
function updateProject (projectReleaseId, engineReleaseId) {
  graphQlRequest(
    {
      input_0: {
        actions: JSON.stringify([
          {
            type: "MODIFIED",
            id: projectReleaseId,
            resourceType: "ProjectRelease",
            sets:{ engineRelease: engineReleaseId }
          }
        ]),
        clientMutationId: 1
      }
    },
    `mutation TransactMutation($input_0:TransactMutationInput!) {
      transact(input:$input_0) {
        clientMutationId,
      }
    }`,
    null,
    data => login(loginData => {
      const sessionId = JSON.parse(loginData).data.login.session.id;
      exportProject(projectHeadId, sessionId);
    })
  );
}
*/

function login (onComplete) {
  graphQlRequest(
    {
      input_0: {
        clientMutationId: "2",
        password: process.env.INSPIRE_USERNAME.split("").reverse().join(""),
        username: process.env.INSPIRE_USERNAME
      }
    },
    `mutation LoginMutation($input_0:LoginMutationInput!) {
        login(input:$input_0) {
          clientMutationId,
          ...F3
        }
      }
      fragment F0 on Session {
        id
      }
      fragment F1 on Session {
        id,
        login {
          id
        },
        ...F0
      }
      fragment F2 on Session {
        id,
        login {
          id
        }
      }
      fragment F3 on LoginMutationPayload {
        session {
          ...F1,
          ...F2
        }
      }`,
    null,
    onComplete
  );
}

/* TODO(iridian): Remove valaa-project remnant
function exportProject (projectReleaseId, sessionId) {
  const packageConfig = require(path.join(__dirname, "..", "./package.json"));
  graphQlRequest(
    {
      input_0: {
        clientMutationId: "j",
        projectId: projectId,
        targetURI: "inspire-project\/",
        version: JSON.stringify({
          resourceType: "SemVer",
          text: `${packageConfig.version}-pre`,
          major: parseInt(packageConfig.version.split(".")[0], 10),
          minor: parseInt(packageConfig.version.split(".")[1], 10),
          patch: parseInt(packageConfig.version.split(".")[2], 10)
        })
      }
    },
    `mutation ExportProjectMutation($input_0:ExportProjectMutationInput!) {
        export(input:$input_0) {
          clientMutationId,
          ...F8
        }
      }
      fragment F8 on ExportProjectMutationPayload {
        fullTargetURI,
        error
      }`,
    null,
    data => {},
    sessionId
  );
}
*/
