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
	writeFile(lyrInfo, originPath + "/out/");

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
	writeFile(lyrInfo, originPath + "/out/");

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
	writeFile(lyrInfo, originPath + "/out/");

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

/*
{"activeId":0,"items":{"item-0":{"id":0,"type":"Dialog","parentId":false,"style":{"enabled":true,"varName":null,"windowType":"Dialog","creationProps":{"su1PanelCoordinates":false,"maximizeButton":false,"minimizeButton":true,"independent":false,"closeButton":true,"borderless":false,"resizeable":false},"text":"ReCut&ReSlice Me","preferredSize":[220,300],"margins":15,"orientation":"column","spacing":10,"alignChildren":["center","top"]}},"item-2":{"id":2,"type":"IconButton","parentId":6,"style":{"enabled":true,"varName":null,"text":"","preferredSize":[73,0],"creationProps":{"style":"toolbutton","toggle":false},"iconButtonStroke":false,"image":["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACEAAAAoCAYAAABw65OnAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDE0IDc5LjE1Njc5NywgMjAxNC8wOC8yMC0wOTo1MzowMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MThEOENEN0M1QTgzMTFFNUJDMzY5QkExRkY1RkU5MjMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MThEOENEN0Q1QTgzMTFFNUJDMzY5QkExRkY1RkU5MjMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDowMDdCRDdGRjVBODMxMUU1QkMzNjlCQTFGRjVGRTkyMyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDowMDdCRDgwMDVBODMxMUU1QkMzNjlCQTFGRjVGRTkyMyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pp4OaOYAAAJhSURBVHjaxJdNSFRRFMdHDbSFCyXKDxIXLRQxCMuNLiRNkDDRZjGGC93owoW2UHShoLiQVlFibSLciORAH5vsA6oBkVr4hTBDUoISygxILXQUR/N/4Ty587q390bfO3Pgt5j73jx+3HvuufekBAfuelyIHOAD9SAM7oG/qheLhv2ecy4IDIEecJ5+f9EJGOG0xEdQbRqbs/pTqoMC0woBQ4xFohJ4FePb4BOXRL9mvBMccUikg5uK8QkwZecDTkhcBRmmsVHQavcDTuyOEmn9X4HHYDGRD9iRKASXQRqIgO/gQHo+C26Dt6Z6cEXUInAR/AZL4EciEpmUVCLjy0zPNsFn4AevwSohohw0gVpwTbNdxUy9sZJoBE/AJY1gLmgm1sEkiIEGUGoxqzWESNgWcKiS6AIPE1jOAtB3ijzyUS7VgV/y7qhKUOCsUUqzeLJFU6jscoZI6F55OcT6XmAU+EqlPq5YtTEK7JorrJDIAhWMEr0kEidRJl1A3I4oeKo6O4oZZ+GDURvMEvmMEiu6UzSTUWJfJ5HGKJGtk4gySlToJMKMEtdVOSgk1pjL9ahKYoVZooWO8ziJINhgFnkPbsgSh3Z6A4dDnNrfxO0tNOhNNQ6wF57kxBiYNyTegZ0kifwxJGJ0r0xGdMjXuwdJEAgUDftDskREdcy6HN2qNvA+LQ1HzIAFlcQeaGeSaPtfQ/ycLh9uhujutqy68gb5JYfjGRi304tGqa8MUEOsi3l6RwjngVsW18VH1OXZ7so3qEsS9eMOlVpj/CVV2WXF/+povWulmf4JRqiJ/ieOBRgAOI9xI/epCFkAAAAASUVORK5CYII="],"alignment":null,"helpTip":null}},"item-3":{"id":3,"type":"IconButton","parentId":6,"style":{"enabled":true,"varName":null,"text":"","preferredSize":[73,0],"creationProps":{"style":"toolbutton","toggle":false},"iconButtonStroke":false,"image":["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAApCAYAAAC/QpA/AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDE0IDc5LjE1Njc5NywgMjAxNC8wOC8yMC0wOTo1MzowMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NDZCM0Y4OTk1QTgzMTFFNUJDMzY5QkExRkY1RkU5MjMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NDZCM0Y4OUE1QTgzMTFFNUJDMzY5QkExRkY1RkU5MjMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDoxOEQ4Q0Q4NjVBODMxMUU1QkMzNjlCQTFGRjVGRTkyMyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo0NkIzRjg5ODVBODMxMUU1QkMzNjlCQTFGRjVGRTkyMyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PnO69IYAAAKqSURBVHja7JhbSBZBFMd3V7M+LxVdhBLKsCCCBHsTukCB+RAVlJc3A6GHXqReEkMF6ynSeupCRSBBJII+Wm8lQYlkVqQlRh/4Fb1Ilmbl9X/grAzT7O7s9+1Ihgd+7MzszNk/M3PmsvZA/QlL07pAJ7hp6VslOA0OelXY2dS+kHZCOL4PboBMzfo2eAAe6n4gPaSYInAX1IBDoBDkg2zwC8TBG/AYNILr4JYJMWSt4BU4BmI+9f6ADLAvjPMww3QJ9HE6FlA3g5/doCVqMR3gAs+DLzwkfkbvP3P6LHgUlZg74DinP4DNYAeY9mlDcykPvOZ8ic5EDhJzAFQL+d/8HAFzPu2+8nNCKCsHR1IRc1XK7wYvwSewwqfdIOgFxQH+tKNpC4eybEUaQ7uJkW072AXehe2ZEsuMHU6mZ56BMwFzI6zZHO7ql8LeRL00ay2+pWF/mhGHqYmXchrL/VxWwVERNVXsfw8vovHBhpPN7jBR6NYLSp9wd9I6kmugJ2x+PgVZnD4HQXHqmVJFg5iwgkZtrt8sqXwviRn3iDLHkBgvvxNek3ZO6E5TwyTbrGP9Q7YsZlnMkhfjhAg/k2Y7fM34K+bBjKGPevnNdvioINskWGtIzBqP8l4Scw3cBj9BAhzllxsNiVknHLIS/N174Ip7uKL7cC34AaaELcGEuX7p1rkN5OA8Myqf9EYXaRKLfqdcIUGhvdKQmFXJrDM9hsQ8T0ZMP19Nv2mMv6Uxz8jPefAi2RWYIm0r33fKFO/p7FogcFFR5xS3Jz+XU/0l8p1RjTX9BPgo5BOKOu/BcNR70wZFWY6UX62os/6/37VtjTJbs13KYlTrTqbiiqO9rqQiZkhRNqCYrKrfI5GLoaipA2O8h9E/4VapThto5/djfG1+q/uBeQEGABeelma7Tob/AAAAAElFTkSuQmCC"],"alignment":null,"helpTip":null}},"item-4":{"id":4,"type":"IconButton","parentId":6,"style":{"enabled":true,"varName":null,"text":"","preferredSize":[73,0],"creationProps":{"style":"toolbutton","toggle":false},"iconButtonStroke":false,"image":["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAlCAYAAADfosCNAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDE0IDc5LjE1Njc5NywgMjAxNC8wOC8yMC0wOTo1MzowMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MThEOENEODA1QTgzMTFFNUJDMzY5QkExRkY1RkU5MjMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MThEOENEODE1QTgzMTFFNUJDMzY5QkExRkY1RkU5MjMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDoxOEQ4Q0Q3RTVBODMxMUU1QkMzNjlCQTFGRjVGRTkyMyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDoxOEQ4Q0Q3RjVBODMxMUU1QkMzNjlCQTFGRjVGRTkyMyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pr98mI4AAAE3SURBVHjaYrxeG+zMwMAwBYjFGAYf+ALEXSxAYgkQSzAMTiAECkCQI7mhAk+B+DAQMw4Cx/0DYn0g1gLiHyBHfgViXiA+AMQx9HaNRtMarOI36kKKgFQvEP9mQhLnGmRRzQ9jIDuScZA5kgmbIwctGHXkqCNHHTnqyFFHjjpy1JGjjhx15KgjqeXIv4PMbX+wOfLfYHUkC5KgCxCfordLgL1CbML/gVgGmyMFgdh0sKZJ5qGQcfgHuRt5QY5cPsgdeQmUJhMYIGNAMiRqNgDiABLUnwDiHSSoBw1WvAfiubCMM5cMHzqS6MgtQNyKLohrLIhaNQ6p45l8A1EtspConpPejlTCFnUEQCIQe9PLkeZAfBeI5UnUxwNNl7G0jjJ2BsjwNQh8JsODoFHledCcfptYTQABBgB8gCrw8RL/tQAAAABJRU5ErkJggg=="],"alignment":null,"helpTip":null}},"item-5":{"id":5,"type":"StaticText","parentId":0,"style":{"enabled":true,"varName":null,"creationProps":{"truncate":"none","multiline":false,"scrolling":false},"softWrap":false,"text":"ReCut&ReSlice","justify":"center","preferredSize":[220,0],"alignment":"center","helpTip":null}},"item-6":{"id":6,"type":"Group","parentId":0,"style":{"enabled":true,"varName":"Mode","preferredSize":[0,0],"margins":[6,0,0,0],"orientation":"row","spacing":10,"alignChildren":["left","center"],"alignment":null}},"item-7":{"id":7,"type":"Group","parentId":0,"style":{"enabled":true,"varName":"Export","preferredSize":[0,0],"margins":[10,0,0,0],"orientation":"row","spacing":10,"alignChildren":["left","center"],"alignment":null}},"item-8":{"id":8,"type":"Button","parentId":11,"style":{"enabled":true,"varName":null,"text":"ALL GROUPS","justify":"center","preferredSize":[110,0],"alignment":"center","helpTip":null}},"item-9":{"id":9,"type":"Button","parentId":11,"style":{"enabled":true,"varName":null,"text":"SUB GROUPS","justify":"center","preferredSize":[110,0],"alignment":"center","helpTip":null}},"item-10":{"id":10,"type":"Button","parentId":11,"style":{"enabled":true,"varName":null,"text":"SLC LAYERS","justify":"center","preferredSize":[110,0],"alignment":"center","helpTip":null}},"item-11":{"id":11,"type":"Group","parentId":7,"style":{"enabled":true,"varName":"ExportOption","preferredSize":[110,0],"margins":0,"orientation":"column","spacing":10,"alignChildren":["left","center"],"alignment":"fill"}},"item-12":{"id":12,"type":"IconButton","parentId":7,"style":{"enabled":true,"varName":null,"text":"Ratio","preferredSize":[100,100],"creationProps":{"style":"toolbutton","toggle":false},"iconButtonStroke":false,"image":[""],"alignment":null,"helpTip":null}},"item-13":{"id":13,"type":"Group","parentId":0,"style":{"enabled":true,"varName":"Resolution","preferredSize":[0,0],"margins":[14,2,2,2],"orientation":"row","spacing":10,"alignChildren":["center","center"],"alignment":null}},"item-14":{"id":14,"type":"RadioButton","parentId":16,"style":{"enabled":true,"varName":null,"text":"LDPI","preferredSize":[null,0],"alignment":null,"helpTip":null}},"item-15":{"id":15,"type":"RadioButton","parentId":16,"style":{"enabled":true,"varName":null,"text":"XHDPI","preferredSize":[0,0],"alignment":null,"helpTip":null}},"item-16":{"id":16,"type":"Group","parentId":13,"style":{"enabled":true,"varName":null,"preferredSize":[220,0],"margins":[0,0,0,0],"orientation":"row","spacing":4,"alignChildren":["left","center"],"alignment":null}},"item-18":{"id":18,"type":"RadioButton","parentId":16,"style":{"enabled":true,"varName":null,"text":"MDPI","preferredSize":[0,0],"alignment":null,"helpTip":null}},"item-19":{"id":19,"type":"RadioButton","parentId":16,"style":{"enabled":true,"varName":null,"text":"HDPI","preferredSize":[0,0],"alignment":null,"helpTip":null}}},"order":[0,5,6,2,3,4,7,11,8,9,10,12,13,16,14,15,18,19],"settings":{"importJSON":true,"indentSize":false,"cepExport":false,"includeCSSJS":true,"showDialog":true,"functionWrapper":false,"afterEffectsDockable":false,"itemReferenceList":"None"}}
*/ 

