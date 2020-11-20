// Enables double-clicking from Finder/Explorer (CS2 and higher)
#target photoshop
// Makes Photoshop the active application
app.bringToFront()

/****************************************/
// prototype-function for array indexOf method, which is not supported in ExtendedScript
Array.prototype.indexOf = function ( item ) {
    var index = 0, length = this.length;
    for ( ; index < length; index++ ) {
        if ( this[index] === item )
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
var resolution;
// Sentient variable
var saveLyrInfo = false;
    
function exportAll(){
    if (!outFolder.exists) outFolder.create();
    var savedState = app.activeDocument.activeHistoryState;
	
	// Stores saved layer info: name, coordinates, width and height
	var lyrInfo = "ASSET NAME, COORDINATE, WIDTH, HEIGHT\n";
	
	// Define pixels as unit of measurement
	var defaultRulerUnits = preferences.rulerUnits;
	preferences.rulerUnits = Units.PIXELS;

    lyrInfo += scan(doc);

	// Resumes back to original ruler units
	preferences.rulerUnits = defaultRulerUnits;
	// Writes stored layer info into single file
	if (saveLyrInfo) {
	    writeFile(lyrInfo, originPath + "/out/");
	}

    app.activeDocument.activeHistoryState = savedState;
}

function exportSelected(){
    if (!outFolder.exists) outFolder.create();
    var savedState = app.activeDocument.activeHistoryState;

	// Stores saved layer info: name, coordinates, width and height
	var lyrInfo = "ASSET NAME, COORDINATE, WIDTH, HEIGHT\n";

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
	if (saveLyrInfo) {
	    writeFile(lyrInfo, originPath + "/out/");
    }

    app.activeDocument.activeHistoryState = savedState;
}

function scanLayersList(layers) {
    var lyrInfo = "";
    for (var i = 0; i < layers.length; i++){
        setSelectedLayers(layers[i]);
        var layer = activeDocument.activeLayer;
        lyrInfo += recordLayerInfo(layer);
        prepare(layer, false, true);
        saveLayer(layer.name);
    }
    return lyrInfo;
}

function exportSubgroups(){
    if (!outFolder.exists) outFolder.create();
    var savedState = app.activeDocument.activeHistoryState;

	// Stores saved layer info: name, coordinates, width and height
	var lyrInfo = "ASSET NAME, COORDINATE, WIDTH, HEIGHT\n";

	// Define pixels as unit of measurement
	var defaultRulerUnits = preferences.rulerUnits;
	preferences.rulerUnits = Units.PIXELS;

    var selectLayers = getSelectedLayersId();
    if (selectLayers == null || selectLayers.length == 0) {
        alert("NO_LAYER_SELECTED");
        return;
    }

    for (var i = 0; i < selectLayers.length; i++){
        setSelectedLayers(selectLayers[i]);
        var layer = activeDocument.activeLayer;
        lyrInfo += recordLayerInfo(layer);
        scan(layer);
    }

	// Resumes back to original ruler units
	preferences.rulerUnits = defaultRulerUnits;
	// Writes stored layer info into single file
	if (saveLyrInfo) {
	    writeFile(lyrInfo, originPath + "/out/");
    }

    app.activeDocument.activeHistoryState = savedState;
}

function setPlatform(newPlatform){
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
function scan(canvas){
	var lyrInfo = "";
	//var docPath = activeDocument.path;

	// Scan layer group inside the canvas
	for(var i=0; i<canvas.layerSets.length; i++){
		var layer = canvas.layerSets[i];
		// Check if layer name ends with "@", which signifies for export layer
		if (layer.name.substr(-1) == "@"){
			// Collect about-to-be-exported layer information
			lyrInfo += recordLayerInfo(layer);
			// Prepare layer for possible trim and resize defined by the Shape layer within it
			prepare(layer, false, true);
			saveLayer(layer.name);
		} else if (layer.name.slice(-4) == "_BTN"){
			// current layer is a Button group
			// Collect about-to-be-exported layer information
			lyrInfo += recordLayerInfo(layer);
			var regex = /(normal|hover|disabled|pressed|selected|clicked)/;
			// iterate every group inside _BTN group
			for(var k=0; k<layer.layers.length; k++){
				if (layer.layers[k].name.match(regex) != null){
					// Prepare layer for possible trim and resize defined by the Shape layer within it
					prepare(layer.layers[k], true, true);
					saveLayer(layer.name+"."+layer.layers[k].name);
				}
			}
		} else {
			// Recursive
			lyrInfo += scan(canvas.layerSets[i]);
		}
	}

	// Find art layers in current group whose name ends with "@"
	for(var j=0; j<canvas.artLayers.length; j++){
		if(canvas.artLayers[j].name.substr(-1) == "@"){
			lyrInfo += recordLayerInfo(layer);
			prepare(layer, false, false);
			saveLayer(canvas.artLayers[j].name);
		}
	}

	return lyrInfo;
}

function saveLayer(lname){
    /*
    * JavaScript supports indexOf method for Array,
    * but Adobe's ExtendedScript engine is out of date to support this method
    * prototype-function added atop
    */
    if(platform == []){
        alert('NO_PLATFORM_SELECTED');
        return;
    }
	if(platform.indexOf('ios') != -1){
	    if (!iosFolder.exists) iosFolder.create();

		// save as Retina, i.e. the original size(dpi)
		var saveRetinaFile = File(iosFolder + "/" + lname + "_x2.png");
		SavePNG(saveRetinaFile);

		// resize canvas to a quarter of its size
		resize(0.5*activeDocument.width.value, 0.5*activeDocument.height.value);
		var saveFile = File(iosFolder + "/" + lname + "_x1.png");
		SavePNG(saveFile);

		// resize back
		resize(2*activeDocument.width.value, 2*activeDocument.height.value);
	}

	if(platform.indexOf('android') != -1){
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
		    resize(0.75*activeDocument.width.value, 0.75*activeDocument.height.value);
		    var saveHDPI = File(androidHDPIFolder + "/" + lname + "_hdpi.png");
		    SavePNG(saveHDPI);
		    // resize back
		    resize(4.0/3*activeDocument.width.value, 4.0/3*activeDocument.height.value);
		}

        if (resolution.indexOf('mdpi') != -1) {
   	        if (!androidMDPIFolder.exists) androidMDPIFolder.create();
		    // resize canvas to MDPI
		    resize(0.5*activeDocument.width.value, 0.5*activeDocument.height.value);
		    var saveMDPI = File(androidMDPIFolder + "/" + lname + "_mdpi.png");
		    SavePNG(saveMDPI);
		    // resize back
		    resize(2*activeDocument.width.value, 2*activeDocument.height.value);
		}

        if (resolution.indexOf('ldpi') != -1) {
            if (!androidLDPIFolder.exists) androidLDPIFolder.create();
		    // resize canvas to LDPI
		    resize(0.375*activeDocument.width.value, 0.375*activeDocument.height.value);
		    var saveLDPI = File(androidLDPIFolder + "/" + lname + "_ldpi.png");
		    SavePNG(saveLDPI);
		    // resize back
		    resize(8.0/3*activeDocument.width.value, 8.0/3*activeDocument.height.value);
		}
	}

	if(platform.indexOf('macos') != -1){
	    if (!macFolder.exists) macFolder.create();
		var saveMac = File(macFolder + "/" + lname + ".png");
		SavePNG(saveMac);
	}
	// Reverts to original state
	close();
}

function close(){
    var desc904 = new ActionDescriptor();
    desc904.putEnumerated(charIDToTypeID("Svng"), charIDToTypeID("YsN "), charIDToTypeID("N   "));
    executeAction(charIDToTypeID("Cls "), desc904, DialogModes.NO);
}

function dupLayers(){
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

function SavePNG(saveFile){
	var pngOpts = new ExportOptionsSaveForWeb;
	pngOpts.format = SaveDocumentType.PNG;
	pngOpts.PNG8 = false;
	pngOpts.transparency = true;
	pngOpts.interlaced = false;
	pngOpts.quality = 100;
	activeDocument.exportDocument(new File(saveFile), ExportType.SAVEFORWEB, pngOpts);
}

function trim(){
	var idtrim = stringIDToTypeID("trim");
	var desc83 = new ActionDescriptor();
	desc83.putEnumerated(stringIDToTypeID("trimBasedOn"), stringIDToTypeID("trimBasedOn"), charIDToTypeID("Trns"));
	desc83.putBoolean(charIDToTypeID("Top "), true);
	desc83.putBoolean(charIDToTypeID("Btom"), true);
	desc83.putBoolean(charIDToTypeID("Left"), true);
	desc83.putBoolean(charIDToTypeID("Rght"), true);
	executeAction(idtrim, desc83, DialogModes.NO);
}


function hasRectBoundLayer(layer){
	if (layer.artLayers == null || layer.artLayers.length == 0){
		return false;
	}
	return layer.typename == "LayerSet" && layer.artLayers[0].name == "#";
}

function prepare(layer, isBtn, mergeOpt){
	activeDocument.activeLayer = layer;
	// Duplicate passed layer to modify on it
	dupLayers();

	if (isBtn){
		layer = layer.parent;
	}

	// If there is a Shape layer with name "#" at the top of layer group
	if (hasRectBoundLayer(layer)) {
		if (isBtn){
			var boundLayer = layer.artLayers[0];
		} else{
			var boundLayer = activeDocument.activeLayer.artLayers[0];
			boundLayer.visible = false;
		}
		activeDocument.crop(boundLayer.bounds);
	} else {
		// Trims the transparent area around the image
		// activeDocument.trim(TrimType.TRANSPARENT, true, true, true, true);
		trim();
	}
	
	if (mergeOpt == undefined || mergeOpt == true){
		activeDocument.mergeVisibleLayers();
	}
}

function resize(width, height){
	var action = new ActionDescriptor();
	if (width > 0){
		action.putUnitDouble(app.charIDToTypeID("Wdth"), app.charIDToTypeID("#Pxl"), width);
	}
	if (height > 0){
		action.putUnitDouble(app.charIDToTypeID("Hght"), app.charIDToTypeID("#Pxl"), height);
	}
	if (width == 0 || height == 0) {
		action.putBoolean(app.stringIDToTypeID("scaleStyles"), true);
		action.putBoolean(app.charIDToTypeID("Blnr"), true);
	}
	action.putEnumerated(app.charIDToTypeID("Intr"), app.charIDToTypeID("Intp"), app.charIDToTypeID("Blnr"));
	app.executeAction(app.charIDToTypeID("ImgS"), action, DialogModes.NO);
}


function recordLayerInfo(layer){
	var x = (layer.bounds[0].value + layer.bounds[2].value)/2;
	var y = (layer.bounds[1].value + layer.bounds[3].value)/2;
	var width = layer.bounds[2].value - layer.bounds[0].value;
	var height = layer.bounds[3].value - layer.bounds[1].value;
	var info = layer.name + ": centered at (" + x + ", " + y + "), width: " + width + "px, height: " + height + "px. \n";
	return info;
}

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
	} catch(e) {}

}

// return an array of layers' id that are being selected
function getSelectedLayersId()
{
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