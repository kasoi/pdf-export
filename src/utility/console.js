import fs from "fs";
import util from 'util';
import now from "./time.js"

var logFile = fs.createWriteStream('logs.txt', { flags: 'a' });
// Or 'w' to truncate the file every time the process starts.
var logStdout = process.stdout;

console.log = function () 
{
    logFile.write(now() + ' | ' + util.format.apply(null, arguments) + '\n');
    logStdout.write(util.format.apply(null, arguments) + '\n');
}

console.error = console.log;