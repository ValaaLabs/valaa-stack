const _layoutKey = "";

module.exports = {
  default: function markdownify (value, theme, context) {
    // https://github.github.com/gfm/#introduction
    const markdownifyTheme = Object.assign(Object.create(theme), {
      code (...rest) {
        const body = rest.slice(0, -1);
        const last = body[body.length - 1];
        return [`\`\`\`${rest[rest.length - 1]}`,
          (rest[0] || "")[0] === "\n" ? "" : "\n",
          body,
          (last || "")[last.length - 1] === "\n" ? "" : "\n",
          "```",
        ];
      },
      sectionIndexes: [],
      heading: function heading (...rest) {
        let sectionIndexString = "";
        if (this.hasOwnProperty("sectionIndexes")) {
          ++this.sectionIndexes[this.sectionIndexes.length - 1];
          sectionIndexString = !this.sectionIndexes ? "" : ` ${this.sectionIndexes.join(".")}`;
        }
        return ((typeof rest[rest.length - 1] !== "number") ? rest : [
          "\n",
          "#".repeat(Math.max(1, Math.min(6, rest[rest.length - 1]))),
          sectionIndexString,
          " ", ...rest.slice(0, -1),
        ]);
      },
      // paragraphIndent: 0,
      // paragraphPrefix: "",
      // pageWidth: 71,
      paragraphize: function paragraphize (text, indent = this.paragraphIndent,
          prefix = this.paragraphPrefix, pageWidth = this.pageWidth) {
        return _layoutSectionText(text, indent || 0, prefix || "", pageWidth || 71);
      },
    });
    const blockTree = _createBlockTree(value, context, markdownifyTheme);
    // console.log("blockTree:", JSON.stringify(blockTree, null, 2));
    return _renderBlock(blockTree, context, markdownifyTheme);
  },
  addLayoutOrderedProperty (target, name, entry, customLayout) {
    const targetLayout = target["..."] || (target["..."] = {});
    const entries = targetLayout.entries || (targetLayout.entries = []);
    entries.push(customLayout === undefined ? name : [name, customLayout]);
    target[name] = entry;
  }
};

/**
 * Converts and returns the given value as a Github Formatted Markdown
 * string.
 *
 * Purpose of this tool two-fold: to make it possible to have all
 * github markdown documents as JSON objects and also to be able to
 * insert arbitrary tool output JSON values to be part of these
 * documents with minimal additional formatting code.
 *
 * The conversion is then a compromise of two principles:
 * 1. all non-surprising value structures produce non-surprising and
 *    intuitively structured and readable markdown string.
 * 2. any valid GHM output HTML can be produced using a combination of
 *    surprising value structures and inline entries.
 *
 * Tools which are not aware that their JSON output is gfmarkdownified
 * should not naturally or accidentally produce the surprising values.
 * An example of a surprising value structure is an array which
 * otherwise contains objects with only primitive values but the first
 * entry is an array - _toGFMarkdown uses the array to specify the
 * columns of a table.
 * Another example of surprising values are strings containing GFM
 * notation or HTML: these are /not/ escaped and translate as-is to the
 * GFM output string.
 *
 * Non-surprising production rules:
 * 1. Strings map as-is, numbers map JSON.stringify, null as "-" and
 *    undefined as "".
 * 2. Empty arrays [] and objects {} affect layout but they are removed
 *    from containing arrays and objects. Empty keys "" are removed.
 * 3. Innermost array (contains only primitive values) is " "-joined.
 *    All isolated singular newlines are removed (and rewritten later).
 * 4. Second and subsequent nesting arrays become numbered lists.
 *    Note: with production rule 2. lists can be enforced like so:
 *      numbered list: [[], "first entry", "second entry"]
 *      unordered list: [{}, "first entry", "second entry"]
 * 5. Isolated objects with primitive values are mapped as GFM tables
 *    with key and value columns properties as its two rows.
 * 6. Consequtive objects with primitive values are mapped as a single
 *    GFM table with the collection of all object keys as columns,
 *    objects as rows and object values as cells in the corresponding
 *    column.
 * 7. Objects with complex values are mapped into chapters with the
 *    object key as header. The deeper the nesting, the lower the
 *    emitted H tag. { "...": [[[[[{}]]]]] }
 *
 * @param {*} value
 * @param {*} theme
 * @param {*} context
 * @returns
 */

