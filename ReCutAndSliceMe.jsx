// Enables double-clicking from Finder/Explorer (CS2 and higher)
#target photoshop
// Makes Photoshop the active application
app.bringToFront()

// Part I. CORE FUNCTIONALITY
// ========
// author: @guoxuanc

/****************************************/
// prototype-function for array indexOf method, which is not supported in ExtendedScript
Array.prototype.indexOf = function (item) {
    var index = 0, length = this.length;
    for (; index < length; index++) {
        if (this[index] === item)
            return index;
    }
    return -1;
};
/****************************************/

// Global variables
var doc = activeDocument;
var originPath = activeDocument.path;
// Get document name, without extension
var fname = doc.name.match(/(.*)\.[^\.]+$/)[1];
var outFolder = new Folder(originPath + "/out");
var iosFolder = new Folder(originPath + "/out/" + fname + "_iPhone_assets");
var androidFolder = new Folder(originPath + "/out/" + fname + "_Android_assets");
var androidXHDPIFolder = new Folder(originPath + "/out/" + fname + "_Android_assets/XHDPI");
var androidLDPIFolder = new Folder(originPath + "/out/" + fname + "_Android_assets/LDPI");
var androidMDPIFolder = new Folder(originPath + "/out/" + fname + "_Android_assets/MDPI");
var androidHDPIFolder = new Folder(originPath + "/out/" + fname + "_Android_assets/HDPI");
var macFolder = new Folder(originPath + "/out/" + fname + "_Mac_assets");
// Array platform in ['ios', 'android', 'macos']
var platform = [];
// Array resolution in ['xhdpi', 'hdpi', 'mdpi', 'ldpi']
var resolution = [];
// Sentient variable
var saveLyrInfo = false;

// Export all assets in a .psd file
function exportAll() {
    if (!outFolder.exists) outFolder.create();
    var savedState = app.activeDocument.activeHistoryState;

    // Stores saved layer info: name, coordinates, width and height
    var lyrInfo = "";

    // Define pixels as unit of measurement
    var defaultRulerUnits = preferences.rulerUnits;
    preferences.rulerUnits = Units.PIXELS;

    lyrInfo += scan(doc);

    // Resumes back to original ruler units
    preferences.rulerUnits = defaultRulerUnits;
    // Writes stored layer info into single file
    if (saveLyrInfo && lyrInfo != "") {
        writeFile("ASSET NAME, COORDINATE, WIDTH, HEIGHT\n" + lyrInfo, originPath + "/out/");
    }

    app.activeDocument.activeHistoryState = savedState;
}

// Export all assets of selected layer group as one .png file
function exportSelected() {
    if (!outFolder.exists) outFolder.create();
    var savedState = app.activeDocument.activeHistoryState;

    // Stores saved layer info: name, coordinates, width and height
    var lyrInfo = "";

    // Define pixels as unit of measurement
    var defaultRulerUnits = preferences.rulerUnits;
    preferences.rulerUnits = Units.PIXELS;

    var selectLayers = getSelectedLayersId();
    if (selectLayers == null || selectLayers.length == 0) {
        alert("NO_LAYER_SELECTED");
        return;
    }

    lyrInfo += scanLayersList(selectLayers);

    // Resumes back to original ruler units
    preferences.rulerUnits = defaultRulerUnits;
    // Writes stored layer info into single file
    if (saveLyrInfo && lyrInfo != "") {
        writeFile("ASSET NAME, COORDINATE, WIDTH, HEIGHT\n" + lyrInfo, originPath + "/out/");
    }

    app.activeDocument.activeHistoryState = savedState;
}

function scanLayersList(layers) {
    var lyrInfo = "";
    for (var i = 0; i < layers.length; i++) {
        progress.update(3);
        progress.message("orgnizing layers...");
        setSelectedLayers(layers[i]);
        var layer = activeDocument.activeLayer;
        progress.update(10);
        progress.message("preparing layers: " + layer.name);
        lyrInfo += recordLayerInfo(layer);
        progress.update(60);
        prepare(layer, false, true);
        progress.message("exporting layers: " + layer.name);
        saveLayer(layer.name);
        progress.update(100);
        $.sleep(300);
    }
    return lyrInfo;
}

// Export all assets of selected layer group into independent .png files
function exportSubgroups() {
    if (!outFolder.exists) outFolder.create();
    var savedState = app.activeDocument.activeHistoryState;

    // Stores saved layer info: name, coordinates, width and height
    var lyrInfo = "";

    // Define pixels as unit of measurement
    var defaultRulerUnits = preferences.rulerUnits;
    preferences.rulerUnits = Units.PIXELS;

    var selectLayers = getSelectedLayersId();
    if (selectLayers == null || selectLayers.length == 0) {
        alert("NO_LAYER_SELECTED");
        return;
    }

    for (var i = 0; i < selectLayers.length; i++) {
        setSelectedLayers(selectLayers[i]);
        var layer = activeDocument.activeLayer;
        lyrInfo += scan(layer);
    }

    // Resumes back to original ruler units
    preferences.rulerUnits = defaultRulerUnits;
    // Writes stored layer info into single file
    if (saveLyrInfo && lyrInfo != "") {
        writeFile("ASSET NAME, COORDINATE, WIDTH, HEIGHT\n" + lyrInfo, originPath + "/out/");
    }

    app.activeDocument.activeHistoryState = savedState;
}

function setPlatform(newPlatform) {
    platform = [];
    if (newPlatform.constructor != Array) {
        newPlatform = [newPlatform];
    }
    if (newPlatform.indexOf('ios') != -1) platform.push('ios');
    if (newPlatform.indexOf('android') != -1) platform.push('android');
    if (newPlatform.indexOf('macos') != -1) platform.push('macos');
};

///////////////////// TESTING ////////////////////////
/*
// Array platform in ['ios', 'android', 'macos']
platform = ['android', 'macos'];
// Array resolution in ['xhdpi', 'hdpi', 'mdpi', 'ldpi']
resolution = ['xhdpi'];
exportSubgroups();
*/
///////////////////////////////////////////////////////

// Scan layer sets to prepare for exporting
function scan(canvas) {
    var lyrInfo = "";
    //var docPath = activeDocument.path;

    // Scan layer group inside the canvas
    for (var i = 0; i < canvas.layerSets.length; i++) {
        progress.update(10);
        var layer = canvas.layerSets[i];
        // Check if layer name ends with "@", which signifies for export layer
        if (layer.name.substr(-1) == "@") {
            progress.message("scanning layer: " + layer.name);
            // Collect about-to-be-exported layer information
            lyrInfo += recordLayerInfo(layer);
            progress.update(20);
            // Prepare layer for possible trim and resize defined by the Shape layer within it
            progress.message("preparing layer: " + layer.name);
            prepare(layer, false, true);
            progress.update(50);
            progress.message("exporting layer: " + layer.name);
            saveLayer(layer.name);
            progress.update(100);
            $.sleep(200);
        } else if (layer.name.slice(-4) == "_BTN") {
            progress.message("scanning button: " + layer.name);
            // current layer is a Button group
            // Collect about-to-be-exported layer information
            lyrInfo += recordLayerInfo(layer);
            progress.update(15);
            var regex = /(normal|hover|disabled|pressed|selected|clicked)/;
            // iterate every group inside _BTN group
            for (var k = 0; k < layer.layers.length; k++) {
                progress.message("scanning " + layer.name + " -> " + layer.layers[k].name);
                if (layer.layers[k].name.match(regex) != null) {
                    progress.update(20);
                    // Prepare layer for possible trim and resize defined by the Shape layer within it
                    progress.message("preparing " + layer.name + ": " + layer.layers[k].name);
                    prepare(layer.layers[k], true, true);
                    progress.update(50);
                    progress.message("exporting " + layer.name + ": " + layer.layers[k].name);
                    saveLayer(layer.name + "." + layer.layers[k].name);
                }
                progress.update(100);
                $.sleep(200);
            }
        } else {
            // Recursive
            lyrInfo += scan(canvas.layerSets[i]);
        }
    }

    // Find art layers in current group whose name ends with "@"
    for (var j = 0; j < canvas.artLayers.length; j++) {
        progress.update(20);
        progress.message("scanning layer: " + canvas.artLayers[j].name);
        if (canvas.artLayers[j].name.substr(-1) == "@") {
            lyrInfo += recordLayerInfo(layer);
            progress.update(30);
            progress.message("preparing layer: " + canvas.artLayers[j].name);
            prepare(layer, false, false);
            progress.update(60);
            progress.message("exporting layer: " + canvas.artLayers[j].name);
            saveLayer(canvas.artLayers[j].name);
        }
        progress.update(100);
        progress.message("Complete");
        $.sleep(200);
    }

    return lyrInfo;
}

// resize asset into corresponding platform's resolution and save it as png file
function saveLayer(lname) {
    /*
    * JavaScript supports indexOf method for Array,
    * but Adobe's ExtendedScript engine is out of date to support this method
    * prototype-function added atop
    */
    if (platform == []) {
        alert('NO_PLATFORM_SELECTED');
        return;
    }
    if (platform.indexOf('ios') != -1) {
        if (!iosFolder.exists) iosFolder.create();

        // save as Retina, i.e. the original size(dpi)
        var saveRetinaFile = File(iosFolder + "/" + lname + "_x2.png");
        SavePNG(saveRetinaFile);

        // resize canvas to a quarter of its size
        resize(0.5 * activeDocument.width.value, 0.5 * activeDocument.height.value);
        var saveFile = File(iosFolder + "/" + lname + "_x1.png");
        SavePNG(saveFile);

        // resize back
        resize(2 * activeDocument.width.value, 2 * activeDocument.height.value);
    }

    if (platform.indexOf('android') != -1) {
        if (!androidFolder.exists) androidFolder.create();

        // save original size as XHDPI
        if (resolution == undefined || resolution.indexOf('xhdpi') != -1) {
            if (!androidXHDPIFolder.exists) androidXHDPIFolder.create();
            var saveXHDPI = File(androidXHDPIFolder + "/" + lname + "_xhdpi.png");
            SavePNG(saveXHDPI);
        }

        if (resolution.indexOf('hdpi') != -1) {
            if (!androidHDPIFolder.exists) androidHDPIFolder.create();
            // resize canvas to HDPI
            resize(0.75 * activeDocument.width.value, 0.75 * activeDocument.height.value);
            var saveHDPI = File(androidHDPIFolder + "/" + lname + "_hdpi.png");
            SavePNG(saveHDPI);
            // resize back
            resize(4.0 / 3 * activeDocument.width.value, 4.0 / 3 * activeDocument.height.value);
        }

        if (resolution.indexOf('mdpi') != -1) {
            if (!androidMDPIFolder.exists) androidMDPIFolder.create();
            // resize canvas to MDPI
            resize(0.5 * activeDocument.width.value, 0.5 * activeDocument.height.value);
            var saveMDPI = File(androidMDPIFolder + "/" + lname + "_mdpi.png");
            SavePNG(saveMDPI);
            // resize back
            resize(2 * activeDocument.width.value, 2 * activeDocument.height.value);
        }

        if (resolution.indexOf('ldpi') != -1) {
            if (!androidLDPIFolder.exists) androidLDPIFolder.create();
            // resize canvas to LDPI
            resize(0.375 * activeDocument.width.value, 0.375 * activeDocument.height.value);
            var saveLDPI = File(androidLDPIFolder + "/" + lname + "_ldpi.png");
            SavePNG(saveLDPI);
            // resize back
            resize(8.0 / 3 * activeDocument.width.value, 8.0 / 3 * activeDocument.height.value);
        }
    }

    if (platform.indexOf('macos') != -1) {
        if (!macFolder.exists) macFolder.create();
        var saveMac = File(macFolder + "/" + lname + ".png");
        SavePNG(saveMac);
    }
    // Reverts to original state
    close();
}

function close() {
    var desc904 = new ActionDescriptor();
    desc904.putEnumerated(charIDToTypeID("Svng"), charIDToTypeID("YsN "), charIDToTypeID("N   "));
    executeAction(charIDToTypeID("Cls "), desc904, DialogModes.NO);
}

function dupLayers() {
    var desc143 = new ActionDescriptor();
    var ref73 = new ActionReference();
    ref73.putClass(charIDToTypeID('Dcmn'));

    desc143.putReference(charIDToTypeID('null'), ref73);
    desc143.putString(charIDToTypeID('Nm  '), activeDocument.activeLayer.name);

    var ref74 = new ActionReference();
    ref74.putEnumerated(charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'));

    desc143.putReference(charIDToTypeID('Usng'), ref74);
    executeAction(charIDToTypeID('Mk  '), desc143, DialogModes.NO);
}

function SavePNG(saveFile) {
    var pngOpts = new ExportOptionsSaveForWeb;
    pngOpts.format = SaveDocumentType.PNG;
    pngOpts.PNG8 = false;
    pngOpts.transparency = true;
    pngOpts.interlaced = false;
    pngOpts.quality = 100;
    activeDocument.exportDocument(new File(saveFile), ExportType.SAVEFORWEB, pngOpts);
}

function trim() {
    var idtrim = stringIDToTypeID("trim");
    var desc83 = new ActionDescriptor();
    desc83.putEnumerated(stringIDToTypeID("trimBasedOn"), stringIDToTypeID("trimBasedOn"), charIDToTypeID("Trns"));
    desc83.putBoolean(charIDToTypeID("Top "), true);
    desc83.putBoolean(charIDToTypeID("Btom"), true);
    desc83.putBoolean(charIDToTypeID("Left"), true);
    desc83.putBoolean(charIDToTypeID("Rght"), true);
    executeAction(idtrim, desc83, DialogModes.NO);
}

// if obj is a layer set and its fist layer is a Shape layer, i.e. named as "#"
function hasRectBoundLayer(obj) {
    if (obj.artLayers == null || obj.artLayers.length == 0) {
        return false;
    }
    return obj.typename == "LayerSet" && obj.artLayers[0].name == "#";
}

// prepare layer for exporting
function prepare(layer, isBtn, mergeOpt) {
    activeDocument.activeLayer = layer;
    // Duplicate passed layer to modify on it
    dupLayers();

    // if layer is a button group, reverse back to its parent group for exporting this button group
    if (isBtn) {
        layer = layer.parent;
    }

    // If there is a Shape layer with name "#" at the top of layer group
    if (hasRectBoundLayer(layer)) {
        if (isBtn) {
            var boundLayer = layer.artLayers[0];
        } else {
            var boundLayer = activeDocument.activeLayer.artLayers[0];
            boundLayer.visible = false;
        }
        activeDocument.crop(boundLayer.bounds);
    } else {
        // Trims the transparent area around the image
        // activeDocument.trim(TrimType.TRANSPARENT, true, true, true, true);
        trim();
    }

    if (mergeOpt == undefined || mergeOpt == true) {
        activeDocument.mergeVisibleLayers();
    }
}

// Resize layer to given width and height
function resize(width, height) {
    var action = new ActionDescriptor();
    if (width > 0) {
        action.putUnitDouble(app.charIDToTypeID("Wdth"), app.charIDToTypeID("#Pxl"), width);
    }
    if (height > 0) {
        action.putUnitDouble(app.charIDToTypeID("Hght"), app.charIDToTypeID("#Pxl"), height);
    }
    if (width == 0 || height == 0) {
        action.putBoolean(app.stringIDToTypeID("scaleStyles"), true);
        action.putBoolean(app.charIDToTypeID("Blnr"), true);
    }
    action.putEnumerated(app.charIDToTypeID("Intr"), app.charIDToTypeID("Intp"), app.charIDToTypeID("Blnr"));
    app.executeAction(app.charIDToTypeID("ImgS"), action, DialogModes.NO);
}

// return saved layer assets info
function recordLayerInfo(layer) {
    var x = (layer.bounds[0].value + layer.bounds[2].value) / 2;
    var y = (layer.bounds[1].value + layer.bounds[3].value) / 2;
    var width = layer.bounds[2].value - layer.bounds[0].value;
    var height = layer.bounds[3].value - layer.bounds[1].value;
    var info = layer.name + ": centered at (" + x + ", " + y + "), width: " + width + "px, height: " + height + "px. \n";
    return info;
}

// save assets info into txt file
function writeFile(lyrInfo, path) {

    // Detects line feed type
    // Defaults to MacOS
    var fileLineFeed = "Macintosh";
    if ($.os.search(/windows/i) !== -1) {
        fileLineFeed = "Windows";
    }

    try {
        var f = new File(path + "/" + fname + "_exported_assets_info.txt");
        f.remove();
        f.open('a');
        f.linefeed = fileLineFeed;
        f.write(lyrInfo);
        f.close()
    } catch (e) { }

}

// return an array of layers' id that are being selected
function getSelectedLayersId() {
    var selectedLayers = [];
    try {
        var targetLayersTypeId = stringIDToTypeID("targetLayers");
        var selectedLayersReference = new ActionReference();
        selectedLayersReference.putProperty(charIDToTypeID("Prpr"), targetLayersTypeId);
        selectedLayersReference.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var descriptor = executeActionGet(selectedLayersReference);
        if (descriptor.hasKey(targetLayersTypeId) == false) {
            selectedLayersReference = new ActionReference();
            selectedLayersReference.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("LyrI"));
            selectedLayersReference.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
            descriptor = executeActionGet(selectedLayersReference);
            var id = descriptor.getInteger(charIDToTypeID("LyrI"));
            if (isVisiblebyId(id)) {
                selectedLayers.push(id);
            }
        } else {
            var hasBackground = hasBackgroundLayer() ? 0 : 1;
            var list = descriptor.getList(targetLayersTypeId);
            for (var i = 0; i < list.count; i++) {
                var selectedLayerIndex = list.getReference(i).getIndex() + hasBackground;
                var selectedLayersReference = new ActionReference();
                selectedLayersReference.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("LyrI"));
                selectedLayersReference.putIndex(charIDToTypeID("Lyr "), selectedLayerIndex);
                descriptor = executeActionGet(selectedLayersReference);
                var id = descriptor.getInteger(charIDToTypeID("LyrI"));
                if (isVisiblebyId(id)) {
                    selectedLayers.push(id);
                }
            }
        }
    } catch (ex) {
        //console_error($.fileName, $.line, ex);
    }
    return selectedLayers;
};

