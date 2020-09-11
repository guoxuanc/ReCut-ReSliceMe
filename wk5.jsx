
// Enables double-clicking from Finder/Explorer (CS2 and higher)
#target photoshop

// Makes Photoshop the active application
app.bringToFront()

function main(){
    var doc = activeDocument;
    var originPath = activeDocument.path;
    var outFolder = new Folder(originPath + "/out");

    if (!outFolder.exists) {
        outFolder.create();
    }

    var savedState = app.activeDocument.activeHistoryState;
	
	// Stores saved layer info: name, coordinates, width and height
	var lyrInfo = "NAME, COORDINATE, WIDTH, HEIGHT\n";
	
	// Define pixels as unit of measurement
	var defaultRulerUnits = preferences.rulerUnits;
	preferences.rulerUnits = Units.PIXELS;

    scanLayerSets(doc);

	function scanLayerSets(canvas){
		// Finds layer groups
		for(var i=0; i<canvas.layerSets.length; i++){
			var lname = canvas.layerSets[i].name;
			if (lname.substr(-1) == "@"){
				var layer = canvas.layers.getByName(lname);
				lyrInfo += recordLayerInfo(lname, layer);
				prepare(layer, true);
				saveLayer(lname, originPath);
			} else if (lname.slice(-4) == "_BTN"){
				var btnLayer = canvas.layers.getByName(lname);
				lyrInfo += recordLayerInfo(lname, btnLayer);
				for(var k=0; k<btnLayer.layers.length; k++){
					var bname = btnLayer.layers[k].name;
					var regex = /(normal|disabled|pressed)/;
					if (bname.match(regex) != null){
						prepareBTN(btnLayer.layers.getByName(bname));
						saveLayer(lname+"."+bname, originPath);
					}
				}
			}
			else {
				//recursive
				scanLayerSets(canvas.layerSets[i]);
			}
		}

		// Finds art layers in current group whose name ends with @
		for(var j=0; j<canvas.artLayers.length; j++){
			var name = canvas.artLayers[j].name;
			if (name.substr(-1) == "@"){
				var layer = canvas.layers.getByName(name);
				lyrInfo += recordLayerInfo(lname, layer);
				prepare(layer, false);
				saveLayer(name, originPath);
			}
		}
	}

	function saveLayer(lname, path){
		// save as Retina, i.e. the original size(dpi)
		var saveRetinaFile = File(path + "/out/" + lname + "_x2.png");
		SavePNG(saveRetinaFile);

		// resize canvas to a quarter of its size
		resize(0.5*activeDocument.width.value, 0.5*activeDocument.height.value);
		
		var saveFile = File(path + "/out/" + lname + "_x1.png");
		SavePNG(saveFile);
		// Reverts to original state
		//app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
        close();
	}

	// Resumes back to original ruler units
	preferences.rulerUnits = defaultRulerUnits;
	// Writes stored layer info into single file
	writeFile(lyrInfo, originPath + "/out/");

    app.activeDocument.activeHistoryState = savedState;
}

main();

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

function prepare(layer, mergeOpt){
	activeDocument.activeLayer = layer;
	dupLayers();
	
	// If there is a Shape layer with name "#" at the top of layer group
	if (hasRectBoundLayer(layer)) {
		var boundLayer = activeDocument.activeLayer.artLayers[0];
		activeDocument.crop(boundLayer.bounds);
		// var selection = Rect.fromBounds(boundLayer.bounds);
		// this.activeDocument.crop([selection.X, selection.Y, selection.right(), selection.bottom()]);
		boundLayer.visible = false;
	} else {
		// Trims the transparent area around the image
		// activeDocument.trim(TrimType.TRANSPARENT, true, true, true, true);
		trim();
	}
	
	if (mergeOpt == undefined || mergeOpt == true){
		activeDocument.mergeVisibleLayers();
	}
}

function prepareBTN(layer){
	activeDocument.activeLayer = layer;
	dupLayers();

	// If this layer's container has Shape layer named "#" at the top of layer group
	if (hasRectBoundLayer(layer.parent)){
		var boundLayer = layer.parent.artLayers[0];
		activeDocument.crop(boundLayer.bounds);
	} else {
		trim();
	}

	activeDocument.mergeVisibleLayers();
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


function recordLayerInfo(lname, layer){
	var x = (layer.bounds[0].value + layer.bounds[2].value)/2;
	var y = (layer.bounds[1].value + layer.bounds[3].value)/2;
	var width = layer.bounds[2].value - layer.bounds[0].value;
	var height = layer.bounds[3].value - layer.bounds[1].value;
	var info = lname + ": centered at (" + x + ", " + y + "), width: " + width + "px, height: " + height + "px. \n";
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
		var f = new File(path + "/saved_layers_info.txt");
		f.remove();
		f.open('a');
		f.linefeed = fileLineFeed;
		f.write(lyrInfo);
		f.close()
	} catch(e) {}

}
