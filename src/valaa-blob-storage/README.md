# Valaa Blob storage system

## Files

 - cloudformation/*: This is a cloudformation template used to describe all of the AWS resources
    that make up the valaa blob storage system. This includes S3 buckets, the lambda function and
    all associated policies, roles, etc. The template is split up in to multiple js files and the
    resources are organised by AWS resource type. At build time all of these seperate files are
    combined in to 1 template.
 - lambda/verify-blob.js: this is the valaa blob content verification lambda source code.

## Deploying

### Prerequisites

The deployment script uses the AWS command line interface so you should install and configure it
before trying to run the deploy script.

 - Instructions for installing the AWS CLI can be found here:
    http://docs.aws.amazon.com/cli/latest/userguide/installing.html
 - Instructions for configuring the AWS CLI can be found here:
    http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html

### Running the deploy script

 1. Run `npm run deploy-valaa-blobs`. This will create the valaa blob storage stack if it does not
    exist, or update it if it already exists.

The deploy script is located at `script/deploy-valaa-blobs.js`.
 - It converts the content of the ./cloudformation module in to 1 json template file
 - It copies all of the local artifacts required by the stack to dist along with the template json
 - It runs 2 `aws cloudformation` commands: `package` and `deploy`.

The `package` command packages up the required lambda source code and runs the AWS SAM
cloudformation template through the  `AWS::Serverless-2016-10-31` transform. The lambda source is
packaged and uploaded to our cloudformation S3 bucket & the transformed cloudformation templated is
output to dist/.

The `deploy` command invokes cloudformation with the transformed cloudformation template created in
the previous step. Cloudformation then takes care of creating or updating the valaa blob storage
stack.

You can view the status of the deploy using the Cloudformation section of the AWS console.

## Troubleshooting

    q: The lambda returns 'Internal server error' with nothing in the logs after an S3 operation
    a: The lambda probably ran out of memory - try increasing MemorySize in the template

## TODOS (maybe?): 

 - webpack the lambda code at build time so it can pull from anything in the valaa codebase and use
    es6 and flow