// return if a layer is visible or not by passing the layer id
function isVisiblebyId(id) {
    var layerReference = new ActionReference();
    layerReference.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Vsbl"));
    layerReference.putIdentifier(charIDToTypeID("Lyr "), id);
    var descriptor = executeActionGet(layerReference);
    if (descriptor.hasKey(charIDToTypeID("Vsbl")) == false) {
        return false;
    }
    return descriptor.getBoolean(charIDToTypeID("Vsbl"));
};

function hasBackgroundLayer() {
    var backgroundReference = new ActionReference();
    backgroundReference.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Bckg"));
    backgroundReference.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Back"));
    var backgroundDescriptor = executeActionGet(backgroundReference);
    var hasBackground = backgroundDescriptor.getBoolean(charIDToTypeID("Bckg"));
    if (hasBackground == false) {
        try {
            var layerReference = new ActionReference();
            layerReference.putIndex(charIDToTypeID("Lyr "), 0);
            var zero = executeActionGet(layerReference);
            hasBackground = true;
        } catch (ex) {

        }
    }
    return hasBackground;
};

// return layer name by layer id
function getLayerName(id) {
    var layerReference = new ActionReference();
    layerReference.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Nm  "));
    layerReference.putIdentifier(charIDToTypeID("Lyr "), id);
    var descriptor = executeActionGet(layerReference);
    return descriptor.getString(charIDToTypeID("Nm  "));
};

// active layers by array of layers id
function setSelectedLayers(layers) {
    if (layers.constructor != Array) {
        layers = [layers];
    }
    if (layers.length == 0) {
        return;
    }
    var current = new ActionReference();
    for (var i = 0; i < layers.length; i += 1) {
        current.putIdentifier(charIDToTypeID("Lyr "), layers[i]);
    }
    var desc = new ActionDescriptor();
    desc.putReference(charIDToTypeID("null"), current);
    executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
};

// Part II. UI DESIGN
// ========
// author: @guoxuanc

/*
{"activeId":6,"items":{"item-0":{"id":0,"type":"Dialog","parentId":false,"style":{"enabled":true,"varName":null,"windowType":"Palette","creationProps":{"su1PanelCoordinates":false,"maximizeButton":false,"minimizeButton":true,"independent":false,"closeButton":true,"borderless":false,"resizeable":false},"text":"ReCut&ReSlice Me","preferredSize":[220,300],"margins":15,"orientation":"column","spacing":10,"alignChildren":["center","top"]}},"item-6":{"id":6,"type":"Group","parentId":0,"style":{"enabled":true,"varName":"platforms","preferredSize":[220,40],"margins":[5,0,4,0],"orientation":"row","spacing":10,"alignChildren":["center","center"],"alignment":null}},"item-7":{"id":7,"type":"IconButton","parentId":17,"style":{"enabled":true,"varName":"iosIcon","text":"","preferredSize":[45,45],"creationProps":{"style":"toolbutton","toggle":false},"iconButtonStroke":false,"image":["data:image/png;base64,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"],"alignment":null,"helpTip":null}},"item-8":{"id":8,"type":"IconButton","parentId":19,"style":{"enabled":true,"varName":"androidIcon","text":"","preferredSize":[45,45],"creationProps":{"style":"toolbutton","toggle":false},"iconButtonStroke":false,"image":["data:image/png;base64,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"],"alignment":null,"helpTip":null}},"item-9":{"id":9,"type":"IconButton","parentId":21,"style":{"enabled":true,"varName":"macosIcon","text":"","preferredSize":[45,45],"creationProps":{"style":"toolbutton","toggle":false},"iconButtonStroke":false,"image":["data:image/png;base64,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"],"alignment":"center","helpTip":""}},"item-10":{"id":10,"type":"Group","parentId":0,"style":{"enabled":true,"varName":"export_option","preferredSize":[0,0],"margins":[5,0,17,0],"orientation":"column","spacing":10,"alignChildren":["left","center"],"alignment":null}},"item-11":{"id":11,"type":"Button","parentId":10,"style":{"enabled":true,"varName":"cutAll","text":"Cut All Assets","justify":"center","preferredSize":[200,30],"alignment":null,"helpTip":null}},"item-12":{"id":12,"type":"Button","parentId":10,"style":{"enabled":true,"varName":"cutSubgroups","text":"Cut Subgroups","justify":"center","preferredSize":[200,30],"alignment":null,"helpTip":null}},"item-13":{"id":13,"type":"Button","parentId":10,"style":{"enabled":true,"varName":"cutSelected","text":"Cut Selected","justify":"center","preferredSize":[200,30],"alignment":null,"helpTip":null}},"item-14":{"id":14,"type":"Group","parentId":0,"style":{"enabled":true,"varName":"other","preferredSize":[0,0],"margins":0,"orientation":"row","spacing":10,"alignChildren":["left","center"],"alignment":null}},"item-15":{"id":15,"type":"DropDownList","parentId":23,"style":{"enabled":true,"varName":"resolList","text":"DropDownList","listItems":"XHDPI, HDPI, MDPI, LDPI","preferredSize":[0,0],"alignment":null,"selection":0,"helpTip":null}},"item-16":{"id":16,"type":"RadioButton","parentId":14,"style":{"enabled":true,"varName":"LayerInfo","text":"Export Cut Infos","preferredSize":[0,0],"alignment":null,"helpTip":null,"checked":false}},"item-17":{"id":17,"type":"Group","parentId":6,"style":{"enabled":true,"varName":"ios","preferredSize":[0,0],"margins":0,"orientation":"column","spacing":0,"alignChildren":["center","center"],"alignment":null}},"item-18":{"id":18,"type":"StaticText","parentId":17,"style":{"enabled":true,"varName":"iosName","creationProps":{"truncate":"none","multiline":false,"scrolling":false},"softWrap":true,"text":"iOS","justify":"center","preferredSize":[0,0],"alignment":null,"helpTip":null}},"item-19":{"id":19,"type":"Group","parentId":6,"style":{"enabled":true,"varName":"android","preferredSize":[0,0],"margins":0,"orientation":"column","spacing":0,"alignChildren":["center","center"],"alignment":null}},"item-20":{"id":20,"type":"StaticText","parentId":19,"style":{"enabled":true,"varName":"androidName","creationProps":{"truncate":"none","multiline":false,"scrolling":false},"softWrap":true,"text":"android","justify":"left","preferredSize":[0,0],"alignment":null,"helpTip":null}},"item-21":{"id":21,"type":"Group","parentId":6,"style":{"enabled":true,"varName":"macos","preferredSize":[0,0],"margins":0,"orientation":"column","spacing":0,"alignChildren":["center","center"],"alignment":null}},"item-22":{"id":22,"type":"StaticText","parentId":21,"style":{"enabled":true,"varName":"macosName","creationProps":{"truncate":"none","multiline":false,"scrolling":false},"softWrap":true,"text":"macOS","justify":"left","preferredSize":[0,0],"alignment":null,"helpTip":null}},"item-23":{"id":23,"type":"Group","parentId":14,"style":{"enabled":true,"varName":"androidResolution","preferredSize":[0,0],"margins":0,"orientation":"column","spacing":0,"alignChildren":["fill","center"],"alignment":null}},"item-24":{"id":24,"type":"StaticText","parentId":23,"style":{"enabled":true,"varName":"resolText","creationProps":{"truncate":"none","multiline":false,"scrolling":false},"softWrap":false,"text":"android only","justify":"center","preferredSize":[0,0],"alignment":null,"helpTip":null}},"item-25":{"id":25,"type":"Divider","parentId":14,"style":{"enabled":true,"varName":"divider"}}},"order":[0,6,17,7,18,19,8,20,21,9,22,10,11,12,13,14,23,24,15,25,16],"settings":{"importJSON":true,"indentSize":false,"cepExport":false,"includeCSSJS":true,"showDialog":true,"functionWrapper":false,"afterEffectsDockable":false,"itemReferenceList":"None"}}
*/

// PALETTE
// =======
var palette = new Window("palette", undefined, undefined, { minimizeButton: true });
palette.text = "ReCut&ReSlice Me";
palette.preferredSize.width = 220;
palette.preferredSize.height = 300;
palette.orientation = "column";
palette.alignChildren = ["center", "top"];
palette.spacing = 10;
palette.margins = 15;

// PLATFORMS
// =========
var platforms = palette.add("group", undefined, { name: "platforms" });
platforms.preferredSize.width = 220;
platforms.preferredSize.height = 40;
platforms.orientation = "row";
platforms.alignChildren = ["center", "center"];
platforms.spacing = 10;
platforms.margins = [0, 5, 0, 4];

// IOS
// ===
var ios = platforms.add("group", undefined, { name: "ios" });
ios.orientation = "column";
ios.alignChildren = ["center", "center"];
ios.spacing = 0;
ios.margins = 0;