// DIALOG
// ======
var dialog = new Window("dialog", undefined, undefined, {minimizeButton: true}); 
    dialog.text = "ReCut & ReSlice Me";
    dialog.preferredSize.width = 220; 
    dialog.preferredSize.height = 300; 
    dialog.orientation = "column"; 
    dialog.alignChildren = ["center","top"]; 
    dialog.spacing = 10; 
    dialog.margins = 15; 

var statictext1 = dialog.add("statictext", undefined, undefined, {name: "statictext1"}); 
    statictext1.text = "ReCut & ReSlice Me"; 
    statictext1.preferredSize.width = 220; 
    statictext1.justify = "center"; 
    statictext1.alignment = ["center","top"];


// MODE
// ====
var Mode = dialog.add("group", undefined, {name: "Mode"}); 
    Mode.orientation = "row"; 
    Mode.alignChildren = ["left","center"]; 
    Mode.spacing = 10; 
    Mode.margins = [0,6,0,0]; 

var iconbutton1_imgString = "%C2%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00!%00%00%00(%08%06%00%00%00p%C3%AB%C2%93%C2%A7%00%00%00%19tEXtSoftware%00Adobe%20ImageReadyq%C3%89e%3C%00%00%03(iTXtXML%3Acom.adobe.xmp%00%00%00%00%00%3C%3Fxpacket%20begin%3D%22%C3%AF%C2%BB%C2%BF%22%20id%3D%22W5M0MpCehiHzreSzNTczkc9d%22%3F%3E%20%3Cx%3Axmpmeta%20xmlns%3Ax%3D%22adobe%3Ans%3Ameta%2F%22%20x%3Axmptk%3D%22Adobe%20XMP%20Core%205.6-c014%2079.156797%2C%202014%2F08%2F20-09%3A53%3A02%20%20%20%20%20%20%20%20%22%3E%20%3Crdf%3ARDF%20xmlns%3Ardf%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%22%3E%20%3Crdf%3ADescription%20rdf%3Aabout%3D%22%22%20xmlns%3Axmp%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2F%22%20xmlns%3AxmpMM%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2Fmm%2F%22%20xmlns%3AstRef%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2FsType%2FResourceRef%23%22%20xmp%3ACreatorTool%3D%22Adobe%20Photoshop%20CC%202014%20(Macintosh)%22%20xmpMM%3AInstanceID%3D%22xmp.iid%3A18D8CD7C5A8311E5BC369BA1FF5FE923%22%20xmpMM%3ADocumentID%3D%22xmp.did%3A18D8CD7D5A8311E5BC369BA1FF5FE923%22%3E%20%3CxmpMM%3ADerivedFrom%20stRef%3AinstanceID%3D%22xmp.iid%3A007BD7FF5A8311E5BC369BA1FF5FE923%22%20stRef%3AdocumentID%3D%22xmp.did%3A007BD8005A8311E5BC369BA1FF5FE923%22%2F%3E%20%3C%2Frdf%3ADescription%3E%20%3C%2Frdf%3ARDF%3E%20%3C%2Fx%3Axmpmeta%3E%20%3C%3Fxpacket%20end%3D%22r%22%3F%3E%C2%9E%0Eh%C3%A6%00%00%02aIDATx%C3%9A%C3%84%C2%97MHTQ%14%C3%87G%0D%C2%B4%C2%85%0B%25%C3%8A%0F%12%17-%141%08%C3%8B%C2%8D.%24M%C2%900%C3%91f1%C2%86%0B%C3%9D%C3%A8%C3%82%C2%85%C2%B6Pt%C2%A1%C2%A0%C2%B8%C2%90VQbm%22%C3%9C%C2%88%C3%A4%40%1F%C2%9B%C3%AC%03%C2%AA%01%C2%91Z%C3%B8%C2%850CR%C2%82%12%C3%8A%0CH-t%14G%C3%B3%7F%C3%A1%3C%C2%B9%C3%B3%C2%BA%C2%B7%C3%B7F%C3%9F%3Bs%C3%A0%C2%B7%C2%98%C3%BB%C3%9E%3C~%C3%9C%7B%C3%AE%C2%B9%C3%B7%C2%A4%04%07%C3%AEz%5C%C2%88%1C%C3%A0%03%C3%B5%20%0C%C3%AE%C2%81%C2%BF%C2%AA%17%C2%8B%C2%86%C3%BD%C2%9Es.%08%0C%C2%81%1Ep%C2%9E~%7F%C3%91%09%18%C3%A1%C2%B4%C3%84GPm%1A%C2%9B%C2%B3%C3%BAS%C2%AA%C2%83%02%C3%93%0A%01C%C2%8CE%C2%A2%12x%15%C3%A3%C3%9B%C3%A0%13%C2%97D%C2%BFf%C2%BC%13%1CqH%C2%A4%C2%83%C2%9B%C2%8A%C3%B1%090e%C3%A7%03NH%5C%05%19%C2%A6%C2%B1Q%C3%90j%C3%B7%03N%C3%AC%C2%8E%12i%C3%BD_%C2%81%C3%87%601%C2%91%0F%C3%98%C2%91(%04%C2%97A%1A%C2%88%C2%80%C3%AF%C3%A0%40z%3E%0Bn%C2%83%C2%B7%C2%A6zpE%C3%94%22p%11%C3%BC%06K%C3%A0G%22%12%C2%99%C2%94T%22%C3%A3%C3%8BL%C3%8F6%C3%81g%C3%A0%07%C2%AF%C3%81*!%C2%A2%1C4%C2%81ZpM%C2%B3%5D%C3%85L%C2%BD%C2%B1%C2%92h%04O%C3%80%25%C2%8D%60.h%26%C3%96%C3%81%24%C2%88%C2%81%06Pj1%C2%AB5%C2%84H%C3%98%16p%C2%A8%C2%92%C3%A8%02%0F%13X%C3%8E%02%C3%90w%C2%8A%3C%C3%B2Q.%C3%95%C2%81_%C3%B2%C3%AE%C2%A8JP%C3%A0%C2%ACQJ%C2%B3x%C2%B2ES%C2%A8%C3%ACr%C2%86H%C3%A8%5Ey9%C3%84%C3%BA%5E%60%14%C3%B8J%C2%A5%3E%C2%AEX%C2%B51%0A%C3%AC%C2%9A%2B%C2%AC%C2%90%C3%88%02%15%C2%8C%12%C2%BD%24%12'Q%26%5D%40%C3%9C%C2%8E(x%C2%AA%3A%3B%C2%8A%19g%C3%A1%C2%83Q%1B%C3%8C%12%C3%B9%C2%8C%12%2B%C2%BAS4%C2%93Qb_'%C2%91%C3%86(%C2%91%C2%AD%C2%93%C2%882JT%C3%A8%24%C3%82%C2%8C%12%C3%97U9(%24%C3%96%C2%98%C3%8B%C3%B5%C2%A8Jb%C2%85Y%C2%A2%C2%85%C2%8E%C3%B38%C2%89%20%C3%98%60%16y%0Fn%C3%88%12%C2%87vz%03%C2%87C%C2%9C%C3%9A%C3%9F%C3%84%C3%AD-4%C3%A8M5%0E%C2%B0%17%C2%9E%C3%A4%C3%84%18%C2%987%24%C3%9E%C2%81%C2%9D%24%C2%89%C3%BC1%24bt%C2%AFLFt%C3%88%C3%97%C2%BB%07I%10%08%14%0D%C3%BBC%C2%B2DDu%C3%8C%C2%BA%1C%C3%9D%C2%AA6%C3%B0%3E-%0DG%C3%8C%C2%80%05%C2%95%C3%84%1Ehg%C2%92h%C3%BB_C%C3%BC%C2%9C.%1Fn%C2%86%C3%A8%C3%AE%C2%B6%C2%AC%C2%BA%C3%B2%06%C3%B9%25%C2%87%C3%A3%19%18%C2%B7%C3%93%C2%8BF%C2%A9%C2%AF%0CPC%C2%AC%C2%8ByzG%08%C3%A7%C2%81%5B%16%C3%97%C3%85G%C3%94%C3%A5%C3%99%C3%AE%C3%8A7%C2%A8K%12%C3%B5%C3%A3%0E%C2%95Zc%C3%BC%25U%C3%99e%C3%85%C3%BF%C3%AAh%C2%BDk%C2%A5%C2%99%C3%BE%09F%C2%A8%C2%89%C3%BE'%C2%8E%05%18%008%C2%8Fq%23%C3%B7%C2%A9%08Y%00%00%00%00IEND%C2%AEB%60%C2%82"; 
var iconbutton1 = Mode.add("iconbutton", undefined, File.decode(iconbutton1_imgString), {name: "ios", style: "toolbutton", toggle: true}); 
    iconbutton1.preferredSize.width = 73; 