function _createBlockTree (value, contextLayout, theme) {
  const layout = {
    type: "text",
    height: 0, depth: ((contextLayout && contextLayout.depth) || 0) + 1,
    trivial: true,
  };
  let ret = { [_layoutKey]: layout };
  if (typeof value !== "object") ret = value;
  else if (value === null) ret = "";
  else if (typeof value === "function") {
    layout.renderer = value;
  } else if (Array.isArray(value)) _createArrayBlock(value, layout, ret, theme);
  else if (layout.text === undefined) _createObjectBlock(value, layout, ret, theme);
  if (contextLayout && (contextLayout.height <= layout.height)) {
    contextLayout.height = layout.height + 1;
  }
  if (contextLayout && !layout.trivial) delete contextLayout.trivial;
  return ret;
}

function _createArrayBlock (value, layout, ret, theme) {
  layout.type = "array";
  // layout.empty = true;
  let iterables = value;
  if (value[0] === "...") {
    if (typeof value[1] !== "object" || value[1] === null) {
      console.error("Unrecognized ['...', layout], expected object layout, got", typeof value[1],
          " with:", value);
    } else {
      Object.assign(layout, value[1]);
    }
    iterables = value.slice(2);
  }
  layout.entries = iterables.map((entry, index) => {
    const block = _createBlockTree(entry, layout, theme);
    const entryLayout = !Array.isArray(block) && block[_layoutKey];
    const subEntries = (entryLayout || {}).entries || [];
    if (subEntries.length === 1 && (entryLayout.type === "object")) {
      const subBlock = block[subEntries[0]];
      const subLayout = _getLayout(subBlock);
      if (subLayout && subLayout.type === "array") subLayout.type = "list";
      ret[subEntries[0]] = subBlock;
      return subEntries[0];
    }
    ret[index] = block;
    return index;
  });
}

function _getLayout (value) {
  return (value && (typeof value === "object") && value[_layoutKey]) || undefined;
}

