
exports.fireball = function( book , tag )
{
	console.log( "ZASH... ROOOOARRRR-CRASHHHHH!" ) ;
} ;

exports['delayed fireball'] = function( book , tag , callback )
{
	console.log( "ssssshhhhh... SSSSSHHHHH..." ) ;
	setTimeout( function() {
		console.log( "ROOOOARRRR-CRASHHHHH!" ) ;
		callback() ;
	} , 500 ) ;
} ;