var iconbutton2_imgString = "%C2%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%23%00%00%00)%08%06%00%00%00%C2%BFB%C2%90%3F%00%00%00%19tEXtSoftware%00Adobe%20ImageReadyq%C3%89e%3C%00%00%03(iTXtXML%3Acom.adobe.xmp%00%00%00%00%00%3C%3Fxpacket%20begin%3D%22%C3%AF%C2%BB%C2%BF%22%20id%3D%22W5M0MpCehiHzreSzNTczkc9d%22%3F%3E%20%3Cx%3Axmpmeta%20xmlns%3Ax%3D%22adobe%3Ans%3Ameta%2F%22%20x%3Axmptk%3D%22Adobe%20XMP%20Core%205.6-c014%2079.156797%2C%202014%2F08%2F20-09%3A53%3A02%20%20%20%20%20%20%20%20%22%3E%20%3Crdf%3ARDF%20xmlns%3Ardf%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%22%3E%20%3Crdf%3ADescription%20rdf%3Aabout%3D%22%22%20xmlns%3Axmp%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2F%22%20xmlns%3AxmpMM%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2Fmm%2F%22%20xmlns%3AstRef%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2FsType%2FResourceRef%23%22%20xmp%3ACreatorTool%3D%22Adobe%20Photoshop%20CC%202014%20(Macintosh)%22%20xmpMM%3AInstanceID%3D%22xmp.iid%3A46B3F8995A8311E5BC369BA1FF5FE923%22%20xmpMM%3ADocumentID%3D%22xmp.did%3A46B3F89A5A8311E5BC369BA1FF5FE923%22%3E%20%3CxmpMM%3ADerivedFrom%20stRef%3AinstanceID%3D%22xmp.iid%3A18D8CD865A8311E5BC369BA1FF5FE923%22%20stRef%3AdocumentID%3D%22xmp.did%3A46B3F8985A8311E5BC369BA1FF5FE923%22%2F%3E%20%3C%2Frdf%3ADescription%3E%20%3C%2Frdf%3ARDF%3E%20%3C%2Fx%3Axmpmeta%3E%20%3C%3Fxpacket%20end%3D%22r%22%3F%3Es%C2%BA%C3%B4%C2%86%00%00%02%C2%AAIDATx%C3%9A%C3%AC%C2%98%5BH%16A%14%C3%87wW%C2%B3%3E%2F%15%5D%C2%84%12%C3%8A%C2%B0%20%C2%82%04%7B%13%C2%BA%40%C2%81%C3%B9%10%15%C2%94%C2%977%03%C2%A1%C2%87%5E%C2%A4%5E%12C%05%C3%AB)%C3%92z%C3%AABE%20A%24%C2%82%3EZo%25A%C2%89dV%C2%A4%25F%1F%C3%B8%15%C2%BDH%C2%96f%C3%A5%C3%B5%7F%C3%A0%C2%AC%0C%C3%93%C3%AC%C3%AE%C3%AC%C3%B7%C3%ADH%C2%86%07~%C3%AC%C3%8C%C3%AC%C3%8C%C3%99%3F3s%C3%A6%C2%B2%C3%B6%40%C3%BD%09K%C3%93%C2%BA%40'%C2%B8i%C3%A9%5B%258%0D%0EzU%C3%98%C3%99%C3%94%C2%BE%C2%90vB8%C2%BE%0Fn%C2%80L%C3%8D%C3%BA6x%00%1E%C3%AA~%20%3D%C2%A4%C2%98%22p%17%C3%94%C2%80C%C2%A0%10%C3%A4%C2%83l%C3%B0%0B%C3%84%C3%81%1B%C3%B0%184%C2%82%C3%AB%C3%A0%C2%96%091d%C2%AD%C3%A0%158%06b%3E%C3%B5%C3%BE%C2%80%0C%C2%B0%2F%C2%8C%C3%B30%C3%83t%09%C3%B4q%3A%16P7%C2%83%C2%9F%C3%9D%C2%A0%25j1%1D%C3%A0%02%C3%8F%C2%83%2F%3C%24~F%C3%AF%3Fs%C3%BA%2Cx%14%C2%95%C2%98%3B%C3%A08%C2%A7%3F%C2%80%C3%8D%60%07%C2%98%C3%B6iCs)%0F%C2%BC%C3%A6%7C%C2%89%C3%8ED%0E%12s%00T%0B%C3%B9%C3%9F%C3%BC%1C%01s%3E%C3%AD%C2%BE%C3%B2sB(%2B%07GR%11sU%C3%8A%C3%AF%06%2F%C3%81'%C2%B0%C3%82%C2%A7%C3%9D%20%C3%A8%05%C3%85%01%C3%BE%C2%B4%C2%A3i%0B%C2%87%C2%B2lE%1AC%C2%BB%C2%89%C2%91m%3B%C3%98%05%C3%9E%C2%85%C3%AD%C2%99%12%C3%8B%C2%8C%1DN%C2%A6g%C2%9E%C2%813%01s%23%C2%AC%C3%99%1C%C3%AE%C3%AA%C2%97%C3%82%C3%9ED%C2%BD4k-%C2%BE%C2%A5a%7F%C2%9A%11%C2%87%C2%A9%C2%89%C2%97r%1A%C3%8B%C3%BD%5CV%C3%81Q%115U%C3%AC%7F%0F%2F%C2%A2%C3%B1%C3%81%C2%86%C2%93%C3%8D%C3%AE0Q%C3%A8%C3%96%0BJ%C2%9Fpw%C3%92%3A%C2%92k%C2%A0'l~%3E%05Y%C2%9C%3E%07Aq%C3%AA%C2%99RE%C2%83%C2%98%C2%B0%C2%82Fm%C2%AE%C3%9F%2C%C2%A9%7C%2F%C2%89%19%C3%B7%C2%882%C3%87%C2%90%18%2F%C2%BF%13%5E%C2%93vN%C3%A8NS%C3%83%24%C3%9B%C2%ACc%C3%BDC%C2%B6%2CfY%C3%8C%C2%92%17%C3%A3%C2%84%08%3F%C2%93f%3B%7C%C3%8D%C3%B8%2B%C3%A6%C3%81%C2%8C%C2%A1%C2%8Fz%C3%B9%C3%8Dv%C3%B8%C2%A8%20%C3%9B%24XkH%C3%8C%1A%C2%8F%C3%B2%5E%12s%0D%C3%9C%06%3FA%02%1C%C3%A5%C2%97%1B%0D%C2%89Y'%1C%C2%B2%12%C3%BC%C3%9D%7B%C3%A0%C2%8A%7B%C2%B8%C2%A2%C3%BBp-%C3%B8%01%C2%A6%C2%84-%C3%81%C2%84%C2%B9~%C3%A9%C3%96%C2%B9%0D%C3%A4%C3%A0%3C3*%C2%9F%C3%B4F%17i%12%C2%8B~%C2%A7%5C!A%C2%A1%C2%BD%C3%92%C2%90%C2%98U%C3%89%C2%AC3%3D%C2%86%C3%84%3COFL%3F_M%C2%BFi%C2%8C%C2%BF%C2%A51%C3%8F%C3%88%C3%8Fy%C3%B0%22%C3%99%15%C2%98%22m%2B%C3%9Fw%C3%8A%14%C3%AF%C3%A9%C3%ACZ%20pQQ%C3%A7%14%C2%B7'%3F%C2%97S%C3%BD%25%C3%B2%C2%9DQ%C2%8D5%C3%BD%04%C3%B8(%C3%A4%13%C2%8A%3A%C3%AF%C3%81p%C3%94%7B%C3%93%06EY%C2%8E%C2%94_%C2%AD%C2%A8%C2%B3%C3%BE%C2%BF%C3%9F%C2%B5m%C2%8D2%5B%C2%B3%5D%C3%8AbT%C3%ABN%C2%A6%C3%A2%C2%8A%C2%A3%C2%BD%C2%AE%C2%A4%22fHQ6%C2%A0%C2%98%C2%AC%C2%AA%C3%9F%23%C2%91%C2%8B%C2%A1%C2%A8%C2%A9%03c%C2%BC%C2%87%C3%91%3F%C3%A1V%C2%A9N%1Bh%C3%A7%C3%B7c%7Cm~%C2%AB%C3%BB%C2%81y%01%06%00%17%C2%9E%C2%96f%C2%BBN%C2%86%C3%BF%00%00%00%00IEND%C2%AEB%60%C2%82"; 
var iconbutton2 = Mode.add("iconbutton", undefined, File.decode(iconbutton2_imgString), {name: "android", style: "toolbutton", toggle: true}); 
    iconbutton2.preferredSize.width = 73; 

