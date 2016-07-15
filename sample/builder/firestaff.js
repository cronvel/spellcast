
exports.fireball = function( book , tag , execContext )
{
	console.log( "ZASH... ROOOOARRRR-CRASHHHHH!" ) ;
	console.log( tag.proxy.data.wizard + ' killed the ' + tag.content + "..." ) ;
} ;

exports['delayed fireball'] = function( book , tag , execContext , callback )
{
	console.log( "ssssshhhhh... SSSSSHHHHH..." ) ;
	setTimeout( function() {
		console.log( "ROOOOARRRR-CRASHHHHH!" ) ;
		console.log( tag.proxy.data.wizard + ' killed the ' + tag.content + "..." ) ;
		callback() ;
	} , 500 ) ;
} ;



