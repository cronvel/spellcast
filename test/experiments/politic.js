/*
	Spellcast

	Copyright (c) 2014 - 2019 Cédric Ronvel

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

var Demographic = require( '../../lib/objects/Demographic.js' ) ;

// This test the Demographic class

var demo ;

/*
demo = Demographic.create( 47 * 1000  )
.partition( 'test' , {
	fan: 15, pro: 25, neutral: 5, anti: 55
} )
.partition( 'em' , {
	fan: 10 ,
	pro: 25 ,
	neutral: 50 ,
	anti: 15
} )
.partition( 'ff' , {
	fan: 15 ,
	pro: 15 ,
	neutral: 35 ,
	anti: 35
} ) ;
//*/

//*
demo = new Demographic( 47 * 1000 )
	.partition( 'socialClass' , {
		low: 60 ,
		middle: 30 ,
		high: 10
	} )
	.partition( 'affinity' , ( group ) => {
		return {
			low: {
				left: 45 ,
				center: 20 ,
				right: 35
			} ,
			middle: {
				left: 25 ,
				center: 25 ,
				right: 50
			} ,
			high: {
				left: 5 ,
				center: 30 ,
				right: 65
			}
		}[ group.socialClass ] ;
	} )
	//.partition( 'test' , { fan: 15, pro: 25, neutral: 5, anti: 55 } )
	.partition( 'jlm' , ( group ) => {
		return {
			left: {
				fan: 25 ,
				pro: 35 ,
				neutral: 15 ,
				anti: 25
			} ,
			center: {
				fan: 10 ,
				pro: 15 ,
				neutral: 30 ,
				anti: 45
			} ,
			right: {
				fan: 2 ,
				pro: 5 ,
				neutral: 13 ,
				anti: 80
			}
		}[ group.affinity ] ;
	} )
	.partition( 'bh' , ( group ) => {
		return {
			left: {
				fan: 5 ,
				pro: 35 ,
				neutral: 50 ,
				anti: 10
			} ,
			center: {
				fan: 5 ,
				pro: 15 ,
				neutral: 55 ,
				anti: 25
			} ,
			right: {
				fan: 2 ,
				pro: 5 ,
				neutral: 13 ,
				anti: 80
			}
		}[ group.affinity ] ;
	} )
	.partition( 'em' , ( group ) => {
		return {
			left: {
				fan: 5 ,
				pro: 20 ,
				neutral: 50 ,
				anti: 25
			} ,
			center: {
				fan: 20 ,
				pro: 55 ,
				neutral: 20 ,
				anti: 5
			} ,
			right: {
				fan: 10 ,
				pro: 35 ,
				neutral: 45 ,
				anti: 10
			}
		}[ group.affinity ] ;
	} )
	.partition( 'ff' , ( group ) => {
		return {
			left: {
				fan: 2 ,
				pro: 5 ,
				neutral: 13 ,
				anti: 80
			} ,
			center: {
				fan: 15 ,
				pro: 25 ,
				neutral: 35 ,
				anti: 25
			} ,
			right: {
				fan: 25 ,
				pro: 35 ,
				neutral: 20 ,
				anti: 20
			}
		}[ group.affinity ] ;
	} )
	.partition( 'mlp' , ( group ) => {
		return {
			left: {
				fan: 5 ,
				pro: 10 ,
				neutral: 25 ,
				anti: 60
			} ,
			center: {
				fan: 2 ,
				pro: 5 ,
				neutral: 23 ,
				anti: 70
			} ,
			right: {
				fan: 35 ,
				pro: 30 ,
				neutral: 5 ,
				anti: 30
			}
		}[ group.affinity ] ;
	} ) ;
//*/

//console.log( demo ) ;
console.log( 'Group count:' , demo.groups.length ) ;