var iconbutton3_imgString = "%C2%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00)%00%00%00%25%08%06%00%00%00%C3%9F%C2%A2%C3%80%C2%8D%00%00%00%19tEXtSoftware%00Adobe%20ImageReadyq%C3%89e%3C%00%00%03(iTXtXML%3Acom.adobe.xmp%00%00%00%00%00%3C%3Fxpacket%20begin%3D%22%C3%AF%C2%BB%C2%BF%22%20id%3D%22W5M0MpCehiHzreSzNTczkc9d%22%3F%3E%20%3Cx%3Axmpmeta%20xmlns%3Ax%3D%22adobe%3Ans%3Ameta%2F%22%20x%3Axmptk%3D%22Adobe%20XMP%20Core%205.6-c014%2079.156797%2C%202014%2F08%2F20-09%3A53%3A02%20%20%20%20%20%20%20%20%22%3E%20%3Crdf%3ARDF%20xmlns%3Ardf%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%22%3E%20%3Crdf%3ADescription%20rdf%3Aabout%3D%22%22%20xmlns%3Axmp%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2F%22%20xmlns%3AxmpMM%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2Fmm%2F%22%20xmlns%3AstRef%3D%22http%3A%2F%2Fns.adobe.com%2Fxap%2F1.0%2FsType%2FResourceRef%23%22%20xmp%3ACreatorTool%3D%22Adobe%20Photoshop%20CC%202014%20(Macintosh)%22%20xmpMM%3AInstanceID%3D%22xmp.iid%3A18D8CD805A8311E5BC369BA1FF5FE923%22%20xmpMM%3ADocumentID%3D%22xmp.did%3A18D8CD815A8311E5BC369BA1FF5FE923%22%3E%20%3CxmpMM%3ADerivedFrom%20stRef%3AinstanceID%3D%22xmp.iid%3A18D8CD7E5A8311E5BC369BA1FF5FE923%22%20stRef%3AdocumentID%3D%22xmp.did%3A18D8CD7F5A8311E5BC369BA1FF5FE923%22%2F%3E%20%3C%2Frdf%3ADescription%3E%20%3C%2Frdf%3ARDF%3E%20%3C%2Fx%3Axmpmeta%3E%20%3C%3Fxpacket%20end%3D%22r%22%3F%3E%C2%BF%7C%C2%98%C2%8E%00%00%017IDATx%C3%9Ab%C2%BC%5E%1B%C3%AC%C3%8C%C3%80%C3%800%05%C2%88%C3%85%18%06%1F%C3%B8%02%C3%84%5D%2C%40b%09%10K0%0CN%20%04%0A%40%C2%90%23%C2%B9%C2%A1%02O%C2%81%C3%B80%103%0E%02%C3%87%C3%BD%03b%7D%20%C3%96%02%C3%A2%1F%20G~%05b%5E%20%3E%00%C3%841%C3%B4v%C2%8DF%C3%93%1A%C2%AC%C3%A27%C3%AAB%C2%8A%C2%80T%2F%10%C3%BFfB%12%C3%A7%1AdQ%C3%8D%0Fc%20%3B%C2%92q%C2%909%C2%92%09%C2%9B%23%07-%18u%C3%A4%C2%A8%23G%1D9%C3%AA%C3%88QG%C2%8E%3Ar%C3%94%C2%91%C2%A3%C2%8E%1Cu%C3%A4%C2%A8%23%C2%A9%C3%A5%C3%88%C2%BF%C2%83%C3%8Cm%7F%C2%B09%C3%B2%C3%9F%60u%24%0B%C2%92%C2%A0%0B%10%C2%9F%C2%A2%C2%B7K%C2%80%C2%BDBl%C3%82%C3%BF%C2%81X%06%C2%9B%23%05%C2%81%C3%98t%C2%B0%C2%A6I%C3%A6%C2%A1%C2%90q%C3%B8%07%C2%B9%1ByA%C2%8E%5C%3E%C3%88%1Dy%09%C2%94%26%13%18%20c%402%24j6%00%C3%A2%00%12%C3%94%C2%9F%00%C3%A2%1D%24%C2%A8%07%0DV%C2%BC%07%C3%A2%C2%B9%C2%B0%C2%8C3%C2%97%0C%1F%3A%C2%92%C3%A8%C3%88-%40%C3%9C%C2%8A.%C2%88k%2C%C2%88Z5%0E%C2%A9%C3%A3%C2%99%7C%03Q-%C2%B2%C2%90%C2%A8%C2%9E%C2%93%C3%9E%C2%8ET%C3%82%16u%04%40%22%10%7B%C3%93%C3%8B%C2%91%C3%A6%40%7C%17%C2%88%C3%A5I%C3%94%C3%87%03M%C2%97%C2%B1%C2%B4%C2%8E2v%06%C3%88%C3%B05%08%7C%26%C3%83%C2%83%C2%A0Q%C3%A5y%C3%90%C2%9C~%C2%9BXM%00%01%06%00%7C%C2%80*%C3%B0%C3%B1%12%C3%BF%C2%B5%00%00%00%00IEND%C2%AEB%60%C2%82"; 
var iconbutton3 = Mode.add("iconbutton", undefined, File.decode(iconbutton3_imgString), {name: "macos", style: "toolbutton", toggle: true}); 
    iconbutton3.preferredSize.width = 73; 

