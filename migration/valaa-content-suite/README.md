# valaa-content-suite
Documentation, tools and templates for creating content for Valaa platform(s)

You need npm.

1. Configuring valaa-content-suite

To set up integrations to Valaa services and to possible external project repository, the
valaa-content-suite must first be configured, run and follow instructions on:

$> npm run configure

2. How to create a new Valaa project

'npm run create' fills a directory (creating it if missing) with a new Valaa project of given name.
Additionally it will add a single engine dependency, either to requested engine or if not given, to
Valaa baseline engine (currently 'inspire-engine'). A specific engine version can be requested or if
not given the latest release of the engine will be used.
TODO(iridian): Implement download of default engine. Right now the inspire engine must be manually
               retrieved and specified in package.json:config: { valaa_engine: "../engineName" }

create synopsis:
  npm run create name relative-directory [engine-name[\@engine-version]]

So for example:

$> npm run create chronicles ../chronicles

Will create the base directory structure and files such as project control scripts at ../chronicles.
Typically this directory is a publicly accessible git project for integrations, and will contain
github/npm style base files.
