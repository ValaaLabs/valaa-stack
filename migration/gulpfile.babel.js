import gulp from "gulp";
import build from "./script/gulp-tasks/build.babel";
import copyEnvironmentsConfig from "./script/gulp-tasks/copy-environment-config.babel";
import deploy from "./script/gulp-tasks/deploy.babel";

// default task, this is run when gulp is called without taskname
gulp.task("default", (done) => {
  console.log("no default task registered yet");
  done();
});

gulp.task("build", build);

gulp.task("deploy:copy-env", ["build"], copyEnvironmentsConfig);
gulp.task("deploy", ["build", "deploy:copy-env"], deploy);