// EXPORT
// ======
var Export = dialog.add("group", undefined, {name: "Export"}); 
    Export.orientation = "row"; 
    Export.alignChildren = ["left","center"]; 
    Export.spacing = 10; 
    Export.margins = [0,10,0,0]; 

// EXPORTOPTION
// ============
var ExportOption = Export.add("group", undefined, {name: "ExportOption"}); 
    ExportOption.preferredSize.width = 110; 
    ExportOption.orientation = "column"; 
    ExportOption.alignChildren = ["left","center"]; 
    ExportOption.spacing = 10; 
    ExportOption.margins = 0; 
    ExportOption.alignment = ["left","fill"]; 

var button1 = ExportOption.add("button", undefined, undefined, {name: "button1"}); 
    button1.text = "ALL GROUPS"; 
    button1.preferredSize.width = 110; 
    button1.alignment = ["center","center"]; 
    
var button2 = ExportOption.add("button", undefined, undefined, {name: "button2"}); 
    button2.text = "SUB GROUPS"; 
    button2.preferredSize.width = 110; 
    button2.alignment = ["center","center"]; 

var button3 = ExportOption.add("button", undefined, undefined, {name: "button3"}); 
    button3.text = "SLC LAYERS"; 
    button3.preferredSize.width = 110; 
    button3.alignment = ["center","center"]; 
    
