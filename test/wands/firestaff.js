
exports.fireball = function( book , tag , ctx )
{
	book.sendMessageToAll( ctx , "ZASH... ROOOOARRRR-CRASHHHHH!" ) ;
	book.sendMessageToAll( ctx , ctx.data.wizard + ' killed the ' + tag.getFinalContent( ctx.data ) + "..." ) ;
} ;

exports['delayed fireball'] = function( book , tag , ctx , callback )
{
	book.sendMessageToAll( ctx , "ssssshhhhh... SSSSSHHHHH..." ) ;
	
	setTimeout( function() {
		book.sendMessageToAll( ctx , "ROOOOARRRR-CRASHHHHH!" ) ;
		book.sendMessageToAll( ctx , ctx.data.wizard + ' killed the ' + tag.getFinalContent( ctx.data ) + ", with a delay..." ) ;
		callback() ;
	} , 500 ) ;
} ;