var iosIcon_imgString = "%C2%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00-%00%00%00-%08%06%00%00%00%3A%1A%C3%A2%C2%9A%00%00%00%04gAMA%00%00%C2%B1%C2%8F%0B%C3%BCa%05%00%00%00%20cHRM%00%00z%26%00%00%C2%80%C2%84%00%00%C3%BA%00%00%00%C2%80%C3%A8%00%00u0%00%00%C3%AA%60%00%00%3A%C2%98%00%00%17p%C2%9C%C2%BAQ%3C%00%00%00xeXIfMM%00*%00%00%00%08%00%05%01%12%00%03%00%00%00%01%00%01%00%00%01%1A%00%05%00%00%00%01%00%00%00J%01%1B%00%05%00%00%00%01%00%00%00R%01(%00%03%00%00%00%01%00%02%00%00%C2%87i%00%04%00%00%00%01%00%00%00Z%00%00%00%00%00%00%00H%00%00%00%01%00%00%00H%00%00%00%01%00%02%C2%A0%02%00%04%00%00%00%01%00%00%00-%C2%A0%03%00%04%00%00%00%01%00%00%00-%00%00%00%00%C3%BAZ%C3%A0%C3%A1%00%00%00%09pHYs%00%00%0B%13%00%00%0B%13%01%00%C2%9A%C2%9C%18%00%00%01YiTXtXML%3Acom.adobe.xmp%00%00%00%00%00%3Cx%3Axmpmeta%20xmlns%3Ax%3D%22adobe%3Ans%3Ameta%2F%22%20x%3Axmptk%3D%22XMP%20Core%205.4.0%22%3E%0A%20%20%20%3Crdf%3ARDF%20xmlns%3Ardf%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%22%3E%0A%20%20%20%20%20%20%3Crdf%3ADescription%20rdf%3Aabout%3D%22%22%0A%20%20%20%20%20%20%20%20%20%20%20%20xmlns%3Atiff%3D%22http%3A%2F%2Fns.adobe.com%2Ftiff%2F1.0%2F%22%3E%0A%20%20%20%20%20%20%20%20%20%3Ctiff%3AOrientation%3E1%3C%2Ftiff%3AOrientation%3E%0A%20%20%20%20%20%20%3C%2Frdf%3ADescription%3E%0A%20%20%20%3C%2Frdf%3ARDF%3E%0A%3C%2Fx%3Axmpmeta%3E%0AL%C3%82'Y%00%00%0C%C3%B9IDATX%09%C3%85Yk%C2%8CU%C3%95%15%C3%BE%C3%B6%C2%B9%C3%A7%3Ef%C2%86%19f%C2%86%C2%A7%C2%BC%1F%C3%A2%C2%A8%C2%80%14P%5B%C2%A0U%C2%B1%C3%91%C2%8A%C2%8D%10%C3%9B%C2%8E%C3%BDS%C3%94%C2%9Aj%C2%8C%C2%ADI%C2%93%C2%B6J5%C3%AA%C2%84%3ED%C3%9B%1F%C2%B6%C3%84%C3%94%C3%9A%C3%84%C2%A0%C2%B4T%C3%80F%C3%85%07%1AIK%C3%93hj%05%C2%B5%C3%B2P%C2%90%C2%A7%C3%B2%18%60%60%60%C3%A6%C3%8E%C3%8C%C2%9D%C3%BB8%C2%BB%C3%9F%C2%B7%C3%8F%3D%C2%97%C2%B93%03%C3%98Vq%25%C3%A7%C3%ACs%C3%B6Y%7B%C3%AFo%C2%AF%C2%BD%C3%B6Z%C3%AB%C2%ACm%00%18%5E%11Y%3E%C3%B4%7C%C2%8F%C3%AAU%C3%9A%C2%BF%5Dq%C2%85_%C3%9D~%C2%9E%C2%B9x%C3%A3%C3%A39U%C3%A8%7DL%C3%B5%C3%88%C3%A9%C2%BE%C2%89%C3%8D%C2%B6%063%C3%99%C3%B4%5CV%0F%C3%A75%C2%8CW%C2%8A%C2%9De%C3%98%C3%99!%3E7%C2%B3%C3%B9%0Ek%C2%B11%C2%B0%C3%9E%1B%13R%1Do%C2%9B%C3%95%C2%AB%0B%C2%AC%C3%87%C2%86%C3%9Bn%C2%8B%C3%8Flm%0D%C3%B8%1E%C3%A8%C2%BD%1F%C3%AA%C2%8D%C2%89C%C2%85%20UF%1FKe%13%C2%BF%C3%B1%C2%B2%C2%AB%1A%1B%C2%BD%C3%89%40l%C3%B2%C3%AA%C3%95Y%C3%B2a%C3%B7u7%C2%9F%0Fc%C2%BF%C3%8Bk%C2%81o%C2%BC%C2%86%C3%AAx%C3%825%C3%8E%07%01r%C2%BAl%C2%80%C2%80%08%3Dc%107%1E%C3%A2%C2%9E%07%C3%9F3%C2%94%C2%86A%7B.%C2%87%C2%BC-l%0B%C2%ACy%C2%BE%10%0B%C2%96%C2%9D%C3%B7%C3%AC%C3%B2%C3%B7%C3%95%C3%A7%C2%96%C3%86%C3%86%C3%84%16%C2%A0p%03%C3%817%15%C3%87U%3D%C2%A976W%C2%A1%C3%8A%3E%C3%94TlHI%C3%B8%17%3F%1EJv%C3%8F%C3%B5%0B%2F%C2%B0%C2%81w%3F%C3%A7%C3%B1%C3%AD%C2%BAD%C3%8Ad%0Ayt%15%C2%9C%C3%80%24yJ%C3%80zlfl%C2%B1d%15%C3%AB%0C%C2%A7%11%C2%96%C3%A4%C3%91X%C3%B1%C2%8AX%0C%C2%A9%C2%98%C2%8F%C3%A3%C3%99%0C%C2%A7fV%C3%A6%C2%BC%60q%04%5E%C2%92%C3%A7x%C3%B9Hr%C3%A4%C3%AFC%11%60%0E%C3%A6%C2%84U%C3%86%C3%B0%C3%A1%C2%BCy%C2%89Ik%C3%97v%C2%B3%C3%92%C3%AC%5Cp%C3%A3%2Fc0%C2%8Bj(%C3%95%139'%C3%B0%1CA%12%C2%93%C3%B1%C2%9CP%C3%BB%C3%AB%C2%A0%C2%AC%C2%B7%C3%A8E%13%40%C2%81%60%C2%85%2B%5E%C3%8B%C3%BE%C2%8E%C2%BB%C3%BE%C3%AC%C2%92%C3%B1%C3%8F%3Fu%C2%8F%C2%BA%C3%A1%C2%B8I%C2%8E%C3%AB%06%C2%89Z%C3%B5%2C%05%3A%02%C3%9E%C2%B3%1E%2F%13%C3%B0%C2%B5%04%C2%BCk%C3%BEw%1A%60%C2%BCg%06'%2B%C2%A6%1C%C3%AB%C3%8E%C2%80%C2%8A%C2%97%C3%B3%60%7D%0E%C3%9Ao%C2%BB%C2%B2N%C3%8E%C3%B0%C3%82%0E%C2%A8H%C3%88Sb%C3%B1%C3%BAD%0A%C3%87%C2%B2%5D%C2%9B%03%C3%AB%7Fk%C3%82%C2%9A'%C2%B6I%5D%C2%A8%C2%8En%C3%AF%C3%B4%C3%AE%26%02%C2%ADR3w%14%01%C3%9E%3D%C3%BF%C3%A6k(%C2%905%03%C3%BCx%3C%C2%9D%C3%8Fu%C2%93)N%06%C2%AF%C3%84X%C3%A4%C3%BF%7F%C2%8A%C3%A2%C3%80%C3%9A%C2%849%C2%8E%C2%93L%17%C2%A8%C3%B4%C2%81%C2%99%3F~%C3%8D%C2%B2W%C2%88%23I%C3%81%C3%B5%C2%94%C2%B8c%C2%97Z%C2%88lSQ%C3%A2%11%C3%A0%5D%C3%B3%176%C2%A6%7Co%C2%ADo%C2%8C%00%C2%ABa%C2%92%60%3FU%C3%80n%60%C3%9D%C3%98%2F%C2%AFd%7B%3E%C2%97%C3%B3a%C3%A2%1AW%C3%A3k%C2%A5%C2%85G%0CM!%3E'%2F!%C2%97%C2%85pV%22%C3%92aIX%0D%C2%B3%C3%9CB%05%1Bp%C3%B9%0C%C3%95%C3%A1%C2%B3'%C2%81%C3%A1%C2%A6%C3%8D%C3%87%C2%8C%C3%A7'hq2%C3%B9%60%C2%9E%24%1E%C3%A9x%C2%84%C3%93%C2%81%16%C2%9C%C3%88JH%C2%87%C2%8D%C2%89m%C2%92%C2%84i%C2%BA%C3%8E%1A%60a%10E%C3%80i*%C3%BD%C2%BC%C2%B59k%0BS'%C2%AC%C3%B9%C3%A3%C2%B6%C3%88%C2%AA%C2%88%C3%87%C2%A9%C2%87%C3%ACp%C3%91%C2%AC%C3%91%1Ax%C3%8FH%C2%87%C3%89%C3%8D%0Dwv%24%2C%20%11iE5%C2%AE%C3%86%17%0E%C2%8FxXe%C2%84O8%C3%85%C2%A7%C2%9B%C2%95%C3%A3%C3%90%C2%8B%C3%8C%C3%9A%C3%A0D%C3%85%C2%94h%C3%93%C2%9D%0D%C2%95%C3%90%C2%B8%C2%BDI%C3%A3R%C3%A2n%C3%B3%C3%93%C2%AAL%C3%99M%5C%C3%A2%C2%89p%1A%C2%B9%C3%A2%C2%B9%C3%AB%C3%97%C3%A7%C3%A58%10x%5B%C2%8B%1D%04l%C3%A8fU%7C%C3%BF%C2%BC%C2%8A%C2%80%C3%A0%C3%9D%C3%A6%C2%A7%03%C2%BAP%0EHx%3D%C3%85%12B%24O'%C3%87A%C2%B0%C2%B2%14%C3%BD%00%3E%C3%BBr%2F%02%C3%8E%0E%24%C2%AE%C2%B8%C3%B3%C3%84%C2%80%C3%B0%3A%C3%80.%C2%96%C3%B0%02JY%C3%AF%C3%85%C3%85)%C2%93-%C3%AB%C3%A2%3E%C3%BD%18%C3%8D%C2%A9%C2%AE%C3%9E~%C2%85.%C3%91%C2%91%C2%AB%C3%A7s%C3%B1%C2%B5%0F_%C3%94%C3%A7%7F%C3%81O%C2%AF%2BW%2F%5C%C3%9Cdv%C2%B2%C2%A4%1DJ%C2%94%C3%81%C2%8Fb%09%C3%B6I%0F%C3%A4%C3%A6%11u%1F%C2%96%C2%BE%0F%7B%C2%AC%C2%9D_%19g%C3%B8T%C3%BFh%C3%90%C2%88%2B%C2%99%C2%80%C2%A9L%C2%86%13K%C3%84%C3%B9%C2%9C%02X%C2%9E%C2%92%C2%92E%1E%09%22%C2%AEg%C2%B6M9s%C3%9C%C2%A7I%C3%91%C3%B3%C3%A6%C2%84%2F%1E%C3%84n%12%C2%83%C3%93%C3%A9q%03%C3%87l%C2%AE%C2%88%C3%B9%0D%0C%C2%80%18%C2%A8%18%C3%B6TN%C3%B6%C3%88%09%C3%B83%1AP8x%C3%84%C2%817u%038%C2%81%7C%08%C2%8C%13%08%3E%3C%00%C3%9B%C3%92%05sN%C2%B5%5B%09%C2%BB%C2%BF%1D%C3%9E%C3%84%3A%C2%981C%C3%A9%C2%A49Q%C2%AD%C2%8E(F%19%C3%91%C3%BE%06%3B%C3%88%7F%C2%A8%03f%04%C3%B9I%C3%B6P%1A%C2%A6*%0E%C2%AFaD%C3%88%C3%A3%C2%84rRx%C2%94v%C2%9E%01%C2%96%C3%9FU%C3%88o%C3%9Bs%C3%A2%C2%A3)%C3%A6%C2%A3%C3%B9%0B%2F6%5E%C3%AC-%C3%9AD-%C2%82%C2%8B(%C3%83%C2%9E%C2%B8%C3%86%C2%94H%C2%B0%C2%B3%19%03%1F%C2%B8%03u_%C3%BF%1A%C2%B2%07%C2%9Bqx%C3%B1%C2%AFQ%C3%98%C3%9B%0C%C2%AFv%00%C2%82%C3%96v%C3%98%C2%B6.T%C3%9Dr%3D*%C2%A6O%C2%85_%5B%C3%8B%C2%BD%11%20%7F%C3%B4%18%3A%5E%7F%13%C2%99'%5E%24%C2%90s%1CP%C2%A72%C2%8C%08%C2%83%03%C3%87P%C3%B9%C2%BDo%C2%A0r%C3%A6%17%10%C2%AB%1D%C3%A8V%C2%AD%C3%90%C3%9E%C2%8E%C3%8C%C3%BB%C3%9B%C3%91%C2%B5%C3%A65%C3%98n.6%C3%83%C3%98%C2%92%C2%8A%11L%C2%84%C2%8B%C2%BE%03%C3%99%02.U%C3%A03G%1B%C2%B05%C3%9BM%C3%93%C3%A8b%0B%C2%87%C3%99%C3%9D%C2%A4J%1D%C3%9D%18p%C3%89%0Cx%0A'G%C2%8DD%7C%C3%AA%C3%B9%C3%88%C2%BF%C2%B3%03%C2%96%13%C3%B2%C2%86%0F%C3%82%C2%90%C3%9F%C3%BD%08%C2%95%13'%C2%9ClS%7C%C2%AA%C2%99%C3%BDE%C2%B4%5D6%0B%C3%87%C3%AEZ%02S_%C3%A3%C2%B4%C3%8E%C2%B6wa%C3%88%1F~%C2%81%C3%AA%C3%A9%C3%93%C3%BA%C3%B0WM%C2%9D%C2%8C%7D%C2%AF%C3%BD%03Hw%C2%85%C2%AA%C3%A2%C2%A4%1D%C2%B2%C3%B1Qj%C2%9Cc%C3%9C%1Eo%0D2%C2%B3c%3F%3C%7F%C3%9A%C3%B7%C2%93%C2%B1%C3%98%C2%B4L%C3%81%05%C3%86%C3%8E%5E%C2%97z%14h%3A%C3%96%5C%C2%B6%13%C3%B1%C3%91%23%C2%91~%C3%B7%3Dt%2C%7F%0E%C2%A6%C2%B6%0A%C2%B6%2B%C2%8Ba%C2%BFY%C2%8C%C3%8Aqc%1D%7B%C3%B7%C2%91%16%C2%A47%C2%BC%C2%8D%2C%C2%A5%C3%AC%0F%C2%AE%C2%87)N%C3%92%C2%9C7%16%C2%9D%C2%AB%5E%C2%A5%C3%BA%C2%B4%C2%A1f%C3%91%C2%AD%C2%A8%C2%9B%7B%C2%99%C3%9BZ%C3%B9t%1A%C2%9D%5B%3E%40%C3%B7%C2%BE%C3%BD0%15)dv%C3%ADAz%C3%A9%C2%9FaF%C3%96%C2%9FT%C2%A7%12%10%C3%B7PH%C3%85b%C2%B1%C3%AE%C2%A0p%C2%84%C3%BAk%C3%8E%C3%8D%C3%91*%2B%C2%80%C3%97%C2%BDD%02%C3%8Cy%18%C2%AAAn%C3%A7%5E%C2%B4%3C%C2%B6%C2%8CK%C2%97%C2%85%C2%A9%C2%ABF~%C3%9Df%C3%94%3Ev7*F%C2%8Fr%C2%AB%C3%98%C2%BD%C3%BF%00%C2%9A%7Fp%2F%C2%82%C2%B7v%C3%83%C3%AEoC%C3%A7%C3%92%C3%9B1%C3%B4%C3%B6%5B%C2%B8i%7D%0C%C2%A4%C3%84%3B%16%5C%C2%8E%C3%8C%7D%2BPIiFt%C3%B8%C2%91%C3%87%C3%90u%C3%BF%C3%83%C2%88%C3%8D%C2%9A%033t%20%C2%BC%C3%81u%C3%B0%26p%0Fh%C2%B3%C3%B7C%C3%BA%C2%B1%C3%88%C3%8B%7B%10%C2%AF6%C3%9Dp%C3%BD%269%C3%8D%C3%A9%C3%89%C2%AC%C3%A5%C2%A1U%08%C3%9E%C3%99%C2%8D!%C2%BF%C2%BA%0FU%0D%C2%93%10%C2%90%C2%AFy%C3%89%23%C3%88%C2%BF%C2%BA%09%03.%C3%A5%2Fa%C2%91Z%C3%BF%C3%B2%02%C2%82%C2%8D%C2%BB%11%C2%BBj%C2%AA%C3%9Bx%1Dw%3E%C2%8A%C3%B4%C2%ACKP3s%C2%BA%C3%AB%C2%B6%C2%8Aj%C3%92%C2%89%C2%9F%C2%84%C2%BAZlS%C3%89%C2%BA%C3%9C%C2%BC%C2%AB%11%1Cl%05%C2%B8j%C3%81%C2%B1%13E%C3%8B%14%C3%B5Z%5E%C3%92%C2%B5%1B%C3%BD%C3%8A%C2%91%C2%86KW%C2%86%C3%A9%C2%9F.%C3%BCE*gtr%C3%A7%C2%A6%C2%90%C2%A5%C2%8C%C3%88ve%C3%A0%C3%8F%C2%9B%06%C2%BF%C2%BE%C3%8EI9%C3%8FM%C2%94%C3%9D%C3%B0%1E%C2%BC%C2%8BF%C3%83%1E%C2%A7Y%C3%8C%C3%A6%60.%1C%C2%8E%C2%AE%C3%8D%C3%AF%C2%97%C3%B6Rb%C3%A4%08%C2%AE%C3%A1Pt%C3%BC%C3%AB%C3%AD%C2%A8%1B%C3%94%5D%C3%BEe%C2%8CX%C2%BE%14%C2%B5%0F%C3%BF%18%C2%B1%C3%B1%23hQ%0E%C3%92rH%3BO%C2%8EUbv%C2%B5%C3%96%0Bqb%C2%98%40%C2%A7d2%C3%BAH%3Aj%C3%81O%C3%BAA%15%C2%A9%C2%B4T%19oH%1Db%C2%B2%C2%AF%C2%AA%24H%07V%C3%A6L%24%5E%C2%9F%C3%BF6m4ca%0D%3C%C3%9A%C3%AC%C3%98W%C3%A6%20%C3%BD%C3%A8%C2%9F%C3%90%C2%BAn%7Di%C2%A8%C3%84%C2%A0z%C3%94_u%25F%C3%BD%C3%B6A%C3%94%C3%9C%7D%0B%C3%AC%C3%9E%C3%83%C3%8En%17%C2%9B%C3%B5*%C2%8C%11N%C3%B6%C2%99R%C2%9C%C2%9C!%C2%98%C3%8A%C3%80Ja%C2%8A%C3%A8%C2%8A%C3%AC%C3%8E%17U%C3%84%C3%91%C3%96z%1C%C2%9D%C3%ADi%C2%A0%C2%BB%1B%01%7F%2Cl%C2%BA%13--G%C2%9D%C2%9D%0EN%14%C2%97U%C3%B6%C2%98%5D%C3%8A%C3%A4%C2%99x%C2%8C%C2%AAY%40K%2B%C2%97%C2%9Ez%C2%9D%3F%7C%C2%84m%C3%B30%C3%A3%C2%86%C2%A1%C3%B5%C2%8E%C2%9F%C2%A3%C3%B3%C3%86%0DH%5E1%07v%C3%BCX%C2%A0%C2%A2%C3%82Y%26%5C%7B5%C3%8C%C3%96%C3%AD%C3%80%1B%C3%AF%02%C2%83h%0A%C3%B3%C3%B4%03%C2%A5i%0B%C2%90%C2%B5%C2%8C%C3%B8%0C1%11%2F%C3%B3%12%C3%BA%C3%8D%C3%97_%C2%B3%3E%C3%B5%26C%C2%A9e%3A%3B%C2%91%C3%AE%C3%A8pW%C3%80%25%C2%B4%3B%C3%B7!M%C3%90%C3%A9t%07%3A%C3%A9%2C0%C2%9A%C2%A9%0E%C3%AA%25R%C2%A1W4%C2%9DY%14%C2%86%0EF%3A%C3%93%C3%ADx2%1F%C3%93Bt%C3%91%C3%BERR%C3%9E%C3%8C%C2%89%C3%88%C3%BE%C3%BD-%C2%B4%C3%9D%C3%BA%00%C3%9A%C3%AF%C3%BA%19%3A%C2%B6lE%1B'%C2%9E%C2%A6%40%C3%8C%C2%97f%00G%C2%A8bZ5%C2%8A%C2%B0'%09%C2%9Fp%C2%92%0E%C3%A9%C3%9E%C2%AC%C2%BC%C2%84~%C3%B3%7B2%C2%95%C2%9EY%C3%AB%C3%B1%3B%C2%AD%C2%8D%2B%C3%A5v%C3%B1%C3%9A%1Ex%07%0E%3A%15%C3%B1R)%C2%98k%C3%A6%02%C3%AB%C3%B6%00%C2%87)%C3%99M%2C'%C2%8F%C2%817%C3%BD%22%1AW%C3%ABb%5E%C2%B3u%1B0%C2%80%13%C3%92%04%0F%C2%B4%C3%80%1C%C3%AF%C2%A0%C3%87%1C%06o%C3%85J%C2%98%7Fn%C2%84%C3%8F%0D%2F%C3%A9!AW%5E%C2%BE%C3%98%25%18%C3%82%C3%A7%C2%AB%3D%C3%B1%C3%92z%C3%98%1DL%C2%A4%C3%8C%3A%C2%95%C2%A4%C2%B5Bn%23j%C3%A7J%C2%83TN%C2%ADE%C3%B0%C3%8A_%C3%A1M%C2%9A%18%C3%86%0E2e%2F-%C2%86%C3%A5F3U%C2%950_%C2%BD%0C%C2%A8%C2%A1%C2%8B%C2%A6%C3%93%0A%C2%B6~%00%C2%BB%C3%AEM%C3%A7%C3%B6%C3%8D%C2%B5s%C2%B9I%1B%60716k%C2%A5Z%5Dw%25%C3%8C%C3%ACKa%15%12%249%C2%A9%5D%7B%C2%A5%C2%B1%C3%A18%25%C2%B8%C3%A1%C2%83%C2%93%C2%B4%C2%9B%19%C3%B1R%C2%BE%1BY%C2%B1%C2%90p%C3%BA%C2%9F%233%14%C3%92K'a%C3%A7%7F%C3%98%C3%89%C3%B0Z%C3%A0%C3%8D-%C2%B0%C2%A3%5E%C2%82%C3%B9%C3%A6u%C3%8E4%1A%C2%9A%403cZ(MI%C2%84%1D%C3%9B%3D%7Ba%7F%C2%BF%1C%C2%A8b%00E%60f%C3%B2%05%00M%C2%A7%197%26%04V%C3%A4%C3%93%0A%C3%98-%C2%B46%C3%8F%C2%AF%03F%0D%0E%C3%B5%C2%B9%2F%1A%C3%96%C3%88%C2%92a%C2%A3%C2%AF%C3%9C%C2%9ARU%14h%C2%9C%C2%B5'c%0FMP%1A%C3%83%C2%8D%08m%C2%A8C%C3%9C%C3%99Y%C3%AAm%26%13z%C2%AC%11%C2%83%60W%C2%BC%0C%7B%C2%A0%C2%99%C3%AAA%C2%89%0D%C2%A7cH%12%C2%9C%26F3h%C2%A9%12v%C3%85%C2%9A%C2%B0%C2%8F%C2%AA%0A%06%C3%82%15%C2%B0%C3%BF%C3%9E%0C%C2%A3%C3%AF%C3%95%0C%C2%B8%14%05j%C3%B3r%C2%AFX%C2%99%C3%87%C2%A7_%0CM%C2%9E%C3%80%3A'%22%00!%15q%C3%85%C3%9B%C2%99%14%C3%A0%C2%8Ez%C3%9D%C3%98%C3%86%C3%86%C3%98%C2%9El%C3%85%C2%96%C3%93Eyn'G%1D)%C2%9CT%C3%87%C2%9A%C2%90%06%3E%C3%8Ae%3E%C3%9E%09L%1A%01%C3%94R%25%14%C3%B0%C3%AC%C3%A3%04%C2%8F%C2%B4%01%C3%A3%C2%99%C2%87%C3%94%C2%A6%128-%C3%AD%C2%BE%16%0A%C2%81z%3B%C2%8A%13%C3%94D%C3%A8a%C2%B1%C2%9F%C2%96%C3%A5(-%C3%938%C3%96%C2%89%C2%A7%C2%9Fx%C2%9D%C3%B2%C2%8D%C2%A2%C2%BC%C3%AD%C2%8C%C3%B2%26%C2%93%C2%8B%C3%BF%C2%86%C3%B3ozhP2y%C2%97%C2%82%26%C2%BE%12%C3%89'%24%01%C2%A7ys%1B%C2%AC%C2%93%C3%993%C3%9Al%07%C2%B2%C2%82%C3%BA)%C2%95%C3%A2%0A%C2%96Y%01MX%7B%22C%C2%B0%C2%9A%C2%88%26%C2%A48%C2%BA%3F%C3%9Er%08%C2%8C%C2%A7%C2%93%C3%B1%C3%96l%C3%A6!%C2%A6%C3%8E%16%C2%B9%C3%AD%C2%A8%C3%AC%C2%A5%C2%92%C2%81%C3%A4%C3%AB%1F%C2%B0%C2%A6%16%5D%3D%3B%C2%93%C3%845%C2%B8%C3%A6%C2%9A%20%C2%A0%C2%9A*%40%3F%00Z%15IQ%3D%C3%B6%24MJ%C2%92%C2%A4%C2%B5%C3%80%00JZ%C2%93%3B%15o%C2%A9%C2%9D%24%03%01%C3%96%C2%9F%C3%8B%C2%93%C2%AA%C3%B6%C2%94O%C3%90%2F%0C%7D%C3%8DJ%25%03IY%C3%A1%2B%235%C2%8B%C2%AE%C2%B2%0Fz!%C2%B7%C3%93C%C2%82%C2%91C%C2%886%C2%AB%C3%AAzST%17p%C2%A2%C3%A2%3B%1Do%C3%98%C2%B3%C3%AE9%C3%BD%23%C2%92V%09%C3%A7%C2%86%C2%99%C2%B7%C3%85%3D%25%C2%B4U%C2%A3t%C2%AB%C2%B2%C2%97%1CJ%1C%C2%AEN%C3%B5%C2%9F%C2%9C%042%C2%BA%C3%8E%C3%94*%C3%A2SyZ%C3%92%C3%9Fx%C3%82ei%03%C2%AFI%C2%9C%C3%AD%C3%95%C3%9B%C3%A9%19%C2%99%C3%84V%C2%86R%C2%B3%C2%A08%C2%97(%7BI%C2%A1r%1D%3F%7F%12%0E%C3%A1%C2%A1%2C%1E%1C%C3%BF%C3%82%C2%B2%0F%C2%84s%C3%AE%C3%BA%C3%B5%05%C2%A7%C3%93%C3%8A%C3%80%0B%C2%A2%C3%B2%C3%83J%C2%B7*%7B%C2%A9%06g%C2%94%C3%83g4%2F%C2%8D%C2%AB%C3%B1%C2%85%C2%A3%C2%85x%C3%86%3D%C3%B7%C3%A4%C2%BD%1A*%C3%82%C3%A9%40%C3%AB%C3%88%40%C2%BA-%5E%C3%A5%C2%87%C2%99a%C3%8A%C3%91h%C3%87%C3%A9%3A%C3%B3g%1B%C2%B8%C3%86%C3%93%C2%B8%1A_8r%C2%81%C3%97%C3%88%3A%2B%7C%C3%82)%C3%B0%0Et%13%17%40G%06%C3%8AN*%C2%A1%C3%8D%04%C3%BF%7C%C3%B9%C3%B9%C2%981%C3%BE%C3%99%04%1E%01V%C3%96T%C3%A3%17%02%C2%BB%C2%A0%C2%81j%C3%B1%C3%A1%C2%BC%3B%C2%93%C3%82'%C2%9C%02%C2%AD%C2%9B%7B%C3%A0r%C2%B8%07%C3%AAM%5C%07B%C3%8A%0FW%C3%B8%C3%B1U%C3%AE%C3%B0%C2%87y%122%C3%B5o%0E%C3%95%C3%8B%C2%A7DR%09IX%C2%80%C2%BB%C3%B2%C3%81%0D%13%C3%96%2C%5B%1D%25%C3%96%C2%9B%08%C2%8F%C2%97%60%C2%9E%04%C2%AD%C2%97%C2%88%C2%A2%C3%84z%C3%AF%C2%93%00~%C2%8F%13%C3%BC%C2%A7%C2%9AXw%12%0B%C2%ADux%12%40%C2%95%C2%90%C2%84%C3%8F%7D%C3%A1%C2%A9%C2%B5%11%C3%A0%08WTJ%3D%22!Gu%C3%90%C2%91%C2%81%1A(%C2%A1%C2%AD%C3%BCpG%3E%C2%BB%C2%B9%3E%C2%91L%16%01%C3%8B%C2%8E%C2%BB%19%C2%97%1A%C3%BC%C2%8F%0F%0A%7F%C3%98%11%C2%BD%10%C2%BCA%C2%89%14O%02%C2%B2%C2%9B%C2%B3%C2%81%C2%B9%C3%A8t%C2%805%C2%94%26Z%C2%9C%C2%AC%5E%C3%8B)%3A%19%60%C2%AD%09%C3%93%C2%ADf%C2%91%0C%7D%7F%C2%A7%5B%C3%A5-O%C3%BDF%C3%BF%C2%A2%C3%90%C2%98~0%3C%C3%9D*%C3%B5G%C2%B3%26%2B!%C2%81H%C2%87'%C2%AD%5D%C2%AA%C3%89%C3%B4Kn%23%C3%B2K%1F%C3%A0M%C2%AC%C3%93%C2%B1XdUh%0E%7F%C2%AAt%2B%01%3F-%09)%16P%C2%AA%C2%8A%C2%A2R%1F9J%C2%8C%C2%97%C2%B364%C2%9F%C3%8E%C3%B5%C2%B2%3A%3A~%C2%B3t%C2%95N%C2%A2J%08yj%C2%A7%C3%B6%C3%BA~%22%C3%97%C2%BD%C2%92%07C%17%C2%8C%7F%C3%AE%C3%89%7B%04X%C3%A3%09%C2%B0%C3%86g%C2%9B%C3%9E%C3%A4%C3%AAt%3B%C3%95G%C3%9B%C3%84o%C2%BC%C3%BA%C2%9C%C3%98ng.%3BV%C3%B0n%C3%A6%1F%5B%C2%8F%13%5B%0B%C3%A5%25%C3%8E%7Cb%C2%9B%C3%A5%C2%89%C2%AD%C3%9D%C3%8En%C2%9FU%2C%11%3A%C2%B5%C3%93%C2%9E%C3%98F%C3%80%C2%85%C3%93%C2%A9e%048*%23%C2%86~K%26%C2%B4c%7D%C3%8F%C3%86%C3%87M%C3%B7L0%C2%9B%C3%8B%C3%8EDHx6%C3%8E%C2%9E%C2%87%C2%B1C%C2%BA20%C3%B8.%3F%1BW%3C%C2%BC%C2%B3%C3%AD%C3%A3w%C3%A9%C3%99%24%7D(%C2%96%C2%90k%C2%96%C2%A7%C3%93%C3%BB'%20%C3%BB%1Fcu%2F%C3%8A%C3%A16%C2%BE%C3%B0%00%00%00%00IEND%C2%AEB%60%C2%82";
var iosIcon = ios.add("iconbutton", undefined, File.decode(iosIcon_imgString), { name: "iosIcon", style: "toolbutton", toggle: true });
iosIcon.preferredSize.width = 45;
iosIcon.preferredSize.height = 45;