// EXPORT
// ======
//var iconbutton4 = Export.add("iconbutton", undefined, undefined, {name: "iconbutton4", style: "toolbutton"}); 
//    iconbutton4.text = "Ratio"; 
//    iconbutton4.preferredSize.width = 100; 
//    iconbutton4.preferredSize.height = 100; 

// RESOLUTION
// ==========
var Resolution = dialog.add("group", undefined, {name: "Resolution"}); 
    Resolution.orientation = "row"; 
    Resolution.alignChildren = ["center","center"]; 
    Resolution.spacing = 10; 
    Resolution.margins = [2,14,2,2]; 

// GROUP1
// ======
var group1 = Resolution.add("group", undefined, {name: "group1"}); 
    group1.preferredSize.width = 220; 
    group1.orientation = "row"; 
    group1.alignChildren = ["left","center"]; 
    group1.spacing = 4; 
    group1.margins = [0,0,0,0]; 

var radiobutton1 = group1.add("radiobutton", undefined, undefined, {name: "radiobutton1"}); 
    radiobutton1.text = "LDPI"; 

var radiobutton2 = group1.add("radiobutton", undefined, undefined, {name: "radiobutton2"}); 
    radiobutton2.text = "XHDPI"; 

var radiobutton3 = group1.add("radiobutton", undefined, undefined, {name: "radiobutton3"}); 
    radiobutton3.text = "MDPI"; 

