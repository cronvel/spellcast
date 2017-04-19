/*
	Spellcast
	
	Copyright (c) 2014 - 2016 Cédric Ronvel
	
	The MIT License (MIT)
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



var kungFig = require( 'kung-fig' ) ;
var LabelTag = kungFig.LabelTag ;



function HereActionsTag( tag , attributes , content , shouldParse )
{
	var self = ( this instanceof HereActionsTag ) ? this : Object.create( HereActionsTag.prototype ) ;
	
	LabelTag.call( self , 'here-actions' , attributes , content , shouldParse ) ;
	
	Object.defineProperties( self , {
		type: { value: self.attributes || 'normal' , enumerable: true } ,
	} ) ;
	
	return self ;
}

module.exports = HereActionsTag ;
HereActionsTag.prototype = Object.create( LabelTag.prototype ) ;
HereActionsTag.prototype.constructor = HereActionsTag ;



HereActionsTag.prototype.run = function run( book , ctx )
{
	console.log( ctx ) ;
	this.ctx.sceneConfig.hereActions = this ;
	return null ;
} ;


