# Valaa Infra

This repository contains configuration describing production Valaa deployments & scripts to create new deployments and update existing ones. The azure CLI is required to deploy a new instance, but for everything else you only need SSH access.

SSH + basic scripts are prefered to any Azure magic because it helps us stay independent from the platform.

## How to

Do stuff using the scripts. All of the scripts should be run using NPM.

### Limitations

 - Currently you have to run the install and deploy scritps seperatly. You usually need to wait for a few minutes after the deploy completes for the VM to be SSHable.

### Available NPM scripts

These are the main npm scripts - please dont use these directly but instead create specialised versions for the deploy/update that you need to do (see `deployValaaInspire` and `installValaaInspire`). This ensures that the parameters that you used are not lost or forgotten.

#### deploy

Creates a new Azure resource group containing the resources required for a single valaa stack (described in `production-templates/valaa-stack.json`). Each deploy requires parameters which should be defined in a parameters file in the `production-deploy-parameters/` directory.

You will need to be logged in to the azure CLI before running this script (`azure login`).

##### Parameters
 - azureSubscriptionId: The azure subscription ID to use with the new resource group.
 - groupName: The name of the new resource group. Also used as the DNS name.
 - azureRegionName: The name of the azure region to create the resource group in.
 - parameters: Path to the azure parameters file for the deployment. The path should be relative to the root of this project.

#### install

Installs Valaa on to a previously created Azure resource group.

##### Parameters
 - deployKeys: Path to a directory containing `id_rsa` and `id_rsa.pub` deploy keys to use on this Valaa instance.
 - hostName: The host name of the virtual machine to install Valaa on to.