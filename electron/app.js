


const electron = require( 'electron' ) ;
const querystring = require( 'querystring' ) ;

// Module to control application life.
const app = electron.app ;

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow ;
const Menu = electron.Menu ;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null ;

// Manage command line arguments
var args = require( 'minimist' )( process.argv.slice( 2 ) ) ;
//console.log( "Args: " , args ) ;



function onReady()
{
	var template = [
		{
			label: 'Join',
			submenu: [
				{
					label: 'Connect' ,
					click: function() { console.log( 'Connect' ) ; }
				} ,
			]
		} ,
		{
			label: 'Server',
			submenu: [
				{
					label: 'Create' ,
					click: function() { console.log( 'Create' ) ; }
				} ,
			] ,
		} ,
	] ;
	
	var menu = Menu.buildFromTemplate( template ) ;
	Menu.setApplicationMenu( menu ) ;
	
	var url ;
	
	if ( args.url )
	{
		url = args.url ;
	}
	else
	{
		var host = args.host || 'localhost' ;
		var port = args.port || 57311 ;
		
		url = 'http://' + host + ':' + port + '/?' + querystring.stringify( {
			port: port ,
			token: args.token || 'no-token' ,
			ui: args.ui || 'classic' ,
			name: args.name || 'electron-client'
		} ) ;
	}
	
	// Create the browser window.
	mainWindow = new BrowserWindow( { width: 800 , height: 600 } ) ;
	
	
	// and load the index.html of the app.
	mainWindow.loadURL( url ) ;

	// Open dev tools?
	if ( args.dev ) { mainWindow.webContents.openDevTools() ; }

	// Emitted when the window is closed.
	mainWindow.on( 'closed' , function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null ;
	} ) ;
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on( 'ready' , onReady ) ;



// Quit when all windows are closed.
app.on( 'window-all-closed' , function () {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if ( process.platform !== 'darwin' )
	{
		app.quit() ;
	}
} ) ;



app.on( 'activate' , function () {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if ( mainWindow === null )
	{
		createWindow() ;
	}
} ) ;

