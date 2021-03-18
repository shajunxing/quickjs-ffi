import * as ffi from './quickjs-ffi.js'

let test4 = new ffi.CFunction('test-lib.so', 'test4', 'string', 'pointer');
let cb = new ffi.CCallback((a, b, c) => {
    console.log('callback begins');
    console.log('arguments are', a, b, c);
    console.log('callback ends');
    return [1, 2, 3, 4];
}, ['long', 'double', ['int', 'float']], 'float', 'double', 'string');
console.log('test4 returns', test4.invoke(cb.cfuncptr));