var iosName = ios.add("statictext", undefined, undefined, { name: "iosName" });
iosName.text = "iOS";
iosName.justify = "center";

// ANDROID
// =======
var android = platforms.add("group", undefined, { name: "android" });
android.orientation = "column";
android.alignChildren = ["center", "center"];
android.spacing = 0;
android.margins = 0;

var androidIcon_imgString = "%C2%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00-%00%00%00-%08%06%00%00%00%3A%1A%C3%A2%C2%9A%00%00%00%04gAMA%00%00%C2%B1%C2%8F%0B%C3%BCa%05%00%00%00%20cHRM%00%00z%26%00%00%C2%80%C2%84%00%00%C3%BA%00%00%00%C2%80%C3%A8%00%00u0%00%00%C3%AA%60%00%00%3A%C2%98%00%00%17p%C2%9C%C2%BAQ%3C%00%00%00%C2%84eXIfMM%00*%00%00%00%08%00%05%01%12%00%03%00%00%00%01%00%01%00%00%01%1A%00%05%00%00%00%01%00%00%00J%01%1B%00%05%00%00%00%01%00%00%00R%01(%00%03%00%00%00%01%00%02%00%00%C2%87i%00%04%00%00%00%01%00%00%00Z%00%00%00%00%00%00%00H%00%00%00%01%00%00%00H%00%00%00%01%00%03%C2%A0%01%00%03%00%00%00%01%00%01%00%00%C2%A0%02%00%04%00%00%00%01%00%00%00-%C2%A0%03%00%04%00%00%00%01%00%00%00-%00%00%00%00%C2%B5%C2%92hS%00%00%00%09pHYs%00%00%0B%13%00%00%0B%13%01%00%C2%9A%C2%9C%18%00%00%01YiTXtXML%3Acom.adobe.xmp%00%00%00%00%00%3Cx%3Axmpmeta%20xmlns%3Ax%3D%22adobe%3Ans%3Ameta%2F%22%20x%3Axmptk%3D%22XMP%20Core%205.4.0%22%3E%0A%20%20%20%3Crdf%3ARDF%20xmlns%3Ardf%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%22%3E%0A%20%20%20%20%20%20%3Crdf%3ADescription%20rdf%3Aabout%3D%22%22%0A%20%20%20%20%20%20%20%20%20%20%20%20xmlns%3Atiff%3D%22http%3A%2F%2Fns.adobe.com%2Ftiff%2F1.0%2F%22%3E%0A%20%20%20%20%20%20%20%20%20%3Ctiff%3AOrientation%3E1%3C%2Ftiff%3AOrientation%3E%0A%20%20%20%20%20%20%3C%2Frdf%3ADescription%3E%0A%20%20%20%3C%2Frdf%3ARDF%3E%0A%3C%2Fx%3Axmpmeta%3E%0AL%C3%82'Y%00%00%0C%5BIDATX%09%C2%B5YypU%C3%A5%15%3FwyK%C2%96%C2%97%C3%A4e%01%C3%82%0EJ%C3%82%C3%A2%3AX%C2%AC%C2%8C%C2%B5%C3%8A%C2%88%C3%94%C2%ADV%3B%20N%C2%9Dn3%15%3BXe%C2%A8%C3%A8%C3%B8%17a%C3%AC%C2%B4%22S%5Bg%C2%B4%C2%8A%C3%BE%C3%912%C2%9D%16%04q%C2%A90%15%C2%87Z%C2%ADZ(%05TT%1A%12%C2%88%C2%80%2C%06%C2%B2%C2%BD%C2%BC%24o%C2%B9%C3%B7%C2%BE%C3%9B%C3%9F%C3%AF%C2%BB%C3%AF%3EnB%24%40%C3%B00%C3%B7%C3%9D%7B%C2%BF%C3%AF%2C%C2%BF%C3%AF%C2%9C%C3%B3%C2%9D%C3%AF%C3%9C%C2%A0%C3%89%C2%85%22W4Y%C3%91%C2%A0%C3%89r(%C3%9C0%5D%C2%9B%C3%8F%1Bu%C3%8F%C3%9F%C3%AB%C3%8A%0A%C3%9C%C2%977%C2%90%C3%83%C3%A5%C3%90pI%1B%C2%96%02%C2%B7A%C2%9F%C3%B9B%C2%AD%11%C2%AB%3B%C3%AE%C2%BEsC%C2%83%3D%C2%94%C2%AE%C3%AB%C3%BF%C3%99%60%26%C2%9Bj%C2%B5%5D%C3%B7%1DwDk%C3%88%0D%C3%85%C3%BFU%C3%B3%C3%A7%07%C2%BA%01%60o%C2%AB5v%5D%C2%B5%C3%88%0A*%1E%C3%BB%C3%A6S%C2%95E%7D%C3%96H%C3%97%C2%94r%5D%C3%97B%C2%B9%C2%9Cki%C2%B6%24R%C3%85%C2%A1%C3%96%23%C3%9FY%C3%9A%11%C3%A4%C2%9D%C2%B9suh%C3%97%26%C2%80o8w%C3%B0%C3%A7%06%C2%9A%60k%01v%C2%91%07v%C3%A4%C2%96U%25%15%19%C2%B9Q%C3%97%C3%B4y%08%C3%BD%2C(%C2%9B%C2%84%1C%C2%88%C3%AB!C%13%0Do%C2%AE%2B9%C3%8Bq%C2%91%15%C2%9D%C3%88%C2%8B%C3%8F%C2%91%1C%3BrnnKWD%C2%B6%C2%B6%C3%8E%5B%C3%96%C3%8BE%C3%8C%5C%0D%C3%B0%C3%87%C3%8F%0D%C3%BCY%C2%83fh%C3%BD%14%C2%A8%7B%C3%A3%C2%A91%C2%86%C3%A4%1E%02%C2%B0%1F%C3%A8E%C2%91%C3%91.0Z%C2%99%C2%ACd3i%C2%B1%2CK%1C%C2%B8%C2%98%C2%A4%C2%81%0C%C2%BA%3C%14%C2%92p%24*%C2%A1HX4%07%0BIe%C2%8EaA%7FqD%7F%C2%BA%C3%A9%C3%B6%C2%A5G%09%3E%C2%A8%C2%9F%C3%AFg%C2%A2%C2%B3%02%C2%ADB%C3%89T%C2%80%C2%A7%C2%A7%5EU%C2%BA%1Cn%7C%C3%84%C2%88%15GS%C3%89%C2%A4%24S%7DN%C2%B7%C2%9D%C3%89%C2%A5sLQW%C3%B7.%C2%A5%C2%96%3Fp0%C3%B7%C2%9E%C2%86I-%17%C3%95u)3%23z%C2%AC%C2%A8%C3%98(%C2%8A%C3%85%C3%84I%C3%B6%C2%A5%5Dq%C2%9Fl%C3%9C%C3%99%C2%B3%C2%82iR%C2%B0s%26%C3%84%C3%946%C3%84%C2%BC%C3%B8%C2%8A%C2%A6l~%C3%B2%0A%C3%83%C3%91%C3%97%C2%85%C3%A2%C2%B1%C3%BA%C3%9E%C2%8ENiO%C3%B7d%13%C2%B6e%02%14%12%01%1Ee%3A%0CA%0E%C3%92%05%C3%BF%C2%B0%0A%C3%8D-7CvU%C2%B44%5CR%19%17%C2%AB3%C2%B9%C3%8F1r%0B%C2%9Bo%7D%C3%A4%23%C3%9F%C3%9E%C2%99T%C2%9D%C3%91%C2%92%1F%C2%B2%C2%BA%C3%97W-4Lc%C2%AD%C2%84Mi%C3%AF%C3%AA%C3%88%C2%9C%C3%88%C2%A6BX%C2%AEn%06%C3%96L%7F%0EEAc%C2%B6%17%C2%84%C3%9C%C2%88p%C2%91UUQ%19%C2%91%C2%AC-%C2%8E%C3%AD%C3%9C%C3%93t%C3%87%C2%B2u%C2%BE%C3%9D%C2%AF%C3%92%17%C3%94%C3%93%C2%8F%C3%87_%C3%B1%C3%94%C2%BF%C2%ADZd%C3%86J%C2%9E%C3%8F%24%7B%C3%A4Ho%C2%97%C2%95%C3%8A%C3%99!SC%16%C2%80%C3%8E%06h%3F%C2%A5%C2%81%17%C3%9F%C2%B0%C3%AD%C3%A6%C2%A4H7%C2%AD%C2%B1%25%15%C2%A1H%C2%ACT%C3%ACd%C3%AF%C3%BD%C2%8D%C3%9F%5D%C2%B6%C3%9A%C2%B7%1F%10)%3C%C3%BA%C2%B2%C2%85%01%3E%C3%B8%02u%C2%9BV-%0C%C2%97%C2%94%C2%ACMu'%C3%9DC%C2%BD%C2%9D9%C3%9Bu%C2%8D%10%C3%92%C3%A0%C2%BC%0Bl%3F%2B%C3%9E%0B%C2%97o!cLMs%26%C2%94%C3%84%C3%B5%C2%A2%C2%B2%C2%98%C2%96%C3%AD%C3%AD%C2%BD%C2%A7%C3%A9%C2%B6e%C3%AB%7C%1C%03%C3%85N%03%C3%AD%C2%87%C2%869l%C2%8A%C3%B9%C2%A1%C3%AD%C3%98%C3%B2yO%C2%87%C3%A3%C2%88%18H%C3%A0%02%60%C3%9F%C3%8B%C2%A7)%18ha%C2%90%C3%B7%C2%81%C2%B2%04%C3%8E%C2%93%C3%89%10q%26%C2%96V%1A!X%C2%B2%C3%85%C2%BE%C2%929%C3%AE%C3%A3%09%C2%AA%C3%B1%C3%A2%C3%AC%C2%8F%C2%A0%3A%C2%A8%C2%B2%C2%86%C2%BB%C2%91%C3%93%C3%971%C2%87%C2%99%12%C3%B4p%100%16%201%C3%A4s).%3E%C2%9F-p%C3%B2%05e%C3%BD%C2%88%C3%B1N%C3%BD%C2%B4s%14%C3%B6hW%C3%99%0F%C3%A0%C3%81t%C2%81%C3%BA%C2%81%C3%A6%C3%81%C3%81%C2%99%C3%BA%C2%99%25%0D%C2%A1%C3%B2X%3D7%1Ds8%C2%98%124%40%C3%80%C2%89%C2%9C%25%C3%9D%C2%AE%23%15x%0E%C2%9E%C3%9F%046%C3%B0%C2%A2N%12%C3%B9%C3%A2%C2%94%C2%85%5C7%C3%A4K%C3%B0%1C%04N%3B%C2%B4G%C2%BB%C2%B4O%1C%C2%94%C3%B3q%C3%B1%C2%99t%C3%8AIX%15k%C3%A5%C3%85%1BW%C2%8E%0DE%C3%8C%C3%A6%C2%8CcE%5Bz%3As%C3%885%C3%9D%0F'%C3%AF%11%5C)%18%C2%9D%13)%C2%97V'%2B%C2%9F%C3%99i)%C3%95%0CIc%5Bz%C3%A0%7Dn%C2%AA%C3%B7IS%C2%9E%2C%C2%82%C2%B9%C2%A4k%C3%8B%C3%A5f%C2%B1T%20v%C3%AFf%C2%BA%25%0A%C3%99%2C%C3%98%7C%20%C2%BC%C3%83%C3%A3%C2%B9%C3%89%C2%A5q%3Db%C2%84%C3%92V%C3%86%C2%9E%C2%B2%C3%BF%C3%BB%C2%8F%1E%C3%A1%19A%7C%C3%94X%C3%B04%7B%09%0E%C2%98!%C3%BD!%1E%1C%C2%AC%C3%83%C3%90T%C2%98%C3%A7%1C%C3%A1%C3%94%C3%80%C2%88%C2%A4%13r%C3%97%C3%A8%19%C3%B2%C3%827%C3%90%C3%8B%C2%A5%C3%9Ae%04%0E%C2%8D0%C3%A6%C3%86a%C2%AEN%0F%C3%894%3D%5C%C2%B8%C3%B8%3E%16%C3%A3%C2%9C%C2%AF%60%C3%95%C2%81%C3%AC%C2%8B%C3%9F%C2%BC%5Bn%191E%24%C2%93%C3%B4%C3%B4a%C2%AE%1F%C3%81.%C3%AD%13%C2%87ijK8%C3%A7%C3%A3%C3%A3%C2%B3%C2%B7%40tk%C3%AC%C2%BAj%C3%967%C2%94V%17%C3%87%C2%9A%C2%B2%C3%A2%C3%94%1EH%C2%B4%C3%B7%C3%B3%C2%B2%C3%8F%5C%0C%C2%91n%C3%82%C2%B73%C2%B2o%C3%9E%12%C3%B9%C3%A3%C2%9E%7F%C3%88%13%C3%87%3E%C2%94%C2%9Ap%C2%A9%C2%9C%04%08q2X%C2%9D%1FtZ%00P%23*c%2319%02%C3%80%C2%BF%C2%9A4%5B%C3%AE%C2%AA%C2%9F-%C3%93%C2%B7%C3%BCV%C3%A2%C3%A1%C2%98%C2%B0%C3%A3b%C2%94%C2%82%C3%B1%C3%B1%C2%BD%7DQy%15%C2%96o%1Co%C3%ABK%C3%96%C2%9D%5C%C3%90%C3%90%23y%C2%9C%C3%8C%7Fa%7B%C2%B9%0B%C2%85!%1E.%C2%99%C2%8B%5E%C2%A26%C3%99%C3%91%C2%86%C3%BD%C3%82%23%C3%99%0F%1A%C2%B9%3CO%13p%3D%C2%BC%C2%B7%2F%C3%9B%26o%1D%C3%98-%0B%C2%A7%5D%2BO4o%C2%96xd%C2%BA%C3%BCt%C3%8C%C2%952-%3EZj%C2%8A%C3%8A%C2%B1%C2%97Bb%C2%A1%C3%B2%C2%9C%C3%A8%C3%AD%C2%92O%3B%C2%8F%C3%8A%C2%9F%C3%9A%5B%C3%A0%C3%99%0E%C3%B9%5E%C3%9D5%C3%B2z%C3%93v%2C.%2B%C3%95%C2%BA!%C3%8D9%C2%9BUc%10r5%C2%B6%085%C2%95%C3%95%C2%B5q%3B7%C3%B7%C2%A4%C3%88%C2%AB%3EN%05%C2%9A%C3%BD0%C2%A5%10%C3%A5y%C2%AE%0EO%C2%A2%C2%97%C3%80%C3%91%7C%C2%9A%C2%AE%7CX%C2%90%C2%97%C2%8E%C2%8C%2F%19)%C2%BF%C3%B8x%C2%9D%7C8%C3%BEq%C3%99s%C3%87J%19%15%C2%AB%C2%94%C2%9AX%7C%10%C3%A3%C3%9E%C3%90%2F%C2%BB%C3%9B%C2%A5%C2%BD7!%7DVZ%1E%C3%BBt%C2%83%C3%94UM%C3%87%C2%86dD%C3%B8mp%C3%BA%C3%97%01%5B%03%C3%A2%C2%A8%C3%96%C3%99s%C3%89%3C0%C2%BE%C3%AA%C3%A34)%C3%B3%C2%8E%C3%96%C2%A0%C3%B6%10%18gY%C3%99%C2%AC%C2%A0%C3%B9%C3%91%C2%B0%01O%0F%19F%26%C3%A2%C3%B0%3E%08%C3%83%C2%AC%C3%98%5BnX*%C3%93FN%C2%90%C2%88%C3%89%C2%8C%C3%B5%08%C2%AD%C2%A7%17%12%7F%00%2BE%C3%AB*%C2%A3%C3%8A%C2%AA%C3%94%C2%95%C2%B22%C2%B2%C3%B9%C3%BA%C2%87%C3%A5%C3%96%C2%9D%2F!mB2%C3%9E%C2%88%C3%88alN%C2%B6%04~%C2%8A%C3%B0%C3%8E%5E%C2%868%C2%88%07s%C2%B3%C2%A8N%C2%95c%C3%A0%C3%95%C3%95'%12%06F%C2%AD%7F%C2%ACF%C3%93%C2%B5%C2%89l%2Fa%C2%B5%7F%5E%60%C2%84%C2%BD%C3%828%C2%8D%C2%80Sri%C2%B8DZn~Xn%C2%AA%C2%9F%C2%A5%00%3B9G%14X%C3%B0%11%C2%A0%0E%C3%97%14.%C3%A64%C2%88%C3%B3%C3%A4%2B%0AE%C3%A4%C2%96%C3%A9%C3%97H3%C3%A4'%C2%98%00%C2%8C%C3%AA%C3%83%C2%8D%C2%AAz%11%C3%85%19%C3%BCq5%C3%A2!.%C3%A2S3%C3%B8%C2%A4%C3%93e%C3%BAg%0A%60%C2%89Y%3A%12%C2%83q%C3%B6%C3%83%20%C3%8F%C2%92%C3%A2%C3%B2~X5%C2%BE%40m5%C2%8C%C2%B0%C3%BC%C3%BD%C2%A6%07dR%C3%95%C3%A8%02P%03%C2%B9I%C2%B0%C2%BE%C2%A7%02b%C3%AA%C2%91%C3%A3%C2%9C'%1F%09%C2%AD%C2%B6%5C%5C3V%C3%BE5%C3%B7%01L%18r%04y%5D%C2%9D_%C2%9Cb8%C3%B5%C2%A3%C3%A7%C3%B1%C3%84%C3%B3%C3%B8%C2%84x%01%C2%8E%C2%9F%C2%A0%08%C2%87%C2%A3%C3%85%C2%B5%C2%90%C2%A9%1A%C3%B8S2%C3%9EVT%C2%A7%18%C3%82%25%C2%99%C2%84%C3%BC%C3%A7%C3%9A%1F%C3%89%C2%98%C2%8A%1A%C3%B2%C2%A9%5C%C3%BC%C3%9D%07%1B%C3%A5%C3%A9%7F%C2%BF%C2%82%0507%C2%99%19%C3%BD%C2%A1%C3%B3%C3%8D%1B%17%C3%B9%C3%83%C3%B6%C3%97%C3%A5%C3%89%C3%B7%5ER%3C9%C3%88%C2%8F%C2%AF%1C%25%C3%9Bg%C3%BF%10%C3%A5%C2%A3%0B%C3%A5%C3%90%C3%80i%C3%A9%C3%A9%08%C3%9A%C3%A7%07%05q%11%C2%9F7%3E_t%0F2_%5D%7CV%20%C2%AF%C3%A8%C2%86%40%C3%99%60%C3%98.B%1E%C2%B7%C2%A4%3Ad%C3%A5%C3%85sd%C3%A6%C2%B8%C2%A9%0A0w%C2%87%C2%85p%C2%BFxt%C2%8F%C3%BC%C3%B9%C3%A8'%C3%82%1EEQ%7F%C3%8Ct%C2%AB%1Afj%C2%BCvl%C2%AF%3Cz%C3%A4%23%C3%89%C2%82%C2%97%C3%A9%C3%83%C2%85_%3Dq%C2%86%C2%AC%C2%98%7C%C2%9D%C3%AC%C2%87%C3%BEI%C2%B03%20M4%C2%85%C2%87%0E%23%3E%10%C3%B1%C2%9A%C3%AA3%C2%9FC%C3%B8%08%C2%A5%01%7C!qN%01%C3%A7%0FO%C2%B1%147%17%C2%822%1F%C3%A5%C2%8DD%16z4%C2%8CSm%C3%BB%C3%AD%C2%8F%C2%A81%C2%968%C2%AE7%2F%C2%AF%C3%86%3C%5E%C3%A5%081%C2%91%06%2F%C3%9F%C3%B2%C2%A0%C3%A2%C2%89b%C3%A3*%03%C3%8A%C2%94%C3%88%C3%9D%C3%93%C2%BE%25%C3%8B%0F~%C2%80h%09%0E!%C2%AF%C2%9F%C3%89%2B%C3%A0'%1B%C2%8C%C3%81%1A%C3%B1%C2%81%C2%88%17%C3%A9%C3%A1%C3%81F_%C2%9Bp-%C3%94L%C2%BA%00%C3%84b%C3%84%C2%AB%16%C3%86%C2%8Ee%C2%93%C3%B2%C3%B3%113dBU-%C2%A7%140%C2%AFL%C2%B9RVT%C2%A2..b%20%60%C3%85%C2%9C%C3%A7%C3%A7%7CY%C2%B4D%C3%8A%C2%8BJ%C3%B1%C3%A4%C2%A5%C2%81%C3%8F%3F%C2%B9z%C2%B4%C3%9C%5B%5D'%C2%87%C2%AC%1E%19%0D%7BLG%C3%9A%26%11%0Fq%11%C2%9F7%C2%B2%01%C2%A0%C3%B7%C3%8E%C3%A0%C2%A2%25%C2%97%C3%A88%01O%25Lx%C2%8C~G)Q%C2%8D%11%C3%81%09v%C3%B8%C2%AC%C2%9A%C2%89%C3%98Lh%C2%8E%C3%90%C2%A4%22%C3%8DThy%C2%B7%11v%5E%C3%BE%18C%3E%C3%985%18%C2%AF%3F%C3%86V%C3%B4%C2%9A%C3%AAI%C2%B0%C2%93%C3%82A%C3%A3u%C2%8F%C2%B4OX%C3%84C%5C%C3%84%C3%87%01%C3%A2%C3%95%C3%95_~%C3%B0%7Ch%C3%91%C3%AF%5B%C2%B1%C2%99%0E%C3%85%C2%A2Q%C2%99%C2%A0%C2%87%5C6CI%C2%A4E%1Cy%26%C3%98%C3%9DS*%C3%87(%19%C3%930%C2%B8%C3%BA%C3%82%C3%85%C2%B0%C3%B3%0A%C2%8E%7D%C3%95%C3%B3%60%C2%BC%1C%23%C3%95S%C2%BFcI%25%C3%AC%C3%B5%C3%80n%2B%C3%9A%C2%81%C3%B1%C2%BA%C3%A9%12%0Fq%11%C2%9Fb%C3%84_%C2%AATM%C2%9F%C2%BF~%C2%BD%C2%B1a%C3%81%02'%C3%AA%C2%B8%C2%BB%C2%8F%C2%9A%C3%86em%C2%99%C2%84%7B%7D%C3%A9(y%3F%C3%9B'%3B%C3%BB%C3%9AD%C2%A2%15%C2%B2%C3%ADh%236%C2%90%25i%C3%9B*%C2%A4%01SR%C3%A5f%C3%A0N%C3%85%C3%BE%18%C2%9F%C2%83%C2%A4B%C2%8A%01_%C2%8Es%C3%9C%07Qxs%C3%87%C3%B1f%C2%B4%C2%90%15%C3%B2_%C3%9AC%1F3'%12%C2%97%C2%B7%7B%C2%BEtG%C2%84FIm%C2%9F%C2%B5%1B%C2%AC9%C2%85S%5B%C3%A0%C2%A8c%7CC%C3%8D%5E%C3%AA%C2%91%C2%8F%7B%12%5B%C2%AF%C2%AB(%C3%BB%C3%B1%C3%93s%C2%97%C3%A8Sk%C3%86%C2%B9i%2B%C2%AB%C3%BDu%C3%8F%C3%9B%C2%B2x%C3%AFf%C3%B9%C2%A2%C2%AFS%22'%0FK%16%5EW)C%C2%81%0B%40%C3%8C%C3%AF0%C2%BC%7B%24%C2%85%C2%94EN%3F7%C3%BD6%C2%B9%C3%BB%C2%B2%1Bx%08%C2%B9%C3%BB%C3%9A%C2%8E%C3%A8%C2%8B%1B%C3%9F%C2%92%0FzZ%C2%B7%C3%92%C2%94%C2%8F%C3%933%C2%BB~%C2%BE%C3%9Fg%C2%8C%C3%9C%C3%BB%C3%A5A%C3%A66%09_%C3%BC%1E%C3%8D%C3%9D%C3%B8k%C3%B7%C3%BD%03%1F%C3%BB%C2%AF_%C3%8B%7Dk%C3%93N%C3%B7%C3%A6W~%13%C3%94%C2%AD%C3%AC%7Fr%C3%BCs%C3%A62%0F%3E%C2%91%3CN%C3%A5iY%C2%B0%C2%81%0Ch7%C2%B4%C3%96%C3%89%15%C2%A36b%C3%BA~%C2%BC%3B%C3%88%25%C2%9D%C3%B99%7F%C3%AC%C2%A5%C3%92%C2%95%C3%AEQr%C2%AC%C3%87%C3%B9%02%C2%A3%C3%9E%C2%87%C3%BB%C3%83C%C3%86%C3%84FL%40%C3%BF%C2%9Dc.Q%C3%AA%C2%B8%C2%91%C2%B1%C3%A9%1D%C3%A0%C3%91%C3%AB%C3%A3c%5E%C3%81%60k%1E%C2%9F%3A%0C%C3%94%16%C3%8D%1BVUf%C3%AB%C2%B6w%C2%9F%C2%85%C2%90%05%01UF8%C2%87f%5B%1D%C3%83%C3%AA%19%C2%BBZ%C3%B5%17%17%C3%AA%C3%AEUX%C2%A53%C2%90v%C2%AC%C3%8F!8%C3%8D%C3%9E%C2%B6%7B%C3%A7%C2%B3A%7C%7C%C3%B6%3C%C2%8D%070%C2%81%07%7F%C2%95%C3%93%C2%B4O%C3%9B%13%C2%9D%C3%8FU%C2%96U%3C%C2%88DgA%0F%C3%BB%1B%C2%88%02%C3%81g%C2%BE%0F%C2%97%C2%B0%0F%C2%BD%C2%9D%C2%A9%14y%C3%9A%7D%C2%BB%C3%9D%C3%89%C3%84%C3%B3%C3%9F%C2%9E%3D%C3%BB%C2%93%3C.%C2%96oEAOs%40IU%C3%8D%C2%B9%C3%BA%C3%B1%C2%AC%C2%95%3D%C2%844%C3%A0%C3%91I%C2%AF%2B%C3%A6%C2%AF%C3%B3Ga%C3%B7%C3%ACX%C2%B4%C2%9B%C3%89f%0F_%7D%C3%AF%C2%9D%2B%C3%B26%C2%BD%C3%95%C3%A4_%C3%BA%C2%81%C3%B6%C2%BD-%C2%BB%C2%9A%C3%9A%1A%C2%9B%C3%B7%C3%9F%C2%9F%C3%A7%0999%C3%9B%3F%C2%A0%C2%BE6%C3%9Ct%0B%C3%92%C2%92%C3%9EdZJcs%C3%B3%7DMo%C2%BC%C3%93%C2%96%C3%B7r%3F%C3%BB%C3%BD%40%C2%93%19%C3%80%C2%B9)%C2%8D%C3%8Bg%C3%8Cx%C2%B3%C3%A5%C2%8B%C2%83K9%16%C2%89%14!%C2%B1%C2%B5Bx8v%C3%A1Is%22%C3%A1%C2%A8%C3%82%C2%B3%C3%AF%60%C3%8B%C2%92%2B.%C2%B9d%C3%8B%C3%80%C2%B4%C3%B0m%16r%C3%9A%1F%C3%A0%3D%C3%AFql%60%C3%ADwNo%C2%A6%3CZV%C2%B6%1C%07*%C2%A7lDpP%19N%C2%9E%0F%C3%A53%C3%8F%C2%96P%C3%88%C2%8C%14%C2%87%24%C3%9B%C3%93%C3%970u%C3%92EO%030%C3%AD%C3%B7%C3%B3%C3%B0%C2%90%C3%BA!%C3%84%C2%B6%C3%90K%C3%A6g%16-%C3%9Dq%C2%B4%09%C2%AF%C2%AC%C2%83%C2%B9%0C%C3%8A%147%C3%AD%C2%B0%C2%89z%C2%A8%C2%8F%C2%8A%C3%9E%3F%C2%8C%C3%BFPz%C3%A6g*%C2%B2x%3De%7BH%C2%A4%03%18%C3%B2%C3%82*d%C3%AF%C3%AD%C3%98v%7B*%C2%93%3ED%03y%C3%8A%C3%A2%C3%8ET%3A%C3%97%05%C2%90%C2%9Fr%C2%94W%C2%94%C3%8Ed%0ES%3F%C3%8Dc%C2%80%C3%B6%C2%86%C2%BD%C3%B3%C2%B9j%C3%AF%C3%84%C2%9C%2C%C3%A3%C2%BF%3C%C3%99%C3%BA%C2%BCe%C3%9B%C3%B8Cg%C2%81l8%C2%8C%C3%AF%16%C2%BE%03%C3%95%22%02%C2%81%20%40%C3%A5P5%C3%AF%C3%B1%C3%A1%0FH%1E9%C2%8Ec%C2%9Dlo_%3D%C3%B3%C3%86%1B%C3%87%C3%A7%01%C3%93%C3%8E%C2%B0%01S%C2%97%22%C2%98%C3%B1%C2%8FzY%C3%BB%C3%9Ak%C2%B3O%C2%B4%C2%B5%C2%AD%C3%81%C3%B7%5B%C2%BB%0F%60%C3%80%C2%9D%C3%A0%C3%BDk%C3%80%14V%07%C2%B9%C2%B6%C2%8E%C2%8E5%C2%9B%C2%B6l%C2%9A%3D%C2%98~%7F%C3%AC%C2%82%C3%9Ca%5D%C3%A7%C3%A5%2B%7B%7C%C3%A5%C3%8Ai%C3%BB%5BZ%1E%C3%A8%C3%AC%C3%AAz9%C2%95N%C3%AF%C2%B3m%3B9%10!%C2%BC%C2%8F%1E%C3%9E%C3%AE%C3%AEK%C2%A5%1A%C3%9B%3B%3B74%C2%B74%2F%C2%A6%C2%9C%C2%AFc%C2%A0N%7F%C3%BCL%C3%B7%C3%B3%0A%05%0CQ%0E%C2%9B%C2%BB%C2%B0%C2%BB%C2%B9%C2%90%C2%9A5k%C3%97%C2%8C%C2%9E%3Cv%C3%B2%C3%88%C3%A2%C2%8AXy%14%C3%95%20%0D%C2%97%26%3A%C2%BB%13%C3%BF%3B%C3%90%C3%98%C2%BA%C3%B8'%C3%B7%1D%07%0F%C3%BEP%C3%A4%7D%C2%94%C3%A4%17%C3%8F%C3%A3%C2%BA%C3%9F%C3%81%C2%81%C3%B9!%C3%A9%C2%BC%40%C3%BBZ%C3%B3%C2%86%C2%A9%23w6%C3%86%C3%B3%C2%8B%C3%A5%02%09%C3%B6%C3%9C%C3%8A%C2%99o%14%C3%B7a%C2%81%0E%C3%AA%01%C2%A0%C3%80k%3F%C2%BD%C2%85%09%00%25O%C3%A1%3D(p.%C3%8F%C3%BF%07%14H%7CM%1D8%C3%93i%00%00%00%00IEND%C2%AEB%60%C2%82";
var androidIcon = android.add("iconbutton", undefined, File.decode(androidIcon_imgString), { name: "androidIcon", style: "toolbutton", toggle: true });
androidIcon.preferredSize.width = 45;
androidIcon.preferredSize.height = 45;