function vote( demographic , interest , ... candidates ) {
	var proRate = 0.7 ,
		proAntiRate = 0.85 ,
		neutralRate = 0.1 ,
		neutralAntiRate = 0.5 ,
		whiteRate = 0.1 ,
		score = {} ;

	var sqrtInterest = Math.sqrt( interest ) ;
	var sqInterest = interest * interest ;

	proRate *= interest ;
	proAntiRate *= sqrtInterest ;

	neutralRate *= sqInterest ;
	neutralAntiRate *= interest ;

	candidates.forEach( candidate => score[ candidate ] = 0 ) ;
	score._white = 0 ;
	score._abstention = 0 ;

	demographic.groups.forEach( ( group ) => {

		//console.log( '----------------------\nGroup:' , group ) ;

		var rate , voteCount = 0 , whiteCount = 0 ,
			attitudes = {
				fan: [] , pro: [] , neutral: [] , anti: []
			} ;

		candidates.forEach( candidate => attitudes[ group[ candidate ] ].push( candidate ) ) ;

		// First check fans
		if ( attitudes.fan.length ) {
			// Shared between candidate that have fans
			attitudes.fan.forEach( candidate => score[ candidate ] += group.count / attitudes.fan.length ) ;
			return ;
		}

		// Then check pro
		if ( attitudes.pro.length ) {
			// Shared between candidate that have pro
			if ( attitudes.anti.length ) {
				rate = ( proAntiRate * attitudes.anti.length + proRate * ( attitudes.neutral.length + attitudes.pro.length - 1 ) ) /
					( attitudes.anti.length + attitudes.neutral.length + attitudes.pro.length - 1 ) ;
			}
			else {
				rate = proRate ;
			}

			voteCount = group.count * rate ;
			attitudes.pro.forEach( candidate => score[ candidate ] += voteCount / attitudes.pro.length ) ;
			score._abstention += group.count - voteCount ;
			//console.log( 'Add' , whiteCount , 'to white' ) ;
			//console.log( 'Add' , group.count - voteCount - whiteCount , 'to abstention' ) ;

			return ;
		}

		// Neutral can receive a small share of vote, or a bigger one if there are anti
		if ( attitudes.neutral.length ) {
			if ( attitudes.anti.length ) {
				rate = ( neutralAntiRate * attitudes.anti.length + neutralRate * ( attitudes.neutral.length - 1 ) ) /
					( attitudes.anti.length + attitudes.neutral.length - 1 ) ;
			}
			else {
				rate = neutralRate ;
			}

			voteCount = group.count * rate ;
			//console.log( 'Add' , voteCount , 'to' , attitudes.neutral ) ;
			attitudes.neutral.forEach( candidate => score[ candidate ] += voteCount / attitudes.neutral.length ) ;

			whiteCount = ( group.count - voteCount ) * whiteRate ;
			score._white += whiteCount ;
			score._abstention += group.count - voteCount - whiteCount ;
			//console.log( 'Add' , whiteCount , 'to white' ) ;
			//console.log( 'Add' , group.count - voteCount - whiteCount , 'to abstention' ) ;

			return ;
		}

		// Peoples who hate anyone
		whiteCount = ( group.count - voteCount ) * whiteRate ;
		score._white += whiteCount ;
		score._abstention += group.count - voteCount - whiteCount ;
		//console.log( 'Add' , whiteCount , 'to white' ) ;
		//console.log( 'Add' , group.count - voteCount - whiteCount , 'to abstention' ) ;
	} ) ;

	// Turn to percentage?
	for ( let k in score ) { score[ k ] = Math.round( score[ k ] * 10000 / demographic.count ) / 100 ; }

	return score ;
}

//console.log( vote( demo , 'em' , 'ff' ) ) ;
console.log( vote( demo , 0.5 , 'em' , 'ff' , 'jlm' , 'bh' , 'mlp' ) ) ;
//console.log( vote( demo , 'em' , 'ff' , 'test' ) ) ;
//console.log( vote( demo , 'em' , 'test' ) ) ;



