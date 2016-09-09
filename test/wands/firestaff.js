
exports.fireball = function( book , tag , ctx )
{
	console.log( "ZASH... ROOOOARRRR-CRASHHHHH!" ) ;
	console.log( ctx.data.wizard + ' killed the ' + tag.getFinalContent( ctx.data ) + "..." ) ;
} ;

exports['delayed fireball'] = function( book , tag , ctx , callback )
{
	console.log( "ssssshhhhh... SSSSSHHHHH..." ) ;
	setTimeout( function() {
		console.log( "ROOOOARRRR-CRASHHHHH!" ) ;
		console.log( ctx.data.wizard + ' killed the ' + tag.getFinalContent( ctx.data ) + ", with a delay..." ) ;
		callback() ;
	} , 500 ) ;
} ;



