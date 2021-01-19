### User Guide to ReCut&ReSlice Me

—
NOTE:

This is an ExtendScript (Adobe’s version of JavaScript, but outdated) file (using ScriptUI as User Interface) mainly targets Photoshop CS6. 

This script can be programmed into a Flash based extension to support Photoshop CS6 and below, or HTML5 based extension to support Photosho CC series. 

Additional tools (with extension builder installed on Adobe’s Flash Builder, both are provided under folder ‘tools for future PSCS6 dev’ ) are needed for Flash based extension. Since Adobe has stopped support of Flash, so it might not be feasible.

—
USAGE:

1 Open the .psd file you intended to export using Photoshop. Make sure your .psd file has been saved before running the script.

If you ONLY want to export certain layer sets, you need to select them before running the script. Otherwise no action needed.

2 Run the script “ReCutAndSliceMe.jsx” by either 1) double click the script file or 2) in the Photoshop menu “File -> Scripts -> Browse…” to locate and run the script.



Notice: Photoshop CS6 may have problem rendering the UI component, if an error window pops up or the script is not running (if you open the script using “File->Scripts->Browse…” method, it will pop up the error rendering window, just ignore it), ignore it and attempt to run the script again.

3 Choose Platform to export: decide how the exported assets should be formatted (resolution) by choosing at least one platform icon. The script provided up to 7 different resolutions for three different platforms. They’re original and Retina resolution for iOS, XHDPI, HDPI, MDPI, LDPI for android and original resolution for macOS(desktop).



If android platform is selected, you can decide which resolution (i.e. XHDPI, HDPI, MDPI and LDPI) of android to export through buttom left dropdown list. This is only applied when android icon is selected when choosing the platform.

4 [OPTIONAL] choose to export assets info: Click “Export Cut Infos” if you want to know each exported asset’s position, pixels information. Informations will be stored in .txt file.

5 Export: export using either of three buttons. Detailed description of each button please refer to this website:

https://webdesign.tutsplus.com/articles/retina-friendly-photoshop-slicing-with-cutslice-me--webdesign-13815