var androidName = android.add("statictext", undefined, undefined, { name: "androidName" });
androidName.text = "android";

// MACOS
// =====
var macos = platforms.add("group", undefined, { name: "macos" });
macos.orientation = "column";
macos.alignChildren = ["center", "center"];
macos.spacing = 0;
macos.margins = 0;

var macosIcon_imgString = "%C2%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00-%00%00%00-%08%06%00%00%00%3A%1A%C3%A2%C2%9A%00%00%00%01sRGB%00%C2%AE%C3%8E%1C%C3%A9%00%00%00%C2%84eXIfMM%00*%00%00%00%08%00%05%01%12%00%03%00%00%00%01%00%01%00%00%01%1A%00%05%00%00%00%01%00%00%00J%01%1B%00%05%00%00%00%01%00%00%00R%01(%00%03%00%00%00%01%00%02%00%00%C2%87i%00%04%00%00%00%01%00%00%00Z%00%00%00%00%00%00%00H%00%00%00%01%00%00%00H%00%00%00%01%00%03%C2%A0%01%00%03%00%00%00%01%00%01%00%00%C2%A0%02%00%04%00%00%00%01%00%00%00-%C2%A0%03%00%04%00%00%00%01%00%00%00-%00%00%00%00%C2%B5%C2%92hS%00%00%00%09pHYs%00%00%0B%13%00%00%0B%13%01%00%C2%9A%C2%9C%18%00%00%01YiTXtXML%3Acom.adobe.xmp%00%00%00%00%00%3Cx%3Axmpmeta%20xmlns%3Ax%3D%22adobe%3Ans%3Ameta%2F%22%20x%3Axmptk%3D%22XMP%20Core%205.4.0%22%3E%0A%20%20%20%3Crdf%3ARDF%20xmlns%3Ardf%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%22%3E%0A%20%20%20%20%20%20%3Crdf%3ADescription%20rdf%3Aabout%3D%22%22%0A%20%20%20%20%20%20%20%20%20%20%20%20xmlns%3Atiff%3D%22http%3A%2F%2Fns.adobe.com%2Ftiff%2F1.0%2F%22%3E%0A%20%20%20%20%20%20%20%20%20%3Ctiff%3AOrientation%3E1%3C%2Ftiff%3AOrientation%3E%0A%20%20%20%20%20%20%3C%2Frdf%3ADescription%3E%0A%20%20%20%3C%2Frdf%3ARDF%3E%0A%3C%2Fx%3Axmpmeta%3E%0AL%C3%82'Y%00%00%0A%C3%81IDATX%09%C2%BDY%5Bl%1DW%15%C3%9D%C3%B3%C2%BC%C2%8F%C3%987v%1C7%24mCi1%C2%8D1%C2%A5%0D1j%11I%2B%23%5E%15HDV%C2%9A%16%09%3E%C3%8AG%C3%B8B%02%C2%A1%26%C3%A9%07%C3%B4%C3%82O_%C2%AAP%C2%85%C3%B8%20%1F%C2%8D*~%C2%9A%C2%A62%01%15%C2%85J%15%C2%A1yH%C2%95H%08%C2%85%C2%A4I%C3%AAF%02T*d%C3%87%C2%8E%7Dm%C3%9F%C3%87%3CY%C3%AB%C3%8C%C2%8C3c%C3%9F%C3%AB%5C%C3%B7%26%1C%7Bf%C3%AE%C2%9C%C3%99g%C3%AFu%C3%B69g%C3%AF%7D%C3%B6%C3%91d%15%C3%A5%C2%91W_5%C2%86%C3%BA%C3%BB%C2%B5%C3%B2%C3%88%C2%88%C3%87fa%18j%C3%BBN%C3%BD~%C2%9B%04%C3%81vMd%1B%C2%AA%06B%C2%91~%3C%C3%BBp%C2%95%24%C2%94%0A%C3%9E%C2%A7uM%26%40%C3%BB%C2%BE%18%C3%9Ai%C3%9F%0BNu%C3%BF%C3%B9%1Fg%C3%8A%C3%A5r%00%1A)%1F%3Bf%C2%9E%C2%9F%C2%9C%0C%0F%C3%AF%C3%9E%C3%AD%C3%B3%C2%BD%C2%9D%02Ym%14%C2%80%C3%9Bs%C3%A6%C2%80y%60%C3%B8%C3%BB.%C2%A9%C3%B7%C2%9E%C3%BC%C3%9D%C3%9D%12%C3%BA%C2%8FK%C2%A8%C2%8D%1A%C2%A69%60%15%0B%C3%AC%C2%81%04%C2%9E'%C2%81%C3%AF%C3%87W%20%C2%BA%C2%A1%C3%A32%C2%A2%C3%8B4E4M%C3%9CjM%7C%C3%8F%1BGg~%C2%AB%C3%A9%C3%BAK%C3%8Fm%C3%BF%C3%96%25%C3%B2%C3%9Cs%C3%BA%C3%97%C3%96%C2%81m%7B%3C%C3%90%C3%A0%C3%93%C3%8A%C3%A5%C2%BA%C2%A0%C3%8B%C3%87%C3%8Afy%C2%A4%C2%AC4%C3%BB%C3%A3c%C2%AFm1%0C%C3%B3)%20%7C%C2%ACP%C3%AA%16%C2%B7%C3%9E%10%C3%97qB0%C2%895%2F%3AdB%C2%AA%06xB%C3%A9%C3%B8%06%1D%C2%A3%0A%15J%C2%B3%C2%A83-%C3%9B%C3%96%C2%AC%7CNj%C2%959%C2%A2%3B%C3%A4%C3%BB~%C3%B9%C2%85%C2%91%5D%17%C3%B9%C2%92%C2%96%C3%87%C3%B7feE%C3%90%C2%AA%C3%B7%C2%B1v%C3%B7%C2%9D8%C3%B24%04%C3%AE%C3%8Fw%C2%AD%C2%91%C3%BA%C3%9C%3CF%3Et%C3%91%C3%98P%C3%AA%C3%83%C2%AD%19%C3%B3%16u%C3%AC%0B%C3%86E%7CM%C2%80%C2%BD%1B%C3%BC%C3%A6%C2%ABd%C3%B0%C3%8C%C2%B3%3Bv%3E%C3%896i%C2%B9%C3%8Dx%C2%B4%14%C2%B6%C3%A7%C3%B4i%C3%AB%C3%80%C3%B0%C2%B0%C3%BB%C3%A4%C2%89%C2%B1O%C3%B9%C2%A1%C2%8C%15%7B%C3%96%0EUg*%C3%A0%11b%C2%8Ah%18%C3%ABU%01m%26%C2%9Bu%C3%AC%00FI%C2%B3%0AkKR%C2%9B%C2%9D%3Boh%C3%81%C3%A8%C3%93%3BF%C3%9FK%C3%A47k%C3%98%14t%C3%92%C3%A0%C2%89cc_%C3%87%C2%80%C2%BF%C2%9E%2B%C3%A6%0D%C2%A7Vw%C3%80%C3%80%C3%82%C3%95%C2%B4M3%C3%A6%C2%AB%C2%A8%03xq%C3%ADB%C3%9EnT%C3%AB%C2%BE%C3%A8%C3%A17%C2%9F%C3%9F1%C3%BA%C3%87%04%C3%87R%3E%C3%8B%00%24%C2%84%7B%C2%8F%1F%C3%99e%C3%A5%C3%AC%C3%83%C2%9E%07%C3%85%C3%BA%C2%81kj%C2%BAE%C3%8E7%C2%AB%10%C2%88%17%06%C2%AE%18%C2%BAe%C2%9A%C2%96%C2%B8%0D%C3%A7%C2%91%C3%A7%1E%C3%9C%C3%B9Z%C2%82'-7%03%3A%C2%99K%C3%94%C2%B0%5D%C3%8C%1Fu%1B%0D%C2%A8U%C3%B3%C3%81%C3%8C%C2%98v%C3%B9%1B%25%C3%93%22%C3%8Dj%15%C2%BF%C3%99%7B%C3%B2Ii%C2%81%3F%C3%97Y9%C2%B14%C3%9D%0F%244%C2%AC%5CN%1C%C2%A7%C3%BEp%C2%A4qX%C2%96xmQ%C3%8A%22%C2%84d%C3%95r%0E%7B%C2%81%C3%B6%C2%AEn%C3%AA%C2%86%C3%B8%C2%A1_%0B%3C%C2%A3%C3%8F%C3%8A%C3%8B%C2%976%C3%9D%25%C3%9Dv%3EZB%C2%99%C2%96%7CI%C3%8A%22%C2%BB%C2%A4%C2%A2%C2%8D'l%0D%C3%BE%C3%A6%C2%9C%C2%BA%C3%BC%C3%A9%C3%83%C3%8B2%C3%A5%C3%96%C2%A5%C2%A0%C2%9B%3El%C2%BA%11x%C2%81o%C3%AA%C3%A1%C2%A79%C3%87%13%7Cd%18I%C2%81MJ%C3%AC%C3%A3%C3%9E%C3%A3c%C3%A7%C3%ACBa%C3%88%C2%AD%C3%95%5D%2F%0C%C2%AD%C2%92i%C3%8B%0F%C2%B6%3E%24%C2%BD%C2%85%C2%AE6%00tFr%C2%B56%2F%C2%BF%3C%C3%BB%C2%96T%3CGLMs%C2%ADB%C3%9Erj%C2%8D%C3%B3%C2%98%26%C2%9FQ%C2%9Cc%C2%9C%C2%B4%02%C2%A2%1C%07%16%02%C3%8DZ%C2%BE%C3%94%3DT%C2%9B%C2%AD8%18%26%7B%C3%82%C2%A9%C3%8A%C3%8E%C3%8D%C2%83%0A%C3%B0%C3%B4%C3%8C%C2%AC%5C%C2%B88.%C2%BA%C2%AE%C2%B7%40%C2%A6%C2%89m%C3%9B%C2%89%1AZ%C3%90%2C%C2%AF%C2%A6%C3%96%C2%82%20%C2%94O%C3%9E%C3%B5q%C3%A9%C2%85%C3%AD%C3%A7%C2%88%C2%BEt%C3%B9o%C2%B2)W%04%C3%A0%C2%BA%03%C2%AB2D%5C4%C2%87%09N%C2%93%C2%AE%C3%B9%C3%80%C3%B0n%C2%97%C2%8E%03%C3%B3j%3F%00%C2%93%C2%B3Ztd%C3%88)%C3%81B%C3%80%C3%9B%C2%BF%C3%B0C%C3%B9%C3%ACW%C2%B6%C3%88%C2%87%C3%B3%0D%C2%8C%C3%9E%C2%B5%C2%A9%007-%C3%B3%C2%AE%2F%3B%06n%C2%95%C3%B5%C3%ABJ%02g%C2%81%16%C3%97%C2%BE%2B%06-n9%C3%9B%C2%94%0B%C3%BF%C2%9A%C2%94%17%7F%C3%B2%3D%C3%B9%C3%BC%C3%96%7B%C2%94%3C%C2%B6%C2%8C%C2%A7%C2%BB%C2%A5%C3%B0h%C3%9A~%C3%A0%7B%C3%B9%C2%85%C3%A1%5D%17%C2%89%C3%97d%2Cq%18D%C2%86n%C2%94%C3%B3%5DE%3A%0E%C3%9Aa%C2%9A6U%02%C2%BA%01%14j%C2%98%C2%80%C2%B7%0El%C2%92%C3%81%06%C2%AC_%0A4%C2%85%C2%90%C3%8E%00%C3%8D%C2%86%C2%BER4%1Aq%3B%C3%95%C2%B8%C3%85%C2%8D%C2%9Cm%13%C3%BE%09%C2%85mY%C3%A0%C2%B4%C3%943%C2%BE%C2%81u%C3%A8%C3%82%C2%A1Y%C2%8D%C2%B9%C3%AAS%C2%A8%C3%BB6%C3%B1%C3%82E%C2%8Fx*%C2%96%08%C2%82G%C3%ABs%0B%C2%A8W%C2%8Ec%C2%B1!%01%25%C2%85%1A%26%C3%A0j%C3%83%5D%C2%A6G%3An%C3%8F%C3%B3e%C3%A2%C3%8A%C2%B4%C3%B4%C3%B7%C3%B5B%C3%9B%C3%B0%C3%9A%C2%A9%C2%8E%25%3C2%C3%8F%C2%B8c%0D%C3%87KAMK%24%C2%B5fF%C2%B8%C3%A41%C3%A0%2C%C2%97%C2%B7%C2%8F%5C%C2%8A%C2%BB%17%3E%C3%8EX%C2%82%C2%AE%C2%99T%19%C3%86%C2%A9%175%25%00%C2%84%04%04%C2%99%C2%BEHfBkWg%C3%A6%C2%A4%C2%81%C2%8Eqd%14%1Di%5B%5C%C3%ACTKad%18%15%C3%840%C2%A1K%7C*HC%C2%9D%C2%8E%10Q%C2%87%1D%1Be%C3%B0%03%06%C3%91X%25%C3%A4%7C%C2%B6%C3%815!%C2%A7b9M%C2%A6%C2%AE%C3%8E%26U7%C3%A4I%5C%C3%84%C3%87%C2%A8%C2%92%C3%91%C2%97%5E%C3%BD%C3%B2%C3%96%C3%8F1%C2%BCd%C2%B4F%C3%BDu%22%C2%85%C2%A3m%22%1C%C2%AD%20%00%C2%AA%22%04%C3%95%C2%B1BUh%C3%94%09S%C3%95%16%C3%B6%0F%C3%B8%C2%88%C2%93%C3%B1%C2%BB%C3%8E%00%C3%9E*%C3%A6%C2%A9P%C2%86%C2%97%1D%C2%81%26%7F%02%C3%A7%C2%A0_%C2%99%C2%9EQ%C2%A6L%05%C2%A9JpG7j%C3%93%23N%C3%A2%C2%A5%C2%B5%C3%9A%C2%96Z%05%1DqN%1A%1B%C3%90v%15%C3%83YA%08%C3%8B%C2%B9%7Dc%C2%B4%0D%C3%AEJ!%02Mc%C2%8B%C3%84%1D%074%C3%94%C3%8Ak%24X%C3%9A~%12%24M%18%C3%A7%C2%B6%C3%ABzj%C2%9A%C2%B4%C3%9D%C2%B8%05!%C3%B1%11'%C3%8A%C2%80%0E%C3%B0%C3%BD%C3%9C%22q%C3%87%C3%91%C2%82%C3%BE%23US%C3%83%04%7C%15%C3%8EJ%C3%93%3A%C3%976%C3%B1%11'%C3%B1R%C2%BB%7D%C3%91Kg%C2%8Bpi%C3%8F%C2%94%C2%B6%C2%B1%3F%C2%9C%C2%99%C2%9D%C2%93%3A%C2%A6%0A%3B%C3%91I%C3%A1%16%C2%8E8%C2%81%C2%BA%C2%8F%C2%9CJ%01%1C%01%C3%94%7CC5M%C2%80%C3%97L%C3%A0L'xU%5B%C3%A2%23N%C2%A0%2C%11t%C2%85%C2%BBf%C2%A8%1D%C3%BF%C3%AD%C2%96%C3%B6%C3%BAGKB%1387_%C2%93%C2%85%C2%85%C3%AA%C2%B2E%C3%99%C2%92K%C2%93%0F%C3%84G%C2%9C%40Y!%C3%A8)n%C3%B3iQ%C2%AF%07Y%C3%85!%C2%8A*%C2%8A%10%C3%B8%C3%B3%C2%BA%17%08h%C3%B6h%02%19H%C2%A5M%60K%C2%AB%C2%A2dd%C3%91%10%1Fq%02%C3%A8%C2%94%C2%89NM%C3%A2%C3%A5%C3%8Ex%C2%9B%C2%BF%C2%942%C2%A3%C3%BF%0Dkr%C3%82%C2%A8%C2%8C%C3%82%C3%9A%5D%01%C2%94O%C2%A0%C2%8CKj%C2%B5%C2%BA%C3%B4%C3%B6%C3%84Q%20%19%C3%A0%23%5D%C2%BFm%C2%A5%1Dq%13%C3%84T%0E%C3%92%10%C2%91r%C3%9DI%C3%86%C3%93%C3%A3%C2%BAi%C3%9E%0F%1E%C3%8CK%C2%A4%5B%2B%C2%A6%C2%89f%C2%A8%C3%A5so%C2%8Ec%C2%B8%C2%91.B%C3%A0%C2%84%04%07%C3%88%C3%9B%2F%1CG%C3%A3%C3%B2%C2%84%3C%C2%B0e%C2%B3%C3%A4s6%C3%9C%C2%BDJ%C2%83H%C3%8E2%C3%A5%C2%BD%0F%C2%A6%24DL%C3%8D%C3%92*%1A!%3E%C3%A0%24%C2%BEq%13%C2%A4g%40%C3%B9%1D%C3%95b%C3%89%C2%8Dlfk%C2%8C%C3%BCD%C2%86%06%07%C3%A4%C3%AD%C2%BF%C2%BC%18Y%C2%81f3%09%7Dh%25%C2%90%C3%AD9%C2%A1%C3%98%C3%8C%C3%84%10%C3%83%1D%C2%AB%C3%9FI%C2%BF%C2%83%20%C2%90%3B%3Fq%3B%C3%89%C2%94%C2%BC%08%C2%BEz%C3%8D%C3%9E%C2%A2%C3%819c%02%C3%85I%C2%B7ZW%23%15%C3%95A6%C2%8A%0FM%C3%B4%C3%A5%C3%B2r%C3%B4%C3%92%C3%9Fe%C2%B0o%C2%A3%C3%B4%C3%B7%C2%AC%C2%93%C3%BB%C2%87%C3%AF%C3%8B2%C2%B9%C3%81o%C2%933%C3%93J%5E_%C2%A9%C2%A0%C3%A4%C2%A7%C3%98%C2%AB%C3%BE%12'%C3%B1j%C2%98%C2%9F%1A%C2%B63%C2%97L%C3%9B%1E%C3%B0%C2%9C%06m%0A%17%C2%A7%C2%9A%C2%B7%C3%94JeaA%C2%8C%C3%89%19%C3%B9%C3%86%C3%A0VY%5B%C3%ACRQ%C2%9C%C3%AAU%C2%9A%23~3%1EX%C2%8F%1Dt%14%C2%90%C2%A6%3E%C3%A2'v%C3%97r%05%3B%7B%C3%8E%00%C3%95%C2%96%C2%B7X%C2%9D%7Cp%C2%AA%C3%8DV%C3%A7%C3%A5%0F%17%C3%8E%C2%8A%C3%9F%C3%9F%23%C2%A55k%C3%84%C3%8B%2C%C3%9A00%C3%AD%C2%9C%C3%AE9%C3%8E8%C2%B6%5Dwc%C3%BF%C2%A8%C2%85%7BO%1C%19Cnm%C2%9F%C3%AB4%C2%90%C2%AA%C2%8A%C3%9C%C2%B9Z%3ChH%06%0B%C2%90%C3%B6%C2%ABwN%C2%AA%C3%80%3E%25O%01%C3%A0%3BC%C3%B8%22%C3%BA%C3%BA%C3%9D%C2%8F%C3%9D%26E%0C%C2%BD%C2%B22%C2%A8g!%C2%A0*%C3%9C%C3%AFo%C3%BE%C3%BB%C2%81T1z%26Z%11h%C2%8CY%C3%B1%C3%A0o%C3%86%2Bwl%C3%9C%C3%94%04%C2%B0%C2%A2%C3%B5%C2%81O%C3%B7%C3%9C%C3%86%18%C3%B1%C2%AA%C2%8D-%C2%96%C3%B7A%24%03%C3%B7aNr%C2%9BE%1E%C3%84%12%C2%ADz%00%2Fvw%C3%89%3D%C3%9DH%C2%94%C3%86%C2%8BG%7D%03%09%01%C2%91%C3%90%C3%87%C3%A0%C3%A5%C3%A1%C3%B1%C2%866%C3%9E.9%C2%8C%C3%8ER%C3%90%0D%C3%B0%C2%B8%C2%AF%C2%B7%5B%C3%AA%C2%98%C2%BB%C3%9CHP%00i%22%C3%83In%C2%94%C2%A5%0B%C2%9DtV%C3%83%C3%AA%13S%05%C2%96JV%C3%AA%C3%86A%C3%96%C3%A8%C3%8C%0F%C2%ABtk(%C2%87%C2%98%0C%04f%15%C2%95(r%C3%9C%C2%A8qz%227%C3%B0%C2%91%01%02S%5C%04%C3%99%C3%80%C3%BB%C2%84S%C2%93%2B%C3%88W%5C%C2%AE%2F%C3%88%06%2C%C3%AC%1C%C3%B6%18%C2%9E%C3%AF%22zD%C3%8A7%C2%BE%C3%B8%C3%8Ez~'%1D%C3%A9%C3%99%C2%8E%C3%AD%C3%89'%C3%A1I%C3%BE%C3%8A3C%5E%C2%B6%C2%84%5E%C2%84K%7B%C2%858%C2%89W%25%C2%B4I%C3%A4%07~%19%C3%99%C3%8BG%013%C2%A3m%C3%85%20%C3%85%C2%87%3F%1Dhl%0D%C2%A6%C3%81%C3%B0%C2%BA%C2%8DJkEh%C3%B7%C3%9E%C2%B5%C2%BD%C2%92%07%C2%B0%C3%98r%C2%A9f%C3%89%C2%8D%C3%B3%C3%BD%C2%AB%C2%B7u%C3%89%C2%86%C3%99%C2%ABR%C3%A5%5C%C3%85%C2%87s%C2%B3%13%C2%B2%C2%80icc%C2%84%C2%A8yURr%C3%A2%1A%7C%C3%92%2CfU%7D%C3%9F%C3%BB%19%C3%AB%C2%98%C2%80WdI%3A%2C%C3%8E%7B0%C2%8D%C3%80d%23%C2%92%18%C3%8B%0B%1BPK%3F%C2%BA%C3%B7!%C3%99%C3%9C%C2%B3%3EC%C2%B0(%3CS%1B%C2%BD%2C%C3%85%C3%B3%C3%AF%C2%99%2B%C3%B2%C2%8Bw%C3%9E%C2%92%1C%12Y%2B%C2%B4s%C2%8A%3D%25%7Bav%C3%AE%C2%99%C3%A7%C2%99%C3%B7%60%C3%A2%1D%C3%A9%C2%B1%C2%88%17%2C%08%C3%A6%C2%81j%C2%9Bd%C2%98%C2%9CZ-%C2%93J%C2%A0h%12%C2%93%C2%88%1E%C3%B1%C2%A7%0F%3C%2C%5DqN%C2%84%C3%9FV%5B%C3%A61M~%C3%BE%C3%B6Q5%C3%BD%12%C2%BEY%1E!%C2%B2%C2%A8%05%24lj%C3%880%C2%8D.%C3%8F0%11p%C2%92%2B%C2%83%C3%83%1BE%C2%BA%C3%B5%5D8%00%C3%8B%C3%87%C2%AA%C3%80%14%5B%C3%B4%C2%92%04%C3%8C%C3%857%C2%8FL%C3%AA%C3%8B%C3%87%C3%9F%C2%90%2F%C3%9E%C2%B1%05%7B%C3%8DDOKu%C2%99%C2%85%10%C2%BDE%C2%B4%0C%C3%9DO%C3%BD%C3%B3%C2%A2%C3%94%0CO%C2%BA%2Cz%C3%87%C2%84GL%C2%85eC%C3%B9L%C3%BB%C2%9A%C2%BA%C2%8C%C2%B2V%C3%A1%C3%934%C2%B5%C3%9E2%C2%92%12%C3%B53k%C2%8A%C3%BD%C3%98Q%C3%98E%C2%BA%C3%97%2Cp%08%40bG%26%26'%C3%A4%3F%13%C2%93ba%3E%C2%B7%0C%7C%22%0C%C2%99%3B%17%C2%B6%C2%8By%7D%C3%AB-%C3%BDrK%7F%3F%C3%96%12%C3%82%C3%A2%C3%94%C3%A2%03%7B_%C3%935%03G%1C%C3%A2T%C2%915%1Da%C2%9E%C2%BAE%C3%964%C3%A1%C2%9C%C3%A4%C2%83%C2%99%C2%9F6%C2%91%C2%9F%C2%8E%0E%7F%C2%98%C2%A4%C2%BE%C2%96u%22-%C2%B7S%1AV%1Du%C2%94%C3%A9y%C3%82%C2%A8%C3%853%C2%A1%0F%C2%B1%3A%098%5BBW7L%0B1%C2%86x%C3%AD%C3%A6%C2%A7%13%06%09%C3%B0%7D%C3%87%C2%8F%7C%0DB%5E%C2%B7%0B9%C3%B3%C3%BFz%12%10%C3%A0%24%40i8%3ABIp%25O%C3%A5%C2%B2%C2%93%C2%97%C3%A4%C3%89%C2%B3%16%02%7F%C3%B6%C3%81%C2%9Do%C3%A0%0Cd%C2%88%C2%8B%C2%A1%C2%80U%C2%8C%C3%AFP%C2%AA%C3%8ABe'a%C3%92p%C3%B5O%C3%B0%C2%89%C2%B2Z%C3%85%C2%B5%25%C2%9Bi%5D%C3%A6%C2%A3W%02L%11%2B%C2%8Elz.%3D%C2%81t%2B%C2%88o%C3%82%C3%A9V%17N%C2%B7%16%08%C2%A4%C3%AD%C3%93%C2%AD%C2%A6%C2%9AN%14F%C2%9B%C3%88U%C3%8Bw%C3%9AI%1CZ%0E%22%19%C3%B8%0A%C3%9F%C2%8B%C2%A5%C2%92%C3%85%20%26V9s%C2%80.%17%114G%C3%BF%C2%A2%C2%AA%C2%A3'%C3%9EU%C2%BDD4%20d%3B%C2%B6'%C2%9Fze%C3%BE%10%C3%B9%26%C3%87q%C2%94%C2%97%3E%C2%AA%20%C3%8D%C3%92%C2%B2%C2%A2%C2%A6%17%C2%89a%C3%87%C2%97%C2%9D%C3%98%C3%BA8%C2%B1%C3%95%3E%C3%BA%C2%89-%C3%9A%C2%8E%C3%A1%3AxSNl%17%C2%81%C3%A3G%C3%9Bg%C3%A3%C3%98%C3%A6c%C2%BC%C3%95%C3%998%C2%9ES%C3%90%C3%8C%24%C3%8C%C3%A2%C3%BB%00y%C2%9A%C3%B1p%C3%B1%C3%8D%C2%B3%7F-wp6%C3%BE%3F%1AG%C2%93%00%C3%BA%04UP%00%00%00%00IEND%C2%AEB%60%C2%82";
var macosIcon = macos.add("iconbutton", undefined, File.decode(macosIcon_imgString), { name: "macosIcon", style: "toolbutton", toggle: true });
macosIcon.preferredSize.width = 45;
macosIcon.preferredSize.height = 45;
macosIcon.alignment = ["center", "center"];