function _createObjectBlock (value, layout, ret, theme) {
  layout.type = "object";
  if (value["..."]) Object.assign(layout, value["..."]);
  if (layout.defaultHeadings === undefined) layout.defaultHeadings = true;
  const entries = layout.entries || [null];
  _extractEntries(entries, value, layout.entries = [], ret);
  delete layout.trivial;
  // layout.empty = true;
  let onlyNumbers = true;
  layout.entries.forEach(([e]) => {
    if (isNaN(e)) onlyNumbers = false;
    // if ((typeof ret[e] !== "object") || !(ret[e]["."] || {}).empty) delete layout.empty;
  });
  if (onlyNumbers) layout.type = "numbered";
  if (layout.columns) {
    const columns = layout.columns;
    const columnLookup = {};
    _extractEntries(columns, undefined, layout.columns = [], columnLookup);
  } else if (layout.type !== "numbered") {
    let totalElementCount = 0;
    let columns = [];
    const columnLookup = {};
    if (layout.height === 1) {
      columns = layout.entries.map(e => { columnLookup[e[0]] = e[1]; return e; });
      delete layout.entries;
      totalElementCount = columns.length;
    } else if (layout.height === 2) {
      // Gather all column names from row properties.
      layout.entries.forEach(([rowKey]) => {
        const elements = ((ret[rowKey] || {})[_layoutKey] || {}).columns;
        if (elements) {
          elements.forEach(element => {
            const [elementKey, elementLayout] = Array.isArray(element) ? element : [element];
            let columnLayout = elementLayout || columnLookup[elementKey];
            if (!columnLayout) {
              columnLayout = columnLookup[elementKey] = {};
              columns.push([elementKey, columnLayout]);
            }
            ++totalElementCount;
            columnLayout.entryCount = (columnLayout.entryCount || 0) + 1;
          });
        }
      });
    }
    if (totalElementCount > (columns.length * (layout.entries || [1]).length) / 2) {
      // Only tablify if more than half of the elements are filled
      Object.assign(layout, { columns });
    }
  }
  _postProcess(layout.entries);
  _postProcess(layout.columns);
  function _postProcess (seq) {
    if (!(seq || []).length) return;
    for (let i = 0; i < seq.length; ++i) {
      const entry = ret[seq[i][0]];
      const entryLayout = (entry && (typeof entry === "object") && entry[_layoutKey]) || undefined;
      const after = entryLayout && (entryLayout.indexAfter || entryLayout.after);
      if (entryLayout && entryLayout.indexAfter) layout.indexSections = true;
      const afterIndex = (after === undefined)
          ? -1 : seq.findIndex(e => (String(e[0]) === String(after)));
      if ((afterIndex >= 0) && ((afterIndex + 1) !== i)) {
        const extractee = seq.splice(i, 1);
        seq.splice(afterIndex + (afterIndex < i ? 1 : 0), 0, extractee[0]);
        if (afterIndex > i) --i;
      }
    }
    seq.forEach(([e, layout_], index) => { if (!Object.keys(layout_).length) seq[index] = e; });
  }

  /*
  if (layout.type === "object") {
    if (layout.height === 1) {
      // Heuristics for deciding between horizontal or vertical trivial tablification is here
      if (!((layout.heading || {}).name || "").match(/s$/)
          && (layout.mappingKeyLayouts.length < 4)) {
        return _renderTable(undefined, [block], layout.mappingKeyLayouts, block, layout, theme);
      }
      // Vertical layout: two columns: "key" and "value", key/value pairs as rows
      return _renderTable(undefined, Object.entries(block).filter(entry => (entry[0] !== _layoutKey)),
          [[0, { text: "key" }], [1, { text: "value" }]], { 0: {}, 1: {} }, layout, theme);
    } else if (layout.chapters || (layout.height > 2)
        || !(layout.columns || (layout.minHeight <- dead === 2))) {
      return _renderChapters(layout.mappingKeyLayouts, block, layout, theme);
    }
    return _renderTable(layout.mappingKeyLayouts.map(([key]) => key), block,
        layout.columns, layout.columnLookup, layout, theme);
  }
  if (layout.type === "array") {
    if ((layout.height === 2) && ((layout.sections || []).length <= 2)
        && layout.sections[layout.sections.length - 1][0][_layoutKey].type === "object") {
      const arrayLayout = (layout.sections.length === 2) && layout.sections[0];
      return _renderTable(undefined, layout.sections[layout.sections.length - 1],
          layout.columns, layout.columnLookup, arrayLayout, theme);
    }
    // TODO(iridian): Add lists etc.
    return layout.mappingKeyLayouts.map(([key]) => _renderBlock(block[key], layout, theme))
        .join("\n");
  }
  */
  function _extractEntries (entry, sourceObject, targetKeyLayouts, targetLookup) {
    // If entryBlock is omitted the entries are inside a layout structure. Limit some operations,
    // notably provide an undefined contextLayout for recursive processing.
    if ((entry === undefined) || (entry === "") || (entry === "...")) return;
    const selfRecurser = e => _extractEntries(e, sourceObject, targetKeyLayouts, targetLookup);
    if (entry === null) {
      if (sourceObject) Object.keys(sourceObject).sort().forEach(selfRecurser);
    } else if (Array.isArray(entry)) {
      if ((entry.length === 2) && (typeof entry[0] === "string") && typeof entry[1] === "object") {
        if ((!sourceObject || (sourceObject[entry[0]] !== undefined))) {
          if (!targetLookup[entry[0]]) {
            const entryBlock = !sourceObject
                ? { [_layoutKey]: {} }
                : _createBlockTree(sourceObject[entry[0]], layout, theme);
            targetKeyLayouts.push(entry);
            targetLookup[entry[0]] = entryBlock;
          }
          // Update layout.
          if (Object.keys(entry || {}).length) {
            Object.assign(targetKeyLayouts.find(([key]) => (key === entry[0]))[1], entry[1]);
          }
        }
      } else {
        entry.forEach(selfRecurser);
      }
    } else if (typeof entry === "object") {
      Object.keys(entry).sort().map(key => [key, entry[key]]).forEach(selfRecurser);
    } else selfRecurser([String(entry), {}]);
  }
}

