
// responsivevoice.org's rate and pitch are neutral at 0.5 instead of 1
module.exports = remoteRequest => {
	remoteRequest.query.rate = remoteRequest.query.rate ? parseFloat( remoteRequest.query.rate ) / 2 : 0.5 ;
	remoteRequest.query.pitch = remoteRequest.query.pitch ? parseFloat( remoteRequest.query.pitch ) / 2 : 0.5 ;
} ;

