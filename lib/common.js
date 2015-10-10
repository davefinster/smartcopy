//optionsList is a list of objects in order or priority
//the highest priority is the first
//mergeOptions will return a single object containing all the keys of
//all the objects, but the value will be the first occurance of that value only
//this function allows locally configured values to take priority over
//default configuration
exports.mergeOptions = function(optionsList){
  var returnObj = {};
  for ( var i = 0; i < optionsList.length; i++ ){
    var keys = Object.keys(optionsList[i]);
    for ( var j = 0; j < keys.length; j++ ){
      if ( returnObj[keys[j]] == undefined ) {
        returnObj[keys[j]] = optionsList[i][keys[j]];
      }
    }
  }
  return returnObj;
}
