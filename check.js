const fs = require('fs');
const c = fs.readFileSync('C:/Users/yanie/Desktop/naplan-vocab/vocab.js', 'utf8');
const arr = JSON.parse(c.slice(c.indexOf('['), c.lastIndexOf(']') + 1));
console.log('Total words:', arr.length);
console.log('Missing e:', arr.filter(x => !x.e).length);
console.log('First:', JSON.stringify(arr[0]));
console.log('Last:', JSON.stringify(arr[arr.length - 1]));
