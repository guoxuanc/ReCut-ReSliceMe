// Enables double-clicking from Finder/Explorer (CS2 and higher)
#target photoshop
// Makes Photoshop the active application
app.bringToFront()

/*
 *	main() function of script
 */
function main(){
    var doc = activeDocument;
    var originPath = activeDocument.path;
    var outFolder = new Folder(originPath + "/out");
	var iosFolder = new Folder(originPath + "/out/iPhone_assets");
	var androidFolder = new Folder(originPath + "/out/Android_assets");
	var androidXHDPIFolder = new Folder(originPath + "/out/Android_assets/XHDPI");
	var androidLDPIFolder = new Folder(originPath + "/out/Android_assets/LDPI");
	var androidMDPIFolder = new Folder(originPath + "/out/Android_assets/MDPI");
	var androidHDPIFolder = new Folder(originPath + "/out/Android_assets/HDPI");
	var macFolder = new Folder(originPath + "/out/Mac_assets");
   	
	// create folder accordigly
	if (!outFolder.exists) {
        outFolder.create();
    }
	if (!iosFolder.exists) iosFolder.create();
	if (!androidFolder.exists) androidFolder.create();
	if (!androidXHDPIFolder.exists) androidXHDPIFolder.create();
	if (!androidHDPIFolder.exists) androidHDPIFolder.create();
	if (!androidMDPIFolder.exists) androidMDPIFolder.create();
	if (!androidLDPIFolder.exists) androidLDPIFolder.create();
	if (!macFolder.exists) macFolder.create();

	// Save current state before using ReCut&ReSlice Me to reverse back to original state at the end
    var savedState = app.activeDocument.activeHistoryState;
	
	// Stores saved layer info: name, coordinates, width and height
	var lyrInfo = "NAME, COORDINATE, WIDTH, HEIGHT\n";
	
	// Define pixels as unit of measurement
	var defaultRulerUnits = preferences.rulerUnits;
	preferences.rulerUnits = Units.PIXELS;

	// scan the file
    lyrInfo += scan(doc);

	// Resumes back to original ruler units
	preferences.rulerUnits = defaultRulerUnits;
	// Writes stored layer info into single file
	writeFile(lyrInfo, originPath + "/out/");

    app.activeDocument.activeHistoryState = savedState;
}

// call the main()
main();