function _renderBlock (block, contextLayout, theme) {
  // console.log("block:", JSON.stringify(block, null, 2));
  if (typeof block === "string") {
    if (!theme.hasOwnProperty("paragraphStyle")) return block;
    return theme.decorate(theme.paragraphStyle)(block);
  }
  if (block === undefined) return "";
  if ((typeof block === "boolean") || (typeof block === "number")) return String(block);
  if (Array.isArray(block)) {
    const isOutermost = contextLayout.type !== "array";
    const arrayTheme = isOutermost ? theme : Object.create(theme);
    const entries = block.map(entry => _renderBlock(entry, contextLayout, arrayTheme));
    if (!isOutermost) return entries.join(" ");
    return entries.map(theme.decorate(theme.paragraphStyle)).join("\n");
  }
  const layout = block[_layoutKey];
  if (layout.hide) return "";
  if (layout.text !== undefined) return layout.text;
  if (layout.columns) {
    if (!layout.entries) return _renderTable([0], [block], layout.columns, layout, theme);
    return _renderTable(layout.entries, block, layout.columns, layout, theme);
  }
  if ((layout.type === "numbered") || (layout.type === "list")) {
    return _renderList(layout.entries, block, layout, theme);
  }
  const sectionTheme = Object.create(theme);
  if (/* (layout.type === "array") && */ (!contextLayout || (contextLayout.type !== "array"))) {
    sectionTheme.paragraphStyle = "paragraphize";
  }
  return _renderChapters(layout.entries || Object.keys(block).filter(key => (key !== _layoutKey)),
      block, layout, sectionTheme);
}

function _renderChapters (chapters, chapterLookup, chaptersLayout, sectionTheme) {
  const retRows = [];
  if (chaptersLayout.indexSections) {
    sectionTheme.sectionIndexes = [...sectionTheme.sectionIndexes, 0];
  }
  chapters.forEach((chapter) => {
    const [chapterName, chapterLayout] = Array.isArray(chapter) ? chapter : [chapter];
    const chapterBlock = chapterLookup[chapterName];
    const lookups = [
      (typeof chapterBlock === "object") && chapterBlock[_layoutKey],
      chapterLayout, {
        heading: isNaN(chapterName) && chaptersLayout.defaultHeadings
            && { text: chapterName, style: "bold" }
      },
    ];
    if (_getLayoutProperty(lookups, "hide")) return;
    const heading = _getLayoutProperty(lookups, "heading");
    const headingText = typeof heading === "string" ? heading : (heading && heading.text);
    if (headingText) {
      retRows.push(sectionTheme.decorate([
        _getLayoutProperty(lookups, "heading", "style"), { heading: chaptersLayout.depth }
      ])(headingText));
    }
    const chapterText = _renderBlock(chapterBlock, chaptersLayout, sectionTheme);
    const style = _getLayoutProperty(lookups, "elementStyle")
        || _getLayoutProperty(lookups, "style");
    retRows.push(!style ? chapterText : sectionTheme.decorate(style)(chapterText));
  });
  return retRows.join("\n");
}

function _renderList (entries, list, layout, theme) {
  const paragraphIndent = (theme.paragraphIndent === undefined) ? 0 : theme.paragraphIndent + 2;
  const paragraphPrefix = layout.type !== "numbered" ? "  " : "   ";
  const listTheme = Object.assign(Object.create(theme), {
    paragraphStyle: "paragraphize", paragraphIndent, paragraphPrefix
  });
  const retRows = entries.map(entry => `${
      " ".repeat(paragraphIndent)}${
      layout.type !== "numbered" ? "-" : `${_getKey(entry)}.`} ${
      _renderBlock(list[_getKey(entry)], layout, listTheme).replace(/^\s*/, "")}`);
  return retRows.join("\n");
}

