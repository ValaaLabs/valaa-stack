/* 
    valaaFiles is ValaaScript converter that converts json string to folders and files.
    Entity: folder
    property: goes to "properties" file
    identifiers: goes to "identifiers" file
    media: file
    relation:
*/

//dependencies
var fs = require('fs-extra');

// make sure there's dst folder
if(!fs.existsSync("dst/")) fs.mkdirSync("dst");


// json conversion and file check

var args = process.argv.slice(2,process.argv.length);
var data;
var dataJSON;
if(args) {
    if(fs.existsSync(args[0]) && fs.lstatSync(args[0]).isFile()) {
        data = fs.readFileSync(args[0]);
        if(IsJsonString(data)) {
            dataJSON = JSON.parse(data);
        } else {
            console.log(args[0] + " cannot be parsed with JSON.");
            process.exit();
        }
    } else {
        console.log(args[0] +" is not a file or doesn't exist."); 
        process.exit();
    }

} else {
    console.log("no input file!");
    process.exit();
}


// checker for data that everything is included
var addedElements = 0;


//helper functions 
function IsJsonString(str) {
    var json;
    try {
        json = JSON.parse(str);
    } catch (e) {
        return false;
    }
    if(json) return true;
    return false;
}


var getElementByName = (arr, name) => {
    return arr.find((obj)=> {
        var id = obj.id ? obj.id : obj.name;
        return id === name
    });
}

var getTypeInitial = (element) => {
    if(element.type === "Entity") return "E";
    if(element.type === "Media") return "M";
    if(element.type === "Property") return "P";
    if(element.type === "Relation") return "R";
    return undefined;
}

var getBaseName = (element) => {
    return "[" + getTypeInitial(element) + "]" + element.name;
}

var createName = (folder,element) => {
    var id = 0;
    var result  = folder + getBaseName(element);
    while(fs.existsSync(result)) {
        id++;
        result  = folder + getBaseName(element) + id;
    }
    return result;
}

var createProperties = (path,obj, ignore) => {
    // need a copy to have evething in the original
    var objCopy = Object.assign({},obj);
    // removing keys from copy
    ignore.forEach((i)=>{
        if(objCopy[i]) delete objCopy[i];
    });

    for(var property in objCopy) {
            fs.writeFileSync(path + ".meta", JSON.stringify(objCopy));
    }
}


var medias = dataJSON.content;

for(var media in medias) {
    // this is an old way to this.. The new one did not work
    medias[media] = new Buffer(medias[media], 'base64').toString('utf8');
}

// getting first elements
var currentObjects = dataJSON.structure.filter( item => item.type === 'Entity' && !item.owner);
var firstElement = currentObjects.find((w)=>true); 
// delete last version if exists
if(fs.existsSync("dst/" + getBaseName(firstElement))) fs.removeSync("dst/" + getBaseName(firstElement));


//var medias = dataJSON.content;
var rootElements = [];
var nextRootElements = []; 


//console.log(dataJSON);

var depthOfTree = 0

// loop until every element is stored
while(addedElements < dataJSON.structure.length) {


//    console.log("Layer " + depthOfTree + ":");
//    console.log(addedElements + "/" + dataJSON.structure.length);
//    console.log(currentObjects);

//    console.log("rootElements: ")
//    console.log(rootElements);




var parentFolder = "dst/";


    currentObjects.forEach(element => {

        console.log(element);

        // find a proper folder for data
        if(depthOfTree === 0) {
        } else {
            var owner = getElementByName(rootElements,element.owner);
            parentFolder = owner.folder;
        }

        

        var folder = createName(parentFolder,element);

        if(element.type === 'Entity') {
            fs.mkdirSync(folder);
            folder += "/";
            createProperties(folder,element,[]);

            // add folder to object after createProperties to avoid mis info
            element.folder = folder;
            nextRootElements.push(element);
        } 
        else if(element.type === 'Property') {
            if(element.propertyType === 'Identifier') {
                fs.writeFileSync(folder, element.target);
            } 
            else {
                var data = typeof element.value === 'object' ? JSON.stringify(element.value) : element.value;
                fs.writeFileSync(folder, data);
            }        
        } 
        else if(element.type === 'Relation') {
            fs.mkdirSync(folder);
            folder += "/";
            createProperties(folder,element,[]);

            element.folder = folder;
            nextRootElements.push(element);            
        } 
        else if(element.type === 'Media'){
            fs.writeFileSync(folder, medias[element.name]);
            fs.writeFileSync(folder+".meta",JSON.stringify(element));
        }

        addedElements++;
        element.added = true;
    })

    rootElements = nextRootElements;


    // find all elements that owner is one of the objects from previous layer  
    currentObjects = dataJSON.structure.filter( item => 
        rootElements.find(element => {
            var id;
            if(element.hasOwnProperty('id')) id=element.id; else id=element.name; 
            if(item.owner === id && !item.added) return true;  
            return false; 
        })
    );
    depthOfTree++;
}


console.log("Done!")
console.log("elements:" + addedElements + "/" + dataJSON.structure.length);







