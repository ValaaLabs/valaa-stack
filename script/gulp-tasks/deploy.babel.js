import cp from "child_process";
import env from "./helper/env.babel";

module.exports = (cb, plugins) => {

  const command = `aws s3 cp ${env().buildPath} ${env().environmentConfiguration.bucket} --grants read=uri=${env().environmentConfiguration.rights} --recursive`;
  console.log(env().environmentConfiguration);
  console.log(` -> deploying env ${env().environment} to bucket: ${env().environmentConfiguration.bucket}`);

  cp.exec(command, function (err, stdout, stderr) {
    if (err) return cb(stderr);
    console.log(stdout);
    return cb();
  });
};
