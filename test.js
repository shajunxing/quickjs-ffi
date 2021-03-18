import * as ffi from './quickjs-ffi.js'

// let test4 = new ffi.CFunction('test-lib.so', 'test4', 'void', 'pointer');
// let cb1 = new ffi.CCallback(() => { console.log('cb1') }, 'void');
// test4.invoke(cb1.cfuncptr);

let test5 = new ffi.CFunction('test-lib.so', 'test5', 'void', 'pointer');
let cb2 = new ffi.CCallback((a, b, c) => {
    console.log('cb2', a, b, c);
    return a + b;
}, 'double', 'float', 'double', 'string');
test5.invoke(cb2.cfuncptr);
