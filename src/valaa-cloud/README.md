# valaa-cloud

## purpose
this is supposed to contain the AWS lambda functions for valaa

## directories and special files
* dist/ - this is where builds are created in, it should also be in gitignore
* lambdas/ - this is where the actual lambda functions exist. Files from here will be webpacked 1:1 to dist/ with their dependencies
* node_modules/ - this should be in gitignore and is used for the dependencies during builds
* templates/ - templates that can be used to create new files
* templates/function.js - a template to create new functions from
* .gitignore - the git ignore file, containing dist & node_modules
* package.json - the npm configuration for valaa-cloud
* README.md - this file
* webpack.config.js - webpack config to bake the lambdas into single files
* scripts/build.js - make a build, will run webpack and then build-zips
* scripts/build-zips.js - will zip .js files found in dist/ 
* scripts/deploy - will run build.js and then deploy all zips for which a configuration exists in lambda-maps.json to aws lambda
* lambda-maps.json - deployment config (add new lambdas here!)

## deploy
deploy currently tries to deploy all lambdas that are configured in lambda-maps, right now theres is no 
way to execute it for just one lambda.
to be able to deploy, the environment variables AWS_LAMBDA_ACCESS_KEY_ID and AWS_LAMBDA_SECRET_ACCESS_KEY need to be set. For travis builds, travis configuration does that.

## documentation
the resulting API is documented in the openapi format in the swagger.json file. A documentation for this can be generated with various tools. A suggestion for a tool that can be run localy is spectacle (https://github.com/sourcey/spectacle) for displaying the docs, another option is swagger ui (https://github.com/swagger-api/swagger-ui) 
An editor for swagger/openapi files can be found at http://swagger.io/swagger-editor/

## running locally
in the dev requirements this adds a package called lambda-local, which can be used to run lambdas locally triggered either via CLI or from a script, see https://github.com/ashiina/lambda-local for more information about / documentation of the tool

This needs to run lambda files which have been built, thus from dist/. to not have to manually run build each time a file is saved: ```node_modules/.bin/webpack --progress --colors --watch```

An example for running the commands lambda with a put (storeCommand):
```node_modules/.bin/lambda-local -l dist/commands.js -P ~/.aws/credentials -p default -h handler -e lambda-samples/commands-put-created.js```
(the -P path and the -p profile assume you have stored AWS credentials for the AWS cli client)

*note:* at the moment this also requires a local dynamodb instance, with the table created, howeve a create for the table is commented out in the commands lambda, so for the sake of not being blocked you can uncomment that, call the lambda locally, comment it again, and then call the lambda. This currently doesn't provide you with a way to call this as http API though.