function _getKey (entry) { return Array.isArray(entry) ? entry[0] : entry; }

function _getLayoutProperty (lookups, ...steps) {
  for (const lookup_ of lookups) {
    if (!lookup_) continue;
    const value = steps.reduce((acc, step) => (acc || {})[step], lookup_);
    if (value !== undefined) return value;
  }
  return undefined;
}

function _renderTable (rowKeys, rowLookup, columns, layout, tableTheme) {
  const rows = [];
  const _escpipe = (v, column) => (column.oob ? v : ((v && v.replace(/\|/g, "\\|")) || ""));
  const columnKeyLayouts = columns.map(entry => {
    const [name, layout_] = Array.isArray(entry) ? entry : [entry];
    return [name, Object.assign({}, layout_)];
  });
  const renderHeaders = !layout || !layout.hideHeaders;
  if (renderHeaders) {
    rows.push(columnKeyLayouts.map(([columnKey, columnLayout]) => ([
      _escpipe(columnLayout.text || columnKey, columnLayout), columnLayout.style,
    ])));
    rows.push(columnKeyLayouts.map(() => ([""]))); // placeholder
  }
  rows.push(...rowKeys.map(rowKey => {
    // no rowKeys means rowLookup is an array.
    const rowData = rowLookup[rowKey];
    const entryLayouts = (((typeof rowData === "object") && rowData && rowData["..."]) || {})
        .entryLayouts || {};
    return columnKeyLayouts.map(([columnKey, columnLayout]) => {
      const text = (columnKey === null) || (typeof rowData !== "object")
          ? rowData : (rowData || {})[columnKey];
      const entryLayout = entryLayouts[columnKey];
      const lookups = [entryLayout, columnLayout];
      return [
        _escpipe(String(text), entryLayout || columnLayout),
        _getLayoutProperty(lookups, "elementStyle") || _getLayoutProperty(lookups, "style"),
      ];
    });
  }));
  columnKeyLayouts.forEach(([columnKey, columnLayout], columnIndex) => {
    columnLayout.width = columnLayout.oob
        ? 3 : Math.max(...rows.map(row => (row[columnIndex][0] || "").length));
  });
  if (renderHeaders) {
    rows[1] = columnKeyLayouts.map(([, columnLayout]) => ([
      `${(columnLayout.align || "right") !== "right" ? ":" : "-"}${
          "-".repeat(columnLayout.width - 2)}${
          (columnLayout.align || "left") !== "left" ? ":" : "-"}`,
      ""
    ]));
  }
  return rows.map(row => row.map(([text_, style_], index) => {
    const columnLayout = columnKeyLayouts[index][1];
    if (!columnLayout) return "";
    let text = (typeof text_ === "string") ? text_ : `<${typeof text_}>`;
    const pad = (columnLayout.width || 0) - text.length;
    const style = (style_ !== undefined) ? style_ : columnLayout.elementStyle || columnLayout.style;
    text = !style ? text : tableTheme.decorate(style)(text);
    return `${text}${" ".repeat(pad > 0 ? pad : 0)}`;
  }).join("|")).join("\n");
}

function _layoutSectionText (section, indent = 0, prefix = "", width = 71) {
  const _flatten = (value) => (!Array.isArray(value) ? value : [].concat(...value.map(_flatten)));
  const words = _flatten([section]).join(" ").split(/[\n\r ]+/);
  const prefindent = `${" ".repeat(indent)}${prefix}`;
  let charCount = prefindent.length - 1;
  let line = [];
  const lines = [line];
  for (const word of words) {
    if (charCount + 1 + word.length > width) {
      lines.push(line = []);
      charCount = prefindent.length - 1;
    }
    line.push(word);
    charCount += 1 + word.length;
  }
  return lines.map(linewords => `${prefindent}${linewords.join(" ")}`).join("\n");
}
