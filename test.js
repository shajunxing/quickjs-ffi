import * as ffi from './quickjs-ffi.js'

function foo(){}

let test4 = new ffi.CFunction('test-lib.so', 'test4', 'void', 'pointer');
let cb = new ffi.CCallback(foo, 'void', 'pointer');
test4.invoke(cb.cfuncptr);