var macosName = macos.add("statictext", undefined, undefined, { name: "macosName" });
macosName.text = "macOS";

// EXPORT_OPTION
// =============
var export_option = palette.add("group", undefined, { name: "export_option" });
export_option.orientation = "column";
export_option.alignChildren = ["left", "center"];
export_option.spacing = 10;
export_option.margins = [0, 5, 0, 17];

var cutAll = export_option.add("button", undefined, undefined, { name: "cutAll" });
cutAll.text = "Cut All Assets";
cutAll.preferredSize.width = 200;
cutAll.preferredSize.height = 30;

var cutSubgroups = export_option.add("button", undefined, undefined, { name: "cutSubgroups" });
cutSubgroups.text = "Cut Subgroups";
cutSubgroups.preferredSize.width = 200;
cutSubgroups.preferredSize.height = 30;

var cutSelected = export_option.add("button", undefined, undefined, { name: "cutSelected" });
cutSelected.text = "Cut Selected";
cutSelected.preferredSize.width = 200;
cutSelected.preferredSize.height = 30;

// OTHER
// =====
var other = palette.add("group", undefined, { name: "other" });
other.orientation = "row";
other.alignChildren = ["left", "center"];
other.spacing = 10;
other.margins = 0;

// ANDROIDRESOLUTION
// =================
var androidResolution = other.add("group", undefined, { name: "androidResolution" });
androidResolution.orientation = "column";
androidResolution.alignChildren = ["fill", "center"];
androidResolution.spacing = 0;
androidResolution.margins = 0;