var radiobutton4 = group1.add("radiobutton", undefined, undefined, {name: "radiobutton4"}); 
    radiobutton4.text = "HDPI"; 
    
 var statictext2 = dialog.add("statictext", undefined, undefined, {name: "status"});
    statictext2.text = "Ready";
    statictext2.preferredSize.width = 220;
    statictext2.justify = "center";
    statictext2.alignment = ["center", "bottom"];

function selected_rbutton (rbuttons) {
    for (var i = 0; i < rbuttons.children.length; i++) {
        if (rbuttons.children[i].value == true) {
            var rbutton = rbuttons.children[i].text;
            return rbuttons.children[i].text.toLowerCase();
            }
        }
}

button2.onClick = function() {
    selected_rbutton (group1);
};

function get_platform_list (platform_btns) {
    var platform_list = [];
    for (var i = 0; i < platform_btns.length; i++) {
        if (platform_btns[i].value == true) {
                platform_list.push(platform_btns[i].properties.name);
            }
    }
    return platform_list;
}

radiobutton1.enabled = false;
radiobutton2.enabled = false;
radiobutton3.enabled = false;
radiobutton4.enabled = false;
iconbutton2.onClick = function() {
    if (radiobutton1.enabled == false) {
        radiobutton1.enabled = true;
        radiobutton2.enabled = true;
        radiobutton3.enabled = true;
        radiobutton4.enabled = true;
    }
    else {
        radiobutton1.enabled = false;
        radiobutton2.enabled = false;
        radiobutton3.enabled = false;
        radiobutton4.enabled = false;
    }
};

