import { CFunction } from './quickjs-ffi.js'

let test1 = new CFunction('test-lib.so', 'test1', 'void').invoke;
console.log(test1());

let test2 = new CFunction('test-lib.so', 'test2', 'double', 'float', 'double', 'string').invoke;
console.log(test2(3.141592654, 2.718281829, 'How do you do?'));

let test3 = new CFunction('test-lib.so', 'test3', 'void', ['long', 'double', ['int', 'float']]).invoke;
console.log(test3([123456789, 3.141592654, 54321, 2.718281829]));

