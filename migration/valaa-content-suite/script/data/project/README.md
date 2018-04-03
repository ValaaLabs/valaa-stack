Project description using markdown format. 
Files in the project:

## 1. README.md - this file 

This document describes your project for its users and is your space as the
project owner. One you've read this file through, feel free to clear the
whole file and edit it to your liking. 

TODO(iridian): Add nice project description skeleton here 
(to valaa-content-suite:script/data/minimal/README.md)

See http://daringfireball.net/projects/markdown/ for reference and,
TODO(iridian): Find a nice markdown tutorial and put it here  


## 2. package.json - npm configuration file

This file describes the project parameters. The format is defined in
https://docs.npmjs.com/files/package.json, even if the project would never end
up in npm. This file contains a 'valaa' section, and the whole file is used as
a basis for generation of valaa.json, the project configuration file used when
packaging a release of the project to Valaa.


## 3. .gitignore - files to exclude from version control

Contains rules for git (the distributed version control system or DVCS,
https://git-scm.com/) on which files and file patterns to exclude from version
control.


## 4. script/ - project management scripts

This folder contains implementations for the commands that can be run with 
'npm run'. They are used to create package archives which can be uploaded to
the Valaa ecosystem to update existing projects or create completely new ones.


## 5. dist/ - project media hierarchy

The files contained in this folder will be packaged and uploaded to Valaa as
part of the 'npm run package' process.
TODO(iridian): If dist/ is empty git ignores it, so this is a bit awkward.