var resolText = androidResolution.add("statictext", undefined, undefined, { name: "resolText" });
resolText.text = "android only";
resolText.justify = "center";

var resolList_array = ["XHDPI", "HDPI", "MDPI", "LDPI"];
var resolList = androidResolution.add("dropdownlist", undefined, undefined, { name: "resolList", items: resolList_array });
resolList.selection = 0;
// default this group to disabled, enable it when android is selected
// androidResolution.enabled = false;

// OTHER
// =====
var divider = other.add("panel", undefined, undefined, { name: "divider" });
divider.alignment = "fill";

// var LayerInfo = other.add("radiobutton", undefined, undefined, { name: "LayerInfo" });
var LayerInfo = other.add("checkbox", undefined, "LayerInfo");
LayerInfo.text = "Export Cut Infos";
LayerInfo.value = saveLyrInfo;

// Part III. UI LOGIC
// ========
// author: @weiwang; @guoxuanc

/*
*   NOTE:
*   - uncomment android inClick listerner would block display of Progress Bar contents
*     suspect of Adobe's palette display bug
*/

// android onClick listener
// disable androidResolution when android is not selected
/*
androidResolution.enabled = false;
androidIcon.onClick = function () {
    // if resolution is diabled, click android icon would enable it
    if (androidResolution.enabled == false) {
        androidResolution.enabled = true;
        }
    else {
        // if resolution is enabled, click android icon again would disable it
        androidResolution.enabled = false;
        }
}
*/

