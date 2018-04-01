import gulp from "gulp";
import env from "./helper/env.babel";

module.exports = (cb, plugins) => {
  console.log(` -> copying environment specifics from source ${env().sourcePath} to ${env().buildPath}`);
  return gulp.src(
    [`${env().sourcePath}/environments/${env().environment}/**/*`],
    {base: `${env().sourcePath}/environments/${env().environment}`}
  ).pipe(gulp.dest(env().buildPath));
};
