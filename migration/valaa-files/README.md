## valaaFiles

Backup application for valaaScript resources. valaaFiles makes an folder structure based on the json copy from zero editor.

### installation

git clone https://github.com/ValaaLabs/valaaFiles.git

install npm/node if not already installed.

### how to use

1. in Zero: copy entity/partition to clipboard. open clipboard copy

2. paste it to <project_name>.json somewhere in your system.

3. node valaaFiles.js \<path to source file\>

ready backup will be in ./dst

#### Supported Valaa Resources

* Entity   =>  folder
* Property => can be found from properties file
* Identifier => cen be found from identifiers file
* Media => file
* Relation => folder with target

#### status

Application is development. Current version gives an opportunity to create quick back up from your project. However this version is not capable to pack folders and files back to json. On the other hand, code media will be readable and safe.