// Scan layer sets to prepare for exporting
function scan(canvas){
	var lyrInfo = "";
	var docPath = activeDocument.path;
	// Scan layer group inside the canvas
	for(var i=0; i<canvas.layerSets.length; i++){
		var layer = canvas.layerSets[i];
		// Check if layer name ends with "@", which signifies for export layer
		if (layer.name.substr(-1) == "@"){
			// Collect about-to-be-exported layer information
			lyrInfo += recordLayerInfo(layer);
			// Prepare layer for possible trim and resize defined by the Shape layer within it
			prepare(layer, false, true);
			saveLayer(layer.name, docPath);
		} else if (layer.name.slice(-4) == "_BTN"){
			// current layer is a Button group
			// Collect about-to-be-exported layer information
			lyrInfo += recordLayerInfo(layer);
			var regex = /(normal|disabled|pressed)/;
			// iterate every group inside _BTN group
			for(var k=0; k<layer.layers.length; k++){
				if (layer.layers[k].name.match(regex) != null){
					// Prepare layer for possible trim and resize defined by the Shape layer within it
					prepare(layer.layers[k], true, true);
					saveLayer(layer.name+"."+layer.layers[k].name, docPath);
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
			saveLayer(canvas.artLayers[j].name, docPath);
		}
	}

	return lyrInfo;
}

// save export layer using proper size and into proper folder
function saveLayer(lname, path, platform){
	// save to iOS size and folder
	if(platform == undefined || platform == 'iOS'){
		// save as Retina, i.e. the original size(dpi)
		var saveRetinaFile = File(path + "/out/iPhone_assets/" + lname + "_x2.png");
		SavePNG(saveRetinaFile);

		// resize canvas to a quarter of its size
		resize(0.5*activeDocument.width.value, 0.5*activeDocument.height.value);
		var saveFile = File(path + "/out/iPhone_assets/" + lname + "_x1.png");
		SavePNG(saveFile);
		// resize back
		resize(2*activeDocument.width.value, 2*activeDocument.height.value);
	}

	// save to android 4 different sizes and folder
	if(platform == undefined || platform == 'android'){
		var saveXHDPI = File(path + "/out/Android_assets/XHDPI/" + lname + "_xhdpi.png");
		SavePNG(saveXHDPI);

		// resize canvas to HDPI
		resize(0.75*activeDocument.width.value, 0.75*activeDocument.height.value);
		var saveHDPI = File(path + "/out/Android_assets/HDPI/" + lname + "_hdpi.png");
		SavePNG(saveHDPI);
		// resize back
		resize(4.0/3*activeDocument.width.value, 4.0/3*activeDocument.height.value);

		// resize canvas to MDPI
		resize(0.5*activeDocument.width.value, 0.5*activeDocument.height.value);
		var saveMDPI = File(path + "/out/Android_assets/MDPI/" + lname + "_mdpi.png");
		SavePNG(saveMDPI);
		// resize back
		resize(2*activeDocument.width.value, 2*activeDocument.height.value);

		// resize canvas to LDPI
		resize(0.375*activeDocument.width.value, 0.375*activeDocument.height.value);
		var saveLDPI = File(path + "/out/Android_assets/LDPI/" + lname + "_ldpi.png");
		SavePNG(saveLDPI);
		// resize back
		resize(8.0/3*activeDocument.width.value, 8.0/3*activeDocument.height.value);
	}

	// save to mac folder
	if(platform == undefined || platform == 'Mac'){
		var saveMac = File(path + "/out/Mac_assets/" + lname + ".png"); 
		SavePNG(saveMac);
	}
	// Reverts to original state
	close();
}

// close current document
function close(){
    var desc904 = new ActionDescriptor();
    desc904.putEnumerated(charIDToTypeID("Svng"), charIDToTypeID("YsN "), charIDToTypeID("N   "));
    executeAction(charIDToTypeID("Cls "), desc904, DialogModes.NO);
}

// duplicate layer
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

// save as png file
function SavePNG(saveFile){
	var pngOpts = new ExportOptionsSaveForWeb;
	pngOpts.format = SaveDocumentType.PNG;
	pngOpts.PNG8 = false;
	pngOpts.transparency = true;
	pngOpts.interlaced = false;
	pngOpts.quality = 100;
	activeDocument.exportDocument(new File(saveFile), ExportType.SAVEFORWEB, pngOpts);
}

// trim the layer, cut out surrounding exmpty space
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

// check if current docuent is layer set, and its first layer is a Shape layer named "#"
function hasRectBoundLayer(layer){
	if (layer.artLayers == null || layer.artLayers.length == 0){
		return false;
	}
	return layer.typename == "LayerSet" && layer.artLayers[0].name == "#";
}

// prepare a layer, call different methods based on requirements
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

// resize a layer to certain width and height
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

// record layer information
function recordLayerInfo(layer){
	var x = (layer.bounds[0].value + layer.bounds[2].value)/2;
	var y = (layer.bounds[1].value + layer.bounds[3].value)/2;
	var width = layer.bounds[2].value - layer.bounds[0].value;
	var height = layer.bounds[3].value - layer.bounds[1].value;
	var info = layer.name + ": centered at (" + x + ", " + y + "), width: " + width + "px, height: " + height + "px. \n";
	return info;
}

// save layer information into file
function writeFile(lyrInfo, path) {
	
	// Detects line feed type
	// Defaults to MacOS
	var fileLineFeed = "Macintosh";
	if ($.os.search(/windows/i) !== -1) {
		fileLineFeed = "Windows";
	}
	
	try {
		var f = new File(path + "/saved_layers_info.txt");
		f.remove();
		f.open('a');
		f.linefeed = fileLineFeed;
		f.write(lyrInfo);
		f.close()
	} catch(e) {}

}
