module.exports = {
  createStandardBuildTargetOption (yargs, description) {
    return {
      type: "string", default: yargs.vlm.releasePath,
      description,
      interactive: { type: "input", when: "if-undefined" },
    };
  },

  createStandardDeploySourceOption (yargs, description) {
    return {
      type: "string", default: yargs.vlm.releasePath,
      description,
      interactive: {
        type: "input", when: "if-undefined", confirm: value => !!yargs.vlm.shell.test("-d", value),
      },
    };
  },

  /**
   * Validates toolset build pre-conditions and returns the toolset target dist path where the
   * actual build will be placed.
   *
   * @param {*} toolsetName
   * @param {*} releasePath
   * @returns
   */
  prepareToolsetBuild (yargv, toolsetName, toolsetDescription = "toolset",
      desiredVersionHash) {
    const vlm = yargv.vlm;
    const logger = vlm.tailor({ contextCommand: `build-release/${toolsetName}` });
    const releasePath = yargv.target;
    if (!vlm.shell.test("-d", releasePath)) {
      throw new Error(`${vlm.contextCommand}: releasePath directory '${
          vlm.theme.path(releasePath)}' missing`);
    }
    const toolsetConfig = vlm.getToolsetConfig(toolsetName);
    if (!toolsetConfig) return {};
    if (desiredVersionHash && (toolsetConfig.deployedVersionHash === desiredVersionHash)) {
      logger.info(`${vlm.theme.bold(`Skipping the ${toolsetDescription} release build`)
          } of already deployed version:`, vlm.theme.version(desiredVersionHash));
      return {};
    }
    const simpleToolsetName = toolsetName.replace(/\//g, "_");
    const toolsetReleasePath = vlm.path.join(releasePath, simpleToolsetName);
    logger.info(`Building ${toolsetDescription} release in`, vlm.theme.path(toolsetReleasePath));
    vlm.shell.rm("-rf", toolsetReleasePath);
    vlm.shell.mkdir("-p", toolsetReleasePath);
    vlm.toolset = toolsetName;
    return { toolsetConfig, toolsetReleasePath };
  },

  prepareToolBuild (yargv, toolsetName, toolName,
      toolDescription = "tool", desiredVersionHash) {
    const vlm = yargv.vlm;
    const logger = vlm.tailor({ contextCommand: `build-release/${toolName}` });
    const toolConfig = vlm.getToolConfig(toolsetName, toolName);
    if (!toolConfig) return {};
    if (desiredVersionHash && (toolConfig.deployedVersionHash === desiredVersionHash)) {
      logger.info(`${vlm.theme.bold(`Skipping the ${toolDescription} release build`)
          } of already deployed version within toolset ${vlm.theme.package(toolsetName)}:`,
          vlm.theme.version(desiredVersionHash));
      return {};
    }
    const simpleToolsetName = toolsetName.replace(/\//g, "_");
    const simpleToolName = toolName.replace(/\//g, "_");
    const toolReleasePath = vlm.path.join(yargv.target, simpleToolsetName, simpleToolName);
    logger.info(`Building ${toolDescription} release in '${vlm.theme.path(toolReleasePath)}'`);
    vlm.shell.rm("-rf", toolReleasePath);
    vlm.shell.mkdir("-p", toolReleasePath);
    return { toolConfig, toolReleasePath };
  },

  locateToolsetRelease (yargv, toolsetName, toolsetDescription = "toolset") {
    const vlm = yargv.vlm;
    const logger = vlm.tailor({ contextCommand: `deploy-release/${toolsetName}` });
    const releasePath = yargv.source;
    const toolsetConfig = vlm.getToolsetConfig(toolsetName);
    if (!toolsetConfig) {
      throw new Error(`${vlm.contextCommand}: toolsets.json:['${
          vlm.theme.package(toolsetName)}'] missing`);
    }
    if (!vlm.shell.test("-d", releasePath)) {
      throw new Error(`${vlm.contextCommand}: releasePath '${
          vlm.theme.path(releasePath)}' missing`);
    }
    const toolsetReleasePath = vlm.path.join(releasePath, toolsetName);
    if (!vlm.shell.test("-d", toolsetReleasePath)) {
      logger.ifVerbose(1)
          .info(`skipping ${toolsetDescription} deploy: no release at '${
              vlm.theme.path(toolsetReleasePath)}'`);
      return {};
    }
    logger.info(`deploying ${toolsetDescription} release from '${
        vlm.theme.path(toolsetReleasePath)}'`);
    vlm.toolset = toolsetName;
    return { toolsetConfig, toolsetReleasePath };
  },

  locateToolRelease (yargv, toolsetName, toolName, toolDescription = "tool") {
    const vlm = yargv.vlm;
    const logger = vlm.tailor({ contextCommand: `deploy-release/${toolName}` });
    const releasePath = yargv.source;
    const toolConfig = vlm.getToolConfig(toolsetName, toolName);
    const toolReleasePath = vlm.path.join(releasePath, toolsetName, toolName);
    if (!vlm.shell.test("-d", toolReleasePath)) {
      logger.ifVerbose(1)
          .info(`skipping ${toolDescription} deploy: no release at '${
              vlm.theme.path(toolReleasePath)}'`);
      return {};
    }
    logger.info(`deploying ${toolDescription} release from '${vlm.theme.path(toolReleasePath)}'`);
    return { toolConfig, toolReleasePath };
  },
};