// Load config from UI
function loadConfig() {
    // init all config parameters
    resolution = [];
    platform = [];
    var platformBtns = [iosIcon, androidIcon, macosIcon];
    var platformChosen = [];
    for (var i = 0; i < platformBtns.length; i++) {
        if (platformBtns[i].value === true) {
            if (platformBtns[i].properties.name === 'iosIcon') {
                platformChosen.push('ios');
            } else if (platformBtns[i].properties.name === 'androidIcon') {
                platformChosen.push('android');
            } else if (platformBtns[i].properties.name === 'macosIcon') {
                platformChosen.push('macos')
            }
        }
    }
    if (platformChosen.length === 0) {
        alert('Please select at least one platform (iOS, Android, macOS)');
        return -1;
    }
    if (platformChosen.indexOf("android") > -1) {
        //['xhdpi', 'hdpi', 'mdpi', 'ldpi']
        if (resolList.selection.text === 'XHDPI') {
                resolution.push('xhdpi');
        } else if (resolList.selection.text === 'HDPI') {
                resolution.push('hdpi');
        } else if (resolList.selection.text === 'MDPI') {
                resolution.push('mdpi');
        } else if (resolList.selection.text === 'LDPI') {
                resolution.push('ldpi');
        }
    } else {
        resolution = [];
    }
    // statictext2.text = "working";
    platform = platformChosen;
    saveLyrInfo = LayerInfo.value;
    return 0;
}

// progress bar
function progress(steps) {
    var b;
    var t;
    var w;
    w = new Window("palette", "Progress...", undefined, { closeButton: false });
    t = w.add("statictext");
    w.active = true;
    t.preferredSize = [450, -1]; // 450 pixels wide, default height.
    if (steps) {
        b = w.add("progressbar", undefined, 0, steps);
        b.preferredSize = [450, -1]; // 450 pixels wide, default height.
    }
    progress.close = function () {
        w.close();
    };
    progress.update = function (val) {
        b.value = val;
    };
    progress.message = function (message) {
        t.text = message;
    };
    w.show();
}

// cutAll onClick listener
cutAll.onClick = function () {
    progress(100);

    progress.message("Load configurations...");
    $.sleep(200);

    if (loadConfig() == -1) {
        progress.close ();
        return;
    }
    progress.update(0);

    //exportAll();

    if (!outFolder.exists) outFolder.create();
    var savedState = app.activeDocument.activeHistoryState;

    // Stores saved layer info: name, coordinates, width and height
    var lyrInfo = "";

    // Define pixels as unit of measurement
    var defaultRulerUnits = preferences.rulerUnits;
    preferences.rulerUnits = Units.PIXELS;

    progress.message("Exporting files");
    lyrInfo += scan(doc);

    // Resumes back to original ruler units
    preferences.rulerUnits = defaultRulerUnits;
    // Writes stored layer info into single file
    if (saveLyrInfo && lyrInfo != "") {
        writeFile("ASSET NAME, COORDINATE, WIDTH, HEIGHT\n" + lyrInfo, originPath + "/out/");
    }

    progress.close();
    alert('Done!');

    app.activeDocument.activeHistoryState = savedState;

}

// cutSubgroups onClick listener
cutSubgroups.onClick = function () {
    progress(100);

    progress.message("Load configurations...");
    $.sleep(200);

    if (loadConfig() == -1) {
        progress.close ();
        return;
    }
    progress.update(0);

    if (!outFolder.exists) outFolder.create();
    var savedState = app.activeDocument.activeHistoryState;

    // Stores saved layer info: name, coordinates, width and height
    var lyrInfo = "";

    // Define pixels as unit of measurement
    var defaultRulerUnits = preferences.rulerUnits;
    preferences.rulerUnits = Units.PIXELS;

    var selectLayers = getSelectedLayersId();
    if (selectLayers == null || selectLayers.length == 0) {
        progress.close();
        alert("NO_LAYER_SELECTED");
        return;
    }

    for (var i = 0; i < selectLayers.length; i++) {
        progress.update(5);
        setSelectedLayers(selectLayers[i]);
        var layer = activeDocument.activeLayer;
        lyrInfo += scan(layer);
    }


    // Resumes back to original ruler units
    preferences.rulerUnits = defaultRulerUnits;
    // Writes stored layer info into single file
    if (saveLyrInfo && lyrInfo != "") {
        writeFile("ASSET NAME, COORDINATE, WIDTH, HEIGHT\n" + lyrInfo, originPath + "/out/");
    }

    progress.close();
    alert('Done!');

    app.activeDocument.activeHistoryState = savedState;

}

// cutSelected onClick listener
cutSelected.onClick = function () {
    progress(100);

    progress.message("Load configurations...");
    $.sleep(200);

    if (loadConfig() == -1) {
        progress.close ();
        return;
    }
    progress.update(2);

    if (!outFolder.exists) outFolder.create();
    var savedState = app.activeDocument.activeHistoryState;

    // Stores saved layer info: name, coordinates, width and height
    var lyrInfo = "";

    // Define pixels as unit of measurement
    var defaultRulerUnits = preferences.rulerUnits;
    preferences.rulerUnits = Units.PIXELS;

    var selectLayers = getSelectedLayersId();
    if (selectLayers == null || selectLayers.length == 0) {
        progress.close();
        alert("NO_LAYER_SELECTED");
        return;
    }

    lyrInfo += scanLayersList(selectLayers);

    // Resumes back to original ruler units
    preferences.rulerUnits = defaultRulerUnits;
    // Writes stored layer info into single file
    if (saveLyrInfo && lyrInfo != "") {
        writeFile("ASSET NAME, COORDINATE, WIDTH, HEIGHT\n" + lyrInfo, originPath + "/out/");
    }

    progress.close();
    alert('Done!');

    app.activeDocument.activeHistoryState = savedState;
}

palette.show();

//sentinel variable
var isDone = false;

palette.onClose = function () {
    return isDone = true;
};

waitForRedraw = function () {
    var d;
    d = new ActionDescriptor();
    d.putEnumerated(s2t('state'), s2t('state'), s2t('redrawComplete'));
    return executeAction(s2t('wait'), d, DialogModes.NO);
};

while (isDone === false) {
    app.refresh(); // or, alternatively, waitForRedraw();
}
