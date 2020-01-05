const sass = require('node-sass');
const Twig = require('twig');
const fs = require('fs');
/**
 * Concatenates "content" and other files (filesToAppend) to the specified file (path).
 * @param {string} content content of 
 * @param {string} path
 * @param {string} embedSASSfile SCSS file to embedd
 * @param { string[] } filesToAppend a list of files to be appended to the resulting content
 * @returns {string} resulting content
 */
module.exports = (content, path, embedSASSfile, filesToAppend) => {
    let result = sass.renderSync({
        file: embedSASSfile,
        sourceMap: false,
        outputStyle: 'compressed',
    });
    //const dialogCss = result.css.toString();//.replace(/\r?\n|\r/, "");
      
    let template = Twig.twig({
        //id: 'css',
        //path: path,
        data: content.toString(),
        async: false
    });
    
    let resultPromise = template.renderAsync({ css: JSON.stringify(result.css.toString()) });
    filesToAppend.forEach( (val, index, array) => {
        resultPromise = resultPromise.then( content => {
            return new Promise( (resolve, reject) => {
                fs.readFile(val, (err, data) => {
                    if(err) reject(err);
                    else resolve(content+'\r\n'+data);
                });
            });
        });
    });
    return resultPromise;
};