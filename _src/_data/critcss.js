const fs = require('fs');
const path = require('path');

module.exports = {
  getCSS(relPath) {
  	console.log( relPath);
    return fs.readFileSync( path.join( relPath ), 'utf-8' );
  }
};