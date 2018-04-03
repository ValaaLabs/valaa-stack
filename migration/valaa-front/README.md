# valaa-front // lamda@edge function

This function provides the intial page from which valaa is loaded, and picks the initial partition based on a mapping json 
(which can be found in `~/environments/live/front/endpoint-matches.json` )

As this is realized as a lambda@edge function there is a few limitations and things to be aware of:

as a lambda@edge function 

 * this function can only have a very limited amount of runtime, it shouldn't fetch anything that takes longer to fetch, hence it fetches the matches from the live s3.
 * it must be deployed to us-east-1 region, as all lambda@edge lambdas have to
 * deployment is currently done by manually copying the function to the lambda in the console, while this could be handled by enhancing the buildsystem to allow manifests that allow picking of region, the effort doesn't seem worth it, and there are further steps necessary to get it live.
 * after copying the lambda into the inline-from of the lambda management, it is necessary to publish a new version (Actions button at the top of the site) 
 * after a new version is published, the version number for the clount front distribution needs to be updated, go to the cloud front console, pick the distribution, go the "Behaviors" tab, edit the default path pattern, and set the number in the function arn at the bottom to the correct one - this is also the place to roll back to a previous one
 * after saving the updated version, it will take up to a minute for cloud front to distribute the new function, then it should be reliably called on each request.

How to add new endpoints:

 * adding endpoints does not require a change at the lambda! 
 * edit the endpoint-matches.json (path see above), and once its safed deploy to the live system (if you want to avoid deploying the whole live system, just upload the file into the s3 bucket for the live system in the folder front/

