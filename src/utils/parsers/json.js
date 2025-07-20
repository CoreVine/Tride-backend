/**
* Converts non-string values in `data` to strings (required by FCM)
*/

function _stringifyData(data) {
   return Object.entries(data).reduce((acc, [key, value]) => {
       acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
       return acc;
   }, {});
}

module.exports = {
  _stringifyData,
};