button1.onClick = function() {
    platform = get_platform_list ([iconbutton1, iconbutton2, iconbutton3]);
    resolution = [];
    if (platform.length == 0) {
        alert('Please select a platform');
        return;
    } else if (platform.indexOf("android") > -1) {
        resolution = selected_rbutton (group1);
        if (resolution.length == 0) {
            alert('Please select resolution for Android platform!');
            return;
        }
    }
    //alert(get_platform_list ([iconbutton1, iconbutton2, iconbutton3]).toString());
    statictext2.text = "working";
    exportAll();
    statictext2.text = "ready";
};

button2.onClick = function() {
    platform = get_platform_list ([iconbutton1, iconbutton2, iconbutton3]);
    resolution = [];
    if (platform.length == 0) {
            alert('Please select a platform');
            return;
        } else if (platform.indexOf("android") > -1) {
        resolution = selected_rbutton (group1);
        if (resolution.length == 0) {
            alert('Please select resolution for Android platform!');
            return;
        }
    }
    //alert(get_platform_list ([iconbutton1, iconbutton2, iconbutton3]).toString());
    statictext2.text = "working";
    exportSubgroups ();
    statictext2.text = "ready";
};

button3.onClick = function() {
    platform = get_platform_list ([iconbutton1, iconbutton2, iconbutton3]);
    resolution = [];
    if (platform.length == 0) {
            alert('Please select a platform');
            return;
        } else if (platform.indexOf("android") > -1) {
        resolution = selected_rbutton (group1);
        if (resolution.length == 0) {
            alert('Please select resolution for Android platform!');
            return;
        }
    }
    //alert(get_platform_list ([iconbutton1, iconbutton2, iconbutton3]).toString());
    statictext2.text = "working";
    exportSelected();
    statictext2.text = "ready";
};

dialog.show();
